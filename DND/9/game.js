(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const {
    FIXED_STEP_MS,
    MAX_FRAME_MS,
    PHASE,
    ATTACK_TYPE,
    PURPLE_LINE_COUNT,
    BOX_RECT,
    MENU_ITEMS: menuItems,
    DEFAULT_ENEMY_DATA
  } = window.SoulBattle.constants;
  const { clamp, lerp, easeInOutCubic } = window.SoulBattle.utils;
  const { createAssets, playSound, playMusic, stopMusic } = window.SoulBattle.assets;
  const { createInput } = window.SoulBattle.input;

  const enemyData = {
    ...DEFAULT_ENEMY_DATA,
    ...(window.ENEMY_DATA || {})
  };

  const { sprites, sounds } = createAssets(enemyData);

  function stopCurrentMusic() {
    stopMusic(sounds.battleTheme);
    stopMusic(sounds.phase2Theme);
  }

  function currentBossData() {
    return state.bossPhase === 2 && enemyData.phase2
      ? { ...enemyData, ...enemyData.phase2 }
      : enemyData;
  }

  function currentAttackPatterns() {
    const bossData = currentBossData();
    return Array.isArray(bossData.attackPatterns)
      ? bossData.attackPatterns
      : enemyData.attackPatterns;
  }

  function currentTurns() {
    if (state.bossPhase === 2 && enemyData.phase2) {
      if (Array.isArray(enemyData.phase2.turns)) {
        return enemyData.phase2.turns;
      }

      if (Array.isArray(enemyData.phase2.attackPatterns)) {
        return enemyData.phase2.attackPatterns;
      }
    }

    if (Array.isArray(enemyData.turns)) {
      return enemyData.turns;
    }

    const attackPatterns = currentAttackPatterns();
    return Array.isArray(attackPatterns) ? attackPatterns : null;
  }

  function normalizeAttackPattern(attackPattern) {
    if (typeof attackPattern === "function") {
      return {
        type: ATTACK_TYPE.NORMAL,
        duration: null,
        setup: null,
        pattern: attackPattern
      };
    }

    if (attackPattern && typeof attackPattern === "object") {
      return {
        type: typeof attackPattern.type === "string" ? attackPattern.type : ATTACK_TYPE.NORMAL,
        duration: Number.isFinite(attackPattern.duration) ? attackPattern.duration : null,
        setup: typeof attackPattern.setup === "function" ? attackPattern.setup : null,
        pattern: attackPattern.pattern
      };
    }

    return {
      type: ATTACK_TYPE.NORMAL,
      duration: null,
      setup: null,
      pattern: null
    };
  }

  function normalizeTurnEvent(event) {
    if (!event || !Array.isArray(event.steps)) return null;

    const steps = event.steps.filter((step) => (
      step &&
      (step.type === "textbox" || step.type === "enemyDialog" || step.type === "flash")
    )).map((step) => ({
      type: step.type,
      text: typeof step.text === "string" ? step.text : "",
      color: typeof step.color === "string" ? step.color : "#fff",
      duration: Number.isFinite(step.duration) ? Math.max(1, step.duration) : null
    }));

    return steps.length > 0 ? { steps } : null;
  }

  function normalizeTurn(turn) {
    if (turn && typeof turn === "object" && (
      Object.prototype.hasOwnProperty.call(turn, "attack") ||
      Object.prototype.hasOwnProperty.call(turn, "event") ||
      Object.prototype.hasOwnProperty.call(turn, "loop")
    )) {
      return {
        attack: normalizeAttackPattern(turn.attack || turn),
        event: normalizeTurnEvent(turn.event),
        loop: turn.loop !== false
      };
    }

    return {
      attack: normalizeAttackPattern(turn),
      event: null,
      loop: true
    };
  }

  function currentAttackConfig() {
    if (state.currentTurn) {
      return state.currentTurn.attack;
    }

    const turns = currentTurns();

    if (!Array.isArray(turns) || turns.length === 0) {
      return {
        type: ATTACK_TYPE.NORMAL,
        duration: null,
        setup: null,
        pattern: null
      };
    }

    return normalizeTurn(turns[state.pattern]).attack;
  }

  const input = createInput({ canvas, width: W, height: H });

  function createInventory(items) {
    if (!Array.isArray(items)) return [];

    return items
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({
        name: item.name,
        heal: Number.isFinite(item.heal) ? item.heal : 0
      }))
      .slice(0, 4);
  }

  function createActs(bossData) {
    if (Array.isArray(bossData.acts)) {
      const acts = bossData.acts
        .filter((act) => act && typeof act.name === "string")
        .map((act) => ({
          name: act.name,
          dialog: typeof act.dialog === "string" ? act.dialog : bossData.actMessage
        }))
        .slice(0, 4);

      if (acts.length > 0) return acts;
    }

    return [{
      name: "Check",
      dialog: typeof bossData.actMessage === "string" ? bossData.actMessage : "* Nothing happens."
    }];
  }

  function currentActs() {
    return createActs(currentBossData());
  }

  function currentActConditions() {
    const acts = currentActs();
    const conditions = currentBossData().actConditions;

    if (!Array.isArray(conditions)) return [];

    return conditions
      .filter((condition) =>
        condition &&
        Number.isInteger(condition.act) &&
        condition.act >= 1 &&
        condition.act <= acts.length &&
        typeof condition.dialog === "string"
      )
      .map((condition) => ({
        act: condition.act,
        dialog: condition.dialog
      }));
  }

  function canMercyCurrentEnemy() {
    const conditions = currentActConditions();
    return state.actConditionIndex >= conditions.length;
  }

  const state = {
    phase: PHASE.INTRO,
    bossPhase: 1,
    phase2Started: false,
    selected: 0,
    selectedFightTarget: 0,
    selectedAct: 0,
    selectedItem: 0,
    selectedMercyTarget: 0,
    actConditionIndex: 0,
    frame: 0,
    textTimer: 0,
    dialogIndex: 0,
    enemyDialogIndex: 0,
    enemyDialogTimer: 0,
    enemyDialogDuration: 0,
    enemyDialogMessage: "",
    currentTurn: null,
    consumedTurns: new Set(),
    turnEvent: {
      steps: [],
      index: -1,
      timer: 0,
      step: null
    },
    message: enemyData.introMessage,

    playerHP: 50,
    maxHP: 50,

    enemyHP: enemyData.maxHP,
    enemyMaxHP: enemyData.maxHP,
    enemyName: enemyData.name,

    inventory: createInventory(enemyData.items),

    attack: {
      markerX: 205,
      speed: 8,
      direction: 1,
      active: false,
      result: null,
      damage: 0,
      flash: 0,
    },
    damageResult: {
      timer: 0,
      duration: 105,
      dropStart: 20,
      fromHP: enemyData.maxHP,
      toHP: enemyData.maxHP,
      damage: 0,
    },

    box: { ...BOX_RECT.TEXT },
    soul: { x: 450, y: 420, r: 8, speed: 5.06, invuln: 0, lane: 1, vy: 0 },
    attackType: ATTACK_TYPE.NORMAL,
    bullets: [],

    enemyTimer: 0,
    enemyWarmup: 75,
    enemyDuration: 640,
    pattern: -1,
    boxMorph: {
      timer: 0,
      duration: 28,
      from: { ...BOX_RECT.TEXT },
      to: { ...BOX_RECT.TEXT },
      nextPhase: PHASE.MENU,
      onComplete: null,
    },
    shake: 0,
    hpFillTarget: 0,
    hpFillSpeed: 1.35,
    phaseTransition: {
      timer: 0,
      fadeOutDuration: 90,
      holdDuration: 150,
      fadeInDuration: 100,
      refillMessageMinDuration: 180,
      refillMessageTimer: 0,
      refillStarted: false,
    },
    ultimate: {
      transformed: false,
      timer: 0,
      fadeOutDuration: 75,
      holdDuration: 25,
      fadeInDuration: 75,
    },
    mercy: {
      timer: 0,
      messageDuration: 135,
      fadeDuration: 90,
      success: false,
    },
    defeatDissolve: {
      timer: 0,
      duration: 180,
      dissolveDuration: 112,
      pixelSize: 6,
      spriteSize: 330,
      spriteTop: 5,
      spriteKey: "enemy",
      releasedRows: 0,
      particles: [],
      source: null,
    },
  };

  function currentBattleDialog() {
    const bossData = currentBossData();
    const battleDialog = bossData.battleDialog;
    const fallback = `* ${bossData.name} refuses to die.`;

    if (!Array.isArray(battleDialog) || battleDialog.length === 0) return fallback;

    if (!Number.isInteger(state.dialogIndex) || state.dialogIndex < 0) {
      state.dialogIndex = 0;
    }

    const index = Math.min(state.dialogIndex, battleDialog.length - 1);
    return battleDialog[index] || fallback;
  }

  function advanceBattleDialog() {
    const battleDialog = currentBossData().battleDialog;

    if (!Array.isArray(battleDialog) || battleDialog.length === 0) return;

    if (!Number.isInteger(state.dialogIndex) || state.dialogIndex < 0) {
      state.dialogIndex = 0;
    }

    if (state.dialogIndex < battleDialog.length - 1) {
      state.dialogIndex++;
    }
  }

  function currentEnemyDialog() {
    const enemyDialog = currentBossData().enemyDialog;

    if (!Array.isArray(enemyDialog) || enemyDialog.length === 0) return null;
    if (!Number.isInteger(state.enemyDialogIndex) || state.enemyDialogIndex < 0) {
      state.enemyDialogIndex = 0;
    }
    if (state.enemyDialogIndex >= enemyDialog.length) return null;

    return enemyDialog[state.enemyDialogIndex] || null;
  }

  window.setUpcomingAttack = function setUpcomingAttack(number) {
    const turns = currentTurns();

    if (!Array.isArray(turns) || turns.length === 0) {
      console.warn("This enemy has no configured attacks.");
      return false;
    }

    if (!Number.isInteger(number) || number < 1 || number > turns.length) {
      console.warn(`Choose an attack number from 1 to ${turns.length}.`);
      return false;
    }

    const index = number - 1;
    const ultimateIndex = turns.findIndex((turn) =>
      normalizeTurn(turn).attack.type === ATTACK_TYPE.ULTIMATE
    );

    if (ultimateIndex !== -1 && index > ultimateIndex) {
      state.ultimate.transformed = true;

      for (let priorIndex = 0; priorIndex <= ultimateIndex; priorIndex++) {
        if (!normalizeTurn(turns[priorIndex]).loop) {
          state.consumedTurns.add(priorIndex);
        }
      }
    }

    state.pattern = (index + turns.length - 1) % turns.length;
    state.consumedTurns.delete(index);
    console.info(`Attack ${number} will run on the next enemy turn.`);
    return true;
  };

  function selectNextTurn() {
    const turns = currentTurns();

    if (!Array.isArray(turns) || turns.length === 0) {
      state.pattern = (state.pattern + 1) % 5;
      return { attack: normalizeAttackPattern(null), event: null, loop: true };
    }

    for (let offset = 1; offset <= turns.length; offset++) {
      const index = (state.pattern + offset) % turns.length;

      if (state.consumedTurns.has(index)) continue;

      const turn = normalizeTurn(turns[index]);
      state.pattern = index;

      if (!turn.loop) {
        state.consumedTurns.add(index);
      }

      return turn;
    }

    return { attack: normalizeAttackPattern(null), event: null, loop: true };
  }

  function beginTurnEvent(event) {
    state.turnEvent.steps = event.steps;
    state.turnEvent.index = -1;
    state.turnEvent.timer = 0;
    state.turnEvent.step = null;
    advanceTurnEvent();
  }

  function advanceTurnEvent() {
    state.turnEvent.index++;
    state.turnEvent.timer = 0;
    state.turnEvent.step = state.turnEvent.steps[state.turnEvent.index] || null;

    if (!state.turnEvent.step) {
      beginEnemyDialog();
      return;
    }

    const step = state.turnEvent.step;
    state.phase = PHASE.TURN_EVENT;

    if (step.type === "textbox") {
      state.box = { ...BOX_RECT.TEXT };
      state.message = step.text;
      state.textTimer = 0;
    } else if (step.type === "enemyDialog") {
      state.enemyDialogMessage = step.text;
      state.enemyDialogTimer = 0;
    }
  }

  function beginEnemyTurn() {
    state.currentTurn = selectNextTurn();

    if (state.currentTurn.event) {
      beginTurnEvent(state.currentTurn.event);
      return;
    }

    beginEnemyDialog();
  }

  function beginEnemyDialog() {
    const line = currentEnemyDialog();

    if (!line) {
      beginEnemyAttack();
      return;
    }

    state.phase = PHASE.ENEMY_DIALOG;
    state.box = { ...BOX_RECT.TEXT };
    state.enemyDialogMessage = line;
    state.enemyDialogTimer = 0;
    state.enemyDialogDuration = Math.max(120, Math.ceil(line.length / 1.25) + 60);
    state.enemyDialogIndex++;
  }

  function beginMenu(message) {
    state.phase = PHASE.MENU;
    state.box = { ...BOX_RECT.TEXT };
    state.message = typeof message === "string" ? message : currentBattleDialog();
    state.textTimer = 0;
    state.bullets = [];
    state.attackType = ATTACK_TYPE.NORMAL;
    state.attack.active = false;
    state.attack.result = null;
    state.attack.damage = 0;
    state.soul.x = state.box.x + state.box.w / 2;
    state.soul.y = state.box.y + state.box.h / 2;
    state.soul.lane = 1;
    state.soul.vy = 0;
  }

  function beginBoxMorph(to, nextPhase, onComplete) {
    state.phase = PHASE.BOX_MORPH;
    state.boxMorph = {
      timer: 0,
      duration: 28,
      from: { ...state.box },
      to: { ...to },
      nextPhase,
      onComplete: typeof onComplete === "function" ? onComplete : null,
    };
  }

  function finishBoxMorph() {
    const morph = state.boxMorph;

    state.box = { ...morph.to };
    state.phase = morph.nextPhase;

    if (typeof morph.onComplete === "function") {
      morph.onComplete();
    }

    morph.onComplete = null;
  }

  function beginItemSelection() {
    state.phase = PHASE.ITEM;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedItem = clamp(state.selectedItem, 0, Math.max(0, state.inventory.length - 1));
    state.textTimer = 0;
  }

  function beginActSelection() {
    const acts = currentActs();

    state.phase = PHASE.ACT;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedAct = clamp(state.selectedAct, 0, Math.max(0, acts.length - 1));
    state.textTimer = 0;
  }

  function beginFightTargetSelection() {
    state.phase = PHASE.FIGHT_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedFightTarget = 0;
    state.textTimer = 0;
  }

  function beginMercyTargetSelection() {
    state.phase = PHASE.MERCY_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedMercyTarget = 0;
    state.textTimer = 0;
  }

  function beginAttack() {
    const meter = getAttackMeterBounds();

    state.phase = PHASE.ATTACK;
    state.box = { ...BOX_RECT.TEXT };
    state.attack.markerX = meter.trackStart;
    state.attack.direction = 1;
    state.attack.speed = 14.72;
    state.attack.active = true;
    state.attack.result = null;
    state.attack.damage = 0;
    state.attack.flash = 0;
  }

  function beginPhase2Transition() {
    const phase2 = enemyData.phase2;

    if (!phase2) return false;

    stopCurrentMusic();

    state.phase = PHASE.PHASE_TRANSITION;
    state.phase2Started = true;
    state.enemyHP = 0;
    state.pattern = -1;
    state.currentTurn = null;
    state.consumedTurns.clear();
    state.bullets = [];
    state.message = phase2.transitionMessage || "* The music cuts out.";
    state.textTimer = 0;
    state.hpFillTarget = state.enemyMaxHP;
    state.hpFillSpeed = Number.isFinite(phase2.hpFillSpeed) ? phase2.hpFillSpeed : 1.35;
    state.phaseTransition = {
      timer: 0,
      fadeOutDuration: Number.isFinite(phase2.fadeOutDuration) ? phase2.fadeOutDuration : 90,
      holdDuration: Number.isFinite(phase2.holdDuration) ? phase2.holdDuration : 150,
      fadeInDuration: Number.isFinite(phase2.fadeInDuration) ? phase2.fadeInDuration : 100,
      refillMessageMinDuration: Number.isFinite(phase2.refillMessageMinDuration) ? phase2.refillMessageMinDuration : 180,
      refillMessageTimer: 0,
      refillStarted: false,
    };

    return true;
  }

  function finishPhase2Transition() {
    const phase2 = enemyData.phase2 || {};

    state.enemyHP = state.enemyMaxHP;
    state.phase = PHASE.MESSAGE;
    state.message = phase2.startMessage || "* Phase 2 begins.";
    state.textTimer = 0;

    playMusic(sounds.phase2Theme);
    setTimeout(beginEnemyTurn, 2200);
  }

  function resolveAttack() {
    if (!state.attack.active) return;

    const meter = getAttackMeterBounds();
    const center = meter.center;
    const dist = Math.abs(state.attack.markerX - center);
    const maxDist = meter.maxDist;
    const accuracy = Math.max(0, 1 - dist / maxDist);
    const damage = Math.max(1, Math.round(6 + accuracy * accuracy * 28));
    const fromHP = state.enemyHP;
    const toHP = Math.max(0, state.enemyHP - damage);

    state.attack.damage = damage;
    state.attack.result = accuracy > 0.82 ? "CRITICAL" : accuracy > 0.45 ? "HIT" : "WEAK";
    state.attack.active = false;
    state.attack.flash = 22;
    playSound(sounds.attackLand);
    advanceBattleDialog();
    state.phase = PHASE.DAMAGE_RESULT;
    state.message = "";
    state.enemyDialogMessage = "";
    state.textTimer = 0;
    state.damageResult = {
      timer: 0,
      duration: 105,
      dropStart: 20,
      fromHP,
      toHP,
      damage,
    };
  }

  function finishDamageResult() {
    state.enemyHP = state.damageResult.toHP;

    if (state.enemyHP <= 0) {
      if (!state.phase2Started && beginPhase2Transition()) {
        return;
      }

      stopCurrentMusic();
      beginDefeatDissolve();
      return;
    }

    state.phase = PHASE.MESSAGE;
    state.message = currentBattleDialog();
    state.textTimer = 0;
    beginEnemyTurn();
  }

  function beginEnemyAttack() {
    state.bullets = [];
    state.enemyTimer = -state.enemyWarmup;
    const attackConfig = currentAttackConfig();

    state.attackType = attackConfig.type;
    state.enemyDuration = Number.isFinite(attackConfig.duration) ? attackConfig.duration : 640;
    state.message = "";
    state.textTimer = 0;

    if (state.attackType === ATTACK_TYPE.ULTIMATE && !state.ultimate.transformed) {
      state.phase = PHASE.ULTIMATE_TRANSITION;
      state.ultimate.timer = 0;
      return;
    }

    beginDefenseBoxMorph();
  }

  function beginDefenseBoxMorph() {
    const defenseBox = state.attackType === ATTACK_TYPE.ULTIMATE
      ? BOX_RECT.FULL
      : BOX_RECT.BATTLE;

    beginBoxMorph(defenseBox, PHASE.ENEMY, () => {
      state.soul.x = state.box.x + state.box.w / 2;
      state.soul.lane = 1;
      state.soul.vy = 0;

      if (state.attackType === ATTACK_TYPE.PURPLE) {
        state.soul.y = getPurpleLineYs()[state.soul.lane];
      } else if (state.attackType === ATTACK_TYPE.BLUE) {
        state.soul.y = state.box.y + state.box.h - state.soul.r;
      } else {
        state.soul.y = state.box.y + state.box.h / 2;
      }

      const attackConfig = currentAttackConfig();

      if (typeof attackConfig.setup === "function") {
        attackConfig.setup({
          box: state.box,
          state,
          spawnBullet
        });
      }
    });
  }

  function updateUltimateTransition() {
    const transition = state.ultimate;
    const swapTime = transition.fadeOutDuration + transition.holdDuration;
    const finishTime = swapTime + transition.fadeInDuration;

    transition.timer++;

    if (!transition.transformed && transition.timer >= swapTime) {
      transition.transformed = true;
    }

    if (transition.timer >= finishTime) {
      beginDefenseBoxMorph();
    }
  }

  function useMenuSelection() {
    const item = menuItems[state.selected];

    if (item === "FIGHT") {
      beginFightTargetSelection();
    }

    if (item === "ACT") {
      beginActSelection();
    }

    if (item === "ITEM") {
      beginItemSelection();
    }

    if (item === "MERCY") {
      beginMercyTargetSelection();
    }
  }

  function useSelectedAct() {
    const acts = currentActs();
    const act = acts[state.selectedAct];

    if (!act) return;

    const conditions = currentActConditions();
    const nextCondition = conditions[state.actConditionIndex];
    let message = act.dialog;

    if (nextCondition && nextCondition.act === state.selectedAct + 1) {
      state.actConditionIndex++;
      message = nextCondition.dialog;
    }

    state.phase = PHASE.MESSAGE;
    state.message = message;
    state.textTimer = 0;
    advanceBattleDialog();
    setTimeout(beginEnemyTurn, 3250);
  }

  function useSelectedItem() {
    if (state.inventory.length === 0) return;

    const item = state.inventory[state.selectedItem];
    if (!item) return;

    playSound(sounds.itemUse);

    const heal = Math.min(item.heal, state.maxHP - state.playerHP);
    state.playerHP += heal;

    state.inventory.splice(state.selectedItem, 1);
    state.selectedItem = clamp(state.selectedItem, 0, Math.max(0, state.inventory.length - 1));

    state.phase = PHASE.MESSAGE;
    state.message = heal > 0
      ? `* You used ${item.name}. Recovered ${heal} HP.`
      : `* You used ${item.name}. But your HP was already full.`;
    state.textTimer = 0;

    advanceBattleDialog();
    setTimeout(beginEnemyTurn, 3250);
  }

  function resolveMercy() {
    const bossData = currentBossData();
    const success = canMercyCurrentEnemy();

    state.phase = PHASE.MERCY_MESSAGE;
    state.message = success ? bossData.mercySuccess : bossData.mercyFailure;
    state.textTimer = 0;
    state.mercy.timer = 0;
    state.mercy.success = success;
  }

  function updateMercyMessage() {
    state.mercy.timer++;

    if (state.mercy.timer < state.mercy.messageDuration) return;

    if (!state.mercy.success) {
      advanceBattleDialog();
      beginEnemyTurn();
      return;
    }

    stopCurrentMusic();
    state.phase = PHASE.MERCY_FADE;
    state.mercy.timer = 0;
  }

  function updateMercyFade() {
    state.mercy.timer++;

    if (state.mercy.timer < state.mercy.fadeDuration) return;

    state.phase = PHASE.SPARED;
    state.message = currentBossData().mercyWinMessage;
  }

  function beginDefeatDissolve() {
    const dissolve = state.defeatDissolve;

    playSound(sounds.vaporized);
    state.phase = PHASE.DEFEAT_DISSOLVE;
    state.message = currentBossData().winMessage || enemyData.winMessage;
    dissolve.timer = 0;
    dissolve.spriteTop = 5 + Math.sin(state.frame / 24) * 4;
    dissolve.spriteKey = activeEnemySpriteKey();
    dissolve.releasedRows = 0;
    dissolve.particles = [];
    dissolve.source = captureEnemySprite(dissolve.spriteKey, dissolve.spriteSize);
  }

  function updateDefeatDissolve() {
    const dissolve = state.defeatDissolve;
    const rowCount = Math.ceil(dissolve.spriteSize / dissolve.pixelSize);
    const progress = clamp(dissolve.timer / dissolve.dissolveDuration, 0, 1);
    const targetRows = Math.floor(easeInOutCubic(progress) * rowCount);

    while (dissolve.releasedRows < targetRows) {
      releaseDissolveRow(dissolve.releasedRows);
      dissolve.releasedRows++;
    }

    for (const particle of dissolve.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx += particle.drift;
      particle.vy -= 0.008;
      particle.life--;
    }

    dissolve.particles = dissolve.particles.filter((particle) => particle.life > 0);
    dissolve.timer++;

    if (dissolve.timer >= dissolve.duration) {
      dissolve.particles = [];
      dissolve.source = null;
      state.phase = PHASE.WIN;
    }
  }

  function releaseDissolveRow(row) {
    const dissolve = state.defeatDissolve;
    const source = dissolve.source;
    const size = dissolve.pixelSize;
    const y = row * size;

    if (!source || y >= dissolve.spriteSize) return;

    let pixels;

    try {
      pixels = source.getContext("2d").getImageData(0, y, dissolve.spriteSize, Math.min(size, dissolve.spriteSize - y)).data;
    } catch (err) {
      return;
    }

    for (let x = 0; x < dissolve.spriteSize; x += size) {
      const sampleX = Math.min(dissolve.spriteSize - 1, x + Math.floor(size / 2));
      const sampleY = Math.min(size - 1, Math.floor(size / 2));
      const index = (sampleY * dissolve.spriteSize + sampleX) * 4;
      const alpha = pixels[index + 3];

      if (alpha < 28) continue;

      const life = 32 + Math.floor(Math.random() * 35);

      dissolve.particles.push({
        x,
        y,
        size: size * (0.7 + Math.random() * 0.65),
        color: `rgba(${pixels[index]},${pixels[index + 1]},${pixels[index + 2]},${alpha / 255})`,
        vx: (Math.random() - 0.5) * 1.35,
        vy: -0.18 - Math.random() * 0.8,
        drift: (Math.random() - 0.5) * 0.025,
        life,
        maxLife: life,
      });
    }
  }

  function spawnBullet(b) {
    const bullet = {
      x: b.x,
      y: b.y,
      vx: 0,
      vy: 0,
      r: 7,
      type: "dot",
      life: 999,
      angle: 0,
      spin: 0,
      harmless: false,
      damageOnlyWhileMoving: false,
      damageOnlyWhileStill: false,
      age: 0,
      update: null,
      ...b
    };

    state.bullets.push(bullet);
    return bullet;
  }

  function updateEnemyDialog() {
    state.enemyDialogTimer++;

    if (state.enemyDialogTimer >= state.enemyDialogDuration) {
      beginEnemyAttack();
    }
  }

  function updateTurnEvent() {
    const step = state.turnEvent.step;

    if (!step) {
      beginEnemyDialog();
      return;
    }

    state.turnEvent.timer++;

    const defaultDuration = step.type === "flash"
      ? 42
      : Math.max(120, Math.ceil(step.text.length / 1.25) + 60);
    const duration = Number.isFinite(step.duration) ? step.duration : defaultDuration;

    if (state.turnEvent.timer >= duration) {
      advanceTurnEvent();
    }
  }

  function updateEnemyAttack() {
    const t = state.enemyTimer++;
    const box = state.box;
    const turns = currentTurns();

    if (t < 0) {
      return;
    }

    const previousSoulX = state.soul.x;
    const previousSoulY = state.soul.y;

    moveSoul();

    const soulIsMoving = state.soul.x !== previousSoulX || state.soul.y !== previousSoulY;

    if (Array.isArray(turns)) {
      const attackConfig = currentAttackConfig();
      const attackPattern = attackConfig.pattern;

      if (typeof attackPattern === "function") {
        attackPattern({
          t,
          box,
          state,
          purpleLineYs: state.attackType === ATTACK_TYPE.PURPLE ? getPurpleLineYs() : null,
          spawnBullet
        });
      }
    } else {
      if (state.pattern === 0) {
        if (t % 34 === 0) {
          const y = box.y + 18 + Math.random() * (box.h - 36);
          spawnBullet({ x: box.x - 12, y, vx: 2 + t / 430, r: 7 });
        }

        if (t % 52 === 20) {
          const y = box.y + 18 + Math.random() * (box.h - 36);
          spawnBullet({ x: box.x + box.w + 12, y, vx: -2 - t / 470, r: 7 });
        }
      }

      if (state.pattern === 1) {
        if (t % 26 === 0) {
          const x = box.x + 14 + Math.random() * (box.w - 28);
          spawnBullet({ x, y: box.y - 14, vy: 2.5, r: 6 });
        }

        if (t % 118 === 0) {
          const gap = box.x + 60 + Math.random() * (box.w - 120);
          for (let x = box.x + 18; x < box.x + box.w - 10; x += 26) {
            if (Math.abs(x - gap) > 34) {
              spawnBullet({ x, y: box.y - 18, vy: 2, r: 8, type: "diamond", spin: 0.06 });
            }
          }
        }
      }

      if (state.pattern === 2) {
        if (t % 46 === 0) {
          const fromLeft = Math.random() > 0.5;
          const x = fromLeft ? box.x - 20 : box.x + box.w + 20;
          const targetY = box.y + 20 + Math.random() * (box.h - 40);
          spawnBullet({ x, y: targetY, vx: fromLeft ? 2.5 : -2.5, vy: Math.sin(t) * 0.7, r: 9, type: "bone" });
        }

        if (t % 72 === 14) {
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;

          for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8 + t * 0.02;
            spawnBullet({ x: cx, y: cy, vx: Math.cos(a) * 2.2, vy: Math.sin(a) * 2.2, r: 5 });
          }
        }
      }

      if (state.pattern === 3) {
        if (t % 160 === 0) {
          const gapY = box.y + 45 + Math.random() * (box.h - 90);

          for (let y = box.y + 18; y < box.y + box.h - 12; y += 22) {
            if (Math.abs(y - gapY) > 30) {
              spawnBullet({ x: box.x - 18, y, vx: 1.2, r: 8, type: "diamond", spin: 0.12 });
              spawnBullet({
                x: box.x + box.w + 18,
                y: box.y + box.h - (y - box.y),
                vx: -1.2,
                r: 8,
                type: "diamond",
                spin: -0.12
              });
            }
          }
        }

        if (t % 35 === 10) {
          spawnBullet({
            x: box.x + box.w / 2,
            y: box.y - 18,
            vx: Math.sin(t * 0.08) * 1.2,
            vy: 1.2,
            r: 6
          });
        }
      }

      if (state.pattern === 4) {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;

        if (t % 12 === 0) {
          const a = t * 0.16;
          const radius = 18 + (t % 96);

          spawnBullet({
            x: cx + Math.cos(a) * radius,
            y: cy + Math.sin(a) * radius,
            vx: Math.cos(a + Math.PI / 2) * 1,
            vy: Math.sin(a + Math.PI / 2) * 1,
            r: 5,
            type: "diamond",
            spin: 0.18
          });

          spawnBullet({
            x: cx + Math.cos(a + Math.PI) * radius,
            y: cy + Math.sin(a + Math.PI) * radius,
            vx: Math.cos(a - Math.PI / 2) * 1,
            vy: Math.sin(a - Math.PI / 2) * 1,
            r: 5,
            type: "diamond",
            spin: -0.18
          });
        }

        if (t % 70 === 24) {
          const fromTop = Math.random() > 0.5;

          spawnBullet({
            x: box.x + 20 + Math.random() * (box.w - 40),
            y: fromTop ? box.y - 20 : box.y + box.h + 20,
            vy: fromTop ? 2 : -2,
            vx: Math.random() * 1.4 - 0.7,
            r: 9,
            type: "bone"
          });
        }
      }
    }

    for (const b of state.bullets) {
      b.age++;

      if (typeof b.update === "function") {
        b.update({
          bullet: b,
          t,
          box,
          state,
          spawnBullet
        });
      } else {
        b.x += b.vx;
        b.y += b.vy;
      }

      b.angle += b.spin;
      b.life--;

      if (
        !b.harmless &&
        (!b.damageOnlyWhileMoving || soulIsMoving) &&
        (!b.damageOnlyWhileStill || !soulIsMoving) &&
        collides(state.soul, b) &&
        state.soul.invuln <= 0
      ) {
        state.playerHP = Math.max(0, state.playerHP - 3);
        playSound(sounds.playerHurt);
        state.soul.invuln = 50;
        state.shake = 10;

        if (state.playerHP <= 0) {
          stopCurrentMusic();
          state.phase = PHASE.LOSE;
          state.message = "* Your soul cracks. Try again?";
        }
      }
    }

    state.bullets = state.bullets.filter((b) =>
      b.life > 0 &&
      (
        b.noCull ||
        (
          b.x > box.x - 80 &&
          b.x < box.x + box.w + 80 &&
          b.y > box.y - 80 &&
          b.y < box.y + box.h + 80
        )
      )
    );

    if (state.soul.invuln > 0) state.soul.invuln--;

    if (state.enemyTimer >= state.enemyDuration && state.phase === PHASE.ENEMY) {
      state.bullets = [];
      beginBoxMorph(BOX_RECT.TEXT, PHASE.MENU, () => {
        beginMenu();
      });
    }
  }

  function updatePhaseTransition() {
    const phase2 = enemyData.phase2 || {};
    const transition = state.phaseTransition;
    const refillStart = transition.fadeOutDuration + transition.holdDuration;
    const fadeInEnd = refillStart + transition.fadeInDuration;

    transition.timer++;

    if (transition.timer < refillStart) {
      return;
    }

    if (!transition.refillStarted) {
      transition.refillStarted = true;
      state.bossPhase = 2;
      state.enemyMaxHP = Number.isFinite(phase2.maxHP) ? phase2.maxHP : enemyData.maxHP;
      state.enemyName = phase2.name || enemyData.name;
      state.actConditionIndex = 0;
      state.dialogIndex = 0;
      state.enemyDialogIndex = 0;
      state.enemyDialogMessage = "";
      state.message = phase2.refillMessage || "* The HP bar starts crawling back.";
      state.textTimer = 0;
    }

    transition.refillMessageTimer++;

    if (state.enemyHP < state.hpFillTarget) {
      state.enemyHP = Math.min(state.hpFillTarget, state.enemyHP + state.hpFillSpeed);
      return;
    }

    if (transition.timer < fadeInEnd) {
      return;
    }

    if (transition.refillMessageTimer < transition.refillMessageMinDuration) {
      return;
    }

    finishPhase2Transition();
  }

  function moveSoul() {
    const soul = state.soul;
    const box = state.box;
    let dx = 0;
    let dy = 0;

    if (input.isHeld("ArrowLeft") || input.isHeld("a") || input.isHeld("A")) dx--;
    if (input.isHeld("ArrowRight") || input.isHeld("d") || input.isHeld("D")) dx++;
    if (input.isHeld("ArrowUp") || input.isHeld("w") || input.isHeld("W")) dy--;
    if (input.isHeld("ArrowDown") || input.isHeld("s") || input.isHeld("S")) dy++;

    if (state.attackType === ATTACK_TYPE.PURPLE) {
      const laneYs = getPurpleLineYs();
      const upPressed = input.up;
      const downPressed = input.down;

      if (upPressed && !downPressed) {
        soul.lane = clamp(soul.lane - 1, 0, laneYs.length - 1);
      } else if (downPressed && !upPressed) {
        soul.lane = clamp(soul.lane + 1, 0, laneYs.length - 1);
      }

      soul.x = clamp(soul.x + dx * soul.speed, box.x + soul.r, box.x + box.w - soul.r);
      soul.y = laneYs[soul.lane] || box.y + box.h / 2;
      return;
    }

    if (state.attackType === ATTACK_TYPE.BLUE) {
      const floorY = box.y + box.h - soul.r;
      const upHeld = input.isHeld("ArrowUp") || input.isHeld("w") || input.isHeld("W");
      const support = bluePlatformBelowSoul(soul, 3);
      const grounded = soul.y >= floorY - 0.01 || support !== null;

      if (grounded) {
        soul.y = support ? support.y - soul.r : floorY;
        soul.vy = 0;

        if (input.up) {
          soul.vy = -7.7;
        }
      }

      const carriedX = support && soul.vy === 0 ? support.vx : 0;
      soul.x = clamp(soul.x + dx * soul.speed + carriedX, box.x + soul.r, box.x + box.w - soul.r);

      if (!grounded && !upHeld && soul.vy < -2.8) {
        soul.vy = -2.8;
      }

      soul.vy += upHeld && soul.vy < 0 ? 0.24 : 0.55;
      const nextY = clamp(soul.y + soul.vy, box.y + soul.r, floorY);
      const landingPlatform = soul.vy >= 0 ? blueLandingPlatform(soul, nextY) : null;

      soul.y = landingPlatform ? landingPlatform.y - soul.r : nextY;

      if (landingPlatform) {
        soul.vy = 0;
      }

      if (soul.y >= floorY) {
        soul.y = floorY;
        soul.vy = 0;
      }

      return;
    }

    if (dx && dy) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    soul.x = clamp(soul.x + dx * soul.speed, box.x + soul.r, box.x + box.w - soul.r);
    soul.y = clamp(soul.y + dy * soul.speed, box.y + soul.r, box.y + box.h - soul.r);
  }

  function bluePlatformBelowSoul(soul, tolerance) {
    return state.bullets.find((b) =>
      b.solidPlatform &&
      soul.x + soul.r > b.x - b.width / 2 &&
      soul.x - soul.r < b.x + b.width / 2 &&
      Math.abs(soul.y + soul.r - b.y) <= tolerance
    ) || null;
  }

  function blueLandingPlatform(soul, nextY) {
    const currentFeet = soul.y + soul.r;
    const nextFeet = nextY + soul.r;

    return state.bullets
      .filter((b) =>
        b.solidPlatform &&
        soul.x + soul.r > b.x - b.width / 2 &&
        soul.x - soul.r < b.x + b.width / 2 &&
        currentFeet <= b.y &&
        nextFeet >= b.y
      )
      .sort((a, b) => a.y - b.y)[0] || null;
  }

  function getPurpleLineYs() {
    const box = state.box;

    return [
      box.y + box.h * 0.18,
      box.y + box.h * 0.5,
      box.y + box.h * 0.82
    ];
  }

  function updateBoxMorph() {
    const morph = state.boxMorph;
    morph.timer++;

    const progress = clamp(morph.timer / morph.duration, 0, 1);
    const eased = easeInOutCubic(progress);

    state.box = {
      x: lerp(morph.from.x, morph.to.x, eased),
      y: lerp(morph.from.y, morph.to.y, eased),
      w: lerp(morph.from.w, morph.to.w, eased),
      h: lerp(morph.from.h, morph.to.h, eased),
    };

    if (progress >= 1) {
      finishBoxMorph();
    }
  }

  function updateDamageResult() {
    state.damageResult.timer++;

    if (state.attack.flash > 0) {
      state.attack.flash--;
    }

    if (state.damageResult.timer >= state.damageResult.duration) {
      finishDamageResult();
    }
  }

  function collides(soul, b) {
    if (Number.isFinite(b.width) && Number.isFinite(b.height)) {
      const nearestX = clamp(soul.x, b.x - b.width / 2, b.x + b.width / 2);
      const nearestY = clamp(soul.y, b.y, b.y + b.height);
      const dx = soul.x - nearestX;
      const dy = soul.y - nearestY;
      return dx * dx + dy * dy < soul.r * soul.r * 0.72;
    }

    const rr = soul.r + b.r;
    const dx = soul.x - b.x;
    const dy = soul.y - b.y;
    return dx * dx + dy * dy < rr * rr * 0.72;
  }

  function update() {
    if (state.phase === PHASE.BOX_MORPH) {
      updateBoxMorph();
      input.consume();
      return;
    }

    state.frame++;

    if (state.textTimer < 9999) state.textTimer++;
    if (state.shake > 0) state.shake--;

    const confirm = input.confirm;
    const cancel = input.cancel;
    const left = input.left;
    const right = input.right;
    const up = input.up;
    const down = input.down;
    const mouseClick = input.mouseClick;

    if (state.phase === PHASE.INTRO && confirm) {
      playMusic(sounds.battleTheme);
      beginMenu();
    } else if (state.phase === PHASE.MENU) {
      if (left) {
        state.selected = (state.selected + menuItems.length - 1) % menuItems.length;
        playSound(sounds.menuMove);
      }

      if (right) {
        state.selected = (state.selected + 1) % menuItems.length;
        playSound(sounds.menuMove);
      }

      if (mouseClick) {
        const idx = menuHit(mouseClick.x, mouseClick.y);

        if (idx !== -1) {
          if (idx !== state.selected) {
            playSound(sounds.menuMove);
          }

          state.selected = idx;
        }
      }

      if (confirm) {
        playSound(sounds.menuSelect);
        useMenuSelection();
      }
    } else if (state.phase === PHASE.FIGHT_TARGET) {
      if (cancel) {
        beginMenu();
      } else {
        if (mouseClick) {
          const targetIdx = fightTargetHit(mouseClick.x, mouseClick.y);

          if (targetIdx !== -1) {
            state.selectedFightTarget = targetIdx;
            playSound(sounds.menuSelect);
            beginAttack();
          }
        } else if (confirm) {
          playSound(sounds.menuSelect);
          beginAttack();
        }
      }
    } else if (state.phase === PHASE.ACT) {
      if (cancel) {
        beginMenu();
      } else {
        moveActSelection({ left, right, up, down });

        if (mouseClick) {
          const actIdx = actHit(mouseClick.x, mouseClick.y);

          if (actIdx !== -1) {
            if (actIdx !== state.selectedAct) {
              playSound(sounds.menuMove);
            }

            state.selectedAct = actIdx;
            playSound(sounds.menuSelect);
            useSelectedAct();
          }
        } else if (confirm) {
          playSound(sounds.menuSelect);
          useSelectedAct();
        }
      }
    } else if (state.phase === PHASE.MERCY_TARGET) {
      if (cancel) {
        beginMenu();
      } else if (mouseClick) {
        const targetIdx = fightTargetHit(mouseClick.x, mouseClick.y);

        if (targetIdx !== -1) {
          state.selectedMercyTarget = targetIdx;
          playSound(sounds.menuSelect);
          resolveMercy();
        }
      } else if (confirm) {
        playSound(sounds.menuSelect);
        resolveMercy();
      }
    } else if (state.phase === PHASE.ITEM) {
      if (cancel) {
        beginMenu();
      } else {
        moveItemSelection({ left, right, up, down });

        if (mouseClick) {
          const itemIdx = itemHit(mouseClick.x, mouseClick.y);

          if (itemIdx !== -1) {
            if (itemIdx !== state.selectedItem) {
              playSound(sounds.menuMove);
            }

            state.selectedItem = itemIdx;
            useSelectedItem();
          }
        } else if (confirm && state.inventory.length > 0) {
          useSelectedItem();
        }
      }
    } else if (state.phase === PHASE.ATTACK) {
      if (state.attack.active) {
        const meter = getAttackMeterBounds();

        state.attack.markerX += state.attack.speed * state.attack.direction;

        if (state.attack.markerX < meter.trackStart || state.attack.markerX > meter.trackEnd) {
          state.attack.markerX = clamp(state.attack.markerX, meter.trackStart, meter.trackEnd);
          state.attack.direction *= -1;
        }

        if (confirm) resolveAttack();
      }

      if (state.attack.flash > 0) state.attack.flash--;
    } else if (state.phase === PHASE.DAMAGE_RESULT) {
      updateDamageResult();
    } else if (state.phase === PHASE.DEFEAT_DISSOLVE) {
      updateDefeatDissolve();
    } else if (state.phase === PHASE.MERCY_MESSAGE) {
      updateMercyMessage();
    } else if (state.phase === PHASE.MERCY_FADE) {
      updateMercyFade();
    } else if (state.phase === PHASE.ULTIMATE_TRANSITION) {
      updateUltimateTransition();
    } else if (state.phase === PHASE.TURN_EVENT) {
      updateTurnEvent();
    } else if (state.phase === PHASE.ENEMY_DIALOG) {
      updateEnemyDialog();
    } else if (state.phase === PHASE.ENEMY) {
      updateEnemyAttack();
    } else if (state.phase === PHASE.PHASE_TRANSITION) {
      updatePhaseTransition();
    } else if ((state.phase === PHASE.LOSE || state.phase === PHASE.WIN || state.phase === PHASE.SPARED) && confirm) {
      resetGame();
    }

    input.consume();
  }

  function menuHit(x, y) {
    const y0 = 578;

    for (let i = 0; i < menuItems.length; i++) {
      const bx = 65 + i * 205;
      if (x >= bx && x <= bx + 155 && y >= y0 && y <= y0 + 48) return i;
    }

    return -1;
  }

  function getSubmenuGridLayout(menu) {
    const outerInset = 28;
    const columnGap = 40;
    const cellWidth = (menu.w - outerInset * 2 - columnGap) / 2;

    return {
      cellWidth,
      columnGap,
      rowHeight: 38,
      startX: menu.x + outerInset,
      startY: menu.y + 28,
      textInset: 34,
      valueInset: 10,
      cursorInset: 13
    };
  }

  function itemHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const layout = getSubmenuGridLayout(menu);

    if (y < layout.startY - 22 || y > layout.startY - 22 + layout.rowHeight * 2) return -1;

    const col = x >= layout.startX && x <= layout.startX + layout.cellWidth
      ? 0
      : x >= layout.startX + layout.cellWidth + layout.columnGap &&
        x <= layout.startX + layout.cellWidth * 2 + layout.columnGap
        ? 1
        : -1;
    if (col === -1) return -1;

    const row = Math.floor((y - (layout.startY - 22)) / layout.rowHeight);
    const index = row * 2 + col;
    return index >= 0 && index < state.inventory.length ? index : -1;
  }

  function actHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const layout = getSubmenuGridLayout(menu);

    if (y < layout.startY - 22 || y > layout.startY - 22 + layout.rowHeight * 2) return -1;

    const col = x >= layout.startX && x <= layout.startX + layout.cellWidth
      ? 0
      : x >= layout.startX + layout.cellWidth + layout.columnGap &&
        x <= layout.startX + layout.cellWidth * 2 + layout.columnGap
        ? 1
        : -1;
    if (col === -1) return -1;

    const row = Math.floor((y - (layout.startY - 22)) / layout.rowHeight);
    const index = row * 2 + col;
    return index >= 0 && index < currentActs().length ? index : -1;
  }

  function moveActSelection({ left, right, up, down }) {
    const actCount = currentActs().length;

    if (actCount === 0) return;

    const current = state.selectedAct;
    let next = current;

    if (left && current % 2 === 1) next = current - 1;
    if (right && current % 2 === 0 && current + 1 < actCount) next = current + 1;
    if (up && current - 2 >= 0) next = current - 2;
    if (down && current + 2 < actCount) next = current + 2;

    if (next !== current) {
      state.selectedAct = next;
      playSound(sounds.menuMove);
    }
  }

  function moveItemSelection({ left, right, up, down }) {
    if (state.inventory.length === 0) return;

    const current = state.selectedItem;
    let next = current;

    if (left && current % 2 === 1) next = current - 1;
    if (right && current % 2 === 0 && current + 1 < state.inventory.length) next = current + 1;
    if (up && current - 2 >= 0) next = current - 2;
    if (down && current + 2 < state.inventory.length) next = current + 2;

    if (next !== current) {
      state.selectedItem = next;
      playSound(sounds.menuMove);
    }
  }

  function fightTargetHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const rowY = menu.y + 30;

    if (x < menu.x + 24 || x > menu.x + menu.w - 24) return -1;
    if (y < rowY - 24 || y > rowY + 8) return -1;

    return 0;
  }

  function getAttackMeterBounds() {
    const box = state.box;
    const padX = 30;
    const trackStart = box.x + padX;
    const trackEnd = box.x + box.w - padX;

    return {
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      trackStart,
      trackEnd,
      center: box.x + box.w / 2,
      maxDist: (trackEnd - trackStart) / 2,
    };
  }

  function resetGame() {
    stopCurrentMusic();

    state.phase = PHASE.INTRO;
    state.bossPhase = 1;
    state.phase2Started = false;
    state.selected = 0;
    state.selectedFightTarget = 0;
    state.selectedAct = 0;
    state.selectedItem = 0;
    state.selectedMercyTarget = 0;
    state.actConditionIndex = 0;
    state.playerHP = state.maxHP;
    state.enemyMaxHP = enemyData.maxHP;
    state.enemyHP = enemyData.maxHP;
    state.enemyName = enemyData.name;
    state.dialogIndex = 0;
    state.enemyDialogIndex = 0;
    state.enemyDialogTimer = 0;
    state.enemyDialogDuration = 0;
    state.enemyDialogMessage = "";
    state.currentTurn = null;
    state.consumedTurns.clear();
    state.turnEvent.steps = [];
    state.turnEvent.index = -1;
    state.turnEvent.timer = 0;
    state.turnEvent.step = null;
    state.pattern = -1;
    state.box = { ...BOX_RECT.TEXT };
    state.boxMorph.timer = 0;
    state.boxMorph.from = { ...BOX_RECT.TEXT };
    state.boxMorph.to = { ...BOX_RECT.TEXT };
    state.boxMorph.nextPhase = PHASE.MENU;
    state.boxMorph.onComplete = null;
    state.attackType = ATTACK_TYPE.NORMAL;
    state.soul.vy = 0;
    state.inventory = createInventory(enemyData.items);
    state.bullets = [];
    state.message = enemyData.introMessage;
    state.textTimer = 0;
    state.damageResult.timer = 0;
    state.damageResult.fromHP = enemyData.maxHP;
    state.damageResult.toHP = enemyData.maxHP;
    state.damageResult.damage = 0;
    state.hpFillTarget = 0;
    state.phaseTransition.timer = 0;
    state.phaseTransition.refillMessageTimer = 0;
    state.phaseTransition.refillStarted = false;
    state.ultimate.transformed = false;
    state.ultimate.timer = 0;
    state.mercy.timer = 0;
    state.mercy.success = false;
    state.defeatDissolve.timer = 0;
    state.defeatDissolve.releasedRows = 0;
    state.defeatDissolve.particles = [];
    state.defeatDissolve.source = null;
  }

  function draw() {
    const ox = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const oy = state.shake ? (Math.random() - 0.5) * state.shake : 0;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.clearRect(-20, -20, W + 40, H + 40);
    drawBackground();
    drawEnemy();
    drawUI();
    if (state.phase === PHASE.ENEMY_DIALOG || (state.phase === PHASE.TURN_EVENT && state.turnEvent.step && state.turnEvent.step.type === "enemyDialog")) drawEnemySpeechBubble();

    if (state.phase === PHASE.DAMAGE_RESULT) drawDamageResult();
    if (state.phase === PHASE.ENEMY) drawDefenseBox();
    if (state.phase === PHASE.TURN_EVENT && state.turnEvent.step && state.turnEvent.step.type === "flash") drawTurnEventFlash();
    if (state.phase === PHASE.INTRO || state.phase === PHASE.WIN || state.phase === PHASE.SPARED || state.phase === PHASE.LOSE) drawStartOverlay();

    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = "#fff";

    for (let x = -80; x < W + 80; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x + (state.frame % 40), 0);
      ctx.lineTo(x - 220 + (state.frame % 40), H);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;

    const bossData = currentBossData();

    if (state.ultimate.transformed && typeof bossData.backgroundModifier === "function") {
      bossData.backgroundModifier({
        ctx,
        state,
        width: W,
        height: H
      });
    }
  }

  function drawEnemy() {
    if (state.phase === PHASE.WIN) return;

    const cx = W / 2;
    const spriteSize = 330;
    const spriteTop = 5 + Math.sin(state.frame / 24) * 4;
    const transitionVisual = getPhaseTransitionVisual();
    const enemySprite = sprites[transitionVisual.spriteKey] || sprites.enemy;

    if (state.attack.flash > 0) {
      ctx.save();
      ctx.globalAlpha = state.attack.flash / 22;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    if (state.phase === PHASE.DEFEAT_DISSOLVE) {
      drawDefeatDissolve();
      return;
    }

    if (transitionVisual.alpha <= 0) return;

    ctx.save();
    ctx.globalAlpha = transitionVisual.alpha;
    drawEnemyBody(ctx, enemySprite, cx - spriteSize / 2, spriteTop, spriteSize);

    ctx.restore();
  }

  function drawEnemyBody(renderCtx, enemySprite, x, y, size) {
    if (enemySprite.ready) {
      renderCtx.drawImage(enemySprite, x, y, size, size);
      return;
    }

    renderCtx.save();
    renderCtx.translate(x + size / 2, y + size * 0.6);
    renderCtx.scale(size / 200, size / 200);
    renderCtx.fillStyle = "#111";
    renderCtx.strokeStyle = "#fff";
    renderCtx.lineWidth = 4;

    renderCtx.beginPath();
    renderCtx.ellipse(0, 15, 72, 48, 0, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();

    renderCtx.beginPath();
    renderCtx.ellipse(-35, -18, 28, 42, -0.25, 0, Math.PI * 2);
    renderCtx.ellipse(35, -18, 28, 42, 0.25, 0, Math.PI * 2);
    renderCtx.fill();
    renderCtx.stroke();

    renderCtx.fillStyle = "#fff";
    renderCtx.fillRect(-30, 4, 14, 6);
    renderCtx.fillRect(16, 4, 14, 6);
    renderCtx.fillRect(-20, 35, 40, 5);
    renderCtx.restore();
  }

  function captureEnemySprite(spriteKey, size) {
    const source = document.createElement("canvas");
    const sourceCtx = source.getContext("2d");
    const enemySprite = sprites[spriteKey] || sprites.enemy;

    source.width = size;
    source.height = size;
    drawEnemyBody(sourceCtx, enemySprite, 0, 0, size);
    return source;
  }

  function drawDefeatDissolve() {
    const dissolve = state.defeatDissolve;
    const x = W / 2 - dissolve.spriteSize / 2;
    const y = dissolve.spriteTop;
    const progress = clamp(dissolve.timer / dissolve.dissolveDuration, 0, 1);
    const removedHeight = Math.floor(easeInOutCubic(progress) * dissolve.spriteSize);
    const remainingHeight = dissolve.spriteSize - removedHeight;

    if (dissolve.source && remainingHeight > 0) {
      ctx.drawImage(
        dissolve.source,
        0,
        removedHeight,
        dissolve.spriteSize,
        remainingHeight,
        x,
        y + removedHeight,
        dissolve.spriteSize,
        remainingHeight
      );
    }

    for (const particle of dissolve.particles) {
      ctx.save();
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(x + particle.x, y + particle.y, particle.size, particle.size);
      ctx.restore();
    }
  }

  function activeEnemySpriteKey() {
    if (state.ultimate.transformed) return "ultimateEnemy";
    return state.bossPhase === 2 ? "phase2Enemy" : "enemy";
  }

  function getPhaseTransitionVisual() {
    if (state.phase === PHASE.MERCY_FADE) {
      return {
        alpha: clamp(1 - state.mercy.timer / state.mercy.fadeDuration, 0, 1),
        spriteKey: activeEnemySpriteKey()
      };
    }

    if (state.phase === PHASE.SPARED) {
      return {
        alpha: 0,
        spriteKey: activeEnemySpriteKey()
      };
    }

    if (state.phase === PHASE.ULTIMATE_TRANSITION) {
      const transition = state.ultimate;
      const swapTime = transition.fadeOutDuration + transition.holdDuration;

      if (transition.timer < transition.fadeOutDuration) {
        return {
          alpha: 1 - transition.timer / transition.fadeOutDuration,
          spriteKey: state.bossPhase === 2 ? "phase2Enemy" : "enemy"
        };
      }

      if (transition.timer < swapTime) {
        return {
          alpha: 0,
          spriteKey: "ultimateEnemy"
        };
      }

      return {
        alpha: clamp((transition.timer - swapTime) / transition.fadeInDuration, 0, 1),
        spriteKey: "ultimateEnemy"
      };
    }

    if (state.phase !== PHASE.PHASE_TRANSITION) {
      return {
        alpha: 1,
        spriteKey: activeEnemySpriteKey()
      };
    }

    const transition = state.phaseTransition;
    const t = transition.timer;
    const refillStart = transition.fadeOutDuration + transition.holdDuration;

    if (t < transition.fadeOutDuration) {
      return {
        alpha: 1 - t / transition.fadeOutDuration,
        spriteKey: activeEnemySpriteKey()
      };
    }

    if (t < refillStart) {
      return {
        alpha: 0,
        spriteKey: activeEnemySpriteKey()
      };
    }

    return {
      alpha: clamp((t - refillStart) / transition.fadeInDuration, 0, 1),
      spriteKey: activeEnemySpriteKey()
    };
  }

  function drawHpBar(x, y, w, h, hp, maxHP) {
    const fillWidth = Math.max(0, ((w - 6) * hp) / maxHP);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 3, y + 3, fillWidth, h - 6);
  }

  function currentDamageDisplayHP() {
    const result = state.damageResult;
    const dropDuration = Math.max(1, result.duration - result.dropStart);
    const progress = clamp((result.timer - result.dropStart) / dropDuration, 0, 1);
    const eased = easeInOutCubic(progress);

    return lerp(result.fromHP, result.toHP, eased);
  }

  function drawDamageResult() {
    const barX = 330;
    const barY = 228;
    const shake = Math.max(0, 7 - state.damageResult.timer / 12);
    const textX = W / 2 + (Math.random() - 0.5) * shake;
    const textY = barY - 22 + (Math.random() - 0.5) * shake;

    ctx.fillStyle = "#ff2a2a";
    ctx.font = "44px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(`${state.damageResult.damage}`, textX, textY);

    drawHpBar(barX, barY, 240, 18, currentDamageDisplayHP(), state.enemyMaxHP);
  }

  function drawUI() {
    if (state.phase === PHASE.WIN || state.phase === PHASE.MERCY_FADE || state.phase === PHASE.SPARED || state.phase === PHASE.ULTIMATE_TRANSITION || state.phase === PHASE.DEFEAT_DISSOLVE) return;

    drawStats();

    if (state.phase === PHASE.FIGHT_TARGET) {
      drawFightTargetMenu();
    } else if (state.phase === PHASE.ACT) {
      drawActMenu();
    } else if (state.phase === PHASE.ITEM) {
      drawItemMenu();
    } else if (state.phase === PHASE.MERCY_TARGET) {
      drawMercyTargetMenu();
    } else if (state.phase === PHASE.ATTACK || state.phase === PHASE.DAMAGE_RESULT || (state.phase === PHASE.ENEMY_DIALOG && state.attack.result)) {
      drawAttackMeter();
    } else if (state.phase === PHASE.BOX_MORPH) {
      drawSharedBox(state.box);
    } else if (state.phase !== PHASE.ENEMY) {
      drawDialogueBox();
    }

    if (state.phase === PHASE.MENU) {
      drawMenu();
    }
  }

  function drawDialogueBox() {
    const { x, y, w } = state.box;

    drawSharedBox(state.box);

    ctx.fillStyle = "#fff";
    ctx.font = "24px Courier New";
    ctx.textAlign = "left";

    const message = typeof state.message === "string" ? state.message : "* ...";
    const visible = message.slice(0, Math.min(message.length, Math.floor(state.textTimer * 1.25)));

    wrapText(visible, x + 28, y + 38, w - 56, 30);
  }

  function drawEnemySpeechBubble() {
    const x = 530;
    const y = 55;
    const w = 330;
    const h = 129;
    const r = 16;
    const tailY = y + 62;
    const message = typeof state.enemyDialogMessage === "string" ? state.enemyDialogMessage : "";
    const timer = state.phase === PHASE.TURN_EVENT ? state.turnEvent.timer : state.enemyDialogTimer;
    const visible = message.slice(0, Math.min(message.length, Math.floor(timer * 1.25)));

    ctx.save();
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;

    drawRoundedRect(x, y, w, h, r);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, tailY - 12);
    ctx.lineTo(x - 24, tailY);
    ctx.lineTo(x, tailY + 12);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "18px Courier New";
    ctx.textAlign = "left";
    wrapText(visible, x + 22, y + 34, w - 44, 25);
    ctx.restore();
  }

  function drawTurnEventFlash() {
    const step = state.turnEvent.step;
    const duration = Number.isFinite(step.duration) ? step.duration : 42;
    const progress = clamp(state.turnEvent.timer / duration, 0, 1);

    ctx.save();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.92;
    ctx.fillStyle = step.color;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawSharedBox(box) {
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.fillStyle = "#000";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
  }

  function drawRoundedRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function drawStats() {
    const y = 565;
    const barY = y - 17;

    ctx.fillStyle = "#fff";
    ctx.font = "22px Courier New";
    ctx.textAlign = "left";

    ctx.fillText("HERO", 65, y);
    ctx.fillText("LV 1", 155, y);
    ctx.fillText("HP", 260, y);

    ctx.strokeStyle = "#fff";
    ctx.strokeRect(305, barY, 170, 20);

    ctx.fillStyle = "#fff";
    ctx.fillRect(309, barY + 4, Math.max(0, 162 * state.playerHP / state.maxHP), 12);

    ctx.fillText(`${state.playerHP} / ${state.maxHP}`, 498, y);
  }

  function drawMenu() {
    const y = 578;

    for (let i = 0; i < menuItems.length; i++) {
      const x = 65 + i * 205;

      ctx.lineWidth = 3;
      ctx.strokeStyle = i === state.selected ? "#ffcc33" : "#fff";
      ctx.fillStyle = "#000";
      ctx.fillRect(x, y, 155, 48);
      ctx.strokeRect(x, y, 155, 48);

      ctx.fillStyle = i === state.selected ? "#ffcc33" : "#fff";
      ctx.font = "24px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(menuItems[i], x + 77, y + 31);

      if (i === state.selected) {
        drawRedHeart(x + 22, y + 24);
      }
    }
  }

  function drawItemMenu() {
    const menu = state.box;
    const layout = getSubmenuGridLayout(menu);

    drawSharedBox(menu);

    if (state.inventory.length === 0) {
      ctx.fillStyle = "#fff";
      ctx.font = "22px Courier New";
      ctx.textAlign = "left";
      ctx.fillText("No items left.", menu.x + 28, menu.y + 52);
      return;
    }

    for (let i = 0; i < state.inventory.length; i++) {
      const item = state.inventory[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cellX = layout.startX + col * (layout.cellWidth + layout.columnGap);
      const textX = cellX + layout.textInset;
      const rowY = menu.y + 30 + row * layout.rowHeight;

      ctx.fillStyle = "#fff";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(item.name, textX, rowY);

      ctx.textAlign = "right";
      ctx.fillText(`+${item.heal} HP`, cellX + layout.cellWidth - layout.valueInset, rowY);

      if (i === state.selectedItem) {
        drawRedHeart(cellX + layout.cursorInset, rowY - 7);
      }
    }

  }

  function drawActMenu() {
    const menu = state.box;
    const acts = currentActs();
    const layout = getSubmenuGridLayout(menu);

    drawSharedBox(menu);

    for (let i = 0; i < acts.length; i++) {
      const act = acts[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cellX = layout.startX + col * (layout.cellWidth + layout.columnGap);
      const rowY = menu.y + 30 + row * layout.rowHeight;

      ctx.fillStyle = "#fff";
      ctx.font = "20px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(act.name, cellX + layout.textInset, rowY);

      if (i === state.selectedAct) {
        drawRedHeart(cellX + layout.cursorInset, rowY - 7);
      }
    }
  }

  function drawFightTargetMenu() {
    const menu = state.box;
    const hpX = menu.x + menu.w - 245;
    const hpY = menu.y + 22;

    drawSharedBox(menu);

    ctx.fillStyle = "#fff";
    ctx.font = "22px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(state.enemyName, menu.x + 58, menu.y + 38);

    if (state.selectedFightTarget === 0) {
      drawRedHeart(menu.x + 34, menu.y + 31);
    }

    drawHpBar(hpX, hpY, 210, 18, state.enemyHP, state.enemyMaxHP);
  }

  function drawMercyTargetMenu() {
    const menu = state.box;

    drawSharedBox(menu);

    ctx.fillStyle = canMercyCurrentEnemy() ? "#ffcc33" : "#fff";
    ctx.font = "22px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(state.enemyName, menu.x + 58, menu.y + 38);

    if (state.selectedMercyTarget === 0) {
      drawRedHeart(menu.x + 34, menu.y + 31);
    }
  }

  function drawAttackMeter() {
    const { y, h, trackStart, trackEnd, center } = getAttackMeterBounds();
    const trackH = 26;
    const trackY = y + h / 2 - trackH / 2;
    const trackW = trackEnd - trackStart;

    drawSharedBox(state.box);

    ctx.fillStyle = "#333";
    ctx.fillRect(trackStart, trackY, trackW, trackH);

    const zones = [
      { width: trackW * 0.47, alpha: 0.18 },
      { width: trackW * 0.25, alpha: 0.35 },
      { width: trackW * 0.07, alpha: 0.85 },
    ];

    for (const z of zones) {
      ctx.globalAlpha = z.alpha;
      ctx.fillStyle = "#fff";
      ctx.fillRect(center - z.width / 2, trackY - 6, z.width, trackH + 12);
    }

    ctx.globalAlpha = 1;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center, trackY - 14);
    ctx.lineTo(center, trackY + trackH + 14);
    ctx.stroke();

    ctx.fillStyle = "#ff3333";
    ctx.fillRect(state.attack.markerX - 5, trackY - 14, 10, trackH + 28);
  }

  function drawDefenseBox() {
    const box = state.box;

    drawSharedBox(box);

    if (state.attackType === ATTACK_TYPE.PURPLE) {
      drawPurpleLines();
    }

    for (const b of state.bullets) {
      drawBullet(b);
    }

    drawSoul();

    if (state.enemyTimer < 0) {
      ctx.fillStyle = "#fff";
      ctx.font = "26px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("GET READY", box.x + box.w / 2, box.y + box.h / 2 - 28);
    }
  }

  function drawPurpleLines() {
    const box = state.box;

    ctx.save();
    ctx.strokeStyle = "#b8b8b8";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.48;

    for (const y of getPurpleLineYs()) {
      ctx.beginPath();
      ctx.moveTo(box.x + 12, y);
      ctx.lineTo(box.x + box.w - 12, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawSoul() {
    const s = state.soul;

    if (state.soul.invuln > 0 && Math.floor(state.frame / 4) % 2 === 0) {
      return;
    }

    if (state.attackType === ATTACK_TYPE.PURPLE) {
      drawHeartShape(s.x, s.y, "#9d5cff");
      return;
    }

    if (state.attackType === ATTACK_TYPE.BLUE) {
      drawHeartShape(s.x, s.y, "#39a7ff");
      return;
    }

    drawRedHeart(s.x, s.y);
  }

  function drawRedHeart(x, y) {
    if (sprites.heart.ready) {
      ctx.drawImage(sprites.heart, x - 11, y - 11, 22, 22);
      return;
    }

    drawHeartShape(x, y, "#ff1e35");
  }

  function drawHeartShape(x, y, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = color;

    ctx.beginPath();
    ctx.moveTo(0, 9);
    ctx.bezierCurveTo(-16, -4, -9, -14, 0, -6);
    ctx.bezierCurveTo(9, -14, 16, -4, 0, 9);
    ctx.fill();

    ctx.restore();
  }

  function drawBullet(b) {
    if (sprites.projectile.ready && b.type === "dot") {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);
      ctx.drawImage(sprites.projectile, -b.r, -b.r, b.r * 2, b.r * 2);
      ctx.restore();
      return;
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(b.angle);

    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#fff";
    ctx.lineWidth = 2;

    if (b.type === "blueLine" || b.type === "orangeLine") {
      ctx.globalAlpha = 0.46;
      ctx.fillStyle = b.type === "blueLine" ? "#20aaff" : "#ff982b";
      ctx.strokeStyle = b.type === "blueLine" ? "#66cfff" : "#ffc266";
      ctx.lineWidth = 2;
      ctx.fillRect(-b.width / 2, 0, b.width, b.height);
      ctx.strokeRect(-b.width / 2, 0, b.width, b.height);
    } else if (b.type === "spikeFloor") {
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#fff";
      const spikeWidth = 18;

      for (let x = -b.width / 2; x < b.width / 2; x += spikeWidth) {
        ctx.beginPath();
        ctx.moveTo(x, b.height);
        ctx.lineTo(x + spikeWidth / 2, 0);
        ctx.lineTo(Math.min(x + spikeWidth, b.width / 2), b.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (b.type === "platform") {
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.fillRect(-b.width / 2, 0, b.width, b.height);
      ctx.strokeRect(-b.width / 2, 0, b.width, b.height);
    } else if (b.type === "meteorSource") {
      const glow = 2 + Math.sin(b.age * 0.15) * 2;
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, b.r + glow, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, b.r * 0.48, 0, Math.PI * 2);
      ctx.stroke();
    } else if (b.type === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, -b.r);
      ctx.lineTo(b.r, 0);
      ctx.lineTo(0, b.r);
      ctx.lineTo(-b.r, 0);
      ctx.closePath();
      ctx.stroke();
    } else if (b.type === "bone") {
      ctx.fillRect(-b.r * 1.8, -3, b.r * 3.6, 6);

      ctx.beginPath();
      ctx.arc(-b.r * 1.8, -4, 5, 0, Math.PI * 2);
      ctx.arc(-b.r * 1.8, 4, 5, 0, Math.PI * 2);
      ctx.arc(b.r * 1.8, -4, 5, 0, Math.PI * 2);
      ctx.arc(b.r * 1.8, 4, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === "boot") {
      ctx.fillRect(-b.r * 0.45, -b.r, b.r * 0.75, b.r * 1.45);
      ctx.fillRect(-b.r * 0.45, b.r * 0.25, b.r * 1.45, b.r * 0.5);
      ctx.fillRect(b.r * 0.45, b.r * 0.55, b.r * 0.55, b.r * 0.3);
    } else if (b.type === "star") {
      ctx.beginPath();

      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? b.r : b.r * 0.45;
        const angle = -Math.PI / 2 + i * Math.PI / 5;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      ctx.closePath();
      ctx.stroke();
    } else if (b.type === "constellationLine") {
      ctx.save();
      ctx.globalAlpha = 0.48;
      ctx.strokeStyle = "#8abfff";
      ctx.lineWidth = 2;
      ctx.beginPath();

      if (Array.isArray(b.points) && b.points.length > 1) {
        ctx.moveTo(b.points[0].x - b.x, b.points[0].y - b.y);

        for (let i = 1; i < b.points.length; i++) {
          ctx.lineTo(b.points[i].x - b.x, b.points[i].y - b.y);
        }

        if (b.closed) {
          ctx.lineTo(b.points[0].x - b.x, b.points[0].y - b.y);
        }
      }

      ctx.stroke();
      ctx.restore();
    } else if (b.type === "constellationWarning") {
      ctx.globalAlpha = 0.5 + Math.sin(b.age * 0.42) * 0.26;
      ctx.strokeStyle = "#b8d7ff";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.arc(0, 0, b.r + Math.sin(b.age * 0.32) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (b.type === "laneBlastWarning") {
      ctx.globalAlpha = 0.52 + Math.sin(b.age * 0.62) * 0.34;
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, -b.r);
      ctx.lineTo(b.r, 0);
      ctx.lineTo(0, b.r);
      ctx.lineTo(-b.r, 0);
      ctx.closePath();
      ctx.fill();
    } else if (b.type === "laneBlast") {
      if (b.age >= b.delay) {
        const beamAge = b.age - b.delay;
        const fadeIn = Math.min(1, beamAge / 4);
        const fadeOut = Math.max(0, 1 - beamAge / 30);

        ctx.globalAlpha = fadeIn * fadeOut;
        ctx.fillStyle = "#fff";
        ctx.shadowColor = "#fff";
        ctx.shadowBlur = 14;
        ctx.fillRect(-b.width / 2, 0, b.width, b.height);
      }
    } else if (b.type === "fireElemental") {
      const flicker = Math.sin(b.age * 0.44) * 3;

      ctx.fillStyle = "#ff7a16";
      ctx.beginPath();
      ctx.moveTo(0, -b.r - 10 - flicker);
      ctx.quadraticCurveTo(b.r + 7, -b.r * 0.35, b.r, b.r * 0.45);
      ctx.quadraticCurveTo(0, b.r + 8, -b.r, b.r * 0.45);
      ctx.quadraticCurveTo(-b.r - 7, -b.r * 0.35, 0, -b.r - 10 - flicker);
      ctx.fill();

      ctx.fillStyle = "#ffd04a";
      ctx.beginPath();
      ctx.arc(0, 2, b.r * 0.62, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#311300";
      ctx.beginPath();
      ctx.arc(-7, 1, 3, 0, Math.PI * 2);
      ctx.arc(7, 1, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === "fireball") {
      ctx.fillStyle = "#ff5a16";
      ctx.beginPath();
      ctx.moveTo(-b.r * 1.8, 0);
      ctx.quadraticCurveTo(-b.r * 0.75, -b.r * 1.2, b.r * 0.82, -b.r * 0.55);
      ctx.quadraticCurveTo(b.r * 1.35, 0, b.r * 0.82, b.r * 0.55);
      ctx.quadraticCurveTo(-b.r * 0.75, b.r * 1.2, -b.r * 1.8, 0);
      ctx.fill();

      ctx.fillStyle = "#ffd84a";
      ctx.beginPath();
      ctx.arc(b.r * 0.2, 0, b.r * 0.58, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === "horseshoe") {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, b.r, Math.PI * 0.15, Math.PI * 0.85, true);
      ctx.stroke();

      ctx.fillRect(-b.r * 0.9, b.r * 0.45, 5, 7);
      ctx.fillRect(b.r * 0.55, b.r * 0.45, 5, 7);
    } else if (b.type === "note") {
      ctx.beginPath();
      ctx.arc(-b.r * 0.35, b.r * 0.45, b.r * 0.45, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillRect(0, -b.r * 1.1, 3, b.r * 1.5);
      ctx.beginPath();
      ctx.moveTo(0, -b.r * 1.1);
      ctx.lineTo(b.r * 0.8, -b.r * 0.8);
      ctx.lineTo(b.r * 0.8, -b.r * 0.45);
      ctx.lineTo(0, -b.r * 0.75);
      ctx.fill();
    } else if (b.type === "claw") {
      ctx.lineWidth = 3;

      for (let i = -1; i <= 1; i++) {
        ctx.beginPath();
        ctx.moveTo(-b.r * 1.1, i * b.r * 0.45 - b.r * 0.6);
        ctx.quadraticCurveTo(0, i * b.r * 0.35, b.r * 1.25, i * b.r * 0.45 + b.r * 0.35);
        ctx.stroke();
      }
    } else if (b.type === "shadow") {
      ctx.globalAlpha = b.harmless ? 0.42 : 0.78;
      ctx.fillStyle = "#111";
      ctx.strokeStyle = "#777";
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.ellipse(0, 0, b.r * 1.45, b.r * 0.78, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = 1;
    } else if (b.type === "eye") {
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.ellipse(0, 0, b.r * 1.15, b.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(0, 0, b.r * 0.32, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawStartOverlay() {
    let title = "SOUL BATTLE";
    let sub = "Press Enter / Z / Click to begin";

    if (state.phase === PHASE.WIN) {
      title = "OBISCWTPDNDWMFT";
      sub = "Press Enter / Z / Click to restart";
    }

    if (state.phase === PHASE.SPARED) {
      title = "MERCY";
      sub = typeof state.message === "string" ? state.message : "You won without fighting.";
    }

    if (state.phase === PHASE.LOSE) {
      title = "GAME OVER";
      sub = "Press Enter / Z / Click to retry";
    }

    ctx.fillStyle = "rgba(0,0,0,0.68)";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(185, 230, 530, 165);

    ctx.fillStyle = "#fff";
    ctx.font = "46px Courier New";
    ctx.textAlign = "center";
    ctx.fillText(title, W / 2, 298);

    ctx.font = "20px Courier New";
    ctx.fillText(sub, W / 2, 345);
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    let yy = y;

    for (const word of words) {
      const test = line + word + " ";

      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = word + " ";
        yy += lineHeight;
      } else {
        line = test;
      }
    }

    ctx.fillText(line, x, yy);
  }

  let lastFrameTime = 0;
  let accumulatedTime = 0;

  function loop(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;

    const elapsed = Math.min(timestamp - lastFrameTime, MAX_FRAME_MS);
    lastFrameTime = timestamp;
    accumulatedTime += elapsed;

    while (accumulatedTime >= FIXED_STEP_MS) {
      update();
      accumulatedTime -= FIXED_STEP_MS;
    }

    draw();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
