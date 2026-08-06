(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

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
  const { createAssets, playSound, playMusic, stopMusic, getMusicElapsed } = window.SoulBattle.assets;
  const { createInput } = window.SoulBattle.input;
  const COMMAND_OPTION_ORANGE = "#f28c28";
  const COMMAND_OPTION_HIGHLIGHT = "#ffcc33";
  const HUD_MAROON = "#5b2118";
  const PARTY_SESSION_KEY = "soulBattle.selectedParty";
  const STARRY_FORM_FADE_FRAMES = 45;
  let lastPartySelectionNames = [];

  const enemyData = {
    ...DEFAULT_ENEMY_DATA,
    ...(window.ENEMY_DATA || {})
  };

  const { sprites, sounds } = createAssets(enemyData);

  function stopCurrentMusic() {
    stopMusic(sounds.battleTheme);
    stopMusic(sounds.phase2Theme);
    stopMusic(sounds.determination);
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
        damage: null,
        box: null,
        setup: null,
        enemyDialog: null,
        sprite: null,
        assignDefaultSprite: null,
        lockDefaultSprite: false,
        pattern: attackPattern
      };
    }

    if (attackPattern && typeof attackPattern === "object") {
      return {
        type: typeof attackPattern.type === "string" ? attackPattern.type : ATTACK_TYPE.NORMAL,
        duration: Number.isFinite(attackPattern.duration) ? attackPattern.duration : null,
        damage: Number.isFinite(attackPattern.damage) ? Math.max(0, attackPattern.damage) : null,
        box: attackPattern.box && Number.isFinite(attackPattern.box.x) && Number.isFinite(attackPattern.box.y) &&
          Number.isFinite(attackPattern.box.w) && Number.isFinite(attackPattern.box.h)
          ? { ...attackPattern.box }
          : null,
        setup: typeof attackPattern.setup === "function" ? attackPattern.setup : null,
        enemyDialog: typeof attackPattern.enemyDialog === "string" ? attackPattern.enemyDialog : null,
        sprite: typeof attackPattern.sprite === "string" ? attackPattern.sprite : null,
        assignDefaultSprite: typeof attackPattern.assignDefaultSprite === "string"
          ? attackPattern.assignDefaultSprite
          : null,
        lockDefaultSprite: attackPattern.lockDefaultSprite === true,
        rhythmGrid: attackPattern.rhythmGrid && typeof attackPattern.rhythmGrid === "object"
          ? { ...attackPattern.rhythmGrid }
          : null,
        freestyleGrid: attackPattern.freestyleGrid && typeof attackPattern.freestyleGrid === "object"
          ? { ...attackPattern.freestyleGrid }
          : null,
        vampireGrid: attackPattern.vampireGrid && typeof attackPattern.vampireGrid === "object"
          ? { ...attackPattern.vampireGrid }
          : null,
        vampireLordGrid: attackPattern.vampireLordGrid && typeof attackPattern.vampireLordGrid === "object"
          ? { ...attackPattern.vampireLordGrid }
          : null,
        pattern: attackPattern.pattern
      };
    }

    return {
      type: ATTACK_TYPE.NORMAL,
      duration: null,
      damage: null,
      box: null,
      setup: null,
      enemyDialog: null,
      sprite: null,
      assignDefaultSprite: null,
      lockDefaultSprite: false,
      pattern: null
    };
  }

  function normalizeTurnEvent(event) {
    if (!event || !Array.isArray(event.steps)) return null;

    const steps = event.steps.filter((step) => (
      step &&
      (
        step.type === "textbox" ||
        step.type === "enemyDialog" ||
        step.type === "enemyTransform" ||
        step.type === "assignEnemyDefault" ||
        step.type === "flash"
      )
    )).map((step) => ({
      type: step.type,
      text: typeof step.text === "string" ? step.text : "",
      color: typeof step.color === "string" ? step.color : "#fff",
      sprite: typeof step.sprite === "string" ? step.sprite : null,
      assignDefault: step.assignDefault === true,
      lockDefault: step.lockDefault === true,
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
        postAttackEvent: normalizeTurnEvent(turn.postAttackEvent),
        scene: turn.scene && typeof turn.scene === "object" ? turn.scene : null,
        loop: turn.loop !== false
      };
  }

  return {
    attack: normalizeAttackPattern(turn),
    event: null,
    postAttackEvent: null,
    scene: null,
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
        box: null,
        setup: null,
        pattern: null
      };
    }

    return normalizeTurn(turns[state.pattern]).attack;
  }

  function currentAttackDamage() {
    const damage = currentAttackConfig().damage;
    return Number.isFinite(damage) ? damage : 3;
  }

  const input = createInput({ canvas, width: W, height: H });

  function createInventory(items) {
    if (!Array.isArray(items)) return [];

    return items
      .filter((item) => item && typeof item.name === "string")
      .map((item) => {
        const target = item.target === "party" ? "party" : "ally";
        const heal = Number.isFinite(item.heal) ? item.heal : 0;
        const description = typeof item.description === "string"
          ? item.description
          : target === "party"
            ? `Heals party ${heal}HP each`
            : `Heals ${heal}HP`;

        return {
          name: item.name,
          heal,
          target,
          description
        };
      });
  }

  function startingItems() {
    if (window.PARTY_DATA && Array.isArray(window.PARTY_DATA.items)) {
      return window.PARTY_DATA.items;
    }

    return enemyData.items;
  }

  function createPlayerActs(acts) {
    if (!Array.isArray(acts)) return [];

    return acts
      .filter((act) => act && typeof act.name === "string")
      .map((act) => ({
        name: act.name,
        description: typeof act.description === "string" ? act.description : "",
        tpCost: Number.isFinite(act.tpCost) ? Math.max(0, act.tpCost) : 0,
        hpCost: Number.isFinite(act.hpCost) ? Math.max(0, act.hpCost) : 0,
        once: act.once === true,
        target: act.target === "enemy" ? "enemy" : act.target === "none" ? "none" : "ally",
        effect: typeof act.effect === "string" ? act.effect : "none",
        script: typeof act.script === "string" ? act.script : null,
        sprite: typeof act.sprite === "string" ? act.sprite : null,
        persistentId: typeof act.persistentId === "string" ? act.persistentId : null,
        persistentGroup: typeof act.persistentGroup === "string" ? act.persistentGroup : null,
        persistentSprite: typeof act.persistentSprite === "string" ? act.persistentSprite : null,
        heal: Number.isFinite(act.heal) ? act.heal : 0,
        downHeal: Number.isFinite(act.downHeal) ? act.downHeal : null,
        damage: Number.isFinite(act.damage) ? act.damage : 0,
        damageMultiplier: Number.isFinite(act.damageMultiplier) ? act.damageMultiplier : 1,
        defendTPBonus: Number.isFinite(act.defendTPBonus) ? act.defendTPBonus : 0,
        popupText: typeof act.popupText === "string" ? act.popupText : null,
        requiresBeast: act.requiresBeast === true
      }))
      .slice(0, 6);
  }

  const DEFAULT_PLAYER_DATA = [
    { name: "KRIS", maxHP: 90, hp: 90, cardColor: "#19d7ff", secondaryColor: "#7eeaff", sprites: null, spriteScale: 1, defendTP: 16 },
    { name: "SUSIE", maxHP: 110, hp: 110, cardColor: "#ff42d0", secondaryColor: "#ff9be8", sprites: null, spriteScale: 1, defendTP: 16 },
    { name: "RALSEI", maxHP: 70, hp: 70, cardColor: "#24e45f", secondaryColor: "#82f09e", sprites: null, spriteScale: 1, defendTP: 16 }
  ];

  function createParty(players) {
    const source = Array.isArray(players) && players.length > 0 ? players : DEFAULT_PLAYER_DATA;

    return source.slice(0, 3).map((player, index) => {
      const maxHP = Number.isFinite(player.maxHP) ? player.maxHP : DEFAULT_PLAYER_DATA[index]?.maxHP || 90;
      const hp = Number.isFinite(player.hp) ? player.hp : maxHP;
      const hasSpriteRoles = player.sprites && typeof player.sprites === "object";
      const hasLegacySprite = typeof player.sprite === "string";
      const spriteKeys = {};
      const spriteAnimations = {};

      if (hasSpriteRoles) {
        for (const [role, src] of Object.entries(player.sprites)) {
          if (typeof src === "string") {
            spriteKeys[role] = `${player.name}:${role}`;
            const configuredAnimation = player.spriteAnimations?.[role];
            const legacyDefaultAnimation = role === "default" ? player.defaultAnimation : null;
            const animation = configuredAnimation || legacyDefaultAnimation;
            const frameCount = Array.isArray(animation?.frames) ? animation.frames.length : 5;
            spriteAnimations[role] = {
              fps: Number.isFinite(animation?.fps) && animation.fps > 0 ? animation.fps : 2,
              spriteKeys: Array.from({ length: frameCount }, (_, frameIndex) =>
                `${player.name}:${role}Animation:${frameIndex}`)
            };
          }
        }
      } else if (hasLegacySprite) {
        for (const role of ["default", "down", "icon"]) {
          spriteKeys[role] = `${player.name}:${role}`;
        }
      }

      return {
        name: typeof player.name === "string" ? player.name : DEFAULT_PLAYER_DATA[index]?.name || `ALLY ${index + 1}`,
        maxHP,
        hp: clamp(hp, 0, maxHP),
        cardColor: typeof player.cardColor === "string"
          ? player.cardColor
          : DEFAULT_PLAYER_DATA[index]?.cardColor || "#fff",
        secondaryColor: typeof player.secondaryColor === "string"
          ? player.secondaryColor
          : typeof player.cardColor === "string"
            ? player.cardColor
            : DEFAULT_PLAYER_DATA[index]?.secondaryColor || "#fff",
        spriteScale: Number.isFinite(player.spriteScale) && player.spriteScale > 0
          ? player.spriteScale
          : DEFAULT_PLAYER_DATA[index]?.spriteScale || 1,
        defendTP: Number.isFinite(player.defendTP)
          ? Math.max(0, player.defendTP)
          : DEFAULT_PLAYER_DATA[index]?.defendTP || 16,
        damage: Number.isFinite(player.damage) ? Math.max(1, player.damage) : 18,
        damageMultiplier: Number.isFinite(player.damageMultiplier) ? player.damageMultiplier : 1,
        temporaryDamageMultiplier: 1,
        temporaryDamageBuffTurns: 0,
        usedActs: new Set(),
        actionSpriteRole: null,
        spriteAnimations,
        acts: createPlayerActs(player.acts),
        spriteKeys
      };
    });
  }

  function partyHP() {
    return state.party.reduce((total, player) => total + player.hp, 0);
  }

  function partyMaxHP() {
    return state.party.reduce((total, player) => total + player.maxHP, 0);
  }

  function livingPartyMembers() {
    return state.party.filter((player) => player.hp > 0);
  }

  function firstLivingPartyIndex() {
    const index = state.party.findIndex((player) => player.hp > 0);
    return index === -1 ? 0 : index;
  }

  function nextLivingPartyIndex(fromIndex) {
    for (let i = fromIndex + 1; i < state.party.length; i++) {
      if (state.party[i].hp > 0) return i;
    }

    return -1;
  }

  function previousLivingPartyIndex(fromIndex) {
    for (let i = fromIndex - 1; i >= 0; i--) {
      if (state.party[i].hp > 0) return i;
    }

    return -1;
  }

  function resetPartyCommands() {
    state.partyTurnIndex = firstLivingPartyIndex();
    state.partyCommands = state.party.map(() => null);
    state.partyCommandTpGains = state.party.map(() => 0);
    state.partyActions = state.party.map(() => null);
    state.selected = 0;
  }

  function clearPartyCommand(index) {
    const tpGain = state.partyCommandTpGains[index] || 0;
    const action = state.partyActions[index];

    if (tpGain > 0) {
      state.tp = clamp(state.tp - tpGain, 0, 100);
    }

    if (action && action.command === "ACT" && Number.isFinite(action.tpCost)) {
      state.tp = clamp(state.tp + action.tpCost, 0, 100);
    }

    if (action && action.command === "ACT" && Number.isFinite(action.hpCost)) {
      const player = state.party[index];
      if (player) player.hp = clamp(player.hp + action.hpCost, 0, player.maxHP);
    }

    if (action && action.command === "ITEM" && action.itemReserved && action.item) {
      const insertIndex = clamp(action.itemIndex, 0, state.inventory.length);
      state.inventory.splice(insertIndex, 0, action.item);
    }

    state.partyCommands[index] = null;
    state.partyCommandTpGains[index] = 0;
    state.partyActions[index] = null;
  }

  function lockPartyCommand(index, command) {
    const player = state.party[index];

    clearPartyCommand(index);
    state.partyCommands[index] = command;

    if (command === "DEFEND" && player) {
      const gain = Math.min(player.defendTP, 100 - state.tp);
      state.tp += gain;
      state.partyCommandTpGains[index] = gain;
    }
  }

  function lockPartyAction(index, command, action = null) {
    lockPartyCommand(index, command);
    state.partyActions[index] = action ? { command, ...action } : { command };
  }

  function advancePartyTurnOrResolve() {
    const nextIndex = nextLivingPartyIndex(state.partyTurnIndex);

    if (nextIndex !== -1) {
      state.partyTurnIndex = nextIndex;
      state.selected = 0;
      state.textTimer = 0;
      beginMenu(undefined, { resetCommands: false });
      return;
    }

    resolveQueuedPartyActions();
  }

  function resolveQueuedPartyActions() {
    const actions = state.partyActions
      .map((action, actorIndex) => action ? { ...action, actorIndex } : null)
      .filter(Boolean);
    const messages = [];

    for (let i = 0; i < state.party.length; i++) {
      const action = state.partyActions[i];
      state.party[i].actionSpriteRole = action?.command === "ITEM"
        ? "item"
        : action?.command === "FIGHT"
          ? "attack"
          : null;
    }

    for (const action of actions.filter((entry) => entry.command === "ITEM")) {
      const message = performItemAction(action);

      if (message) messages.push(message);
    }

    const effectActions = actions.filter((entry) =>
      entry.command === "ACT" && !actDealsDamage(entry.act) && entry.act.effect !== "persistent"
    );
    const persistentActions = actions.filter((entry) =>
      entry.command === "ACT" && entry.act.effect === "persistent"
    );
    const damageActions = actions.filter((entry) => entry.command === "ACT" && actDealsDamage(entry.act));
    const fightActions = actions.filter((entry) => entry.command === "FIGHT");

    state.partyActions = state.party.map(() => null);
    state.partyCommands = state.party.map(() => null);
    state.partyCommandTpGains = state.party.map(() => 0);
    advanceBattleDialog();

    if (effectActions.length > 0) {
      beginPlayerEffectSequence(effectActions, persistentActions, damageActions, fightActions, messages);
      return;
    }

    for (const action of persistentActions) registerPersistentEffect(action);

    if (damageActions.length > 0) {
      beginDamageSpellSequence(damageActions, fightActions, messages);
      return;
    }

    continueQueuedPartyResolution(fightActions, messages);
  }

  function beginPlayerEffectSequence(actions, persistentActions, damageActions, fightActions, messages) {
    const resolution = state.playerEffectAction;
    resolution.queue = [...actions];
    resolution.persistentActions = [...persistentActions];
    resolution.damageActions = [...damageActions];
    resolution.fightActions = [...fightActions];
    resolution.messages = [...messages];
    beginNextPlayerEffect();
  }

  function beginNextPlayerEffect() {
    const resolution = state.playerEffectAction;
    const action = resolution.queue.shift();

    if (!action) {
      resolution.action = null;
      for (const persistentAction of resolution.persistentActions) registerPersistentEffect(persistentAction);

      if (resolution.damageActions.length > 0) {
        beginDamageSpellSequence(resolution.damageActions, resolution.fightActions, resolution.messages);
      } else {
        continueQueuedPartyResolution(resolution.fightActions, resolution.messages);
      }
      return;
    }

    const message = performActAction(action);
    if (message) resolution.messages.push(message);

    if (!action.act.popupText) {
      beginNextPlayerEffect();
      return;
    }

    resolution.action = action;
    resolution.timer = 0;
    const actor = state.party[action.actorIndex];
    if (actor) {
      const requestedRole = action.act.sprite || "action";
      actor.actionSpriteRole = actor.spriteKeys[requestedRole] ? requestedRole : "action";
    }
    state.phase = PHASE.PLAYER_EFFECT;
    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    state.textTimer = 0;
    playSound(action.act.effect === "heal" ? sounds.itemUse : sounds.statChange);
  }

  function updatePlayerEffect() {
    const resolution = state.playerEffectAction;
    if (!resolution.action) return;

    resolution.timer++;
    if (resolution.timer >= 90) {
      const actor = state.party[resolution.action.actorIndex];
      if (actor) actor.actionSpriteRole = null;
      beginNextPlayerEffect();
    }
  }

  function continueQueuedPartyResolution(fightActions, messages, persistentResolved = false) {

    if (state.enemyHP <= 0) {
      state.phase = PHASE.MESSAGE;
      state.box = { ...BOX_RECT.TEXT };
      state.message = messages.join(" ");
      state.textTimer = 0;
      setTimeout(() => {
        if (!state.phase2Started && beginPhase2Transition()) return;
        stopCurrentMusic();
        beginDefeatDissolve();
      }, Math.max(1600, messages.length * 1000));
      return;
    }

    if (!persistentResolved && state.persistentEffects.length > 0) {
      beginPersistentEffectSequence(fightActions, messages);
      return;
    }

    if (fightActions.length > 0) {
      beginFightQte(fightActions);
      return;
    }

    if (messages.length > 0) {
      state.phase = PHASE.MESSAGE;
      state.box = { ...BOX_RECT.TEXT };
      state.message = messages.join(" ");
      state.textTimer = 0;
      setTimeout(beginEnemyTurn, Math.max(1800, messages.length * 1200));
      return;
    }

    state.message = "";
    state.textTimer = 0;
    beginEnemyTurn();
  }

  function registerPersistentEffect(action) {
    const actor = state.party[action.actorIndex];
    const id = action.act.persistentId || action.act.script || action.act.name;
    const alreadyActive = state.persistentEffects.some((effect) =>
      effect.id === id && effect.actorName === actor?.name
    );

    if (alreadyActive || !actor) return;

    if (action.act.persistentGroup) {
      state.persistentEffects = state.persistentEffects.filter((effect) =>
        effect.actorName !== actor.name || effect.group !== action.act.persistentGroup
      );
    }

    state.persistentEffects.push({
      id,
      actorIndex: action.actorIndex,
      actorName: actor.name,
      script: action.act.script,
      group: action.act.persistentGroup,
      sprite: action.act.persistentSprite,
      damage: action.act.damage,
      heal: action.act.heal,
      targetIndex: 0
    });
  }

  function beginDamageSpellSequence(actions, fightActions, messages) {
    state.spellAction.queue = [...actions];
    state.spellAction.fightActions = [...fightActions];
    state.spellAction.messages = [...messages];
    beginNextDamageSpell();
  }

  function beginNextDamageSpell() {
    const spell = state.spellAction;
    const action = spell.queue.shift();

    if (!action) {
      continueQueuedPartyResolution(spell.fightActions, spell.messages);
      return;
    }

    const actor = state.party[action.actorIndex];
    const multiplier = Number.isFinite(actor?.damageMultiplier) ? actor.damageMultiplier : 1;

    state.phase = PHASE.SPELL_ACTION;
    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    state.textTimer = 0;
    spell.timer = 0;
    spell.action = action;
    spell.damage = Math.max(1, Math.round(action.act.damage * multiplier));
    spell.bonusDamage = 0;
    spell.damageApplied = false;
    spell.particles = [];

    if (actor) {
      const requestedRole = action.act.sprite || "action";
      actor.actionSpriteRole = actor.spriteKeys[requestedRole] ? requestedRole : "action";
    }
  }

  function damageSpellActorCenter(actorIndex) {
    return { x: 93 + 39, y: 78 + actorIndex * 124 + 39 };
  }

  function damageSpellEnemyCenter() {
    const spriteKey = activeEnemySpriteKey();
    const size = enemySpriteSize(spriteKey);
    const position = enemySpritePosition(size, spriteKey);
    return { x: position.x + size / 2, y: position.y + size / 2 };
  }

  function applyEnemyDamage(damage, targetIndex = 0) {
    const baseDamage = Math.max(0, Math.round(damage));
    const resolvedTargetIndex = Number.isInteger(targetIndex) ? targetIndex : 0;
    let bonusDamage = 0;

    if (baseDamage > 0 && state.guidingBolt.active && state.guidingBolt.targetIndex === resolvedTargetIndex) {
      bonusDamage = Math.max(1, Math.round(baseDamage * 0.25));
      state.guidingBolt.active = false;
    }

    state.enemyHP = Math.max(0, state.enemyHP - baseDamage - bonusDamage);
    return { baseDamage, bonusDamage };
  }

  function randomLivingEnemyTargetIndex() {
    const targets = state.enemyHP > 0 ? [0] : [];
    return targets.length > 0 ? targets[Math.floor(Math.random() * targets.length)] : -1;
  }

  function spawnCurtainCallImpact(center, color) {
    const particles = state.spellAction.particles;

    for (let i = 0; i < 28; i++) {
      const angle = Math.PI * 2 * i / 28 + Math.random() * 0.16;
      const speed = 2.5 + Math.random() * 4.5;
      particles.push({
        x: center.x,
        y: center.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 34 + Math.floor(Math.random() * 18),
        maxLife: 52,
        color
      });
    }
  }

  function updateDamageSpell() {
    const spell = state.spellAction;
    const action = spell.action;
    if (!action) return;

    spell.timer++;

    if (!spell.damageApplied && spell.timer >= 66) {
      const actor = state.party[action.actorIndex];
      spell.damageApplied = true;
      const result = applyEnemyDamage(spell.damage, action.targetIndex);
      spell.bonusDamage = result.bonusDamage;
      triggerEnemyHitSprite();
      if (action.act.script === "guidingBolt") {
        state.guidingBolt.pending = true;
        state.guidingBolt.targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : 0;
      }
      spawnCurtainCallImpact(damageSpellEnemyCenter(), actor?.secondaryColor || actor?.cardColor || "#fff");
      playSound(action.act.script === "guidingBolt"
        ? sounds.spellCast
        : action.act.script === "curtainCall"
          ? sounds.curtainCall
          : sounds.attackLand);
    }

    for (const particle of spell.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
      particle.life--;
    }
    spell.particles = spell.particles.filter((particle) => particle.life > 0);

    if (spell.timer >= 162) {
      const actor = state.party[action.actorIndex];
      if (actor) actor.actionSpriteRole = null;
      spell.action = null;
      beginNextDamageSpell();
    }
  }

  function beginPersistentEffectSequence(fightActions, messages) {
    const persistent = state.persistentEffectAction;
    persistent.queue = [...state.persistentEffects];
    persistent.fightActions = [...fightActions];
    persistent.messages = [...messages];
    beginNextPersistentEffect();
  }

  function beginNextPersistentEffect() {
    const persistent = state.persistentEffectAction;

    if (state.enemyHP <= 0) {
      persistent.queue = [];
      continueQueuedPartyResolution(persistent.fightActions, persistent.messages, true);
      return;
    }

    const effect = persistent.queue.shift();

    if (!effect) {
      continueQueuedPartyResolution(persistent.fightActions, persistent.messages, true);
      return;
    }

    const actorIndex = state.party.findIndex((player) => player.name === effect.actorName);
    const actor = state.party[actorIndex];

    if (!actor || actor.hp <= 0) {
      state.persistentEffects = state.persistentEffects.filter((entry) => entry !== effect);
      beginNextPersistentEffect();
      return;
    }

    const multiplier = Number.isFinite(actor?.damageMultiplier) ? actor.damageMultiplier : 1;

    effect.actorIndex = actorIndex === -1 ? effect.actorIndex : actorIndex;
    state.phase = PHASE.PERSISTENT_EFFECT;
    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    persistent.timer = 0;
    persistent.effect = effect;
    persistent.damage = effect.script === "starryFormChalice"
      ? 0
      : Math.max(1, Math.round(effect.damage * multiplier));
    persistent.bonusDamage = 0;
    persistent.damageApplied = false;
    effect.targetIndex = effect.script === "starryFormChalice"
      ? randomLowestHpPartyIndex()
      : randomLivingEnemyTargetIndex();

    if (actor && effect.group !== "starryForm") actor.actionSpriteRole = "action";
    if (effect.script === "spiritualWeapon") playSound(sounds.chainsaw);
  }

  function updatePersistentEffect() {
    const persistent = state.persistentEffectAction;
    const effect = persistent.effect;
    if (!effect) return;

    persistent.timer++;

    if (!persistent.damageApplied && persistent.timer >= 30) {
      persistent.damageApplied = true;
      if (effect.script === "starryFormChalice") {
        healExactPartyMember(effect.targetIndex, effect.heal);
        playSound(sounds.itemUse);
      } else {
        const result = applyEnemyDamage(persistent.damage, effect.targetIndex);
        persistent.bonusDamage = result.bonusDamage;
        triggerEnemyHitSprite();
        playSound(sounds.attackLand);
      }
    }

    if (persistent.timer >= 126) {
      const actor = state.party[effect.actorIndex];
      if (actor) actor.actionSpriteRole = null;
      persistent.effect = null;
      beginNextPersistentEffect();
    }
  }

  function performItemAction(action) {
    const item = action.item;
    const actor = state.party[action.actorIndex];

    if (!item || !actor) return "";

    playSound(sounds.itemUse);

    if (item.target === "party") {
      let totalHeal = 0;

      for (let i = 0; i < state.party.length; i++) {
        totalHeal += healExactPartyMember(i, item.heal);
      }

      return totalHeal > 0
        ? `* ${actor.name} used ${item.name}. The party recovered HP.`
        : `* ${actor.name} used ${item.name}. But everyone's HP was already full.`;
    }

    const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
    const target = state.party[targetIndex] || actor;
    const heal = healExactPartyMember(targetIndex, item.heal);

    return heal > 0
      ? `* ${actor.name} used ${item.name}. ${target.name} recovered ${heal} HP.`
      : `* ${actor.name} used ${item.name}. But ${target.name}'s HP was already full.`;
  }

  function actDealsDamage(act) {
    return act && act.effect === "damage";
  }

  function performActAction(action) {
    const act = action.act;
    const actor = state.party[action.actorIndex];

    if (!act || !actor) return "";

    if (act.effect === "heal") {
      const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
      const target = state.party[targetIndex] || actor;
      const healAmount = target.hp <= 0 && Number.isFinite(act.downHeal) ? act.downHeal : act.heal;
      const heal = healExactPartyMember(targetIndex, healAmount);

      return heal > 0
        ? `* ${actor.name} used ${act.name}. ${target.name} recovered ${heal} HP.`
        : `* ${actor.name} used ${act.name}. But ${target.name}'s HP was already full.`;
    }

    if (act.effect === "damageBuff") {
      const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
      const target = state.party[targetIndex] || actor;
      target.damageMultiplier *= act.damageMultiplier;
      if (act.once) actor.usedActs.add(act.name);

      return `* ${actor.name} used ${act.name}. ${target.name}'s damage increased.`;
    }

    if (act.effect === "nextTurnDamageBuff") {
      actor.damageMultiplier *= act.damageMultiplier;
      actor.temporaryDamageMultiplier = act.damageMultiplier;
      actor.temporaryDamageBuffTurns = 2;

      return `* ${actor.name} used ${act.name}. Their next turn's damage doubled.`;
    }

    if (act.effect === "defendTPBuff") {
      const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
      const target = state.party[targetIndex] || actor;
      target.defendTP += act.defendTPBonus;

      return `* ${actor.name} used ${act.name}. ${target.name}'s DEFEND TP gains increased.`;
    }

    if (act.effect === "summonBeast") {
      state.companions.beast.summoned = true;
      state.companions.beast.summonedFrame = state.frame;
      return `* ${actor.name} summoned a powerful beast.`;
    }

    if (act.effect === "beastDodge") {
      state.companions.beast.dodgeArmed = true;
      state.companions.beast.dodgePopupTimer = -1;
      return `* ${actor.name} commanded the beast to guard the party.`;
    }

    if (act.effect === "damage") {
      const multiplier = Number.isFinite(actor.damageMultiplier) ? actor.damageMultiplier : 1;
      const damage = Math.max(1, Math.round(act.damage * multiplier));
      const result = applyEnemyDamage(damage, action.targetIndex);

      return `* ${actor.name} used ${act.name}. ${state.enemyName} took ${damage + result.bonusDamage} damage.`;
    }

    if (act.effect === "check") {
      const bossData = currentBossData();
      return typeof bossData.check === "string"
        ? `* ${bossData.check}`
        : `* ${bossData.actMessage || "Nothing happens."}`;
    }

    return `* ${actor.name} used ${act.name}.`;
  }

  function shuffledIndexes(length) {
    const indexes = Array.from({ length }, (_, index) => index);

    for (let i = indexes.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexes[i], indexes[j]] = [indexes[j], indexes[i]];
    }

    return indexes;
  }

  function beginFightQte(actions) {
    const usableActions = actions.filter((action) => state.party[action.actorIndex]);

    state.phase = PHASE.FIGHT_QTE;
    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    state.textTimer = 0;
    state.fightQte = {
      timer: 0,
      actions: usableActions,
      order: shuffledIndexes(usableActions.length),
      activeBars: [],
      nextOrderIndex: 0,
      spawnTimer: 60,
      finished: usableActions.length === 0,
      finishTimer: 0,
      results: [],
      nextPopupIndex: 0,
      popupSpawnTimer: 0,
      damagePopups: []
    };

    if (usableActions.length === 0) {
      finishFightQte();
    }
  }

  function fightQteLayoutForRow(row) {
    const rowH = BOX_RECT.TEXT.h / 3;
    const y = BOX_RECT.TEXT.y + row * rowH;
    const barH = rowH;
    const trackX = 140;
    const trackW = 225;

    return {
      rowY: y,
      rowH,
      iconX: 24,
      iconY: y + 10,
      pressX: 72,
      pressY: y + rowH / 2 + 8,
      trackX,
      trackY: y,
      trackW,
      trackH: barH,
      targetX: trackX,
      targetY: y + 2,
      targetW: 9.6,
      targetH: barH - 4
    };
  }

  function updateFightQte() {
    const qte = state.fightQte;

    qte.timer++;

    if (!qte.finished && qte.nextOrderIndex < qte.order.length) {
      qte.spawnTimer--;

      if (qte.spawnTimer <= 0) {
        const actionIndex = qte.order[qte.nextOrderIndex];
        const action = qte.actions[actionIndex];
        const actor = state.party[action.actorIndex];

        if (actor) {
          const layout = fightQteLayoutForRow(action.actorIndex);
          qte.activeBars.push({
            actionIndex,
            actorIndex: action.actorIndex,
            targetIndex: Number.isInteger(action.targetIndex) ? action.targetIndex : 0,
            x: layout.trackX + layout.trackW,
            speed: 5.4,
            locked: false
          });
        }

        qte.nextOrderIndex++;
        qte.spawnTimer = 20 + Math.floor(Math.random() * 21);
      }
    }

    for (const bar of qte.activeBars) {
      if (!bar.locked) {
        const layout = fightQteLayoutForRow(bar.actorIndex);
        const stopX = layout.trackX - 24;
        bar.x = Math.max(stopX, bar.x - bar.speed);

        if (bar.x <= stopX) {
          missFightQteBar(bar);
        }
      } else if (bar.justLocked) {
        bar.justLocked = false;
      } else {
        bar.lockAge++;
      }
    }

    qte.damagePopups = qte.damagePopups
      .map((popup) => ({ ...popup, age: popup.age + 1 }))
      .filter((popup) => popup.age < 96);

    const allSpawned = qte.nextOrderIndex >= qte.order.length;
    const allLocked = qte.activeBars.length === qte.actions.length &&
      qte.activeBars.every((bar) => bar.locked);

    const allBurstsFinished = allLocked && qte.activeBars.every((bar) => bar.lockAge >= 30);

    if (!qte.finished && allSpawned && allBurstsFinished) {
      qte.finished = true;
      qte.nextPopupIndex = 0;
      qte.popupSpawnTimer = 0;
    }

    if (qte.finished) {
      if (qte.nextPopupIndex < qte.results.length) {
        qte.popupSpawnTimer--;

        if (qte.popupSpawnTimer <= 0) {
          const popup = { ...qte.results[qte.nextPopupIndex], age: 0 };
          qte.damagePopups.push(popup);
          if (popup.hit) {
            const fightHitCount = qte.results.filter((result) => result.hit).length;
            triggerEnemyHitSprite(fightHitCount > 1 ? 96 : 60);
          }
          qte.nextPopupIndex++;
          qte.popupSpawnTimer = 20;
        }
      }

      if (qte.nextPopupIndex >= qte.results.length && qte.damagePopups.length === 0) {
        finishFightQte();
      }
    }
  }

  function lockNextFightQteBar() {
    const bar = state.fightQte.activeBars.find((entry) => !entry.locked);

    if (!bar) return;

    const actor = state.party[bar.actorIndex];
    const layout = fightQteLayoutForRow(bar.actorIndex);
    const targetCenter = layout.targetX + layout.targetW / 2;
    const maxDistance = Math.max(1, layout.trackW - layout.targetW);
    const distance = Math.min(maxDistance, Math.abs(bar.x - targetCenter));
    const accuracy = 1 - distance / maxDistance;
    const baseDamage = actor.damage * (Number.isFinite(actor.damageMultiplier) ? actor.damageMultiplier : 1);
    const damage = Math.max(1, Math.round(baseDamage * (0.5 + accuracy * 0.5)));
    const popup = enemyDamagePopupPosition(bar.actorIndex);

    bar.locked = true;
    bar.lockAge = 0;
    bar.justLocked = true;
    bar.damage = damage;
    const damageResult = applyEnemyDamage(damage, bar.targetIndex);
    state.fightQte.results.push({
      text: `${damage}`,
      hit: true,
      bonusDamage: damageResult.bonusDamage,
      color: actor.secondaryColor || actor.cardColor || "#fff",
      x: popup.x,
      y: popup.y
    });
    playSound(sounds.attackLand);
  }

  function missFightQteBar(bar) {
    const actor = state.party[bar.actorIndex];
    const popup = enemyDamagePopupPosition(bar.actorIndex);

    bar.locked = true;
    bar.lockAge = 30;
    bar.damage = 0;
    bar.missed = true;
    state.fightQte.results.push({
      text: "MISS",
      color: actor.secondaryColor || actor.cardColor || "#fff",
      x: popup.x,
      y: popup.y
    });
  }

  function finishFightQte() {
    state.fightQte.damagePopups = [];

    if (state.enemyHP <= 0) {
      if (!state.phase2Started && beginPhase2Transition()) return;

      stopCurrentMusic();
      beginDefeatDissolve();
      return;
    }

    beginEnemyTurn();
  }

  function syncLegacyPlayerHP() {
    state.playerHP = partyHP();
    state.maxHP = partyMaxHP();
  }

  function damageRandomLivingPlayer(amount) {
    const living = livingPartyMembers();

    if (living.length === 0) return null;

    const target = living[Math.floor(Math.random() * living.length)];
    target.hp = Math.max(0, target.hp - amount);
    if (target.hp <= 0) removeStarryFormsForPlayer(target);
    syncLegacyPlayerHP();
    return target;
  }

  function removeStarryFormsForPlayer(player) {
    if (!player) return;

    for (const effect of state.persistentEffects) {
      if (effect.actorName !== player.name || effect.group !== "starryForm") continue;

      state.starryFormFades.push({
        actorIndex: state.party.indexOf(player),
        actorName: effect.actorName,
        sprite: effect.sprite,
        startedFrame: state.frame
      });
    }

    state.persistentEffects = state.persistentEffects.filter((effect) =>
      effect.actorName !== player.name || effect.group !== "starryForm"
    );
  }

  function randomLowestHpPartyIndex() {
    if (state.party.length === 0) return -1;

    const injuredIndexes = state.party
      .map((player, index) => player.hp < player.maxHP ? index : -1)
      .filter((index) => index !== -1);
    const candidateIndexes = injuredIndexes.length > 0
      ? injuredIndexes
      : state.party.map((_, index) => index);
    const lowestHP = Math.min(...candidateIndexes.map((index) => state.party[index].hp));
    const tiedIndexes = candidateIndexes.filter((index) => state.party[index].hp === lowestHP);

    return tiedIndexes[Math.floor(Math.random() * tiedIndexes.length)];
  }

  function consumeBeastDodge() {
    const beast = state.companions.beast;
    if (!beast.summoned || !beast.dodgeArmed) return false;

    beast.dodgeArmed = false;
    beast.dodgePopupTimer = 0;
    playSound(sounds.shieldBlock);
    return true;
  }

  function healPartyMember(index, amount) {
    return healExactPartyMember(index, amount);
  }

  function healExactPartyMember(index, amount) {
    const target = state.party[index];

    if (!target) return 0;

    const heal = Math.min(amount, target.maxHP - target.hp);
    target.hp += heal;
    syncLegacyPlayerHP();
    return heal;
  }

  function partyIsDefeated() {
    return livingPartyMembers().length === 0;
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

  function currentActorActs() {
    const actor = state.party[state.partyTurnIndex];
    return actor && Array.isArray(actor.acts) ? actor.acts : [];
  }

  function selectedActorAct() {
    const acts = currentActorActs();
    return acts[state.selectedAct] || null;
  }

  function canAffordAct(act) {
    if (!act || state.tp < act.tpCost) return false;
    const actor = state.party[state.partyTurnIndex];
    if (actor && actor.hp < act.hpCost) return false;
    if (act.once && actor?.usedActs.has(act.name)) return false;
    if (act.effect === "nextTurnDamageBuff" && actor?.temporaryDamageBuffTurns > 0) return false;
    if (act.requiresBeast && !state.companions.beast.summoned) return false;
    if (act.effect === "summonBeast" && state.companions.beast.summoned) return false;
    if (act.effect !== "persistent") return true;

    return !state.persistentEffects.some((effect) =>
      effect.id === act.persistentId && effect.actorName === actor?.name
    );
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
    selectedActTarget: 0,
    selectedActEnemyTarget: 0,
    selectedItem: 0,
    selectedItemTarget: 0,
    selectedMercyTarget: 0,
    actConditionIndex: 0,
    frame: 0,
    commandHudAnimationStartFrame: 0,
    textTimer: 0,
    dialogIndex: 0,
    enemyDialogIndex: 0,
    enemyDialogTimer: 0,
    enemyDialogDuration: 0,
    enemyDialogMessage: "",
    enemyDialogOnComplete: null,
    currentTurn: null,
    consumedTurns: new Set(),
    turnEvent: {
      steps: [],
      index: -1,
      timer: 0,
      step: null,
      onComplete: null,
      transformation: null
    },
    scene: {
      config: null,
      timer: 0,
      onComplete: null
    },
    message: enemyData.introMessage,

    playerHP: 50,
    maxHP: 50,

    enemyHP: enemyData.maxHP,
    enemyMaxHP: enemyData.maxHP,
    enemyName: enemyData.name,

    party: createParty(window.PLAYER_DATA),
    partySelection: {
      cursor: 0,
      picks: []
    },
    partyTurnIndex: 0,
    partyCommands: [],
    tp: 0,
    grazeGlow: 0,
    partyActions: [],

    inventory: createInventory(startingItems()),

    companions: {
      beast: {
        summoned: false,
        summonedFrame: 0,
        dodgeArmed: false,
        dodgePopupTimer: -1
      }
    },

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
    fightQte: {
      timer: 0,
      actions: [],
      order: [],
      activeBars: [],
      nextOrderIndex: 0,
      spawnTimer: 60,
      finished: false,
      finishTimer: 0,
      results: [],
      nextPopupIndex: 0,
      popupSpawnTimer: 0,
      damagePopups: []
    },
    playerEffectAction: {
      timer: 0,
      action: null,
      queue: [],
      persistentActions: [],
      damageActions: [],
      fightActions: [],
      messages: []
    },
    spellAction: {
      timer: 0,
      action: null,
      queue: [],
      fightActions: [],
      messages: [],
      damage: 0,
      bonusDamage: 0,
      damageApplied: false,
      particles: []
    },
    persistentEffects: [],
    starryFormFades: [],
    persistentEffectAction: {
      timer: 0,
      effect: null,
      queue: [],
      fightActions: [],
      messages: [],
      damage: 0,
      bonusDamage: 0,
      damageApplied: false
    },
    guidingBolt: {
      pending: false,
      active: false,
      targetIndex: 0
    },
    lastStand: {
      used: false,
      pendingAttack: null,
      activeAttack: false,
      timer: 0,
      flashDuration: 42,
      messageDuration: 135,
      damage: 0,
      fromHP: enemyData.maxHP,
      toHP: 1
    },

    box: { ...BOX_RECT.TEXT },
    soul: { x: 450, y: 420, r: 8, speed: 5.06, invuln: 0, lane: 1, vy: 0 },
    shieldDirection: "up",
    redShieldGlow: 0,
    redArrowReveal: 0,
    shieldShatter: {
      timer: 0,
      duration: 36,
      particles: []
    },
    attackType: ATTACK_TYPE.NORMAL,
    rhythmGrid: null,
    bullets: [],
    enemySpriteKey: null,
    enemyDefaultSpriteKey: null,
    enemyDefaultSpriteLocked: false,
    enemyHitSpriteUntil: 0,

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
    death: {
      timer: 0,
      determinationStarted: false,
      x: 450,
      y: 420,
      color: "#ff1e35",
      pieces: []
    },
  };

  syncLegacyPlayerHP();
  resetPartyCommands();

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

    for (let priorIndex = 0; priorIndex < index; priorIndex++) {
      if (!normalizeTurn(turns[priorIndex]).loop) {
        state.consumedTurns.add(priorIndex);
      }
    }

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

  function beginTurnEvent(event, onComplete) {
    state.turnEvent.steps = event.steps;
    state.turnEvent.index = -1;
    state.turnEvent.timer = 0;
    state.turnEvent.step = null;
    state.turnEvent.transformation = null;
    state.scene.config = null;
    state.scene.timer = 0;
    state.scene.onComplete = null;
    state.turnEvent.onComplete = typeof onComplete === "function" ? onComplete : beginEnemyDialog;
    advanceTurnEvent();
  }

  function advanceTurnEvent() {
    state.turnEvent.index++;
    state.turnEvent.timer = 0;
    state.turnEvent.step = state.turnEvent.steps[state.turnEvent.index] || null;

    if (!state.turnEvent.step) {
      const onComplete = state.turnEvent.onComplete || beginEnemyDialog;
      state.turnEvent.onComplete = null;
      onComplete();
      return;
    }

    const step = state.turnEvent.step;
    state.phase = PHASE.TURN_EVENT;

    if (step.type === "textbox") {
      state.box = { ...BOX_RECT.TEXT };
      state.message = step.text;
      state.textTimer = 0;
    } else if (step.type === "enemyDialog") {
      if (typeof step.sprite === "string") setEnemyTemporarySprite(step.sprite);
      state.enemyDialogMessage = step.text;
      state.enemyDialogTimer = 0;
    } else if (step.type === "enemyTransform") {
      beginTurnEventEnemyTransformation(step);
    } else if (step.type === "assignEnemyDefault") {
      assignEnemyDefaultSprite(step.sprite, step.lockDefault);
      advanceTurnEvent();
    }
  }

  function beginTurnEventEnemyTransformation(step) {
    const sourceKey = activeEnemySpriteKey();
    const targetKey = attackSpriteKey(step.sprite);
    const spriteSize = enemySpriteSize(sourceKey);
    const position = enemySpritePosition(spriteSize, sourceKey);

    state.box = { ...BOX_RECT.TEXT };
    state.message = "";
    state.textTimer = 0;
    state.turnEvent.transformation = {
      sourceKey,
      targetKey,
      spriteSize,
      pixelSize: 6,
      x: position.x,
      y: position.y + enemySpriteBobOffset(),
      releasedRows: 0,
      particles: [],
      source: captureEnemySprite(sourceKey, spriteSize),
      targetSource: captureEnemySprite(targetKey, spriteSize)
    };
    playSound(sounds.vaporized);
  }

  function beginEnemyTurn() {
    if (state.guidingBolt.pending) {
      state.guidingBolt.pending = false;
      state.guidingBolt.active = true;
    } else if (state.guidingBolt.active) {
      state.guidingBolt.active = false;
    }

    for (const player of state.party) {
      if (player.temporaryDamageBuffTurns <= 0) continue;

      player.temporaryDamageBuffTurns--;
      if (player.temporaryDamageBuffTurns === 0) {
        player.damageMultiplier /= player.temporaryDamageMultiplier;
        player.temporaryDamageMultiplier = 1;
      }
    }

    state.currentTurn = selectNextTurn();
    prepareEnemyAnimationForTurn(state.currentTurn.attack);

    if (state.currentTurn.scene) {
      beginTurnScene(state.currentTurn.scene, beginCurrentTurnAfterScene);
      return;
    }

    beginCurrentTurnAfterScene();
  }

  function beginCurrentTurnAfterScene() {
    if (state.currentTurn.scene && state.currentTurn.scene.skipEnemyDialog) {
      beginEnemyAttack();
      return;
    }

    if (state.currentTurn.event) {
      beginTurnEvent(state.currentTurn.event);
      return;
    }

    beginEnemyDialog();
  }

  function beginChainedEnemyTurn() {
    state.currentTurn = selectNextTurn();
    prepareEnemyAnimationForTurn(state.currentTurn.attack);

    if (state.currentTurn.scene) {
      beginTurnScene(state.currentTurn.scene, beginEnemyAttack);
      return;
    }

    if (state.currentTurn.event) {
      beginTurnEvent(state.currentTurn.event, beginEnemyAttack);
      return;
    }

    beginEnemyAttack();
  }

  function prepareEnemyAnimationForTurn(attack) {
    if (typeof attack.assignDefaultSprite === "string" && attack.assignDefaultSprite) {
      assignEnemyDefaultSprite(attack.assignDefaultSprite, attack.lockDefaultSprite);
    }

    state.enemySpriteKey = !state.enemyDefaultSpriteLocked && typeof attack.sprite === "string"
      ? attackSpriteKey(attack.sprite)
      : null;
  }

  function setEnemyTemporarySprite(sprite) {
    if (state.enemyDefaultSpriteLocked) return;
    state.enemySpriteKey = sprite === "default" ? null : attackSpriteKey(sprite);
  }

  function assignEnemyDefaultSprite(sprite, locked = false) {
    state.enemyDefaultSpriteKey = attackSpriteKey(sprite);
    state.enemyDefaultSpriteLocked = locked === true;
    state.enemySpriteKey = null;
    state.enemyHitSpriteUntil = 0;
  }

  function beginTurnScene(scene, onComplete) {
    state.phase = PHASE.SCENE;
    state.scene.config = scene;
    state.scene.timer = 0;
    state.scene.onComplete = typeof onComplete === "function" ? onComplete : beginCurrentTurnAfterScene;
    state.box = { ...BOX_RECT.TEXT };
    state.bullets = [];
    state.message = "";
    state.textTimer = 0;

    if (typeof scene.setup === "function") {
      scene.setup({
        state,
        sprites,
        sounds,
        playSound
      });
    }
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
    state.enemyDialogDuration = scaleEnemyDialogDuration(
      Math.max(180, Math.ceil(line.length / 1.25) + 120)
    );
    state.enemyDialogOnComplete = null;
    state.enemyDialogIndex++;
  }

  function beginAttackEnemyDialog(line, onComplete = beginEnemyAttack) {
    state.phase = PHASE.ENEMY_DIALOG;
    state.box = { ...BOX_RECT.TEXT };
    state.enemyDialogMessage = line;
    state.enemyDialogTimer = 0;
    state.enemyDialogDuration = scaleEnemyDialogDuration(
      Math.max(180, Math.ceil(line.length / 1.25) + 120)
    );
    state.enemyDialogOnComplete = typeof onComplete === "function" ? onComplete : beginEnemyAttack;
  }

  function scaleEnemyDialogDuration(duration) {
    const multiplier = currentBossData().enemyDialogDurationMultiplier;
    return Math.ceil(duration * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1));
  }

  function beginMenu(message, { resetCommands = true } = {}) {
    state.phase = PHASE.MENU;
    state.commandHudAnimationStartFrame = state.frame;
    state.box = { ...BOX_RECT.TEXT };
    state.message = typeof message === "string" ? message : currentBattleDialog();
    state.textTimer = 0;
    state.bullets = [];
    state.attackType = ATTACK_TYPE.NORMAL;
    state.enemySpriteKey = null;
    state.attack.active = false;
    state.attack.result = null;
    state.attack.damage = 0;
    state.soul.x = state.box.x + state.box.w / 2;
    state.soul.y = state.box.y + state.box.h / 2;
    state.soul.lane = 1;
    state.soul.vy = 0;
    if (resetCommands) {
      state.companions.beast.dodgeArmed = false;
      resetPartyCommands();
    }
  }

  function beginBoxMorph(to, nextPhase, onComplete) {
    state.phase = PHASE.BOX_MORPH;
    state.boxMorph = {
      timer: 0,
      duration: nextPhase === PHASE.ENEMY ? 34 : 18,
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
    state.selectedItemTarget = state.partyTurnIndex;
    state.textTimer = 0;
  }

  function beginItemTargetSelection() {
    state.phase = PHASE.ITEM_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedItemTarget = clamp(state.selectedItemTarget, 0, Math.max(0, state.party.length - 1));
    state.textTimer = 0;
  }

  function beginActSelection() {
    const acts = currentActorActs();

    state.phase = PHASE.ACT;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedAct = clamp(state.selectedAct, 0, Math.max(0, acts.length - 1));
    state.selectedActTarget = state.partyTurnIndex;
    state.selectedActEnemyTarget = 0;
    state.textTimer = 0;
  }

  function beginActTargetSelection() {
    state.phase = PHASE.ACT_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedActTarget = clamp(state.selectedActTarget, 0, Math.max(0, state.party.length - 1));
    state.textTimer = 0;
  }

  function beginActEnemyTargetSelection() {
    state.phase = PHASE.ACT_ENEMY_TARGET;
    state.box = { ...BOX_RECT.TEXT };
    state.selectedActEnemyTarget = 0;
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
    const shouldLastStand = !state.lastStand.used && enemyData.lastStandAttack && toHP <= 0 && fromHP > 0;
    const resolvedDamage = shouldLastStand ? Math.max(0, fromHP - 1) : damage;
    const resolvedToHP = shouldLastStand ? 1 : toHP;

    state.attack.damage = resolvedDamage;
    state.attack.result = accuracy > 0.82 ? "CRITICAL" : accuracy > 0.45 ? "HIT" : "WEAK";
    state.attack.active = false;
    state.attack.flash = 22;
    playSound(sounds.attackLand);
    advanceBattleDialog();
    state.message = "";
    state.enemyDialogMessage = "";
    state.textTimer = 0;

    if (shouldLastStand) {
      beginLastStandEvent({
        fromHP,
        toHP: resolvedToHP,
        damage: resolvedDamage,
        attack: enemyData.lastStandAttack
      });
      return;
    }

    beginDamageResult({
      fromHP,
      toHP: resolvedToHP,
      damage: resolvedDamage
    });
  }

  function beginDamageResult({ fromHP, toHP, damage }) {
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

  function beginLastStandEvent({ fromHP, toHP, damage, attack }) {
    state.phase = PHASE.LAST_STAND_EVENT;
    state.box = { ...BOX_RECT.TEXT };
    state.message = typeof enemyData.lastStandMessage === "string"
      ? enemyData.lastStandMessage
      : "* The enemy refuses to fall.";
    state.textTimer = 0;
    state.lastStand = {
      used: true,
      pendingAttack: normalizeAttackPattern(attack),
      activeAttack: false,
      timer: 0,
      flashDuration: 42,
      messageDuration: 135,
      damage,
      fromHP,
      toHP
    };
  }

  function finishDamageResult() {
    state.enemyHP = state.damageResult.toHP;

    if (state.lastStand.pendingAttack) {
      state.currentTurn = {
        attack: state.lastStand.pendingAttack,
        event: null,
        postAttackEvent: null,
        loop: false
      };
      state.lastStand.pendingAttack = null;
      state.lastStand.activeAttack = true;
      beginEnemyAttack();
      return;
    }

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

  function beginPlayerDeath() {
    if (state.phase === PHASE.LOSE) return;

    stopCurrentMusic();
    state.phase = PHASE.LOSE;
    state.message = "";
    state.bullets = [];
    state.attack.active = false;
    state.attack.flash = 0;
    state.box = { ...BOX_RECT.TEXT };
    state.death = {
      timer: 0,
      determinationStarted: false,
      x: state.soul.x,
      y: state.soul.y,
      color: currentSoulColor(),
      pieces: []
    };
  }

  function currentSoulColor() {
    if (state.attackType === ATTACK_TYPE.PURPLE) return "#9d5cff";
    if (state.attackType === ATTACK_TYPE.BLUE) return "#39a7ff";
    if (state.attackType === ATTACK_TYPE.GREEN) return "#25d65f";
    return "#ff1e35";
  }

  function beginEnemyAttack() {
    for (const player of state.party) {
      player.actionSpriteRole = null;
    }

    state.bullets = [];
    state.soul.invuln = 0;
    state.grazeGlow = 0;
    state.enemyTimer = -state.enemyWarmup;
    const attackConfig = currentAttackConfig();

    state.attackType = attackConfig.type;
    state.rhythmGrid = null;
    state.enemyDuration = Number.isFinite(attackConfig.duration) ? attackConfig.duration : 640;
    state.message = "";
    state.textTimer = 0;

    if (state.attackType === ATTACK_TYPE.ULTIMATE && !state.ultimate.transformed) {
      state.phase = PHASE.ULTIMATE_TRANSITION;
      state.ultimate.timer = 0;
      return;
    }

    if (typeof attackConfig.enemyDialog === "string" && attackConfig.enemyDialog) {
      const line = attackConfig.enemyDialog;
      attackConfig.enemyDialog = null;
      beginAttackEnemyDialog(line, beginDefenseBoxMorph);
      return;
    }

    beginDefenseBoxMorph();
  }

  function beginDefenseBoxMorph() {
    const attackConfig = currentAttackConfig();
    const defenseBox = attackConfig.box
      ? attackConfig.box
      : state.attackType === ATTACK_TYPE.ULTIMATE
      ? BOX_RECT.FULL
      : state.attackType === ATTACK_TYPE.GREEN
        ? BOX_RECT.GREEN
        : state.attackType === ATTACK_TYPE.COMPACT
          ? BOX_RECT.COMPACT
          : BOX_RECT.BATTLE;

    beginBoxMorph(defenseBox, PHASE.ENEMY, () => {
      state.soul.x = state.box.x + state.box.w / 2;
      state.soul.lane = 1;
      state.soul.vy = 0;
      state.soul.pitBounce = false;

      if (state.attackType === ATTACK_TYPE.PURPLE) {
        state.soul.y = getPurpleLineYs()[state.soul.lane];
      } else if (state.attackType === ATTACK_TYPE.BLUE) {
        state.soul.y = state.box.y + state.box.h - state.soul.r;
      } else if (state.attackType === ATTACK_TYPE.GREEN) {
        state.soul.y = state.box.y + state.box.h / 2;
        state.shieldDirection = "up";
      } else {
        state.soul.y = state.box.y + state.box.h / 2;
      }

      const attackConfig = currentAttackConfig();

      if (typeof attackConfig.setup === "function") {
        attackConfig.setup({
          box: state.box,
          state,
          spawnBullet,
          playSound,
          sounds
        });
      }

      if (attackConfig.rhythmGrid) {
        beginRhythmGridAttack(attackConfig.rhythmGrid);
      } else if (attackConfig.freestyleGrid) {
        beginFreestyleGridAttack();
      } else if (attackConfig.vampireGrid) {
        beginVampireGridAttack(attackConfig.vampireGrid);
      } else if (attackConfig.vampireLordGrid) {
        beginVampireLordGridAttack(attackConfig.vampireLordGrid);
      }
    });
  }

  function beginRhythmGridAttack(config) {
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    const beatDuration = 60 / music.bpm;
    const beatsPerMeasure = 4;
    const musicBeat = (elapsed - music.loopStart) / beatDuration;
    const introStartBeat = Math.ceil((musicBeat + beatsPerMeasure) / beatsPerMeasure) * beatsPerMeasure;
    const dance = parseRhythmDance(config.dance, config.sequence);
    const remainingBeats = introStartBeat - musicBeat + 12 + dance.beats * 2;
    const requiredFrames = Math.ceil((remainingBeats * beatDuration + 1.15) * 60);
    state.enemyDuration = Math.max(state.enemyDuration, state.enemyTimer + requiredFrames);

    state.rhythmGrid = {
      cols: 5,
      rows: 3,
      danceEvents: dance.events,
      danceBeats: dance.beats,
      beatDuration,
      introStartBeat,
      phase: "waiting",
      demoStep: -1,
      demoSoundStep: -1,
      countdown: null,
      responseStep: 0,
      col: 2,
      row: 1,
      soulCol: 2,
      soulRow: 1,
      expectedCol: 2,
      expectedRow: 1,
      preparedResponseStep: -1,
      inputWindow: Number.isFinite(config.inputWindow) ? config.inputWindow : 0.1,
      beatPhase: 0,
      finished: false,
      finishTimer: 0
    };

    state.soul.x = rhythmGridX(2);
    state.soul.y = rhythmGridY(1);
  }

  function beginFreestyleGridAttack() {
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    const beatDuration = 60 / music.bpm;
    const musicBeat = (elapsed - music.loopStart) / beatDuration;
    const firstDownbeat = Math.ceil((musicBeat + 4) / 4) * 4;

    state.rhythmGrid = {
      mode: "freestyle",
      phase: "response",
      cols: 5,
      rows: 3,
      beatDuration,
      soulCol: 2,
      soulRow: 1,
      nextCueBeat: firstDownbeat,
      cues: [],
      cueCount: 0
    };

    state.soul.x = rhythmGridX(2);
    state.soul.y = rhythmGridY(1);
  }

  function beginVampireGridAttack(config) {
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    const beatDuration = 60 / music.bpm;
    const musicBeat = (elapsed - music.loopStart) / beatDuration;
    const cols = Number.isInteger(config.cols) ? Math.max(3, config.cols) : 7;
    const rows = Number.isInteger(config.rows) ? Math.max(3, config.rows) : 5;
    const movesPerDownbeat = Number.isInteger(config.movesPerDownbeat)
      ? Math.max(1, config.movesPerDownbeat)
      : 1;
    const moveIntervalBeats = Number.isFinite(config.moveIntervalBeats)
      ? Math.max(1, config.moveIntervalBeats)
      : 4;
    const attackDelayBeats = Number.isFinite(config.attackDelayBeats)
      ? Math.max(0.5, config.attackDelayBeats)
      : 2;
    const vampireCount = Number.isInteger(config.vampireCount)
      ? Math.min(4, Math.max(2, config.vampireCount))
      : 2;
    const centerCol = Math.floor(cols / 2);
    const centerRow = Math.floor(rows / 2);
    const horizontalStartDistance = cols - 3;
    const rightStartRow = horizontalStartDistance % 2 === 0
      ? (centerRow + 1 <= rows - 2 ? centerRow + 1 : centerRow - 1)
      : centerRow;
    const vampireStarts = vampireCount > 2
      ? [
          { side: "topLeft", col: 1, row: 1 },
          { side: "topRight", col: cols - 2, row: 1 },
          { side: "bottomLeft", col: 1, row: rows - 2 },
          { side: "bottomRight", col: cols - 2, row: rows - 2 }
        ].slice(0, vampireCount)
      : [
          { side: "left", col: 1, row: centerRow },
          { side: "right", col: cols - 2, row: rightStartRow }
        ];
    const firstDownbeat = Math.ceil((musicBeat + 4) / 4) * 4;

    state.rhythmGrid = {
      mode: "vampire",
      phase: "response",
      cols,
      rows,
      movesPerDownbeat,
      moveIntervalBeats,
      attackDelayBeats,
      beatDuration,
      soulCol: centerCol,
      soulRow: centerRow,
      nextMoveBeat: firstDownbeat,
      vampires: vampireStarts.map((start) => ({
        ...start,
        fromCol: start.col,
        fromRow: start.row,
        movedAtBeat: null
      })),
      cues: []
    };

    state.soul.x = rhythmGridX(centerCol);
    state.soul.y = rhythmGridY(centerRow);
  }

  function beginVampireLordGridAttack(config) {
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    const beatDuration = 60 / music.bpm;
    const musicBeat = (elapsed - music.loopStart) / beatDuration;
    const cols = Number.isInteger(config.cols) ? Math.max(7, config.cols) : 13;
    const rows = Number.isInteger(config.rows) ? Math.max(7, config.rows) : 13;
    const centerCol = Math.floor(cols / 2);
    const centerRow = Math.floor(rows / 2);
    const firstDownbeat = Math.ceil((musicBeat + 4) / 4) * 4;
    const regularStarts = [
      { col: 1, row: 1 },
      { col: cols - 2, row: 1 },
      { col: 1, row: rows - 2 },
      { col: cols - 2, row: rows - 2 }
    ];

    state.rhythmGrid = {
      mode: "vampireLord",
      phase: "response",
      cols,
      rows,
      beatDuration,
      soulCol: centerCol,
      soulRow: rows - 2,
      nextCycleBeat: firstDownbeat,
      vampires: regularStarts.map((start, index) => ({
        side: index % 2 === 0 ? "left" : "right",
        col: start.col,
        row: start.row,
        fromCol: start.col,
        fromRow: start.row,
        movedAtBeat: null,
        blastMargin: 1,
        contactRadius: 8,
        scale: 0.72,
        seekSoul: true
      })),
      vampireLord: {
        col: centerCol,
        row: centerRow,
        fromCol: centerCol,
        fromRow: centerRow,
        movedAtBeat: null,
        blastMargin: 2,
        contactRadius: 12,
        seekSoul: true
      },
      skullSouls: [2, 6, 10].flatMap((row) => [
        { side: "left", row },
        { side: "right", row }
      ]),
      regularCues: [],
      lordCues: [],
      skullCues: []
    };

    state.soul.x = rhythmGridX(centerCol);
    state.soul.y = rhythmGridY(rows - 2);
  }

  function parseRhythmDance(pattern, fallbackSequence) {
    const events = [];
    let beat = 0;
    const directionNames = { U: "up", D: "down", L: "left", R: "right" };

    if (typeof pattern === "string") {
      for (let index = 0; index < pattern.length;) {
        const symbol = pattern[index].toUpperCase();
        if (directionNames[symbol]) {
          events.push({ beat, direction: directionNames[symbol] });
          beat++;
          index++;
          continue;
        }
        if (symbol === "_") {
          events.push({ beat, direction: null });
          beat++;
          index++;
          continue;
        }
        if (symbol === "[") {
          const closeIndex = pattern.indexOf("]", index + 1);
          if (closeIndex >= 0) {
            const groupedSteps = pattern
              .slice(index + 1, closeIndex)
              .toUpperCase()
              .split("")
              .filter((letter) => directionNames[letter] || letter === "_");
            groupedSteps.forEach((letter, groupIndex) => {
              if (!directionNames[letter]) return;
              events.push({
                beat: beat + groupIndex / groupedSteps.length,
                direction: directionNames[letter]
              });
            });
            beat++;
            index = closeIndex + 1;
            continue;
          }
        }
        index++;
      }
    }

    if (events.length === 0 && Array.isArray(fallbackSequence)) {
      fallbackSequence.forEach((direction, index) => {
        events.push({ beat: index, direction });
      });
      beat = fallbackSequence.length;
    }

    return { events, beats: beat };
  }

  function rhythmGridX(col) {
    const cols = Number.isInteger(state.rhythmGrid?.cols) ? state.rhythmGrid.cols : 5;
    return state.box.x + 22 + col * ((state.box.w - 44) / Math.max(1, cols - 1));
  }

  function rhythmGridY(row) {
    const rows = Number.isInteger(state.rhythmGrid?.rows) ? state.rhythmGrid.rows : 3;
    return state.box.y + 22 + row * ((state.box.h - 44) / Math.max(1, rows - 1));
  }

  function rhythmDirectionInput() {
    if (input.right) return "right";
    if (input.up) return "up";
    if (input.left) return "left";
    if (input.down) return "down";
    return null;
  }

  function moveGridPosition(target, direction) {
    if (direction === "right") target.col++;
    if (direction === "up") target.row--;
    if (direction === "left") target.col--;
    if (direction === "down") target.row++;
    const cols = Number.isInteger(state.rhythmGrid?.cols) ? state.rhythmGrid.cols : 5;
    const rows = Number.isInteger(state.rhythmGrid?.rows) ? state.rhythmGrid.rows : 3;
    target.col = clamp(target.col, 0, cols - 1);
    target.row = clamp(target.row, 0, rows - 1);
  }

  function gridPositionAtDanceBeat(events, danceBeat) {
    const cols = Number.isInteger(state.rhythmGrid?.cols) ? state.rhythmGrid.cols : 5;
    const rows = Number.isInteger(state.rhythmGrid?.rows) ? state.rhythmGrid.rows : 3;
    const position = { col: Math.floor(cols / 2), row: Math.floor(rows / 2) };
    for (const event of events) {
      if (event.beat > danceBeat + 0.0001) break;
      if (event.direction) moveGridPosition(position, event.direction);
    }
    return position;
  }

  function hurtForMissedRhythmStep() {
    const beastDodged = consumeBeastDodge();
    if (!beastDodged) {
      damageRandomLivingPlayer(currentAttackDamage());
      playSound(sounds.playerHurt);
      state.shake = 10;
    }
    state.soul.invuln = 16;
    if (partyIsDefeated()) beginPlayerDeath();
  }

  function randomDistinctIndexes(count, maximum, excluded = []) {
    const available = Array.from({ length: maximum }, (_, index) => index)
      .filter((index) => !excluded.includes(index));
    for (let index = available.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [available[index], available[swapIndex]] = [available[swapIndex], available[index]];
    }
    return available.slice(0, count);
  }

  function updateFreestyleGridAttack(grid, musicBeat) {
    while (musicBeat >= grid.nextCueBeat) {
      const firstCue = grid.cueCount === 0;
      grid.cues.push({
        spawnBeat: grid.nextCueBeat,
        rows: firstCue ? [0, 2] : randomDistinctIndexes(2, 3),
        cols: randomDistinctIndexes(2, 5, firstCue ? [2] : []),
        fired: false
      });
      grid.cueCount++;
      grid.nextCueBeat += 4;
    }

    for (const cue of grid.cues) {
      const fireBeat = cue.spawnBeat + 2;
      if (cue.fired || musicBeat < fireBeat) continue;

      cue.fired = true;
      cue.firedAtBeat = fireBeat;
      cue.damaged = false;
      playSound(sounds.arrow);
    }

    const travelDuration = 0.12;
    const arrowLength = 130;
    for (const cue of grid.cues) {
      if (!cue.fired || cue.damaged) continue;
      const travelProgress = (musicBeat - cue.firedAtBeat) * grid.beatDuration / travelDuration;
      if (travelProgress < 0 || travelProgress > 1) continue;

      const rowArrowHead = lerp(state.box.x - 10, state.box.x + state.box.w + arrowLength, travelProgress);
      const colArrowHead = lerp(state.box.y - 10, state.box.y + state.box.h + arrowLength, travelProgress);
      const rowHit = cue.rows.includes(grid.soulRow) &&
        state.soul.x >= rowArrowHead - arrowLength - state.soul.r &&
        state.soul.x <= rowArrowHead + state.soul.r;
      const colHit = cue.cols.includes(grid.soulCol) &&
        state.soul.y >= colArrowHead - arrowLength - state.soul.r &&
        state.soul.y <= colArrowHead + state.soul.r;

      if (rowHit || colHit) {
        cue.damaged = true;
        hurtForMissedRhythmStep();
      }
    }

    grid.cues = grid.cues.filter((cue) => !cue.fired || musicBeat - cue.firedAtBeat < 0.65);
  }

  function vampireHeartMoves(grid, vampire) {
    const margin = Number.isInteger(vampire.blastMargin) ? vampire.blastMargin : 1;
    const minCol = margin;
    const maxCol = grid.cols - 1 - margin;
    const minRow = margin;
    const maxRow = grid.rows - 1 - margin;
    return [
      { direction: "left", dc: -1, dr: 0 },
      { direction: "right", dc: 1, dr: 0 },
      { direction: "up", dc: 0, dr: -1 },
      { direction: "down", dc: 0, dr: 1 }
    ].filter((move) => (
      vampire.col + move.dc >= minCol &&
      vampire.col + move.dc <= maxCol &&
      vampire.row + move.dr >= minRow &&
      vampire.row + move.dr <= maxRow
    ));
  }

  function moveVampireHeartGroup(grid, movingHearts, allHearts, musicBeat) {
    const movingSet = new Set(movingHearts);
    const stationaryHearts = allHearts.filter((heart) => !movingSet.has(heart));
    const plans = [];

    function chooseMove(index) {
      if (index >= movingHearts.length) return true;

      const heart = movingHearts[index];
      const candidates = vampireHeartMoves(grid, heart)
        .map((move) => {
          const nextCol = heart.col + move.dc;
          const nextRow = heart.row + move.dr;
          const playerDistance = Math.abs(nextCol - grid.soulCol) + Math.abs(nextRow - grid.soulRow);
          return {
            move,
            order: heart.seekSoul ? playerDistance + Math.random() * 0.25 : Math.random()
          };
        })
        .sort((a, b) => a.order - b.order)
        .map((entry) => entry.move);

      for (const move of candidates) {
        const next = { col: heart.col + move.dc, row: heart.row + move.dr };
        const hitsStationaryHeart = stationaryHearts.some((other) =>
          other.col === next.col && other.row === next.row
        );
        const conflictsWithPlan = plans.some((plan, otherIndex) => {
          const other = movingHearts[otherIndex];
          const sameDestination = plan.next.col === next.col && plan.next.row === next.row;
          const swapsPlaces = next.col === other.col && next.row === other.row &&
            plan.next.col === heart.col && plan.next.row === heart.row;
          return sameDestination || swapsPlaces;
        });
        if (hitsStationaryHeart || conflictsWithPlan) continue;

        plans.push({ move, next });
        if (chooseMove(index + 1)) return true;
        plans.pop();
      }

      return false;
    }

    if (!chooseMove(0)) return false;

    movingHearts.forEach((vampire, index) => {
      vampire.fromCol = vampire.col;
      vampire.fromRow = vampire.row;
      vampire.col = plans[index].next.col;
      vampire.row = plans[index].next.row;
      vampire.movedAtBeat = musicBeat;
    });
    return true;
  }

  function moveVampireHearts(grid, musicBeat) {
    moveVampireHeartGroup(grid, grid.vampires, grid.vampires, musicBeat);
  }

  function updateVampireGridAttack(grid, musicBeat) {
    while (musicBeat >= grid.nextMoveBeat) {
      grid.cues.push({
        moveBeat: grid.nextMoveBeat,
        fireBeat: grid.nextMoveBeat + grid.attackDelayBeats,
        movesDone: 0,
        positions: null,
        fired: false
      });
      grid.nextMoveBeat += grid.moveIntervalBeats;
    }

    for (const cue of grid.cues) {
      while (cue.movesDone < grid.movesPerDownbeat) {
        const scheduledMoveBeat = cue.moveBeat + cue.movesDone / grid.movesPerDownbeat;
        if (musicBeat < scheduledMoveBeat) break;

        moveVampireHearts(grid, scheduledMoveBeat);
        cue.movesDone++;
        playSound(sounds.wing);

        if (cue.movesDone >= grid.movesPerDownbeat) {
          cue.positions = grid.vampires.map((vampire) => ({ col: vampire.col, row: vampire.row }));
        }
      }

      if (!cue.positions || cue.fired || musicBeat < cue.fireBeat) continue;

      cue.fired = true;
      cue.firedAtBeat = cue.fireBeat;
      cue.judged = false;
      playSound(sounds.arrow);
    }

    const burstDurationBeats = 0.16 / grid.beatDuration;
    grid.cues = grid.cues.filter((cue) => !cue.fired || musicBeat - cue.firedAtBeat < burstDurationBeats);
  }

  function vampireLordLineCells(grid, vampireLord, lineType, fireBeat) {
    const cells = [];
    const staggerBeats = 0.012 / grid.beatDuration;

    for (let row = 0; row < grid.rows; row++) {
      for (let col = 0; col < grid.cols; col++) {
        const colDistance = Math.abs(col - vampireLord.col);
        const rowDistance = Math.abs(row - vampireLord.row);
        const distance = Math.max(colDistance, rowDistance);
        const isCenter = distance === 0;
        const isOnLine = lineType === "x"
          ? colDistance === rowDistance
          : col === vampireLord.col || row === vampireLord.row;
        if (!isCenter && isOnLine) {
          cells.push({
            col,
            row,
            spawnBeat: fireBeat + distance * staggerBeats,
            judged: false
          });
        }
      }
    }

    return cells;
  }

  function updateVampireLordGridAttack(grid, musicBeat) {
    while (musicBeat >= grid.nextCycleBeat) {
      const cycleBeat = grid.nextCycleBeat;
      grid.regularCues.push({
        moveBeat: cycleBeat,
        fireBeat: cycleBeat + 2,
        movesDone: 0,
        positions: null,
        fired: false
      });
      grid.lordCues.push({
        moveBeat: cycleBeat,
        lineBeat: cycleBeat + 1,
        blastBeat: cycleBeat + 2,
        lineTypes: ["x", "plus"],
        moved: false,
        lineFired: false,
        blastFired: false
      });
      grid.skullCues.push({
        fireBeat: cycleBeat + 3,
        fired: false
      });
      grid.nextCycleBeat += 4;
    }

    const allHearts = [...grid.vampires, grid.vampireLord];
    while (true) {
      let nextMoveBeat = Infinity;
      for (const cue of grid.regularCues) {
        if (cue.movesDone < 2) nextMoveBeat = Math.min(nextMoveBeat, cue.moveBeat + cue.movesDone / 2);
      }
      for (const cue of grid.lordCues) {
        if (!cue.moved) nextMoveBeat = Math.min(nextMoveBeat, cue.moveBeat);
      }
      if (musicBeat < nextMoveBeat || !Number.isFinite(nextMoveBeat)) break;

      const regularMoves = grid.regularCues.filter((cue) =>
        cue.movesDone < 2 && Math.abs(cue.moveBeat + cue.movesDone / 2 - nextMoveBeat) < 0.0001
      );
      const lordMoves = grid.lordCues.filter((cue) =>
        !cue.moved && Math.abs(cue.moveBeat - nextMoveBeat) < 0.0001
      );
      const movingHearts = regularMoves.length > 0 ? [...grid.vampires] : [];
      if (lordMoves.length > 0) movingHearts.push(grid.vampireLord);
      moveVampireHeartGroup(grid, movingHearts, allHearts, nextMoveBeat);
      playSound(sounds.wing);

      for (const cue of regularMoves) {
        cue.movesDone++;
        if (cue.movesDone === 2) {
          cue.positions = grid.vampires.map((vampire) => ({ col: vampire.col, row: vampire.row }));
        }
      }
      for (const cue of lordMoves) {
        cue.moved = true;
        cue.position = { col: grid.vampireLord.col, row: grid.vampireLord.row };
      }
    }

    for (const cue of grid.regularCues) {
      if (!cue.positions || cue.fired || musicBeat < cue.fireBeat) continue;
      cue.fired = true;
      cue.firedAtBeat = cue.fireBeat;
      cue.judged = false;
      playSound(sounds.arrow);
    }

    for (const cue of grid.lordCues) {
      if (cue.moved && !cue.lineFired && musicBeat >= cue.lineBeat) {
        cue.lineFired = true;
        cue.lineCells = cue.lineTypes.flatMap((lineType) =>
          vampireLordLineCells(grid, cue.position, lineType, cue.lineBeat)
        );
        playSound(sounds.arrow);
      }
      if (cue.moved && !cue.blastFired && musicBeat >= cue.blastBeat) {
        cue.blastFired = true;
        cue.blastFiredAtBeat = cue.blastBeat;
        cue.blastPosition = { ...cue.position };
        cue.blastJudged = false;
        playSound(sounds.arrow);
      }
    }

    for (const cue of grid.skullCues) {
      if (cue.fired || musicBeat < cue.fireBeat) continue;
      cue.fired = true;
      cue.firedAtBeat = cue.fireBeat;
      cue.judged = false;
      cue.cells = grid.skullSouls.flatMap((skull) => {
        const edgeCol = skull.side === "left" ? 0 : grid.cols - 1;
        const inward = skull.side === "left" ? 1 : -1;
        return [
          { col: edgeCol, row: skull.row - 1 },
          { col: edgeCol, row: skull.row },
          { col: edgeCol, row: skull.row + 1 },
          { col: edgeCol + inward, row: skull.row }
        ];
      });
      playSound(sounds.bombsplosion, 0.5);
    }

    const burstDurationBeats = 0.16 / grid.beatDuration;
    const lineDurationBeats = 0.18 / grid.beatDuration;
    const skullBlastDurationBeats = 0.22 / grid.beatDuration;
    grid.regularCues = grid.regularCues.filter((cue) =>
      !cue.fired || musicBeat - cue.firedAtBeat < burstDurationBeats
    );
    grid.lordCues = grid.lordCues.filter((cue) => {
      if (!cue.blastFired || !cue.lineFired) return true;
      const lastLineBeat = cue.lineCells.reduce((latest, cell) => Math.max(latest, cell.spawnBeat), cue.lineBeat);
      return musicBeat - Math.max(lastLineBeat + lineDurationBeats, cue.blastFiredAtBeat + burstDurationBeats) < 0;
    });
    grid.skullCues = grid.skullCues.filter((cue) =>
      !cue.fired || musicBeat - cue.firedAtBeat < skullBlastDurationBeats
    );
  }

  function vampireHeartPosition(grid, vampire, musicBeat) {
    const moveProgress = vampire.movedAtBeat === null
      ? 1
      : clamp((musicBeat - vampire.movedAtBeat) * grid.beatDuration / 0.12, 0, 1);
    const easedProgress = 1 - Math.pow(1 - moveProgress, 3);
    return {
      x: lerp(rhythmGridX(vampire.fromCol), rhythmGridX(vampire.col), easedProgress),
      y: lerp(rhythmGridY(vampire.fromRow), rhythmGridY(vampire.row), easedProgress)
    };
  }

  function judgeVampireGridBursts(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;

    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const vampireTouched = grid.vampires.some((vampire) => {
      const position = vampireHeartPosition(grid, vampire, musicBeat);
      return Math.hypot(state.soul.x - position.x, state.soul.y - position.y) <= state.soul.r + 10;
    });
    if (vampireTouched && state.soul.invuln <= 0) hurtForMissedRhythmStep();

    for (const cue of grid.cues) {
      if (!cue.fired || cue.judged || musicBeat < cue.fireBeat) continue;

      cue.judged = true;
      const soulHit = cue.positions.some((position) => {
        const colDistance = Math.abs(grid.soulCol - position.col);
        const rowDistance = Math.abs(grid.soulRow - position.row);
        return colDistance <= 1 && rowDistance <= 1 && (colDistance !== 0 || rowDistance !== 0);
      });
      if (soulHit && state.soul.invuln <= 0) hurtForMissedRhythmStep();
    }
  }

  function judgeVampireLordGridHazards(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;

    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const allHearts = [...grid.vampires, grid.vampireLord];
    const vampireTouched = allHearts.some((vampire) => {
      const position = vampireHeartPosition(grid, vampire, musicBeat);
      return Math.hypot(state.soul.x - position.x, state.soul.y - position.y) <=
        state.soul.r + vampire.contactRadius;
    });
    if (vampireTouched && state.soul.invuln <= 0) hurtForMissedRhythmStep();

    for (const cue of grid.regularCues) {
      if (!cue.fired || cue.judged || musicBeat < cue.fireBeat) continue;
      cue.judged = true;
      const soulHit = cue.positions.some((position) => {
        const colDistance = Math.abs(grid.soulCol - position.col);
        const rowDistance = Math.abs(grid.soulRow - position.row);
        return colDistance <= 1 && rowDistance <= 1 && (colDistance !== 0 || rowDistance !== 0);
      });
      if (soulHit && state.soul.invuln <= 0) hurtForMissedRhythmStep();
    }

    for (const cue of grid.lordCues) {
      if (cue.lineFired) {
        for (const cell of cue.lineCells) {
          if (cell.judged || musicBeat < cell.spawnBeat) continue;
          cell.judged = true;
          if (grid.soulCol === cell.col && grid.soulRow === cell.row && state.soul.invuln <= 0) {
            hurtForMissedRhythmStep();
          }
        }
      }

      if (!cue.blastFired || cue.blastJudged || musicBeat < cue.blastBeat) continue;
      cue.blastJudged = true;
      const colDistance = Math.abs(grid.soulCol - cue.blastPosition.col);
      const rowDistance = Math.abs(grid.soulRow - cue.blastPosition.row);
      if (colDistance <= 2 && rowDistance <= 2 && state.soul.invuln <= 0) {
        hurtForMissedRhythmStep();
      }
    }

    for (const cue of grid.skullCues) {
      if (!cue.fired || cue.judged || musicBeat < cue.fireBeat) continue;
      cue.judged = true;
      const soulHit = cue.cells.some((cell) =>
        grid.soulCol === cell.col && grid.soulRow === cell.row
      );
      if (soulHit && state.soul.invuln <= 0) hurtForMissedRhythmStep();
    }
  }

  function updateRhythmGridAttack() {
    const grid = state.rhythmGrid;
    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    if (!grid || !Number.isFinite(elapsed)) return;

    if (grid.mode === "freestyle" || grid.mode === "vampire" || grid.mode === "vampireLord") {
      const musicBeat = (elapsed - music.loopStart) / grid.beatDuration;
      if (grid.mode === "vampireLord") {
        updateVampireLordGridAttack(grid, musicBeat);
        return;
      }
      if (grid.mode === "vampire") {
        updateVampireGridAttack(grid, musicBeat);
        return;
      }
      updateFreestyleGridAttack(grid, musicBeat);
      return;
    }

    if (grid.finished) {
      grid.finishTimer++;
      if (grid.finishTimer >= 60) state.enemyTimer = state.enemyDuration;
      return;
    }

    const musicBeat = (elapsed - music.loopStart) / grid.beatDuration;
    const relativeBeat = musicBeat - grid.introStartBeat;
    grid.beatPhase = ((relativeBeat % 1) + 1) % 1;

    if (relativeBeat < 0) return;

    const demoBeat = relativeBeat - 4;
    const soundLeadBeats = 0.07 / grid.beatDuration;
    while (
      grid.demoSoundStep + 1 < grid.danceEvents.length &&
      grid.danceEvents[grid.demoSoundStep + 1].beat <= demoBeat + soundLeadBeats
    ) {
      grid.demoSoundStep++;
      if (grid.danceEvents[grid.demoSoundStep].direction) playSound(sounds.wing);
    }

    if (relativeBeat < 4) {
      grid.phase = "introCountdown";
      grid.countdown = 4 - Math.floor(relativeBeat);
      return;
    }

    if (demoBeat < grid.danceBeats) {
      grid.phase = "demo";
      grid.countdown = null;
      const step = grid.danceEvents.reduce((count, event) => count + (event.beat <= demoBeat ? 1 : 0), 0) - 1;
      if (step !== grid.demoStep) {
        grid.demoStep = step;
        const feetPosition = gridPositionAtDanceBeat(grid.danceEvents, demoBeat);
        grid.col = feetPosition.col;
        grid.row = feetPosition.row;
      }
      return;
    }

    const restBeat = demoBeat - grid.danceBeats;
    if (restBeat < 4) {
      grid.phase = "rest";
      grid.countdown = null;
      return;
    }

    const countdownBeat = restBeat - 4;
    if (countdownBeat < 4) {
      grid.phase = "countdown";
      grid.countdown = 4 - Math.floor(countdownBeat);
      return;
    }

    const responseBeat = countdownBeat - 4;
    grid.phase = "response";
    grid.countdown = null;

    if (grid.responseStep >= grid.danceEvents.length) {
      grid.finished = true;
      return;
    }

    while (
      grid.preparedResponseStep + 1 < grid.danceEvents.length &&
      grid.danceEvents[grid.preparedResponseStep + 1].beat <= responseBeat
    ) {
      grid.preparedResponseStep++;
      const expectedPosition = { col: grid.expectedCol, row: grid.expectedRow };
      const direction = grid.danceEvents[grid.preparedResponseStep].direction;
      if (direction) moveGridPosition(expectedPosition, direction);
      grid.expectedCol = expectedPosition.col;
      grid.expectedRow = expectedPosition.row;
    }
  }

  function judgeRhythmGridResponse() {
    const grid = state.rhythmGrid;
    if (grid?.mode === "vampireLord") {
      judgeVampireLordGridHazards(grid);
      return;
    }
    if (grid?.mode === "vampire") {
      judgeVampireGridBursts(grid);
      return;
    }
    if (
      !grid ||
      grid.mode === "freestyle" ||
      grid.phase !== "response" ||
      grid.responseStep >= grid.danceEvents.length
    ) return;

    const music = sounds.battleTheme;
    const elapsed = getMusicElapsed(music);
    if (!Number.isFinite(elapsed)) return;

    const responseStartBeat = 12 + grid.danceBeats;
    const responseBeat = (elapsed - music.loopStart) / grid.beatDuration - grid.introStartBeat - responseStartBeat;

    const graceBeats = grid.inputWindow / grid.beatDuration;
    while (
      grid.responseStep < grid.danceEvents.length &&
      responseBeat >= grid.danceEvents[grid.responseStep].beat + graceBeats
    ) {
      if (grid.soulCol !== grid.expectedCol || grid.soulRow !== grid.expectedRow) {
        hurtForMissedRhythmStep();
      }
      grid.responseStep++;
    }

    if (grid.responseStep >= grid.danceEvents.length) {
      grid.finished = true;
      state.enemyDuration = Math.max(state.enemyDuration, state.enemyTimer + 60);
    }
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
      const attackConfig = currentAttackConfig();

      if (typeof attackConfig.enemyDialog === "string" && attackConfig.enemyDialog) {
        const line = attackConfig.enemyDialog;
        attackConfig.enemyDialog = null;
        beginAttackEnemyDialog(line, beginDefenseBoxMorph);
        return;
      }

      beginDefenseBoxMorph();
    }
  }

  function useMenuSelection() {
    const command = menuItems[state.selected];
    const actingIndex = state.partyTurnIndex;
    const actingPlayer = state.party[actingIndex];

    if (!actingPlayer || actingPlayer.hp <= 0) return;

    if (command === "ITEM") {
      beginItemSelection();
      return;
    }

    if (command === "FIGHT") {
      beginFightTargetSelection();
      return;
    }

    if (command === "ACT") {
      beginActSelection();
      return;
    }

    lockPartyAction(actingIndex, command);
    advancePartyTurnOrResolve();
  }

  function useSelectedAct() {
    const act = selectedActorAct();

    if (!act) return;
    if (!canAffordAct(act)) return;

    if (act.target === "ally") {
      beginActTargetSelection();
      return;
    }

    if (act.target === "enemy") {
      beginActEnemyTargetSelection();
      return;
    }

    lockSelectedActAction(null);
  }

  function lockSelectedActAction(targetIndex) {
    const act = selectedActorAct();

    if (!act || !canAffordAct(act)) return;

    state.tp = clamp(state.tp - act.tpCost, 0, 100);
    const actor = state.party[state.partyTurnIndex];
    if (actor) actor.hp = clamp(actor.hp - act.hpCost, 0, actor.maxHP);

    lockPartyAction(state.partyTurnIndex, "ACT", {
      act,
      tpCost: act.tpCost,
      hpCost: act.hpCost,
      targetIndex: Number.isInteger(targetIndex) ? targetIndex : null
    });

    advancePartyTurnOrResolve();
  }

  function lockSelectedFightAction(targetIndex) {
    lockPartyAction(state.partyTurnIndex, "FIGHT", {
      targetIndex: Number.isInteger(targetIndex) ? targetIndex : 0
    });

    advancePartyTurnOrResolve();
  }

  function useSelectedItem() {
    if (state.inventory.length === 0) return;

    const item = state.inventory[state.selectedItem];
    if (!item) return;

    if (item.target === "ally") {
      beginItemTargetSelection();
      return;
    }

    lockSelectedItemAction(null);
  }

  function lockSelectedItemAction(targetIndex) {
    const itemIndex = state.selectedItem;
    const item = state.inventory[itemIndex];

    if (!item) return;

    state.inventory.splice(itemIndex, 1);
    state.selectedItem = clamp(state.selectedItem, 0, Math.max(0, state.inventory.length - 1));

    lockPartyAction(state.partyTurnIndex, "ITEM", {
      item,
      itemIndex,
      itemReserved: true,
      targetIndex: Number.isInteger(targetIndex) ? targetIndex : null
    });

    advancePartyTurnOrResolve();
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
    dissolve.spriteTop = 5 + enemySpriteBobOffset();
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

    updateDissolveParticles(dissolve);
    dissolve.timer++;

    if (dissolve.timer >= dissolve.duration) {
      dissolve.particles = [];
      dissolve.source = null;
      state.phase = PHASE.WIN;
    }
  }

  function updateDissolveParticles(dissolve) {
    for (const particle of dissolve.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx += particle.drift;
      particle.vy -= 0.008;
      particle.life--;
    }

    dissolve.particles = dissolve.particles.filter((particle) => particle.life > 0);
  }

  function releaseDissolveRow(row, dissolve = state.defeatDissolve) {
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
      const onComplete = state.enemyDialogOnComplete || beginEnemyAttack;
      state.enemyDialogOnComplete = null;
      onComplete();
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
      : step.type === "enemyTransform"
        ? 112
        : Math.max(120, Math.ceil(step.text.length / 1.25) + 60);
    const unscaledDuration = Number.isFinite(step.duration) ? step.duration : defaultDuration;
    const duration = step.type === "enemyDialog"
      ? scaleEnemyDialogDuration(unscaledDuration)
      : unscaledDuration;

    if (step.type === "enemyTransform") {
      updateTurnEventEnemyTransformation(duration);
    }

    if (state.turnEvent.timer >= duration) {
      if (step.type === "enemyTransform" && state.turnEvent.transformation) {
        if (step.assignDefault) {
          assignEnemyDefaultSprite(step.sprite, step.lockDefault);
        } else {
          state.enemySpriteKey = state.turnEvent.transformation.targetKey;
        }
        state.turnEvent.transformation = null;
      }
      advanceTurnEvent();
    }
  }

  function updateTurnEventEnemyTransformation(duration) {
    const transformation = state.turnEvent.transformation;
    if (!transformation) return;

    const rowCount = Math.ceil(transformation.spriteSize / transformation.pixelSize);
    const progress = clamp(state.turnEvent.timer / duration, 0, 1);
    const targetRows = Math.floor(easeInOutCubic(progress) * rowCount);
    while (transformation.releasedRows < targetRows) {
      releaseDissolveRow(transformation.releasedRows, transformation);
      transformation.releasedRows++;
    }
    updateDissolveParticles(transformation);
  }

  function updateScene() {
    const scene = state.scene.config;

    if (!scene) {
      beginCurrentTurnAfterScene();
      return;
    }

    if (typeof scene.update === "function") {
      scene.update({
        state,
        timer: state.scene.timer,
        sprites,
        sounds,
        playSound,
        spawnBullet
      });
    }

    state.scene.timer++;

    const duration = Number.isFinite(scene.duration) ? scene.duration : 240;

    if (state.scene.timer >= duration) {
      const onComplete = state.scene.onComplete || beginCurrentTurnAfterScene;
      state.scene.config = null;
      state.scene.onComplete = null;
      state.scene.timer = 0;
      onComplete();
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

    updateRhythmGridAttack();
    moveSoul();
    judgeRhythmGridResponse();
    updateGreenShieldDirection();

    const soulIsMoving = state.soul.x !== previousSoulX || state.soul.y !== previousSoulY;

    if (Array.isArray(turns)) {
      const attackConfig = currentAttackConfig();
      const attackPattern = attackConfig.pattern;

      if (typeof attackPattern === "function") {
        const activeMusic = state.bossPhase === 2 ? sounds.phase2Theme : sounds.battleTheme;
        const musicElapsed = getMusicElapsed(activeMusic);
        const musicBeat = Number.isFinite(musicElapsed) && Number.isFinite(activeMusic.bpm)
          ? (musicElapsed - activeMusic.loopStart) / (60 / activeMusic.bpm)
          : null;
        attackPattern({
          t,
          box,
          state,
          musicElapsed,
          musicBeat,
          purpleLineYs: state.attackType === ATTACK_TYPE.PURPLE ? getPurpleLineYs() : null,
          spawnBullet,
          playSound,
          sounds
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

      updateYellowArrowFeint(b, box);
      b.angle += b.spin;
      b.life--;

      if (!b.harmless && !b.grazed && grazes(state.soul, b) && !collides(state.soul, b)) {
        b.grazed = true;
        state.tp = clamp(state.tp + 1, 0, 100);
        state.grazeGlow = 18;
        playSound(sounds.graze);
      }

      if (state.attackType === ATTACK_TYPE.GREEN && shieldBlocksBullet(b)) {
        playSound(sounds.shieldBlock);
        if (b.red) {
          state.redShieldGlow = 18;
        }
        if (b.shatterShield) {
          shatterGreenShield(b, { damagePlayer: false });
        }
        b.life = 0;
        continue;
      }

      if (
        !b.harmless &&
        (!b.damageOnlyWhileMoving || soulIsMoving) &&
        (!b.damageOnlyWhileStill || !soulIsMoving) &&
        collides(state.soul, b) &&
        state.soul.invuln <= 0
      ) {
        const beastDodged = consumeBeastDodge();
        if (!b.shatterShield) {
          if (!beastDodged) damageRandomLivingPlayer(currentAttackDamage());
        }
        if (!beastDodged) playSound(sounds.playerHurt);
        state.soul.invuln = 50;
        if (!beastDodged) state.shake = 10;
        if (!beastDodged && state.attackType === ATTACK_TYPE.BLUE && b.superBounce) {
          state.soul.y = Math.min(state.soul.y, b.y - state.soul.r);
          state.soul.vy = -18.8;
          state.soul.pitBounce = true;
        }
        if (b.red) {
          state.redArrowReveal = 45;
        }
        if (b.shatterShield) {
          shatterGreenShield(b, { damagePlayer: !beastDodged });
        }

        if (b.type === "arrow") {
          b.life = 0;
        }

        if (partyIsDefeated()) {
          beginPlayerDeath();
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
    if (state.grazeGlow > 0) state.grazeGlow--;
    updateShieldShatter();

    if (state.enemyTimer >= state.enemyDuration && state.phase === PHASE.ENEMY) {
      state.bullets = [];
      state.lastStand.activeAttack = false;

      if (state.currentTurn && state.currentTurn.postAttackEvent) {
        const event = state.currentTurn.postAttackEvent;
        state.box = { ...BOX_RECT.TEXT };
        beginTurnEvent(event, beginChainedEnemyTurn);
        return;
      }

      beginMenu();
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

    if (state.attackType === ATTACK_TYPE.GREEN) {
      soul.x = box.x + box.w / 2;
      soul.y = box.y + box.h / 2;
      soul.vy = 0;
      return;
    }

    if (state.attackType === ATTACK_TYPE.PURPLE) {
      if (state.rhythmGrid) {
        const grid = state.rhythmGrid;
        if (grid.phase === "response" || (grid.phase === "countdown" && grid.countdown === 1)) {
          const direction = rhythmDirectionInput();
          if (direction) {
            const soulPosition = { col: grid.soulCol, row: grid.soulRow };
            moveGridPosition(soulPosition, direction);
            grid.soulCol = soulPosition.col;
            grid.soulRow = soulPosition.row;
          }
        }
        soul.x = rhythmGridX(grid.soulCol);
        soul.y = rhythmGridY(grid.soulRow);
        return;
      }
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
      const support = soul.vy >= 0 ? bluePlatformBelowSoul(soul, 3) : null;
      const grounded = !soul.pitBounce && (soul.y >= floorY - 0.01 || support !== null);

      if (grounded) {
        soul.y = support ? support.y - soul.r : floorY;
        soul.vy = 0;

        if (input.up) {
          soul.vy = -7.7;
        }
      }

      const carriedX = support && soul.vy === 0 ? support.vx : 0;
      soul.x = clamp(soul.x + dx * soul.speed + carriedX, box.x + soul.r, box.x + box.w - soul.r);

      if (!soul.pitBounce && !grounded && !upHeld && soul.vy < -2.8) {
        soul.vy = -2.8;
      }

      soul.vy += soul.pitBounce
        ? 0.55
        : upHeld && soul.vy < 0
          ? 0.24
          : 0.55;
      if (soul.pitBounce && soul.vy >= 0) soul.pitBounce = false;
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

  function updateGreenShieldDirection() {
    if (state.attackType !== ATTACK_TYPE.GREEN) return;

    const click = input.mouseClick;

    if (click) {
      const dx = click.x - state.soul.x;
      const dy = click.y - state.soul.y;

      if (Math.abs(dx) > Math.abs(dy)) {
        state.shieldDirection = dx < 0 ? "left" : "right";
      } else if (Math.abs(dy) > 0 || Math.abs(dx) > 0) {
        state.shieldDirection = dy < 0 ? "up" : "down";
      }
    } else if (input.left) {
      state.shieldDirection = "left";
    } else if (input.right) {
      state.shieldDirection = "right";
    } else if (input.up) {
      state.shieldDirection = "up";
    } else if (input.down) {
      state.shieldDirection = "down";
    }
  }

  function bluePlatformBelowSoul(soul, tolerance) {
    return state.bullets.find((b) =>
      b.solidPlatform &&
      soul.x + soul.r > b.x - b.width / 2 &&
      soul.x - soul.r < b.x + b.width / 2 &&
      Math.abs(soul.y + soul.r - b.y) <= Math.max(tolerance, b.platformCarryTolerance || 0)
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

  function updateLastStandEvent() {
    state.lastStand.timer++;

    if (state.attack.flash > 0) {
      state.attack.flash--;
    }

    if (state.lastStand.timer >= state.lastStand.flashDuration + state.lastStand.messageDuration) {
      beginDamageResult({
        fromHP: state.lastStand.fromHP,
        toHP: state.lastStand.toHP,
        damage: state.lastStand.damage
      });
    }
  }

  function updatePlayerDeath() {
    state.death.timer++;

    if (state.death.timer === 60) {
      playSound(sounds.break1);
    }

    if (state.death.timer === 150) {
      playSound(sounds.break2);
      spawnDeathHeartPieces();
    }

    if (state.death.timer >= 225 && !state.death.determinationStarted) {
      state.death.determinationStarted = true;
      playMusic(sounds.determination);
    }

    for (const piece of state.death.pieces) {
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.vy += 0.08;
      piece.rotation += piece.spin;
      piece.life++;
    }
  }

  function spawnDeathHeartPieces() {
    const x = state.death.x;
    const y = state.death.y;
    const color = state.death.color;
    const leftPieces = [
      [{ x: -11, y: -12 }, { x: -1, y: -7 }, { x: -2, y: 0 }, { x: -10, y: -1 }],
      [{ x: -10, y: -1 }, { x: -2, y: 0 }, { x: -1, y: 7 }, { x: -8, y: 10 }],
      [{ x: -1, y: 7 }, { x: 0, y: 12 }, { x: -8, y: 10 }]
    ];
    const rightPieces = [
      [{ x: 1, y: -7 }, { x: 11, y: -12 }, { x: 10, y: -1 }, { x: 2, y: 0 }],
      [{ x: 2, y: 0 }, { x: 10, y: -1 }, { x: 8, y: 10 }, { x: 1, y: 7 }],
      [{ x: 1, y: 7 }, { x: 8, y: 10 }, { x: 0, y: 12 }]
    ];

    state.death.pieces = leftPieces.concat(rightPieces).map((points, index) => {
      const side = index < leftPieces.length ? -1 : 1;
      const burst = 2.6 + Math.random() * 2.5;

      return {
        x,
        y,
        points,
        color,
        vx: side * burst + (Math.random() - 0.5) * 1.2,
        vy: -2.2 - Math.random() * 2.4,
        rotation: 0,
        spin: side * (0.05 + Math.random() * 0.09),
        life: 0
      };
    });
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

  function grazes(soul, b) {
    const grazeRadius = soul.r + 18;

    if (Number.isFinite(b.width) && Number.isFinite(b.height)) {
      const nearestX = clamp(soul.x, b.x - b.width / 2, b.x + b.width / 2);
      const nearestY = clamp(soul.y, b.y, b.y + b.height);
      const dx = soul.x - nearestX;
      const dy = soul.y - nearestY;
      return dx * dx + dy * dy < grazeRadius * grazeRadius;
    }

    const rr = grazeRadius + b.r;
    const dx = soul.x - b.x;
    const dy = soul.y - b.y;
    return dx * dx + dy * dy < rr * rr;
  }

  function shatterGreenShield(b, { damagePlayer = true } = {}) {
    spawnShieldShatterEffect();
    playSound(sounds.bombsplosion);
    state.attackType = ATTACK_TYPE.NORMAL;
    state.redShieldGlow = 0;
    state.shieldDirection = "up";
    state.shake = Math.max(state.shake, 16);

    if (damagePlayer) {
      damageRandomLivingPlayer(currentAttackDamage());
      state.soul.invuln = Math.max(state.soul.invuln, 50);
    }

    if (b) {
      b.life = 0;
    }

    if (partyIsDefeated()) {
      beginPlayerDeath();
    }
  }

  function spawnShieldShatterEffect() {
    const shield = greenShieldRect();
    const cx = shield.x + shield.w / 2;
    const cy = shield.y + shield.h / 2;

    state.shieldShatter.timer = 0;
    state.shieldShatter.particles = Array.from({ length: 34 }, (_, index) => {
      const angle = index / 34 * Math.PI * 2 + (Math.random() - 0.5) * 0.42;
      const speed = 2.8 + Math.random() * 4.4;

      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        spin: (Math.random() - 0.5) * 0.26
      };
    });
  }

  function updateShieldShatter() {
    if (state.shieldShatter.particles.length === 0) return;

    state.shieldShatter.timer++;

    for (const particle of state.shieldShatter.particles) {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.95;
      particle.vy *= 0.95;
      particle.vy += 0.08;
      particle.spin += 0.02;
    }

    if (state.shieldShatter.timer >= state.shieldShatter.duration) {
      state.shieldShatter.particles = [];
    }
  }

  function greenShieldRect() {
    const s = state.soul;
    const length = 38;
    const thickness = 7;
    const offset = 35;

    if (state.shieldDirection === "left") {
      return { x: s.x - offset - thickness, y: s.y - length / 2, w: thickness, h: length };
    }

    if (state.shieldDirection === "right") {
      return { x: s.x + offset, y: s.y - length / 2, w: thickness, h: length };
    }

    if (state.shieldDirection === "down") {
      return { x: s.x - length / 2, y: s.y + offset, w: length, h: thickness };
    }

    return { x: s.x - length / 2, y: s.y - offset - thickness, w: length, h: thickness };
  }

  function shieldBlocksBullet(b) {
    if (b.harmless || b.blockable === false) return false;

    const shield = greenShieldRect();
    const tip = bulletTip(b);
    const forgiveness = 7;

    if (state.shieldDirection === "left") {
      const faceX = shield.x;
      return b.vx > 0 &&
        tip.x >= faceX &&
        tip.x <= faceX + forgiveness &&
        tip.y >= shield.y - forgiveness &&
        tip.y <= shield.y + shield.h + forgiveness;
    }

    if (state.shieldDirection === "right") {
      const faceX = shield.x + shield.w;
      return b.vx < 0 &&
        tip.x <= faceX &&
        tip.x >= faceX - forgiveness &&
        tip.y >= shield.y - forgiveness &&
        tip.y <= shield.y + shield.h + forgiveness;
    }

    if (state.shieldDirection === "down") {
      const faceY = shield.y + shield.h;
      return b.vy < 0 &&
        tip.y <= faceY &&
        tip.y >= faceY - forgiveness &&
        tip.x >= shield.x - forgiveness &&
        tip.x <= shield.x + shield.w + forgiveness;
    }

    const faceY = shield.y;
    return b.vy > 0 &&
      tip.y >= faceY &&
      tip.y <= faceY + forgiveness &&
      tip.x >= shield.x - forgiveness &&
      tip.x <= shield.x + shield.w + forgiveness;
  }

  function updateYellowArrowFeint(b, box) {
    if (b.type !== "arrow" || !b.yellow || b.yellowTurned) return;

    const centerX = box.x + box.w / 2;
    const centerY = box.y + box.h / 2;
    const distance = Math.hypot(b.x - centerX, b.y - centerY);
    const turnDistance = Number.isFinite(b.yellowTurnDistance) ? b.yellowTurnDistance : 112;

    if (!b.yellowTurning && distance <= turnDistance) {
      b.yellowTurning = true;
      b.yellowTurnTimer = 0;
      b.yellowTurnDuration = Number.isFinite(b.yellowTurnDuration) ? b.yellowTurnDuration : 16;
      b.harmless = true;
      b.yellowStartX = b.x;
      b.yellowStartY = b.y;
      b.yellowStartOrbitAngle = Math.atan2(b.y - centerY, b.x - centerX);
      b.yellowEndOrbitAngle = b.yellowStartOrbitAngle + Math.PI;
      b.yellowStartRadius = Math.max(52, distance);
      b.yellowHoldAngle = b.angle;
      b.vx = 0;
      b.vy = 0;
    }

    if (!b.yellowTurning) return;

    const duration = Math.max(1, b.yellowTurnDuration);
    const progress = Math.min(1, b.yellowTurnTimer / duration);
    const eased = easeInOutCubic(progress);
    const orbitAngle = lerp(b.yellowStartOrbitAngle, b.yellowEndOrbitAngle, eased);
    const orbitRadius = b.yellowStartRadius;

    b.x = centerX + Math.cos(orbitAngle) * orbitRadius;
    b.y = centerY + Math.sin(orbitAngle) * orbitRadius;
    b.angle = b.yellowHoldAngle;
    b.yellowTurnTimer++;

    if (progress >= 1) {
      const speed = Number.isFinite(b.yellowSpeed) ? b.yellowSpeed : 3.5;
      const dx = centerX - b.x;
      const dy = centerY - b.y;
      const travelDistance = Math.max(1, Math.hypot(dx, dy));

      b.yellowTurned = true;
      b.yellowTurning = false;
      b.harmless = false;
      b.vx = dx / travelDistance * speed;
      b.vy = dy / travelDistance * speed;
      b.angle = b.yellowHoldAngle;
    }
  }

  function bulletTip(b) {
    if (b.type !== "arrow") {
      return { x: b.x, y: b.y };
    }

    const length = Number.isFinite(b.length) ? b.length : 34;

    return {
      x: b.x + Math.cos(b.angle) * length / 2,
      y: b.y + Math.sin(b.angle) * length / 2,
    };
  }

  function partySelectionCardRect(index) {
    const gap = 14;
    const outerInset = 52;
    const w = (W - outerInset * 2 - gap * 3) / 4;

    return { x: outerInset + index * (w + gap), y: 185, w, h: 238 };
  }

  function partySelectionHit(x, y) {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];

    for (let i = 0; i < roster.length; i++) {
      const card = partySelectionCardRect(i);
      if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) return i;
    }

    return -1;
  }

  function movePartySelectionCursor(direction) {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
    if (roster.length === 0) return;

    let next = state.partySelection.cursor;

    for (let i = 0; i < roster.length; i++) {
      next = (next + direction + roster.length) % roster.length;
      if (!state.partySelection.picks.includes(next)) {
        state.partySelection.cursor = next;
        playSound(sounds.menuMove);
        return;
      }
    }
  }

  function choosePartySelection(index) {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
    if (!roster[index] || state.partySelection.picks.includes(index)) return;

    state.partySelection.cursor = index;
    state.partySelection.picks.push(index);
    playSound(sounds.menuSelect);

    if (state.partySelection.picks.length === 3) {
      const selectedPlayers = state.partySelection.picks.map((rosterIndex) => roster[rosterIndex]);
      savePartySelection(selectedPlayers);
      state.party = createParty(selectedPlayers);
      syncLegacyPlayerHP();
      resetPartyCommands();
      playMusic(sounds.battleTheme);
      beginMenu();
      return;
    }

    movePartySelectionCursor(1);
  }

  function updatePartySelection({ confirm, cancel, left, right, up, down, mouseClick }) {
    if (cancel && state.partySelection.picks.length > 0) {
      state.partySelection.cursor = state.partySelection.picks.pop();
      playSound(sounds.menuMove);
      return;
    }

    if (mouseClick) {
      const hit = partySelectionHit(mouseClick.x, mouseClick.y);
      if (hit !== -1) choosePartySelection(hit);
      return;
    }

    if (left || up) movePartySelectionCursor(-1);
    if (right || down) movePartySelectionCursor(1);
    if (confirm) choosePartySelection(state.partySelection.cursor);
  }

  function savePartySelection(players) {
    const names = players.map((player) => player.name);
    lastPartySelectionNames = names;

    try {
      sessionStorage.setItem(PARTY_SESSION_KEY, JSON.stringify(names));
    } catch (error) {
      // The in-memory copy still supports retry when storage is unavailable.
    }
  }

  function loadPartySelection() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(PARTY_SESSION_KEY));
      if (Array.isArray(stored) && stored.length === 3) return stored;
    } catch (error) {
      // Fall back to the in-memory selection below.
    }

    return lastPartySelectionNames;
  }

  function restartWithPreviousParty() {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
    const names = loadPartySelection();
    const selectedPlayers = names.map((name) => roster.find((player) => player.name === name)).filter(Boolean);

    resetGame();

    if (selectedPlayers.length !== 3 || new Set(selectedPlayers).size !== 3) return;

    state.partySelection.picks = selectedPlayers.map((player) => roster.indexOf(player));
    state.party = createParty(selectedPlayers);
    syncLegacyPlayerHP();
    resetPartyCommands();
    playMusic(sounds.battleTheme);
    beginMenu();
  }

  function update() {
    if (state.phase === PHASE.BOX_MORPH) {
      updateBoxMorph();
      input.consume();
      return;
    }

    state.frame++;
    if (state.companions.beast.dodgePopupTimer >= 0) {
      state.companions.beast.dodgePopupTimer++;
      if (state.companions.beast.dodgePopupTimer >= 90) {
        state.companions.beast.dodgePopupTimer = -1;
      }
    }

    if (state.textTimer < 9999) state.textTimer++;
    if (state.shake > 0) state.shake--;
    if (state.redShieldGlow > 0) state.redShieldGlow--;
    if (state.redArrowReveal > 0) state.redArrowReveal--;

    const confirm = input.confirm;
    const cancel = input.cancel;
    const enter = input.enter;
    const escape = input.escape;
    const left = input.left;
    const right = input.right;
    const up = input.up;
    const down = input.down;
    const mouseClick = input.mouseClick;

    if (state.phase === PHASE.INTRO) {
      updatePartySelection({ confirm, cancel, left, right, up, down, mouseClick });
    } else if (state.phase === PHASE.MENU) {
      if (cancel) {
        const previousIndex = previousLivingPartyIndex(state.partyTurnIndex);

        if (previousIndex !== -1) {
          state.partyTurnIndex = previousIndex;
          clearPartyCommand(previousIndex);
          state.selected = 0;
          playSound(sounds.menuMove);
        }
      } else if (left) {
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
        beginMenu(undefined, { resetCommands: false });
      } else {
        if (mouseClick) {
          const targetIdx = fightTargetHit(mouseClick.x, mouseClick.y);

          if (targetIdx !== -1) {
            state.selectedFightTarget = targetIdx;
            playSound(sounds.menuSelect);
            lockSelectedFightAction(state.selectedFightTarget);
          }
        } else if (confirm) {
          playSound(sounds.menuSelect);
          lockSelectedFightAction(state.selectedFightTarget);
        }
      }
    } else if (state.phase === PHASE.ACT) {
      if (cancel) {
        beginMenu(undefined, { resetCommands: false });
      } else {
        moveActSelection({ left, right, up, down });

        if (mouseClick) {
          const actIdx = actHit(mouseClick.x, mouseClick.y);

          if (actIdx !== -1) {
            if (actIdx !== state.selectedAct) {
              playSound(sounds.menuMove);
            }

            state.selectedAct = actIdx;

            if (canAffordAct(selectedActorAct())) {
              playSound(sounds.menuSelect);
              useSelectedAct();
            }
          }
        } else if (confirm && canAffordAct(selectedActorAct())) {
          playSound(sounds.menuSelect);
          useSelectedAct();
        }
      }
    } else if (state.phase === PHASE.ACT_TARGET) {
      if (cancel) {
        beginActSelection();
      } else {
        moveActTargetSelection({ up, down });

        if (mouseClick) {
          const targetIdx = itemTargetHit(mouseClick.x, mouseClick.y);

          if (targetIdx !== -1) {
            if (targetIdx !== state.selectedActTarget) {
              playSound(sounds.menuMove);
            }

            state.selectedActTarget = targetIdx;
            playSound(sounds.menuSelect);
            lockSelectedActAction(state.selectedActTarget);
          }
        } else if (confirm) {
          playSound(sounds.menuSelect);
          lockSelectedActAction(state.selectedActTarget);
        }
      }
    } else if (state.phase === PHASE.ACT_ENEMY_TARGET) {
      if (cancel) {
        beginActSelection();
      } else if (mouseClick) {
        const targetIdx = fightTargetHit(mouseClick.x, mouseClick.y);

        if (targetIdx !== -1) {
          state.selectedActEnemyTarget = targetIdx;
          playSound(sounds.menuSelect);
          lockSelectedActAction(state.selectedActEnemyTarget);
        }
      } else if (confirm) {
        playSound(sounds.menuSelect);
        lockSelectedActAction(state.selectedActEnemyTarget);
      }
    } else if (state.phase === PHASE.MERCY_TARGET) {
      if (cancel) {
        beginMenu(undefined, { resetCommands: false });
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
        beginMenu(undefined, { resetCommands: false });
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
    } else if (state.phase === PHASE.ITEM_TARGET) {
      if (cancel) {
        beginItemSelection();
      } else {
        moveItemTargetSelection({ up, down });

        if (mouseClick) {
          const targetIdx = itemTargetHit(mouseClick.x, mouseClick.y);

          if (targetIdx !== -1) {
            if (targetIdx !== state.selectedItemTarget) {
              playSound(sounds.menuMove);
            }

            state.selectedItemTarget = targetIdx;
            playSound(sounds.menuSelect);
            lockSelectedItemAction(state.selectedItemTarget);
          }
        } else if (confirm) {
          playSound(sounds.menuSelect);
          lockSelectedItemAction(state.selectedItemTarget);
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
    } else if (state.phase === PHASE.FIGHT_QTE) {
      if (confirm) {
        lockNextFightQteBar();
      }

      updateFightQte();
    } else if (state.phase === PHASE.PLAYER_EFFECT) {
      updatePlayerEffect();
    } else if (state.phase === PHASE.SPELL_ACTION) {
      updateDamageSpell();
    } else if (state.phase === PHASE.PERSISTENT_EFFECT) {
      updatePersistentEffect();
    } else if (state.phase === PHASE.DAMAGE_RESULT) {
      updateDamageResult();
    } else if (state.phase === PHASE.LAST_STAND_EVENT) {
      updateLastStandEvent();
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
    } else if (state.phase === PHASE.SCENE) {
      updateScene();
    } else if (state.phase === PHASE.ENEMY_DIALOG) {
      updateEnemyDialog();
    } else if (state.phase === PHASE.ENEMY) {
      updateEnemyAttack();
    } else if (state.phase === PHASE.PHASE_TRANSITION) {
      updatePhaseTransition();
    } else if (state.phase === PHASE.LOSE) {
      updatePlayerDeath();

      if (state.death.timer >= 285) {
        if (enter) {
          restartWithPreviousParty();
        } else if (escape) {
          resetGame();
        }
      }
    } else if ((state.phase === PHASE.WIN || state.phase === PHASE.SPARED) && confirm) {
      resetGame();
    }

    input.consume();
  }

  function menuHit(x, y) {
    if (state.partyTurnIndex < 0) return -1;
    const card = getPartyCommandCardRect(state.partyTurnIndex, true);

    for (let i = 0; i < menuItems.length; i++) {
      const option = getCommandOptionRect(card, i);
      if (x >= option.x && x <= option.x + option.w && y >= option.y && y <= option.y + option.h) return i;
    }

    return -1;
  }

  function getPartyCommandCardRect(index, expanded = false) {
    const gap = 1;
    const baseW = (W - gap * 2) / 3;
    const baseX = index * (baseW + gap);
    const baseY = BOX_RECT.TEXT.y - 44;
    const baseH = 44;

    if (!expanded) {
      return { x: baseX, y: baseY, w: baseW, h: baseH };
    }

    return {
      x: baseX,
      y: baseY - 58,
      w: baseW,
      h: baseH + 58
    };
  }

  function getCommandOptionRect(card, index) {
    const gap = 8;
    const fullOptionW = (card.w - 24 - gap * (menuItems.length - 1)) / menuItems.length;
    const optionW = fullOptionW * 0.8;
    const groupW = optionW * menuItems.length + gap * (menuItems.length - 1);
    const startX = card.x + (card.w - groupW) / 2;

    return {
      x: startX + index * (optionW + gap),
      y: card.y + card.h - 51,
      w: optionW,
      h: 34
    };
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

  function getItemMenuLayout(menu) {
    return {
      leftX: menu.x + 34,
      middleX: menu.x + 282,
      descriptionX: menu.x + 580,
      itemColumnWidth: 230,
      descriptionWidth: 282,
      rowHeight: 34,
      rows: Math.max(1, Math.ceil(state.inventory.length / 2)),
      startY: menu.y + 34,
      cursorInset: 12,
      textInset: 34
    };
  }

  function getActMenuLayout(menu) {
    return {
      ...getItemMenuLayout(menu),
      rows: 3
    };
  }

  function getItemTargetLayout(menu) {
    return {
      startY: menu.y + 34,
      rowHeight: 42,
      nameX: menu.x + 82,
      barX: menu.x + 260,
      barW: 300,
      barH: 16
    };
  }

  function itemHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const layout = getItemMenuLayout(menu);

    if (y < layout.startY - 22 || y > layout.startY - 22 + layout.rowHeight * layout.rows) return -1;

    const col = x >= layout.leftX && x <= layout.leftX + layout.itemColumnWidth
      ? 0
      : x >= layout.middleX && x <= layout.middleX + layout.itemColumnWidth
        ? 1
        : -1;
    if (col === -1) return -1;

    const row = Math.floor((y - (layout.startY - 22)) / layout.rowHeight);
    const index = row * 2 + col;
    return index >= 0 && index < state.inventory.length ? index : -1;
  }

  function itemTargetHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const layout = getItemTargetLayout(menu);

    if (x < layout.nameX - 34 || x > layout.barX + layout.barW + 18) return -1;

    const row = Math.floor((y - (layout.startY - 22)) / layout.rowHeight);
    return row >= 0 && row < state.party.length ? row : -1;
  }

  function actHit(x, y) {
    const menu = BOX_RECT.TEXT;
    const layout = getActMenuLayout(menu);

    if (y < layout.startY - 22 || y > layout.startY - 22 + layout.rowHeight * layout.rows) return -1;

    const col = x >= layout.leftX && x <= layout.leftX + layout.itemColumnWidth
      ? 0
      : x >= layout.middleX && x <= layout.middleX + layout.itemColumnWidth
        ? 1
        : -1;
    if (col === -1) return -1;

    const row = Math.floor((y - (layout.startY - 22)) / layout.rowHeight);
    const index = row * 2 + col;
    return index >= 0 && index < currentActorActs().length ? index : -1;
  }

  function moveActSelection({ left, right, up, down }) {
    const actCount = currentActorActs().length;

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

  function moveActTargetSelection({ up, down }) {
    const current = state.selectedActTarget;
    let next = current;

    if (up && current > 0) next = current - 1;
    if (down && current < state.party.length - 1) next = current + 1;

    if (next !== current) {
      state.selectedActTarget = next;
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

  function moveItemTargetSelection({ up, down }) {
    const current = state.selectedItemTarget;
    let next = current;

    if (up && current > 0) next = current - 1;
    if (down && current < state.party.length - 1) next = current + 1;

    if (next !== current) {
      state.selectedItemTarget = next;
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
    stopMusic(sounds.determination);

    state.phase = PHASE.INTRO;
    state.bossPhase = 1;
    state.phase2Started = false;
    state.selected = 0;
    state.selectedFightTarget = 0;
    state.selectedAct = 0;
    state.selectedActTarget = 0;
    state.selectedActEnemyTarget = 0;
    state.selectedItem = 0;
    state.selectedItemTarget = 0;
    state.selectedMercyTarget = 0;
    state.actConditionIndex = 0;
    state.partySelection.cursor = 0;
    state.partySelection.picks = [];
    state.party = createParty(window.PLAYER_DATA);
    syncLegacyPlayerHP();
    state.tp = 0;
    state.grazeGlow = 0;
    resetPartyCommands();
    state.enemyMaxHP = enemyData.maxHP;
    state.enemyHP = enemyData.maxHP;
    state.enemyName = enemyData.name;
    state.enemySpriteKey = null;
    state.enemyDefaultSpriteKey = null;
    state.enemyDefaultSpriteLocked = false;
    state.enemyHitSpriteUntil = 0;
    state.dialogIndex = 0;
    state.enemyDialogIndex = 0;
    state.enemyDialogTimer = 0;
    state.enemyDialogDuration = 0;
    state.enemyDialogMessage = "";
    state.enemyDialogOnComplete = null;
    state.currentTurn = null;
    state.consumedTurns.clear();
    state.turnEvent.steps = [];
    state.turnEvent.index = -1;
    state.turnEvent.timer = 0;
    state.turnEvent.step = null;
    state.turnEvent.transformation = null;
    state.pattern = -1;
    state.box = { ...BOX_RECT.TEXT };
    state.boxMorph.timer = 0;
    state.boxMorph.from = { ...BOX_RECT.TEXT };
    state.boxMorph.to = { ...BOX_RECT.TEXT };
    state.boxMorph.nextPhase = PHASE.MENU;
    state.boxMorph.onComplete = null;
    state.attackType = ATTACK_TYPE.NORMAL;
    state.shieldDirection = "up";
    state.soul.vy = 0;
    state.soul.pitBounce = false;
    state.inventory = createInventory(startingItems());
    state.companions.beast.summoned = false;
    state.companions.beast.summonedFrame = 0;
    state.companions.beast.dodgeArmed = false;
    state.companions.beast.dodgePopupTimer = -1;
    state.bullets = [];
    state.message = enemyData.introMessage;
    state.textTimer = 0;
    state.damageResult.timer = 0;
    state.damageResult.fromHP = enemyData.maxHP;
    state.damageResult.toHP = enemyData.maxHP;
    state.damageResult.damage = 0;
    state.fightQte.timer = 0;
    state.fightQte.actions = [];
    state.fightQte.order = [];
    state.fightQte.activeBars = [];
    state.fightQte.nextOrderIndex = 0;
    state.fightQte.spawnTimer = 60;
    state.fightQte.finished = false;
    state.fightQte.finishTimer = 0;
    state.fightQte.results = [];
    state.fightQte.nextPopupIndex = 0;
    state.fightQte.popupSpawnTimer = 0;
    state.fightQte.damagePopups = [];
    state.playerEffectAction.timer = 0;
    state.playerEffectAction.action = null;
    state.playerEffectAction.queue = [];
    state.playerEffectAction.persistentActions = [];
    state.playerEffectAction.damageActions = [];
    state.playerEffectAction.fightActions = [];
    state.playerEffectAction.messages = [];
    state.spellAction.timer = 0;
    state.spellAction.action = null;
    state.spellAction.queue = [];
    state.spellAction.fightActions = [];
    state.spellAction.messages = [];
    state.spellAction.damage = 0;
    state.spellAction.bonusDamage = 0;
    state.spellAction.damageApplied = false;
    state.spellAction.particles = [];
    state.persistentEffects = [];
    state.starryFormFades = [];
    state.persistentEffectAction.timer = 0;
    state.persistentEffectAction.effect = null;
    state.persistentEffectAction.queue = [];
    state.persistentEffectAction.fightActions = [];
    state.persistentEffectAction.messages = [];
    state.persistentEffectAction.damage = 0;
    state.persistentEffectAction.bonusDamage = 0;
    state.persistentEffectAction.damageApplied = false;
    state.guidingBolt.pending = false;
    state.guidingBolt.active = false;
    state.guidingBolt.targetIndex = 0;
    state.lastStand.used = false;
    state.lastStand.pendingAttack = null;
    state.lastStand.activeAttack = false;
    state.lastStand.timer = 0;
    state.lastStand.damage = 0;
    state.lastStand.fromHP = enemyData.maxHP;
    state.lastStand.toHP = 1;
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
    state.death.timer = 0;
    state.death.determinationStarted = false;
    state.death.pieces = [];
  }

  function draw() {
    const ox = state.shake ? (Math.random() - 0.5) * state.shake : 0;
    const oy = state.shake ? (Math.random() - 0.5) * state.shake : 0;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.clearRect(-20, -20, W + 40, H + 40);
    if (state.phase === PHASE.LOSE) {
      drawPlayerDeath();
      ctx.restore();
      return;
    }

    drawBackground();
    if (state.phase === PHASE.SCENE) {
      drawScene();
    } else {
      drawEnemy();
    }
    drawFightDamagePopups();
    drawUI();
    if (state.phase === PHASE.PLAYER_EFFECT) drawPlayerEffect();
    if (state.phase === PHASE.SPELL_ACTION) drawDamageSpellEffect();
    if (state.phase === PHASE.PERSISTENT_EFFECT) drawPersistentEffectAction();
    if (state.phase === PHASE.ENEMY_DIALOG || (state.phase === PHASE.TURN_EVENT && state.turnEvent.step && state.turnEvent.step.type === "enemyDialog")) drawEnemySpeechBubble();

    if (state.phase === PHASE.DAMAGE_RESULT) drawDamageResult();
    if (state.phase === PHASE.ENEMY) drawDefenseBox();
    if (state.phase === PHASE.TURN_EVENT && state.turnEvent.step && state.turnEvent.step.type === "flash") drawTurnEventFlash();
    if (state.phase === PHASE.LAST_STAND_EVENT) drawLastStandFlash();
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
    if (
      state.phase === PHASE.TURN_EVENT &&
      state.turnEvent.step?.type === "enemyTransform" &&
      state.turnEvent.transformation
    ) {
      drawTurnEventEnemyTransformation();
      return;
    }

    const transitionVisual = getPhaseTransitionVisual();
    const enemySprite = enemySpriteForKey(transitionVisual.spriteKey);
    const spriteSize = enemySpriteSize(transitionVisual.spriteKey);
    const spritePosition = enemySpritePosition(spriteSize, transitionVisual.spriteKey);
    const spriteX = spritePosition.x;
    const spriteTop = spritePosition.y + enemySpriteBobOffset();

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
    ctx.globalAlpha = transitionVisual.alpha * enemyAttackVisibilityAlpha();
    drawPositionedEnemyBody(ctx, enemySprite, spriteX, spriteTop, spriteSize, transitionVisual.spriteKey);
    if (transitionVisual.spriteKey === "lightbulb") {
      drawEnemyLightbulb(spriteX + spriteSize / 2, spriteTop - 3);
    }

    ctx.restore();
  }

  function drawEnemyLightbulb(x, y) {
    const pulse = 0.82 + Math.sin(state.frame / 8) * 0.18;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha *= pulse;
    ctx.fillStyle = "#fff36a";
    ctx.strokeStyle = "#ffd52a";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#fff04a";
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.arc(0, 0, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#c28b2c";
    ctx.fillRect(-4, 8, 8, 5);
    ctx.restore();
  }

  function drawScene() {
    const scene = state.scene.config;

    if (!scene || typeof scene.draw !== "function") {
      drawEnemy();
      return;
    }

    scene.draw({
      ctx,
      state,
      timer: state.scene.timer,
      sprites,
      width: W,
      height: H,
      clamp,
      lerp,
      easeInOutCubic,
      drawSharedBox,
      wrapText,
      drawEnemyBody,
      drawDefeatDissolveParticles
    });
  }

  function enemyAttackVisibilityAlpha() {
    const fadedAlpha = 0.3;
    const fadeFrames = 30;

    if (state.phase === PHASE.ENEMY) {
      return fadedAlpha;
    }

    if (
      state.phase === PHASE.BOX_MORPH &&
      (
        state.boxMorph.nextPhase === PHASE.ENEMY ||
        state.boxMorph.nextPhase === PHASE.MENU
      ) &&
      state.attackType !== ATTACK_TYPE.NORMAL
    ) {
      const progress = clamp(state.boxMorph.timer / fadeFrames, 0, 1);

      if (state.boxMorph.nextPhase === PHASE.ENEMY) {
        return lerp(1, fadedAlpha, progress);
      }

      return lerp(fadedAlpha, 1, progress);
    }

    return 1;
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

  function drawPositionedEnemyBody(renderCtx, enemySprite, x, y, size, spriteKey) {
    const flip = enemySpriteFlip(spriteKey);
    const aspectRatioRoles = currentBossData().preserveSpriteAspectRatio || enemyData.preserveSpriteAspectRatio;
    const spriteRole = spriteKey === "enemy" ? "default" : spriteKey;
    const preserveAspectRatio = enemySprite.ready && (
      aspectRatioRoles === true ||
      (Array.isArray(aspectRatioRoles) && aspectRatioRoles.includes(spriteRole))
    );
    const nativeWidth = enemySprite.naturalWidth || enemySprite.width;
    const nativeHeight = enemySprite.naturalHeight || enemySprite.height;
    const renderWidth = preserveAspectRatio && nativeWidth > 0 && nativeHeight > 0
      ? size * nativeWidth / nativeHeight
      : size;
    const renderX = (size - renderWidth) / 2;

    function drawAt(localX, localY) {
      if (preserveAspectRatio && nativeWidth > 0 && nativeHeight > 0) {
        renderCtx.drawImage(enemySprite, localX + renderX, localY, renderWidth, size);
        return;
      }
      drawEnemyBody(renderCtx, enemySprite, localX, localY, size);
    }

    if (!flip.x && !flip.y) {
      drawAt(x, y);
      return;
    }

    renderCtx.save();
    renderCtx.translate(x + (flip.x ? size : 0), y + (flip.y ? size : 0));
    renderCtx.scale(flip.x ? -1 : 1, flip.y ? -1 : 1);
    drawAt(0, 0);
    renderCtx.restore();
  }

  function captureEnemySprite(spriteKey, size) {
    const source = document.createElement("canvas");
    const sourceCtx = source.getContext("2d");
    const enemySprite = enemySpriteForKey(spriteKey);

    source.width = size;
    source.height = size;
    drawPositionedEnemyBody(sourceCtx, enemySprite, 0, 0, size, spriteKey);
    return source;
  }

  function enemySpriteForKey(spriteKey) {
    const animation = currentBossData().spriteAnimations?.[spriteKey] || enemyData.spriteAnimations?.[spriteKey];
    if (Array.isArray(animation?.frames)) {
      const frames = animation.frames
        .map((src, index) => typeof src === "string" ? sprites[`enemyAnimation:${spriteKey}:${index}`] : null)
        .filter((sprite) => sprite && sprite.ready);

      if (frames.length > 0) {
        const fps = Number.isFinite(animation.fps) && animation.fps > 0 ? animation.fps : 2;
        const frameDuration = 60 / fps;
        return frames[Math.floor(state.frame / frameDuration) % frames.length];
      }
    }

    if (spriteKey === "enemy" && Array.isArray(enemyData.defaultAnimation?.frames)) {
      const frames = enemyData.defaultAnimation.frames
        .map((src, index) => typeof src === "string" ? sprites[`enemyDefaultAnimation:${index}`] : null)
        .filter((sprite) => sprite && sprite.ready);

      if (frames.length > 0) {
        const fps = Number.isFinite(enemyData.defaultAnimation.fps) && enemyData.defaultAnimation.fps > 0
          ? enemyData.defaultAnimation.fps
          : 2;
        const frameDuration = 60 / fps;
        return frames[Math.floor(state.frame / frameDuration) % frames.length];
      }
    }

    return sprites[spriteKey] || sprites.enemy;
  }

  function enemySpriteBobOffset() {
    const bobAmount = Number.isFinite(currentBossData().spriteBob)
      ? currentBossData().spriteBob
      : 4;
    return Math.sin(state.frame / 24) * bobAmount;
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

    drawDefeatDissolveParticles(dissolve.particles, x, y);
  }

  function drawTurnEventEnemyTransformation() {
    const transformation = state.turnEvent.transformation;
    const step = state.turnEvent.step;
    if (!transformation || !step) return;

    const duration = Number.isFinite(step.duration) ? step.duration : 112;
    const progress = clamp(state.turnEvent.timer / duration, 0, 1);
    const removedHeight = Math.floor(easeInOutCubic(progress) * transformation.spriteSize);
    const remainingHeight = transformation.spriteSize - removedHeight;

    if (transformation.targetSource && removedHeight > 0) {
      ctx.drawImage(
        transformation.targetSource,
        0,
        0,
        transformation.spriteSize,
        removedHeight,
        transformation.x,
        transformation.y,
        transformation.spriteSize,
        removedHeight
      );
    }

    if (transformation.source && remainingHeight > 0) {
      ctx.drawImage(
        transformation.source,
        0,
        removedHeight,
        transformation.spriteSize,
        remainingHeight,
        transformation.x,
        transformation.y + removedHeight,
        transformation.spriteSize,
        remainingHeight
      );
    }
    drawDefeatDissolveParticles(
      transformation.particles,
      transformation.x,
      transformation.y
    );
  }

  function drawDefeatDissolveParticles(particles, x, y) {
    for (const particle of particles) {
      ctx.save();
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.fillStyle = particle.color;
      ctx.fillRect(x + particle.x, y + particle.y, particle.size, particle.size);
      ctx.restore();
    }
  }

  function activeEnemySpriteKey() {
    const defaultSpriteKey = state.enemyDefaultSpriteKey ||
      (state.ultimate.transformed ? "ultimateEnemy" : state.bossPhase === 2 ? "phase2Enemy" : "enemy");
    if (state.enemyDefaultSpriteLocked) return defaultSpriteKey;

    const hitSpriteKey = currentBossData().hitSprite || enemyData.hitSprite;
    if (
      state.frame < state.enemyHitSpriteUntil &&
      typeof hitSpriteKey === "string" &&
      sprites[hitSpriteKey]
    ) {
      return hitSpriteKey;
    }

    if (state.enemySpriteKey) return state.enemySpriteKey;
    if (state.ultimate.transformed) return "ultimateEnemy";
    return defaultSpriteKey;
  }

  function triggerEnemyHitSprite(duration = 60) {
    if (state.enemyDefaultSpriteLocked) return;
    const hitSpriteKey = currentBossData().hitSprite || enemyData.hitSprite;
    if (typeof hitSpriteKey !== "string" || !sprites[hitSpriteKey]) return;

    state.enemyHitSpriteUntil = Math.max(state.enemyHitSpriteUntil, state.frame + duration);
  }

  function enemySpriteSize(spriteKey) {
    const sizes = currentBossData().spriteSizes || enemyData.spriteSizes;
    const fallback = Number.isFinite(enemyData.spriteSize) ? enemyData.spriteSize : 280;

    if (!sizes || typeof sizes !== "object") return fallback;
    if (Number.isFinite(sizes[spriteKey])) return sizes[spriteKey];
    if (spriteKey === "enemy" && Number.isFinite(sizes.default)) return sizes.default;
    if (spriteKey === "phase2Enemy" && Number.isFinite(sizes.phase2)) return sizes.phase2;
    if (spriteKey === "ultimateEnemy" && Number.isFinite(sizes.ultimate)) return sizes.ultimate;

    if (typeof spriteKey === "string" && spriteKey.startsWith("attackSprite:")) {
      const spritePath = spriteKey.slice("attackSprite:".length);
      return Number.isFinite(sizes[spritePath]) ? sizes[spritePath] : fallback;
    }

    return fallback;
  }

  function enemySpritePosition(spriteSize, spriteKey) {
    const positions = currentBossData().spritePositions || enemyData.spritePositions;
    const defaultPosition = {
      x: W - spriteSize - 42,
      y: 72
    };

    if (!positions || typeof positions !== "object") return defaultPosition;

    const position = positions[spriteKey] ||
      (spriteKey === "enemy" ? positions.default : null) ||
      (spriteKey === "phase2Enemy" ? positions.phase2 : null) ||
      (spriteKey === "ultimateEnemy" ? positions.ultimate : null);

    if (!position || typeof position !== "object") return defaultPosition;

    return {
      x: Number.isFinite(position.x) ? position.x : defaultPosition.x,
      y: Number.isFinite(position.y) ? position.y : defaultPosition.y
    };
  }

  function enemyDamagePopupPosition(actorIndex = 0) {
    const spriteKey = activeEnemySpriteKey();
    const size = enemySpriteSize(spriteKey);
    const position = enemySpritePosition(size, spriteKey);
    const offsets = [
      { x: 28, y: -26 },
      { x: -32, y: 0 },
      { x: 22, y: 28 }
    ];
    const offset = offsets[actorIndex] || offsets[0];

    return {
      x: position.x + size / 2 + offset.x,
      y: position.y + size / 2 + offset.y
    };
  }

  function enemySpriteFlip(spriteKey) {
    const flips = currentBossData().spriteFlips || enemyData.spriteFlips;
    const defaultFlip = { x: false, y: false };

    if (!flips || typeof flips !== "object") return defaultFlip;

    const flip = flips[spriteKey] ||
      (spriteKey === "enemy" ? flips.default : null) ||
      (spriteKey === "phase2Enemy" ? flips.phase2 : null) ||
      (spriteKey === "ultimateEnemy" ? flips.ultimate : null);

    if (flip === true) return { x: false, y: true };
    if (!flip || typeof flip !== "object") return defaultFlip;

    return {
      x: flip.x === true,
      y: flip.y === true
    };
  }

  function attackSpriteKey(sprite) {
    if (typeof sprite !== "string" || !sprite) {
      return state.bossPhase === 2 ? "phase2Enemy" : "enemy";
    }

    if (sprites[sprite]) return sprite;
    if (currentBossData().spriteAnimations?.[sprite] || enemyData.spriteAnimations?.[sprite]) return sprite;

    const generatedKey = `attackSprite:${sprite}`;
    return sprites[generatedKey] ? generatedKey : state.bossPhase === 2 ? "phase2Enemy" : "enemy";
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
    if (state.phase === PHASE.INTRO || state.phase === PHASE.WIN || state.phase === PHASE.MERCY_FADE || state.phase === PHASE.SPARED || state.phase === PHASE.ULTIMATE_TRANSITION || state.phase === PHASE.DEFEAT_DISSOLVE || state.phase === PHASE.SCENE) return;

    drawStats();
    drawTextPanel();

    if (state.phase === PHASE.FIGHT_TARGET) {
      drawFightTargetMenu();
    } else if (state.phase === PHASE.ACT) {
      drawActMenu();
    } else if (state.phase === PHASE.ACT_TARGET) {
      drawActTargetMenu();
    } else if (state.phase === PHASE.ACT_ENEMY_TARGET) {
      drawActEnemyTargetMenu();
    } else if (state.phase === PHASE.FIGHT_QTE) {
      drawFightQte();
    } else if (state.phase === PHASE.PLAYER_EFFECT) {
      // Player-effect feedback renders over the cleared text panel.
    } else if (state.phase === PHASE.SPELL_ACTION) {
      // The scripted spell renders over the cleared text panel.
    } else if (state.phase === PHASE.PERSISTENT_EFFECT) {
      // Persistent effects render over the cleared text panel.
    } else if (state.phase === PHASE.ITEM) {
      drawItemMenu();
    } else if (state.phase === PHASE.ITEM_TARGET) {
      drawItemTargetMenu();
    } else if (state.phase === PHASE.MERCY_TARGET) {
      drawMercyTargetMenu();
    } else if (state.phase === PHASE.ATTACK || state.phase === PHASE.DAMAGE_RESULT || (state.phase === PHASE.ENEMY_DIALOG && state.attack.result)) {
      drawAttackMeter();
    } else if (state.phase === PHASE.BOX_MORPH) {
      if (state.boxMorph.nextPhase === PHASE.ENEMY) drawBattlefieldSpin();
    } else if (state.phase !== PHASE.ENEMY) {
      drawDialogueBox();
    }

    if (shouldShowPartyCommandCards()) {
      drawMenu();
    }
  }

  function shouldShowPartyCommandCards() {
    return state.phase === PHASE.MENU ||
      state.phase === PHASE.MESSAGE ||
      state.phase === PHASE.ENEMY_DIALOG ||
      state.phase === PHASE.TURN_EVENT ||
      state.phase === PHASE.PLAYER_EFFECT ||
      state.phase === PHASE.SPELL_ACTION ||
      state.phase === PHASE.PERSISTENT_EFFECT ||
      state.phase === PHASE.BOX_MORPH ||
      shouldShowCollapsedCardsDuringAttack();
  }

  function shouldShowCollapsedCardsDuringAttack() {
    return state.phase === PHASE.ENEMY && !state.lastStand.activeAttack;
  }

  function drawDialogueBox() {
    const { x, y, w } = state.box;

    drawSharedBox(state.box);

    ctx.fillStyle = "#fff";
    ctx.font = "24px Courier New";
    ctx.textAlign = "left";

    const isLastStandFlash = state.phase === PHASE.LAST_STAND_EVENT && state.lastStand.timer < state.lastStand.flashDuration;
    const message = isLastStandFlash
      ? ""
      : typeof state.message === "string" ? state.message : "* ...";
    const textTimer = state.phase === PHASE.LAST_STAND_EVENT
      ? Math.max(0, state.lastStand.timer - state.lastStand.flashDuration)
      : state.textTimer;
    const visible = message.slice(0, Math.min(message.length, Math.floor(textTimer * 1.25)));

    wrapText(visible, x + 28, y + 38, w - 56, 30);
  }

  function drawEnemySpeechBubble() {
    const w = 264;
    const h = 103;
    const r = 13;
    const spriteKey = activeEnemySpriteKey();
    const spriteSize = enemySpriteSize(spriteKey);
    const enemyPosition = enemySpritePosition(spriteSize, spriteKey);
    const x = clamp(enemyPosition.x - w - 26, 20, W - w - 20);
    const y = clamp(enemyPosition.y - h - 17, 20, BOX_RECT.TEXT.y - h - 20);
    const tailBaseY = y + h;
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
    ctx.moveTo(x + w - 48, tailBaseY);
    ctx.lineTo(x + w + 14, tailBaseY + 20);
    ctx.lineTo(x + w - 20, tailBaseY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#000";
    ctx.font = "16px Courier New";
    ctx.textAlign = "left";
    wrapText(visible, x + 18, y + 28, w - 36, 22);
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

  function drawLastStandFlash() {
    if (state.lastStand.timer >= state.lastStand.flashDuration) return;

    const progress = clamp(state.lastStand.timer / state.lastStand.flashDuration, 0, 1);

    ctx.save();
    ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.88;
    ctx.fillStyle = "#d00018";
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  function drawSharedBox(box) {
    if (
      box.x === BOX_RECT.TEXT.x &&
      box.y === BOX_RECT.TEXT.y &&
      box.w === BOX_RECT.TEXT.w &&
      box.h === BOX_RECT.TEXT.h
    ) {
      drawTextPanel();
      return;
    }

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.fillStyle = "#000";
    ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
  }

  function drawTextPanel() {
    const box = BOX_RECT.TEXT;

    ctx.fillStyle = "#000";
    ctx.fillRect(box.x, box.y, box.w, box.h);
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
    drawTPBar();
    drawStarryFormCompanions();
    drawPartySprites();
    drawBeastCompanion();
  }

  function drawTPBar() {
    const x = 24;
    const y = 78;
    const w = 24;
    const h = 205;
    const fillH = Math.round(h * state.tp / 100);

    ctx.save();
    drawTPBarPath(x, y, w, h);
    ctx.fillStyle = HUD_MAROON;
    ctx.fill();

    ctx.save();
    drawTPBarPath(x, y, w, h);
    ctx.clip();
    ctx.fillStyle = COMMAND_OPTION_ORANGE;
    ctx.fillRect(x, y + h - fillH, w, fillH);
    ctx.restore();

    drawTPBarPath(x, y, w, h);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = "18px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("TP", x + w / 2, y - 14);
    ctx.fillText(`${Math.round(state.tp)}%`, x + w / 2, y + h + 24);
    ctx.restore();
  }

  function drawTPBarPath(x, y, w, h) {
    ctx.beginPath();
    ctx.moveTo(x + w, y);
    ctx.lineTo(x + w, y + h - w);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + w);
    ctx.closePath();
  }

  function drawPartySprites() {
    for (let i = 0; i < state.party.length; i++) {
      const player = state.party[i];
      const x = 93;
      const y = 78 + i * 124;

      drawPartySprite(player, x, y);
    }
  }

  function starryFormPosition(actorIndex) {
    const actor = state.party[actorIndex];
    const partySpriteSize = 78;
    const actorSize = partySpriteSize * (actor?.spriteScale || 1);
    const actorTop = 78 + actorIndex * 124 + (partySpriteSize - actorSize) / 2;
    const size = 105;

    return {
      x: 111,
      y: actorTop + actorSize - size,
      size
    };
  }

  function drawStarryFormCompanions() {
    for (const effect of state.persistentEffects) {
      if (effect.group !== "starryForm") continue;

      const actorIndex = state.party.findIndex((player) => player.name === effect.actorName);
      const actor = state.party[actorIndex];
      if (!actor || actor.hp <= 0) continue;

      drawStarryFormCompanion(actor, actorIndex, effect.sprite, 1);
    }

    state.starryFormFades = state.starryFormFades.filter((effect) => {
      const fadeProgress = clamp(
        (state.frame - effect.startedFrame) / STARRY_FORM_FADE_FRAMES,
        0,
        1
      );
      if (fadeProgress >= 1) return false;

      const actorIndex = state.party.findIndex((player) => player.name === effect.actorName);
      const resolvedActorIndex = actorIndex >= 0 ? actorIndex : effect.actorIndex;
      const actor = state.party[resolvedActorIndex];
      if (!actor) return false;

      drawStarryFormCompanion(actor, resolvedActorIndex, effect.sprite, 1 - fadeProgress);
      return true;
    });
  }

  function drawStarryFormCompanion(actor, actorIndex, role, alpha) {
    const position = starryFormPosition(actorIndex);
    const sprite = playerSpriteForRole(actor, role);
    if (!sprite) return;

    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.drawImage(sprite, position.x, position.y, position.size, position.size);
    ctx.restore();
  }

  function playerSpriteForRole(player, role) {
    if (!player || typeof role !== "string") return null;

    const animation = player.spriteAnimations?.[role] || (role === "default" ? player.defaultAnimation : null);
    const frameCount = Array.isArray(animation?.spriteKeys)
      ? animation.spriteKeys.length
      : Array.isArray(animation?.frames)
        ? animation.frames.length
        : 5;
    const animationKeys = Array.isArray(animation?.spriteKeys)
      ? animation.spriteKeys
      : Array.from({ length: frameCount }, (_, index) => `${player.name}:${role}Animation:${index}`);
    const frames = animationKeys.map((key) => sprites[key]).filter((sprite) => sprite && sprite.ready);

    if (frames.length > 0) {
      const fps = Number.isFinite(animation?.fps) && animation.fps > 0 ? animation.fps : 2;
      const frameDuration = 60 / fps;
      return frames[Math.floor(state.frame / frameDuration) % frames.length];
    }

    const spriteKey = player.spriteKeys?.[role] || `${player.name}:${role}`;
    const sprite = sprites[spriteKey];
    return sprite && sprite.ready ? sprite : null;
  }

  function beastCompanionPosition() {
    const buckyIndex = state.party.findIndex((player) => player.name === "BUCKY");
    if (buckyIndex === -1) return null;

    const bucky = state.party[buckyIndex];
    const baseSize = 78;
    const buckySize = baseSize * bucky.spriteScale;
    const buckyX = 93 + (baseSize - buckySize) / 2;
    const buckyY = 78 + buckyIndex * 124 + (baseSize - buckySize) / 2;
    const size = 105;

    return {
      x: buckyX + buckySize - 40,
      napX: buckyX + (buckySize - size) / 2,
      y: buckyY + buckySize - size,
      size,
      buckyIndex
    };
  }

  function drawBeastCompanion() {
    if (!state.companions.beast.summoned) return;

    const position = beastCompanionPosition();
    if (!position) return;

    let alpha = clamp((state.frame - state.companions.beast.summonedFrame) / 24, 0, 1);
    const charging = state.phase === PHASE.SPELL_ACTION &&
      state.spellAction.action?.act?.script === "beastCharge";

    if (charging) {
      alpha = state.spellAction.timer < 78
        ? 0
        : clamp((state.spellAction.timer - 78) / 24, 0, 1);
    }

    if (alpha <= 0) return;
    const bucky = state.party[position.buckyIndex];
    const buckyIsDown = bucky.hp <= 0;
    const sprite = playerSpriteForRole(bucky, buckyIsDown ? "beast_nap" : "beast_sitting");
    if (!sprite) return;

    // The summoned beast normally sits to Bucky's right. When Bucky is down,
    // center its nap sprite on his party slot so it rests over the tombstone.
    const x = buckyIsDown ? position.napX : position.x;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite, x, position.y, position.size, position.size);
    ctx.restore();

    drawBeastDodgePopup({ ...position, x });
  }

  function drawBeastDodgePopup(position) {
    const timer = state.companions.beast.dodgePopupTimer;
    if (timer < 0) return;

    const enterProgress = clamp(timer / 12, 0, 1);
    const exitProgress = clamp((timer - 60) / 30, 0, 1);
    const x = position.x + position.size / 2 - 38 * (1 - enterProgress) + 52 * exitProgress;
    const y = position.y - 8;
    const alpha = enterProgress * (1 - exitProgress);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 27px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#fff";
    ctx.strokeText("dodge", x, y);
    ctx.fillText("dodge", x, y);
    ctx.restore();
  }

  function drawPartySprite(player, x, y) {
    const size = 78;
    const idleRole = player.temporaryDamageBuffTurns > 0 ? "starshot" : "default";
    const role = player.hp > 0 ? player.actionSpriteRole || idleRole : "down";
    const sprite = playerSpriteForRole(player, role) || playerSpriteForRole(player, "default");
    const alpha = player.hp > 0 ? 1 : 0.35;

    ctx.save();
    ctx.globalAlpha = alpha;

    if (sprite && sprite.ready) {
      const scaledSize = size * player.spriteScale;
      ctx.drawImage(sprite, x + (size - scaledSize) / 2, y + (size - scaledSize) / 2, scaledSize, scaledSize);
    } else {
      ctx.fillStyle = "#111";
      ctx.strokeStyle = player.cardColor;
      ctx.lineWidth = 4;
      ctx.fillRect(x, y, size, size);
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = player.cardColor;
      ctx.fillRect(x + 18, y + 18, size - 36, size - 24);
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 28, y + 32, 7, 7);
      ctx.fillRect(x + 43, y + 32, 7, 7);
    }

    ctx.restore();
  }

  function drawMenu() {
    drawCardRules();

    for (let i = 0; i < state.party.length; i++) {
      drawPartyCommandCard(i);
    }
  }

  function drawCardRules() {
    const base = getPartyCommandCardRect(0, false);

    ctx.save();
    ctx.strokeStyle = HUD_MAROON;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, base.y);
    ctx.lineTo(W, base.y);
    ctx.moveTo(0, base.y + base.h);
    ctx.lineTo(W, base.y + base.h);
    ctx.stroke();
    ctx.restore();
  }

  function drawPartyCommandCard(index) {
    const player = state.party[index];
    const active = state.phase === PHASE.MENU && index === state.partyTurnIndex && player.hp > 0;
    const card = getPartyCommandCardRect(index, active);
    const hpRatio = player.maxHP > 0 ? player.hp / player.maxHP : 0;

    ctx.save();
    ctx.fillStyle = active ? "#050505" : "#000";
    ctx.fillRect(card.x, card.y, card.w, card.h);
    if (active) {
      drawActiveCardScanLines(player, card);

      ctx.strokeStyle = player.hp > 0 ? player.cardColor : "#555";
      ctx.lineWidth = 4;
      ctx.strokeRect(card.x, card.y, card.w, card.h);

      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(card.x, card.y + 44);
      ctx.lineTo(card.x + card.w, card.y + 44);
      ctx.stroke();
    }

    drawPartyCardSummary(player, card, active, hpRatio, state.partyCommands[index]);

    if (active) drawCommandIcons(card);

    ctx.restore();
  }

  function drawActiveCardScanLines(player, card) {
    const spawnInterval = 30;
    const lifetime = 60;
    const elapsed = Math.max(0, state.frame - state.commandHudAnimationStartFrame);
    const latestSpawn = Math.floor(elapsed / spawnInterval);
    const firstVisibleSpawn = Math.max(0, latestSpawn - 1);
    const fightOption = getCommandOptionRect(card, 0);
    const defendOption = getCommandOptionRect(card, menuItems.length - 1);

    ctx.save();
    ctx.strokeStyle = player.cardColor;
    ctx.lineWidth = 2;

    for (let spawn = firstVisibleSpawn; spawn <= latestSpawn; spawn++) {
      const age = elapsed - spawn * spawnInterval;
      if (age < 0 || age >= lifetime) continue;

      const timeProgress = age / lifetime;
      const travelProgress = 0.8 * timeProgress + 0.2 * timeProgress * timeProgress;
      const leftX = card.x + (fightOption.x - card.x) * travelProgress;
      const rightX = card.x + card.w + (defendOption.x + defendOption.w - card.x - card.w) * travelProgress;

      ctx.globalAlpha = 1 - timeProgress;
      ctx.beginPath();
      ctx.moveTo(leftX, card.y + card.h);
      ctx.lineTo(leftX, card.y + 44);
      ctx.moveTo(rightX, card.y + card.h);
      ctx.lineTo(rightX, card.y + 44);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawPartyCardSummary(player, card, active, hpRatio, command) {
    const summaryY = card.y + 6;
    const iconSize = 28;
    const iconX = card.x + 12;
    const iconY = summaryY;
    const nameX = card.x + 48;
    const barX = card.x + 190;
    const barY = summaryY + 18;
    const labelY = summaryY + 24;
    const barW = card.w - 204;
    const barH = 11;

    drawPartyMiniIcon(player, iconX, iconY, iconSize);

    ctx.fillStyle = player.hp > 0 ? "#fff" : "#777";
    ctx.font = "20px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(player.name, nameX, labelY);

    ctx.fillStyle = "#fff";
    ctx.font = "12px Courier New";
    ctx.fillText("HP", barX - 25, labelY);

    ctx.fillStyle = "#3b0000";
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = player.hp > 0 ? player.cardColor : "#555";
    ctx.fillRect(barX, barY, Math.max(0, barW * hpRatio), barH);

    ctx.fillStyle = "#fff";
    ctx.font = "14px Courier New";
    ctx.textAlign = "right";
    ctx.fillText(`${player.hp}/${player.maxHP}`, barX + barW, barY - 2);

  }

  function drawPartyMiniIcon(player, x, y, size) {
    const sprite = playerSpriteForRole(player, "icon");

    ctx.save();
    ctx.fillStyle = "#050505";
    ctx.fillRect(x, y, size, size);

    if (sprite && sprite.ready) {
      const scaledSize = size * player.spriteScale * 3;
      ctx.drawImage(sprite, x + (size - scaledSize) / 2, y + (size - scaledSize) / 2, scaledSize, scaledSize);
    } else {
      ctx.strokeStyle = player.hp > 0 ? player.cardColor : "#555";
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, size, size);
      ctx.fillStyle = player.hp > 0 ? player.cardColor : "#555";
      ctx.fillRect(x + 8, y + 8, size - 16, size - 10);
      ctx.fillStyle = "#000";
      ctx.fillRect(x + 12, y + 15, 4, 4);
      ctx.fillRect(x + 19, y + 15, 4, 4);
    }

    ctx.restore();
  }

  function drawCommandIcons(card) {
    for (let i = 0; i < menuItems.length; i++) {
      const option = getCommandOptionRect(card, i);
      const selected = i === state.selected;

      ctx.fillStyle = selected ? "#2a2100" : "#050505";
      ctx.strokeStyle = selected ? COMMAND_OPTION_HIGHLIGHT : COMMAND_OPTION_ORANGE;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.fillRect(option.x, option.y, option.w, option.h);
      ctx.strokeRect(option.x, option.y, option.w, option.h);

      const iconX = option.x + option.w / 2;
      const iconY = option.y + option.h / 2;
      ctx.save();
      ctx.translate(iconX, iconY);
      ctx.scale(0.8, 0.8);
      ctx.translate(-iconX, -iconY);
      drawCommandIcon(menuItems[i], iconX, iconY, selected ? COMMAND_OPTION_HIGHLIGHT : COMMAND_OPTION_ORANGE);
      ctx.restore();

      if (selected) {
        ctx.fillStyle = COMMAND_OPTION_HIGHLIGHT;
        ctx.font = "11px Courier New";
        ctx.textAlign = "center";
        ctx.fillText(menuItems[i], option.x + option.w / 2, option.y + option.h + 13);
      }
    }
  }

  function drawCommandIcon(command, cx, cy, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (command === "FIGHT") {
      ctx.lineCap = "square";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx - 12, cy - 12);
      ctx.lineTo(cx + 6, cy + 6);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 12);
      ctx.lineTo(cx + 12, cy);
      ctx.stroke();
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx + 7, cy + 7);
      ctx.lineTo(cx + 13, cy + 13);
      ctx.stroke();
      ctx.fillRect(cx + 10, cy + 10, 6, 6);
    } else if (command === "ACT") {
      ctx.font = "bold 25px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("ACT", cx, cy + 1);
    } else if (command === "ITEM") {
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 9);
      ctx.lineTo(cx - 9, cy - 4);
      ctx.quadraticCurveTo(cx - 16, cy + 2, cx - 11, cy + 12);
      ctx.quadraticCurveTo(cx, cy + 17, cx + 11, cy + 12);
      ctx.quadraticCurveTo(cx + 16, cy + 2, cx + 9, cy - 4);
      ctx.lineTo(cx + 5, cy - 9);
      ctx.closePath();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 8, cy - 9);
      ctx.lineTo(cx + 8, cy - 9);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 13);
      ctx.lineTo(cx, cy - 9);
      ctx.lineTo(cx + 5, cy - 13);
      ctx.stroke();
    } else if (command === "DEFEND") {
      ctx.beginPath();
      ctx.moveTo(cx, cy - 15);
      ctx.lineTo(cx + 14, cy - 8);
      ctx.lineTo(cx + 10, cy + 9);
      ctx.lineTo(cx, cy + 15);
      ctx.lineTo(cx - 10, cy + 9);
      ctx.lineTo(cx - 14, cy - 8);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - 9);
      ctx.lineTo(cx, cy + 8);
      ctx.stroke();
    }

    ctx.restore();
  }

  function drawItemMenu() {
    const menu = state.box;
    const layout = getItemMenuLayout(menu);

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
      const cellX = col === 0 ? layout.leftX : layout.middleX;
      const textX = cellX + layout.textInset;
      const rowY = layout.startY + row * layout.rowHeight;

      ctx.fillStyle = "#fff";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(item.name, textX, rowY);

      if (i === state.selectedItem) {
        drawRedHeart(cellX + layout.cursorInset, rowY - 7);
      }
    }

    const selectedItem = state.inventory[state.selectedItem];

    if (selectedItem) {
      ctx.fillStyle = "#8f8f8f";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      wrapText(selectedItem.description, layout.descriptionX, layout.startY, layout.descriptionWidth, 24);
    }
  }

  function drawItemTargetMenu() {
    const menu = state.box;
    const layout = getItemTargetLayout(menu);

    drawSharedBox(menu);

    for (let i = 0; i < state.party.length; i++) {
      const player = state.party[i];
      const rowY = layout.startY + i * layout.rowHeight;
      const hpRatio = player.maxHP > 0 ? player.hp / player.maxHP : 0;

      ctx.fillStyle = player.hp > 0 ? "#fff" : "#777";
      ctx.font = "20px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(player.name, layout.nameX, rowY);

      drawHpBar(layout.barX, rowY - layout.barH + 2, layout.barW, layout.barH, player.hp, player.maxHP);

      ctx.fillStyle = player.hp > 0 ? player.cardColor : "#555";
      ctx.fillRect(layout.barX + 3, rowY - layout.barH + 5, Math.max(0, (layout.barW - 6) * hpRatio), layout.barH - 6);

      if (i === state.selectedItemTarget) {
        drawRedHeart(layout.nameX - 28, rowY - 7);
      }
    }
  }

  function drawActMenu() {
    const menu = state.box;
    const acts = currentActorActs();
    const layout = getActMenuLayout(menu);

    drawSharedBox(menu);

    if (acts.length === 0) {
      ctx.fillStyle = "#fff";
      ctx.font = "22px Courier New";
      ctx.textAlign = "left";
      ctx.fillText("No ACTs available.", menu.x + 28, menu.y + 52);
      return;
    }

    for (let i = 0; i < acts.length; i++) {
      const act = acts[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const cellX = col === 0 ? layout.leftX : layout.middleX;
      const rowY = layout.startY + row * layout.rowHeight;
      const affordable = canAffordAct(act);

      ctx.fillStyle = affordable ? "#fff" : "#777";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(act.name, cellX + layout.textInset, rowY);

      if (i === state.selectedAct) {
        drawRedHeart(cellX + layout.cursorInset, rowY - 7);
      }
    }

    const selectedAct = acts[state.selectedAct];

    if (selectedAct) {
      ctx.fillStyle = "#8f8f8f";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      const descriptionBottom = wrapText(
        selectedAct.description,
        layout.descriptionX,
        layout.startY,
        layout.descriptionWidth,
        24
      );

      ctx.fillStyle = selectedAct.hpCost > 0 ? "#ff4545" : "#c68a42";
      ctx.font = "18px Courier New";
      const costText = selectedAct.hpCost > 0
        ? `${selectedAct.hpCost} HP`
        : `${selectedAct.tpCost}% TP`;
      ctx.fillText(costText, layout.descriptionX, descriptionBottom + 24);
    }
  }

  function drawActTargetMenu() {
    const menu = state.box;
    const layout = getItemTargetLayout(menu);

    drawSharedBox(menu);

    for (let i = 0; i < state.party.length; i++) {
      const player = state.party[i];
      const rowY = layout.startY + i * layout.rowHeight;
      const hpRatio = player.maxHP > 0 ? player.hp / player.maxHP : 0;

      ctx.fillStyle = player.hp > 0 ? "#fff" : "#777";
      ctx.font = "20px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(player.name, layout.nameX, rowY);

      drawHpBar(layout.barX, rowY - layout.barH + 2, layout.barW, layout.barH, player.hp, player.maxHP);

      ctx.fillStyle = player.hp > 0 ? player.cardColor : "#555";
      ctx.fillRect(layout.barX + 3, rowY - layout.barH + 5, Math.max(0, (layout.barW - 6) * hpRatio), layout.barH - 6);

      if (i === state.selectedActTarget) {
        drawRedHeart(layout.nameX - 28, rowY - 7);
      }
    }
  }

  function drawActEnemyTargetMenu() {
    const menu = state.box;
    const hpX = menu.x + menu.w - 245;
    const hpY = menu.y + 22;

    drawSharedBox(menu);

    ctx.fillStyle = "#fff";
    ctx.font = "22px Courier New";
    ctx.textAlign = "left";
    ctx.fillText(state.enemyName, menu.x + 58, menu.y + 38);

    if (state.selectedActEnemyTarget === 0) {
      drawRedHeart(menu.x + 34, menu.y + 31);
    }

    drawHpBar(hpX, hpY, 210, 18, state.enemyHP, state.enemyMaxHP);
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

  function drawFightQte() {
    drawSharedBox(BOX_RECT.TEXT);
    const fightingPlayers = new Set(state.fightQte.actions.map((action) => action.actorIndex));

    for (let i = 0; i < state.party.length; i++) {
      if (!fightingPlayers.has(i)) continue;

      const player = state.party[i];
      const layout = fightQteLayoutForRow(i);
      const iconSprite = playerSpriteForRole(player, "icon");

      ctx.save();
      ctx.strokeStyle = "#333";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, layout.rowY);
      ctx.lineTo(W, layout.rowY);
      ctx.stroke();

      if (iconSprite && iconSprite.ready) {
        const iconSize = 34;
        const scaledIconSize = iconSize * player.spriteScale * 3;
        ctx.drawImage(
          iconSprite,
          layout.iconX + (iconSize - scaledIconSize) / 2,
          layout.iconY + (iconSize - scaledIconSize) / 2,
          scaledIconSize,
          scaledIconSize
        );
      } else {
        drawPartyMiniIcon(player, layout.iconX, layout.iconY, 34);
      }

      ctx.fillStyle = "#fff";
      ctx.font = "18px Courier New";
      ctx.textAlign = "left";
      ctx.fillText("PRESS", layout.pressX, layout.pressY);

      ctx.fillStyle = "#050505";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.fillRect(layout.trackX, layout.trackY, layout.trackW, layout.trackH);
      ctx.strokeRect(layout.trackX, layout.trackY, layout.trackW, layout.trackH);

      ctx.strokeStyle = player.secondaryColor || player.cardColor;
      ctx.lineWidth = 3;
      ctx.strokeRect(
        layout.targetX - 1.5,
        layout.targetY - 1.5,
        layout.targetW + 3,
        layout.targetH + 3
      );
      ctx.restore();
    }

    for (const bar of state.fightQte.activeBars) {
      const player = state.party[bar.actorIndex];
      const layout = fightQteLayoutForRow(bar.actorIndex);

      ctx.save();
      if (bar.locked) {
        const progress = clamp(bar.lockAge / 30, 0, 1);
        const width = 8 * (1 + progress * 1.4);
        const height = layout.trackH * (1 + progress * 0.6);
        const green = Math.round(255 - 51 * progress);
        const blue = Math.round(255 - 204 * progress);

        ctx.fillStyle = `rgb(255,${green},${blue})`;
        ctx.globalAlpha = 1 - progress;
        ctx.fillRect(bar.x - width / 2, layout.trackY + (layout.trackH - height) / 2, width, height);
      } else {
        const fadeStartX = layout.trackX - 4;
        const stopX = layout.trackX - 24;
        const fadeProgress = clamp((fadeStartX - bar.x) / (fadeStartX - stopX), 0, 1);

        ctx.fillStyle = "#fff";
        ctx.globalAlpha = 1 - fadeProgress;
        ctx.fillRect(bar.x - 4, layout.trackY, 8, layout.trackH);
      }
      ctx.restore();
    }
  }

  function drawFightDamagePopups() {
    const popups = state.fightQte && Array.isArray(state.fightQte.damagePopups)
      ? state.fightQte.damagePopups
      : [];

    if (popups.length === 0) return;

    for (const popup of popups) {
      const bounceDuration = 12;
      const holdDuration = 60;
      const fadeDuration = 24;
      const fadeAge = popup.age - bounceDuration - holdDuration;
      const fadeProgress = clamp(fadeAge / fadeDuration, 0, 1);
      const bounceProgress = clamp(popup.age / bounceDuration, 0, 1);
      const bounceOffset = popup.age < bounceDuration
        ? -Math.sin(bounceProgress * Math.PI) * 7
        : 0;
      const riseOffset = fadeAge > 0 ? fadeProgress * 28 : 0;
      const alpha = fadeAge > 0 ? (1 - fadeProgress) * (1 - fadeProgress) : 1;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = popup.color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.font = "bold 38px Courier New";
      ctx.textAlign = "center";
      ctx.strokeText(popup.text, popup.x, popup.y + bounceOffset - riseOffset);
      ctx.fillText(popup.text, popup.x, popup.y + bounceOffset - riseOffset);
      if (popup.bonusDamage > 0) {
        ctx.fillStyle = "#fff2a8";
        ctx.font = "bold 27px Courier New";
        ctx.strokeText(`${popup.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
        ctx.fillText(`${popup.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
      }
      ctx.restore();
    }
  }

  function drawDamageSpellEffect() {
    const spell = state.spellAction;
    const action = spell.action;
    if (!action) return;

    const actor = state.party[action.actorIndex];
    const color = actor?.secondaryColor || actor?.cardColor || "#fff";
    const isBeastCharge = action.act.script === "beastCharge";
    const isGuidingBolt = action.act.script === "guidingBolt";
    const fadeIn = clamp(spell.timer / 30, 0, 1);
    const fadeOut = clamp((spell.timer - 66) / 30, 0, 1);
    const darkness = isBeastCharge ? 0 : 0.55 * fadeIn * (1 - fadeOut);

    if (darkness > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(0,0,0,${darkness})`;
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    if (!isBeastCharge && !isGuidingBolt && spell.timer >= 30 && spell.timer < 66) {
      const start = damageSpellActorCenter(action.actorIndex);
      const end = damageSpellEnemyCenter();
      const progress = easeInOutCubic(clamp((spell.timer - 30) / 36, 0, 1));
      const x = lerp(start.x, end.x, progress);
      const y = lerp(start.y, end.y, progress);
      const angle = Math.atan2(end.y - start.y, end.x - start.x);

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = color;
      ctx.fillStyle = "#fff";
      ctx.shadowColor = color;
      ctx.shadowBlur = 22;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(lerp(start.x, x, 0.72), lerp(start.y, y, 0.72));
      ctx.lineTo(x, y);
      ctx.stroke();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-7, -8);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-7, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    if (isBeastCharge) drawBeastChargeEffect(action, spell.timer);
    if (isGuidingBolt) drawGuidingBoltEffect(action, spell.timer);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const particle of spell.particles) {
      ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.strokeStyle = particle.color;
      ctx.beginPath();
      ctx.moveTo(particle.x, particle.y);
      ctx.lineTo(particle.x - particle.vx * 5, particle.y - particle.vy * 5);
      ctx.stroke();
    }
    ctx.restore();

    if (spell.damageApplied) {
      const popupAge = spell.timer - 66;
      const bounceDuration = 12;
      const holdDuration = 60;
      const fadeDuration = 24;
      const fadeAge = popupAge - bounceDuration - holdDuration;
      const fadeProgress = clamp(fadeAge / fadeDuration, 0, 1);
      const bounceProgress = clamp(popupAge / bounceDuration, 0, 1);
      const bounceOffset = popupAge < bounceDuration ? -Math.sin(bounceProgress * Math.PI) * 7 : 0;
      const riseOffset = fadeAge > 0 ? fadeProgress * 28 : 0;
      const alpha = fadeAge > 0 ? (1 - fadeProgress) * (1 - fadeProgress) : 1;
      const popup = enemyDamagePopupPosition(action.actorIndex);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.font = "bold 38px Courier New";
      ctx.textAlign = "center";
      ctx.strokeText(`${spell.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
      ctx.fillText(`${spell.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
      if (spell.bonusDamage > 0) {
        ctx.fillStyle = "#fff2a8";
        ctx.font = "bold 27px Courier New";
        ctx.strokeText(`${spell.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
        ctx.fillText(`${spell.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
      }
      ctx.restore();
    }
  }

  function drawBeastChargeEffect(action, timer) {
    if (timer >= 66) return;

    const actor = state.party[action.actorIndex];
    const sprite = actor ? playerSpriteForRole(actor, "beast_attack") : null;
    if (!sprite) return;

    const companion = beastCompanionPosition();
    if (!companion) return;

    const start = { x: companion.x + companion.size / 2, y: companion.y + companion.size / 2 };
    const end = damageSpellEnemyCenter();
    const progress = easeInOutCubic(clamp((timer - 8) / 58, 0, 1));
    const x = lerp(start.x, end.x, progress);
    const arcHeight = Math.sin(progress * Math.PI) * 115;
    const y = lerp(start.y, end.y, progress) - arcHeight;
    const size = 132;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(lerp(-0.08, 0.16, progress));
    ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
    ctx.restore();
  }

  function drawGuidingBoltEffect(action, timer) {
    const start = damageSpellActorCenter(action.actorIndex);
    const end = damageSpellEnemyCenter();

    for (let i = 0; i < 4; i++) {
      const localProgress = clamp((timer - 8 - i * 3) / (58 - i * 3), 0, 1);
      if (localProgress <= 0 || localProgress >= 1) continue;

      const direction = i % 2 === 0 ? -1 : 1;
      const spread = (i - 1.5) * 10;
      const control = {
        x: start.x + 42 + i * 7,
        y: start.y + direction * (72 + i * 9)
      };
      const pointAt = (t) => {
        const inverse = 1 - t;
        return {
          x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
          y: inverse * inverse * (start.y + spread) + 2 * inverse * t * control.y + t * t * end.y
        };
      };
      const head = pointAt(localProgress);
      const tail = pointAt(Math.max(0, localProgress - 0.16));

      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = i % 2 === 0 ? "#fffbd1" : "#ffe985";
      ctx.lineWidth = 4;
      ctx.lineCap = "round";
      ctx.shadowColor = "#fff6a8";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(tail.x, tail.y);
      ctx.lineTo(head.x, head.y);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(head.x, head.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function drawPlayerEffect() {
    const resolution = state.playerEffectAction;
    const action = resolution.action;
    if (!action) return;

    const targetIndex = Number.isInteger(action.targetIndex) ? action.targetIndex : action.actorIndex;
    const timer = resolution.timer;
    const enterProgress = clamp(timer / 12, 0, 1);
    const exitProgress = clamp((timer - 60) / 30, 0, 1);
    const x = 132 - 38 * (1 - enterProgress) + 52 * exitProgress;
    const y = 55 + targetIndex * 124;
    const alpha = enterProgress * (1 - exitProgress);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = "bold 27px Courier New";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#000";
    ctx.fillStyle = "#42f56f";
    ctx.strokeText(action.act.popupText, x, y);
    ctx.fillText(action.act.popupText, x, y);
    ctx.restore();
  }

  function drawPersistentEffectAction() {
    const persistent = state.persistentEffectAction;
    const effect = persistent.effect;
    if (!effect) return;

    const actor = state.party[effect.actorIndex];
    const color = actor?.secondaryColor || actor?.cardColor || "#fff";
    const enemyCenter = damageSpellEnemyCenter();

    if (effect.script === "starryFormArcher") {
      const archer = starryFormPosition(effect.actorIndex);
      const start = { x: archer.x + archer.size * 0.78, y: archer.y + archer.size * 0.43 };
      const progress = easeInOutCubic(clamp(persistent.timer / 30, 0, 1));
      const x = lerp(start.x, enemyCenter.x, progress);
      const y = lerp(start.y, enemyCenter.y, progress);

      if (persistent.timer <= 30) {
        ctx.save();
        ctx.strokeStyle = "rgba(255, 255, 210, 0.55)";
        ctx.lineWidth = 3;
        ctx.shadowColor = "#fffbd1";
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (effect.script !== "starryFormChalice" && persistent.timer <= 30) {
      const progress = easeInOutCubic(clamp(persistent.timer / 30, 0, 1));
      const start = { x: enemyCenter.x - 68, y: enemyCenter.y + 20 };
      const end = { x: enemyCenter.x + 76, y: enemyCenter.y - 42 };
      const x = lerp(start.x, end.x, progress);
      const y = lerp(start.y, end.y, progress);
      const sprite = actor ? playerSpriteForRole(actor, effect.sprite) : null;
      const size = 72;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-0.28);
      ctx.shadowColor = color;
      ctx.shadowBlur = 16;
      if (sprite && sprite.ready) {
        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(-size / 2, -8, size, 16);
      }
      ctx.restore();
    }

    if (persistent.damageApplied && effect.script === "starryFormChalice") {
      const popupAge = persistent.timer - 30;
      const enterProgress = clamp(popupAge / 12, 0, 1);
      const exitProgress = clamp((popupAge - 60) / 30, 0, 1);
      const x = 132 - 38 * (1 - enterProgress) + 52 * exitProgress;
      const y = 55 + effect.targetIndex * 124;
      const alpha = enterProgress * (1 - exitProgress);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = "bold 27px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.lineJoin = "round";
      ctx.lineWidth = 6;
      ctx.strokeStyle = "#000";
      ctx.fillStyle = "#42f56f";
      ctx.strokeText("+hp", x, y);
      ctx.fillText("+hp", x, y);
      ctx.restore();
    } else if (persistent.damageApplied) {
      const popupAge = persistent.timer - 30;
      const bounceDuration = 12;
      const holdDuration = 60;
      const fadeDuration = 24;
      const fadeAge = popupAge - bounceDuration - holdDuration;
      const fadeProgress = clamp(fadeAge / fadeDuration, 0, 1);
      const bounceProgress = clamp(popupAge / bounceDuration, 0, 1);
      const bounceOffset = popupAge < bounceDuration ? -Math.sin(bounceProgress * Math.PI) * 7 : 0;
      const riseOffset = fadeAge > 0 ? fadeProgress * 28 : 0;
      const alpha = fadeAge > 0 ? (1 - fadeProgress) * (1 - fadeProgress) : 1;
      const popup = enemyDamagePopupPosition(effect.actorIndex);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 5;
      ctx.lineJoin = "round";
      ctx.font = "bold 38px Courier New";
      ctx.textAlign = "center";
      ctx.strokeText(`${persistent.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
      ctx.fillText(`${persistent.damage}`, popup.x, popup.y + bounceOffset - riseOffset);
      if (persistent.bonusDamage > 0) {
        ctx.fillStyle = "#fff2a8";
        ctx.font = "bold 27px Courier New";
        ctx.strokeText(`${persistent.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
        ctx.fillText(`${persistent.bonusDamage}`, popup.x + 48, popup.y - 25 + bounceOffset - riseOffset);
      }
      ctx.restore();
    }
  }

  function drawDefenseBox() {
    const box = state.box;

    drawSharedBox(box);
    if (state.rhythmGrid) drawRhythmGridBeatRectangle(box);

    if (state.attackType === ATTACK_TYPE.PURPLE) {
      if (state.rhythmGrid) {
        drawRhythmGrid();
      } else {
        drawPurpleLines();
      }
    }

    for (const b of state.bullets) {
      drawBullet(b);
    }

    if (
      !state.rhythmGrid ||
      state.rhythmGrid.phase === "countdown" ||
      state.rhythmGrid.phase === "response"
    ) {
      drawSoul();
    }

    if (state.attackType === ATTACK_TYPE.GREEN) {
      drawGreenShield();
    }

    drawShieldShatter();

  }

  function drawBattlefieldSpin() {
    const morph = state.boxMorph;
    const box = morph.to;
    const progress = clamp(morph.timer / Math.max(1, morph.duration), 0, 1);
    const eased = easeInOutCubic(progress);
    const scale = lerp(0.05, 1, eased);
    const angle = (1 - eased) * Math.PI * 1.5;

    ctx.save();
    ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
    ctx.rotate(angle);
    ctx.scale(scale, scale);
    drawSharedBox({ x: -box.w / 2, y: -box.h / 2, w: box.w, h: box.h });
    ctx.restore();
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

  function drawRhythmGrid() {
    const grid = state.rhythmGrid;
    const cols = Number.isInteger(grid?.cols) ? grid.cols : 5;
    const rows = Number.isInteger(grid?.rows) ? grid.rows : 3;

    ctx.save();
    ctx.strokeStyle = "#9d5cff";
    ctx.fillStyle = "#9d5cff";
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.65;

    for (let row = 0; row < rows; row++) {
      ctx.beginPath();
      ctx.moveTo(rhythmGridX(0), rhythmGridY(row));
      ctx.lineTo(rhythmGridX(cols - 1), rhythmGridY(row));
      ctx.stroke();
    }
    for (let col = 0; col < cols; col++) {
      ctx.beginPath();
      ctx.moveTo(rhythmGridX(col), rhythmGridY(0));
      ctx.lineTo(rhythmGridX(col), rhythmGridY(rows - 1));
      ctx.stroke();
    }
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        ctx.beginPath();
        ctx.arc(rhythmGridX(col), rhythmGridY(row), 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    if (grid.mode === "vampireLord") {
      drawVampireLordGrid(grid);
      return;
    }

    if (grid.mode === "vampire") {
      drawVampireGrid(grid);
      return;
    }

    if (grid.mode === "freestyle") {
      drawFreestyleGridCues(grid);
      return;
    }

    if (grid.phase === "introCountdown" || grid.phase === "demo") {
      const elapsed = getMusicElapsed(sounds.battleTheme);
      const audioBeat = Number.isFinite(elapsed)
        ? (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration
        : 0;
      const beatPhase = ((audioBeat % 1) + 1) % 1;
      let feetPosition = { col: 2, row: 1 };
      if (grid.phase === "demo") {
        const liveDanceBeat = audioBeat - grid.introStartBeat - 4;
        feetPosition = gridPositionAtDanceBeat(grid.danceEvents, liveDanceBeat);
      }
      drawDancingFeet(rhythmGridX(feetPosition.col), rhythmGridY(feetPosition.row), beatPhase);
    }

    if ((grid.phase === "introCountdown" || grid.phase === "countdown") && grid.countdown) {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 6;
      ctx.font = "bold 52px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.strokeText(String(grid.countdown), state.box.x + state.box.w / 2, state.box.y + state.box.h / 2);
      ctx.fillText(String(grid.countdown), state.box.x + state.box.w / 2, state.box.y + state.box.h / 2);
      ctx.restore();
    }
  }

  function drawVampireGrid(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;

    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const cellWidth = Math.abs(rhythmGridX(1) - rhythmGridX(0));
    const cellHeight = Math.abs(rhythmGridY(1) - rhythmGridY(0));
    const burstDuration = 0.16;

    for (const cue of grid.cues) {
      if (!cue.fired) continue;

      const progress = clamp((musicBeat - cue.firedAtBeat) * grid.beatDuration / burstDuration, 0, 1);
      const alpha = Math.pow(1 - progress, 0.7);
      for (const position of cue.positions) {
        ctx.save();
        ctx.globalAlpha = alpha * 0.82;
        ctx.fillStyle = "#74152b";
        ctx.strokeStyle = "#bd3552";
        ctx.lineWidth = 2;
        ctx.shadowColor = "#7a102a";
        ctx.shadowBlur = 16 * (1 - progress);

        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
          for (let colOffset = -1; colOffset <= 1; colOffset++) {
            if (colOffset === 0 && rowOffset === 0) continue;
            const x = rhythmGridX(position.col + colOffset);
            const y = rhythmGridY(position.row + rowOffset);
            const width = cellWidth * 0.82;
            const height = cellHeight * 0.82;
            ctx.fillRect(x - width / 2, y - height / 2, width, height);
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          }
        }

        const outerX = rhythmGridX(position.col - 1) - cellWidth * 0.41;
        const outerY = rhythmGridY(position.row - 1) - cellHeight * 0.41;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 4;
        ctx.strokeRect(outerX, outerY, cellWidth * 2.82, cellHeight * 2.82);
        ctx.restore();
      }
    }

    const beatPhase = ((musicBeat % 1) + 1) % 1;
    for (const vampire of grid.vampires) {
      const position = vampireHeartPosition(grid, vampire, musicBeat);
      drawVampireHeart(position.x, position.y, beatPhase);
    }
  }

  function drawVampireLordGrid(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;

    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const cellWidth = Math.abs(rhythmGridX(1) - rhythmGridX(0));
    const cellHeight = Math.abs(rhythmGridY(1) - rhythmGridY(0));
    const burstDuration = 0.16;
    const fireDuration = 0.18;
    const skullBlastDuration = 0.22;

    for (const cue of grid.regularCues) {
      if (!cue.fired) continue;
      const progress = clamp((musicBeat - cue.firedAtBeat) * grid.beatDuration / burstDuration, 0, 1);
      const alpha = Math.pow(1 - progress, 0.7);
      ctx.save();
      ctx.globalAlpha = alpha * 0.82;
      ctx.fillStyle = "#74152b";
      ctx.strokeStyle = "#bd3552";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#7a102a";
      ctx.shadowBlur = 10 * (1 - progress);
      for (const position of cue.positions) {
        for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
          for (let colOffset = -1; colOffset <= 1; colOffset++) {
            if (colOffset === 0 && rowOffset === 0) continue;
            const x = rhythmGridX(position.col + colOffset);
            const y = rhythmGridY(position.row + rowOffset);
            const width = cellWidth * 0.78;
            const height = cellHeight * 0.78;
            ctx.fillRect(x - width / 2, y - height / 2, width, height);
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          }
        }
      }
      ctx.restore();
    }

    for (const cue of grid.lordCues) {
      if (cue.lineFired) {
        for (const cell of cue.lineCells) {
          const age = (musicBeat - cell.spawnBeat) * grid.beatDuration;
          if (age < 0 || age > fireDuration) continue;
          const progress = age / fireDuration;
          const pulse = 0.78 + Math.sin(progress * Math.PI) * 0.22;
          const x = rhythmGridX(cell.col);
          const y = rhythmGridY(cell.row);
          const width = cellWidth * 0.8 * pulse;
          const height = cellHeight * 0.8 * pulse;
          ctx.save();
          ctx.globalAlpha = Math.pow(1 - progress, 0.45);
          ctx.fillStyle = "#ff5a16";
          ctx.strokeStyle = "#ffd15c";
          ctx.lineWidth = 2;
          ctx.shadowColor = "#ff2a00";
          ctx.shadowBlur = 13;
          ctx.fillRect(x - width / 2, y - height / 2, width, height);
          ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          ctx.restore();
        }
      }

      if (cue.blastFired) {
        const progress = clamp(
          (musicBeat - cue.blastFiredAtBeat) * grid.beatDuration / burstDuration,
          0,
          1
        );
        const alpha = Math.pow(1 - progress, 0.6);
        ctx.save();
        ctx.globalAlpha = alpha * 0.88;
        ctx.fillStyle = "#102f76";
        ctx.strokeStyle = "#4384e8";
        ctx.lineWidth = 1.5;
        ctx.shadowColor = "#144da5";
        ctx.shadowBlur = 14 * (1 - progress);
        for (let rowOffset = -2; rowOffset <= 2; rowOffset++) {
          for (let colOffset = -2; colOffset <= 2; colOffset++) {
            const x = rhythmGridX(cue.blastPosition.col + colOffset);
            const y = rhythmGridY(cue.blastPosition.row + rowOffset);
            const width = cellWidth * 0.82;
            const height = cellHeight * 0.82;
            ctx.fillRect(x - width / 2, y - height / 2, width, height);
            ctx.strokeRect(x - width / 2, y - height / 2, width, height);
          }
        }
        ctx.restore();
      }
    }

    for (const cue of grid.skullCues) {
      if (!cue.fired) continue;
      const progress = clamp(
        (musicBeat - cue.firedAtBeat) * grid.beatDuration / skullBlastDuration,
        0,
        1
      );
      const alpha = Math.pow(1 - progress, 0.55);
      ctx.save();
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle = "#39e63d";
      ctx.strokeStyle = "#caff9a";
      ctx.lineWidth = 2;
      ctx.shadowColor = "#37ff18";
      ctx.shadowBlur = 18 * (1 - progress);
      for (const cell of cue.cells) {
        const x = rhythmGridX(cell.col);
        const y = rhythmGridY(cell.row);
        const width = cellWidth * 0.84;
        const height = cellHeight * 0.84;
        ctx.fillRect(x - width / 2, y - height / 2, width, height);
        ctx.strokeRect(x - width / 2, y - height / 2, width, height);
      }
      ctx.restore();
    }

    const beatPhase = ((musicBeat % 1) + 1) % 1;
    for (const vampire of grid.vampires) {
      const position = vampireHeartPosition(grid, vampire, musicBeat);
      drawVampireHeart(position.x, position.y, beatPhase, vampire.scale);
    }
    const lordPosition = vampireHeartPosition(grid, grid.vampireLord, musicBeat);
    drawVampireLordHeart(lordPosition.x, lordPosition.y, beatPhase);
    for (const skull of grid.skullSouls) {
      const position = flamingSkullSoulPosition(grid, skull);
      drawFlamingSkullSoul(position.x, position.y, beatPhase);
    }
  }

  function flamingSkullSoulPosition(grid, skull) {
    const cellWidth = Math.abs(rhythmGridX(1) - rhythmGridX(0));
    const edgeX = skull.side === "left" ? rhythmGridX(0) : rhythmGridX(grid.cols - 1);
    return {
      x: edgeX + (skull.side === "left" ? -1 : 1) * cellWidth * 0.72,
      y: rhythmGridY(skull.row)
    };
  }

  function drawFlamingSkullSoul(x, y, beatPhase) {
    const flicker = Math.sin(beatPhase * Math.PI * 4) * 1.7;

    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#42f04b";
    ctx.shadowColor = "#37ff18";
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(-5, -5);
    ctx.quadraticCurveTo(-9, -14 + flicker, -2, -18);
    ctx.quadraticCurveTo(0, -11 - flicker, 5, -16);
    ctx.quadraticCurveTo(9, -8 + flicker, 5, -4);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 4;
    drawHeartShape(0, 0, "#fff");
    ctx.restore();
  }

  function drawVampireHeart(x, y, beatPhase, scale = 1) {
    const flap = Math.sin(beatPhase * Math.PI * 2) * 2.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#3b0715";
    ctx.strokeStyle = "#8d1d39";
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(-17, -11 - flap);
    ctx.lineTo(-16, -1);
    ctx.lineTo(-26, -6 + flap);
    ctx.lineTo(-20, 8);
    ctx.lineTo(-7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(7, -3);
    ctx.lineTo(17, -11 - flap);
    ctx.lineTo(16, -1);
    ctx.lineTo(26, -6 + flap);
    ctx.lineTo(20, 8);
    ctx.lineTo(7, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    drawHeartShape(0, 0, "#681127");
    ctx.restore();
  }

  function drawVampireLordHeart(x, y, beatPhase) {
    const flap = Math.sin(beatPhase * Math.PI * 2) * 3.5;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(0.9, 0.9);
    ctx.fillStyle = "#020611";
    ctx.strokeStyle = "#2459a6";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#174a9c";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.moveTo(-8, -3);
    ctx.lineTo(-22, -15 - flap);
    ctx.lineTo(-20, -2);
    ctx.lineTo(-34, -9 + flap);
    ctx.lineTo(-28, 10);
    ctx.lineTo(-8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(8, -3);
    ctx.lineTo(22, -15 - flap);
    ctx.lineTo(20, -2);
    ctx.lineTo(34, -9 + flap);
    ctx.lineTo(28, 10);
    ctx.lineTo(8, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 10;
    drawHeartShape(0, 0, "#071b49");
    ctx.restore();
  }

  function drawFreestyleGridCues(grid) {
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!Number.isFinite(elapsed)) return;
    const musicBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;

    for (const cue of grid.cues) {
      if (!cue.fired) {
        ctx.save();
        ctx.fillStyle = "#ff2d3f";
        ctx.shadowColor = "#ff1e35";
        ctx.shadowBlur = 9;
        for (const row of cue.rows) {
          ctx.beginPath();
          ctx.arc(state.box.x - 13, rhythmGridY(row), 7, 0, Math.PI * 2);
          ctx.fill();
        }
        for (const col of cue.cols) {
          ctx.beginPath();
          ctx.arc(rhythmGridX(col), state.box.y - 13, 7, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      const travelDuration = 0.12;
      const travelProgress = (musicBeat - cue.firedAtBeat) * grid.beatDuration / travelDuration;
      if (travelProgress < 0 || travelProgress > 1) continue;

      const arrowLength = 130;
      const rowArrowHead = lerp(state.box.x - 10, state.box.x + state.box.w + arrowLength, travelProgress);
      const colArrowHead = lerp(state.box.y - 10, state.box.y + state.box.h + arrowLength, travelProgress);
      for (const row of cue.rows) {
        drawFreestyleArrow(rowArrowHead, rhythmGridY(row), arrowLength, 0);
      }
      for (const col of cue.cols) {
        drawFreestyleArrow(rhythmGridX(col), colArrowHead, arrowLength, Math.PI / 2);
      }
    }
  }

  function drawFreestyleArrow(headX, headY, length, angle) {
    ctx.save();
    ctx.translate(headX, headY);
    ctx.rotate(angle);
    ctx.fillStyle = "#ff2d3f";
    ctx.shadowColor = "#ff1e35";
    ctx.shadowBlur = 12;
    ctx.fillRect(-length, -4, length - 18, 8);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-24, -12);
    ctx.lineTo(-24, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRhythmGridBeatRectangle(box) {
    const grid = state.rhythmGrid;
    const elapsed = getMusicElapsed(sounds.battleTheme);
    if (!grid || !Number.isFinite(elapsed) || elapsed < sounds.battleTheme.loopStart) return;

    const audioBeat = (elapsed - sounds.battleTheme.loopStart) / grid.beatDuration;
    const pairPhase = ((audioBeat % 2) + 2) % 2;
    if (pairPhase >= 1) return;

    const timeProgress = pairPhase;
    const travelProgress = 0.8 * timeProgress + 0.2 * timeProgress * timeProgress;
    const outset = 26 * travelProgress;

    ctx.save();
    ctx.globalAlpha = Math.pow(1 - timeProgress, 1.35) * 0.9;
    ctx.strokeStyle = "#c9a8ff";
    ctx.lineWidth = 5 - timeProgress * 2;
    ctx.shadowColor = "#9d5cff";
    ctx.shadowBlur = 20 * (1 - timeProgress);
    ctx.strokeRect(
      box.x - outset,
      box.y - outset,
      box.w + outset * 2,
      box.h + outset * 2
    );
    ctx.restore();

    const flashDurationBeats = 0.45;
    if (pairPhase >= flashDurationBeats) return;

    const flashProgress = pairPhase / flashDurationBeats;
    ctx.save();
    ctx.globalAlpha = Math.pow(1 - flashProgress, 1.6);
    ctx.strokeStyle = "#f3eaff";
    ctx.lineWidth = 9 - flashProgress * 4;
    ctx.shadowColor = "#b26cff";
    ctx.shadowBlur = 34 * (1 - flashProgress);
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.restore();
  }

  function drawDancingFeet(x, y, beatPhase) {
    const bounce = Math.sin(beatPhase * Math.PI) * 4;
    ctx.save();
    ctx.translate(x, y - 9 + bounce);
    ctx.fillStyle = "#25d65f";
    ctx.beginPath();
    ctx.ellipse(-7, 0, 5, 10, -0.18, 0, Math.PI * 2);
    ctx.ellipse(7, 0, 5, 10, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawSoul() {
    const s = state.soul;

    if (state.soul.invuln > 0 && Math.floor(state.frame / 4) % 2 === 0) {
      return;
    }

    if (state.grazeGlow > 0) {
      ctx.save();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.lineJoin = "miter";
      ctx.globalAlpha = clamp(state.grazeGlow / 18, 0, 1);
      ctx.beginPath();
      ctx.moveTo(s.x - 3, s.y + 19);
      ctx.lineTo(s.x + 3, s.y + 19);
      ctx.lineTo(s.x + 22, s.y);
      ctx.lineTo(s.x + 22, s.y - 11);
      ctx.lineTo(s.x + 15, s.y - 18);
      ctx.lineTo(s.x + 7, s.y - 18);
      ctx.lineTo(s.x + 2, s.y - 16);
      ctx.lineTo(s.x - 2, s.y - 16);
      ctx.lineTo(s.x - 7, s.y - 18);
      ctx.lineTo(s.x - 15, s.y - 18);
      ctx.lineTo(s.x - 22, s.y - 11);
      ctx.lineTo(s.x - 22, s.y);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    if (state.attackType === ATTACK_TYPE.PURPLE) {
      drawHeartShape(s.x, s.y, "#9d5cff");
      return;
    }

    if (state.attackType === ATTACK_TYPE.BLUE) {
      drawHeartShape(s.x, s.y, "#39a7ff");
      return;
    }

    if (state.attackType === ATTACK_TYPE.GREEN) {
      drawHeartShape(s.x, s.y, "#25d65f");
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

  function drawPlayerDeath() {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, W, H);

    if (state.death.timer < 60) {
      drawHeartShape(state.death.x, state.death.y, state.death.color);
      return;
    }

    if (state.death.timer < 150) {
      drawCrackedDeathHeart();
      return;
    }

    drawDeathHeartPieces();

    if (state.death.timer >= 225) {
      drawGameOverText();
    }
  }

  function drawCrackedDeathHeart() {
    const x = state.death.x;
    const y = state.death.y;
    const color = state.death.color;
    const split = Math.min(9, (state.death.timer - 60) * 0.28);

    drawHeartHalf(x - split, y, color, "left");
    drawHeartHalf(x + split, y, color, "right");

    ctx.save();
    ctx.strokeStyle = "#050505";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y - 11);
    ctx.lineTo(x - 2, y - 5);
    ctx.lineTo(x + 2, y + 1);
    ctx.lineTo(x - 1, y + 7);
    ctx.lineTo(x, y + 12);
    ctx.stroke();
    ctx.restore();
  }

  function drawHeartHalf(x, y, color, side) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(side === "left" ? x - 24 : x, y - 24, 24, 48);
    ctx.clip();
    drawHeartShape(x, y, color);
    ctx.restore();
  }

  function drawDeathHeartPieces() {
    for (const piece of state.death.pieces) {
      ctx.save();
      ctx.translate(piece.x, piece.y);
      ctx.rotate(piece.rotation);
      ctx.fillStyle = piece.color;
      ctx.beginPath();
      piece.points.forEach((point, index) => {
        if (index === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawGameOverText() {
    const titleAlpha = clamp((state.death.timer - 225) / 28, 0, 1);
    const promptAlpha = clamp((state.death.timer - 285) / 24, 0, 1);

    ctx.save();
    ctx.globalAlpha = titleAlpha;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.font = "bold 104px Courier New";
    ctx.textAlign = "center";
    ctx.strokeText("GAME", W / 2, 120);
    ctx.fillText("GAME", W / 2, 120);
    ctx.strokeText("OVER", W / 2, 220);
    ctx.fillText("OVER", W / 2, 220);
    ctx.restore();

    if (promptAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = promptAlpha;
      ctx.fillStyle = "#fff";
      ctx.font = "22px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("Stay determined, gamer! Press Enter to try again,", W / 2, H - 88);
      ctx.fillText("or Escape to change your party.", W / 2, H - 58);
      ctx.restore();
    }
  }

  function drawGreenShield() {
    const shield = greenShieldRect();

    ctx.save();
    ctx.fillStyle = "#25d65f";
    ctx.strokeStyle = "#b8ffd0";
    ctx.lineWidth = 2;
    ctx.shadowColor = "#25d65f";
    ctx.shadowBlur = 10;
    ctx.fillRect(shield.x, shield.y, shield.w, shield.h);
    ctx.shadowBlur = 0;
    ctx.strokeRect(shield.x, shield.y, shield.w, shield.h);

    if (state.redShieldGlow > 0) {
      const glow = state.redShieldGlow / 18;

      ctx.globalAlpha = glow * 0.42;
      ctx.fillStyle = "#ff2d2d";
      ctx.shadowColor = "#ff2d2d";
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(shield.x + shield.w / 2, shield.y + shield.h / 2, 13 + (1 - glow) * 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function drawShieldShatter() {
    if (state.shieldShatter.particles.length === 0) return;

    const alpha = clamp(1 - state.shieldShatter.timer / state.shieldShatter.duration, 0, 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#61ff93";
    ctx.strokeStyle = "#d5ffe0";
    ctx.lineWidth = 1;

    for (const particle of state.shieldShatter.particles) {
      ctx.save();
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.spin * state.shieldShatter.timer);
      ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.strokeRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
      ctx.restore();
    }

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
    } else if (b.type === "platformSpikes") {
      ctx.globalAlpha *= Number.isFinite(b.alpha) ? b.alpha : 1;
      ctx.fillStyle = "#000";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      const spikeWidth = 10;

      for (let x = -b.width / 2; x < b.width / 2; x += spikeWidth) {
        ctx.beginPath();
        ctx.moveTo(x, b.height);
        ctx.lineTo(Math.min(x + spikeWidth / 2, b.width / 2), 0);
        ctx.lineTo(Math.min(x + spikeWidth, b.width / 2), b.height);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (b.type === "platformSpikeWarning") {
      const pulse = 1 + Math.sin(b.age * 0.28) * 0.08;
      ctx.scale(pulse, pulse);
      ctx.fillStyle = "#ffdd33";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(17, 14);
      ctx.lineTo(-17, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#000";
      ctx.font = "bold 22px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("!", 0, 5);
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
    } else if (b.type === "arrow") {
      const length = Number.isFinite(b.length) ? b.length : 34;
      const width = Number.isFinite(b.width) ? b.width : 9;
      const baseAlpha = Number.isFinite(b.alpha) ? b.alpha : 1;
      const revealAlpha = b.red && state.redArrowReveal > 0
        ? state.redArrowReveal / 45
        : 0;
      const alpha = Math.max(baseAlpha, revealAlpha);

      ctx.globalAlpha *= alpha;
      ctx.fillStyle = b.blue ? "#33aaff" : b.red ? "#ff2d2d" : b.yellow ? "#ffdd33" : "#fff";

      ctx.fillRect(-length / 2, -2, length - width * 1.25, 4);

      ctx.beginPath();
      ctx.moveTo(length / 2, 0);
      ctx.lineTo(length / 2 - width * 1.25, -width * 0.72);
      ctx.lineTo(length / 2 - width * 1.25, width * 0.72);
      ctx.closePath();
      ctx.fill();
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
    } else if (b.type === "barovianWolf") {
      ctx.globalAlpha *= Number.isFinite(b.alpha) ? b.alpha : 1;
      ctx.scale(Number.isFinite(b.facing) ? b.facing : 1, 1);
      const wolfSprite = b.lunging ? sprites.wolfLunge : sprites.wolfDefault;
      if (wolfSprite?.ready) {
        ctx.drawImage(wolfSprite, -35, -31, 70, 56);
        ctx.restore();
        return;
      }
      ctx.fillStyle = "#20232a";
      ctx.strokeStyle = "#d8dbe2";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(-2, 1, b.r * 1.25, b.r * 0.62, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.r * 0.55, -b.r * 0.18);
      ctx.lineTo(b.r * 1.45, -b.r * 0.48);
      ctx.lineTo(b.r * 1.55, b.r * 0.28);
      ctx.lineTo(b.r * 0.62, b.r * 0.45);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(b.r * 0.62, -b.r * 0.42);
      ctx.lineTo(b.r * 0.76, -b.r * 1.02);
      ctx.lineTo(b.r * 1.06, -b.r * 0.5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#ff3b3b";
      ctx.beginPath();
      ctx.arc(b.r * 1.13, -b.r * 0.18, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d8dbe2";
      ctx.beginPath();
      ctx.moveTo(-b.r * 0.65, b.r * 0.35);
      ctx.lineTo(-b.r * 0.88, b.r * 1.05);
      ctx.moveTo(b.r * 0.15, b.r * 0.42);
      ctx.lineTo(b.r * 0.34, b.r * 1.05);
      ctx.stroke();
    } else if (b.type === "barovianBat") {
      ctx.globalAlpha *= Number.isFinite(b.alpha) ? b.alpha : 1;
      if (sprites.batMinion?.ready) {
        const wingPulse = 1 + Math.sin(b.age * 0.45) * 0.06;
        ctx.drawImage(sprites.batMinion, -25, -9 * wingPulse, 50, 18 * wingPulse);
      } else {
        const flap = Math.sin(b.age * 0.55) * b.r * 0.36;
        ctx.fillStyle = "#17131f";
        ctx.strokeStyle = "#c5b8da";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 2);
        ctx.lineTo(-b.r * 1.65, -b.r * 0.6 - flap);
        ctx.lineTo(-b.r * 1.18, b.r * 0.42);
        ctx.lineTo(-b.r * 0.55, b.r * 0.08);
        ctx.lineTo(0, b.r * 0.72);
        ctx.lineTo(b.r * 0.55, b.r * 0.08);
        ctx.lineTo(b.r * 1.18, b.r * 0.42);
        ctx.lineTo(b.r * 1.65, -b.r * 0.6 - flap);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (b.type === "flameSkull") {
      ctx.globalAlpha *= Math.min(1, b.age / 7, b.life / 7);
      ctx.scale(Number.isFinite(b.facing) ? b.facing : 1, 1);
      if (sprites.flameSkull?.ready) {
        ctx.drawImage(sprites.flameSkull, -17, -23, 34, 46);
      } else {
        ctx.fillStyle = "#7dff38";
        ctx.shadowColor = "#41ff19";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 2, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#101610";
        ctx.fillRect(-7, -2, 4, 5);
        ctx.fillRect(3, -2, 4, 5);
      }
    } else if (b.type === "greenFireball") {
      ctx.fillStyle = "#8dff45";
      ctx.shadowColor = "#37ff18";
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.moveTo(b.r * 1.35, 0);
      ctx.quadraticCurveTo(0, -b.r, -b.r * 1.65, 0);
      ctx.quadraticCurveTo(0, b.r, b.r * 1.35, 0);
      ctx.fill();
      ctx.fillStyle = "#eaffb5";
      ctx.beginPath();
      ctx.arc(b.r * 0.35, 0, b.r * 0.48, 0, Math.PI * 2);
      ctx.fill();
    } else if (b.type === "greenFireBlast") {
      ctx.scale(Number.isFinite(b.facing) ? b.facing : 1, 1);
      const halfW = b.width / 2;
      const halfH = b.height / 2;
      const flicker = Math.sin(b.age * 0.7) * 5;
      ctx.translate(0, halfH);

      ctx.fillStyle = "#48e62f";
      ctx.shadowColor = "#37ff18";
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.moveTo(halfW + 14 + flicker, 0);
      ctx.lineTo(halfW - 4, -halfH);
      ctx.lineTo(-halfW + 18, -halfH + 2);
      ctx.lineTo(-halfW - 12 - flicker, -halfH * 0.55);
      ctx.lineTo(-halfW + 3, 0);
      ctx.lineTo(-halfW - 12 + flicker, halfH * 0.55);
      ctx.lineTo(-halfW + 18, halfH - 2);
      ctx.lineTo(halfW - 4, halfH);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = "#dfff8c";
      ctx.beginPath();
      ctx.moveTo(halfW + 8, 0);
      ctx.lineTo(halfW - 12, -halfH * 0.55);
      ctx.lineTo(-halfW + 8, -halfH * 0.38);
      ctx.lineTo(-halfW - 2, 0);
      ctx.lineTo(-halfW + 8, halfH * 0.38);
      ctx.lineTo(halfW - 12, halfH * 0.55);
      ctx.closePath();
      ctx.fill();
    } else if (b.type === "treeBlight") {
      ctx.globalAlpha *= Number.isFinite(b.alpha) ? b.alpha : 1;
      ctx.scale(Number.isFinite(b.facing) ? b.facing : 1, 1);
      if (sprites.treeBlight?.ready) {
        ctx.drawImage(sprites.treeBlight, -25, -25, 50, 50);
      } else {
        ctx.fillStyle = "#18251a";
        ctx.strokeStyle = "#9ab68c";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -b.r * 1.4);
        ctx.lineTo(b.r, b.r);
        ctx.lineTo(-b.r, b.r);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else if (b.type === "blightNeedle") {
      ctx.fillStyle = "#d9f2b4";
      ctx.shadowColor = "#91b86e";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(b.r * 2.2, 0);
      ctx.lineTo(-b.r, -2.5);
      ctx.lineTo(-b.r, 2.5);
      ctx.closePath();
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
    if (state.phase === PHASE.INTRO) {
      drawPartySelectionOverlay();
      return;
    }

    let title = "SOUL BATTLE";
    let sub = "Press Enter";

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

  function drawPartySelectionOverlay() {
    const roster = Array.isArray(window.PLAYER_DATA) ? window.PLAYER_DATA : [];
    const picks = state.partySelection.picks;

    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.94)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#080808";
    ctx.strokeStyle = HUD_MAROON;
    ctx.lineWidth = 3;
    ctx.fillRect(32, 38, W - 64, H - 76);
    ctx.strokeRect(32, 38, W - 64, H - 76);

    ctx.fillStyle = "#fff";
    ctx.font = "42px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("Select your Party", W / 2, 100);

    ctx.fillStyle = COMMAND_OPTION_ORANGE;
    ctx.font = "18px Courier New";
    ctx.fillText(`Choose party member ${Math.min(3, picks.length + 1)} of 3`, W / 2, 139);

    for (let i = 0; i < roster.length; i++) {
      const player = roster[i];
      const card = partySelectionCardRect(i);
      const pickedSlot = picks.indexOf(i);
      const picked = pickedSlot !== -1;
      const active = i === state.partySelection.cursor && !picked;
      const icon = playerSpriteForRole(player, "icon");

      ctx.save();
      ctx.globalAlpha = picked ? 0.38 : 1;
      ctx.fillStyle = "#020202";
      ctx.strokeStyle = active ? COMMAND_OPTION_HIGHLIGHT : player.cardColor;
      ctx.lineWidth = active ? 4 : 2;
      ctx.fillRect(card.x, card.y, card.w, card.h);
      ctx.strokeRect(card.x, card.y, card.w, card.h);

      if (icon && icon.ready) {
        const iconSize = 112;
        ctx.drawImage(icon, card.x + (card.w - iconSize) / 2, card.y + 29, iconSize, iconSize);
      }

      ctx.fillStyle = active ? COMMAND_OPTION_HIGHLIGHT : player.cardColor;
      ctx.font = "bold 22px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(player.name, card.x + card.w / 2, card.y + 178);

      ctx.fillStyle = "#fff";
      ctx.font = "14px Courier New";
      ctx.fillText(picked ? `PARTY SLOT ${pickedSlot + 1}` : active ? "SELECT" : "AVAILABLE", card.x + card.w / 2, card.y + 211);
      ctx.restore();
    }

    const slotW = 210;
    const slotGap = 18;
    const slotStartX = (W - slotW * 3 - slotGap * 2) / 2;

    for (let slot = 0; slot < 3; slot++) {
      const rosterIndex = picks[slot];
      const player = Number.isInteger(rosterIndex) ? roster[rosterIndex] : null;
      const x = slotStartX + slot * (slotW + slotGap);

      ctx.fillStyle = "#020202";
      ctx.strokeStyle = player ? player.cardColor : "#555";
      ctx.lineWidth = 2;
      ctx.fillRect(x, 458, slotW, 48);
      ctx.strokeRect(x, 458, slotW, 48);

      ctx.fillStyle = player ? "#fff" : "#777";
      ctx.font = "16px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(`${slot + 1}. ${player ? player.name : "---"}`, x + slotW / 2, 488);
    }

    ctx.fillStyle = "#aaa";
    ctx.font = "15px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("ARROWS / WASD TO MOVE     ENTER TO SELECT     ESC / X TO UNDO", W / 2, 552);
    ctx.restore();
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
    return yy;
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
