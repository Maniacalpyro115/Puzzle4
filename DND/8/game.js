(() => {
  "use strict";

  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const W = canvas.width;
  const H = canvas.height;
  const FIXED_STEP_MS = 1000 / 60;
  const MAX_FRAME_MS = 250;

  const PHASE = {
    INTRO: "intro",
    MENU: "menu",
    ITEM: "item",
    ATTACK: "attack",
    ENEMY: "enemy",
    MESSAGE: "message",
    PHASE_TRANSITION: "phaseTransition",
    WIN: "win",
    LOSE: "lose",
  };

  const DEFAULT_ENEMY_DATA = {
    name: "ENEMY",
    sprite: "sprites/enemy.png",
    maxHP: 100,

    introMessage: "* An enemy blocks your path.",
    winMessage: "* You won.",
    actMessage: "* Nothing happens.",

    mercyLowHpThreshold: 25,
    mercyLowHpMessage: "* The enemy refuses to surrender.",
    mercyHighHpMessage: "* Try lowering its health more.",

    enemyAttackMessage: "* Keep your soul intact.",
    enemyWarmupMessage: "* Get ready...",
    music: "sounds/linedance_battle.wav",
    phase2: null,

    items: [
      {
        name: "Snack",
        heal: 8,
        quantity: 1
      }
    ],

    battleDialog: [
      "* The enemy stares at you."
    ]
  };

  const enemyData = {
    ...DEFAULT_ENEMY_DATA,
    ...(window.ENEMY_DATA || {})
  };

  const sprites = {
    enemy: loadImage(enemyData.sprite),
    phase2Enemy: loadImage(enemyData.phase2?.sprite || enemyData.sprite),
    heart: loadImage("sprites/heart.png"),
    projectile: loadImage("sprites/projectile.png"),
  };

  const sounds = {
    itemUse: loadSound("sounds/snd_heal_c.wav"),
    menuMove: loadSound("sounds/snd_select.wav"),
    menuSelect: loadSound("sounds/snd_select.wav"),
    battleTheme: loadSound(enemyData.music || "sounds/linedance_battle.wav"),
    phase2Theme: loadSound(enemyData.phase2?.music || enemyData.music || "sounds/linedance_battle.wav"),
  };

  function loadSound(src) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audio.volume = 0.3;
    return audio;
  }

  function playSound(sound) {
    if (!sound) return;

    sound.currentTime = 0;
    sound.play().catch(() => {
      // Browser may block sound until the player has interacted with the page.
    });
  }

  function playMusic(music) {
    if (!music) return;

    music.loop = true;
    music.volume = 0.45;

    if (music.paused) {
      music.currentTime = 0;
      music.play().catch((err) => {
        console.warn("Music failed to play:", err);
      });
    }
  }

  function stopMusic(music) {
    if (!music) return;

    music.pause();
    music.currentTime = 0;
  }

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

  function loadImage(src) {
    const img = new Image();
    img.src = src;
    img.ready = false;
    img.onload = () => (img.ready = true);
    img.onerror = () => (img.ready = false);
    return img;
  }

  const keys = new Set();
  let justPressed = new Set();
  let mouseClick = null;

  window.addEventListener("keydown", (e) => {
    const usable = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      "w",
      "a",
      "s",
      "d",
      "Enter",
      " ",
      "Spacebar",
      "z",
      "Z",
      "x",
      "X",
      "Escape"
    ];

    if (usable.includes(e.key)) e.preventDefault();
    if (!keys.has(e.key)) justPressed.add(e.key);
    keys.add(e.key);
  });

  window.addEventListener("keyup", (e) => keys.delete(e.key));

  canvas.addEventListener("pointerdown", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseClick = {
      x: ((e.clientX - rect.left) / rect.width) * W,
      y: ((e.clientY - rect.top) / rect.height) * H,
    };
  });

  function createInventory(items) {
    if (!Array.isArray(items)) return [];

    return items
      .filter((item) => item && typeof item.name === "string")
      .map((item) => ({
        name: item.name,
        heal: Number.isFinite(item.heal) ? item.heal : 0,
        quantity: Number.isFinite(item.quantity) ? item.quantity : 1
      }))
      .filter((item) => item.quantity > 0);
  }

  const state = {
    phase: PHASE.INTRO,
    bossPhase: 1,
    phase2Started: false,
    selected: 0,
    selectedItem: 0,
    frame: 0,
    textTimer: 0,
    dialogIndex: 0,
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

    box: { x: 285, y: 325, w: 330, h: 190 },
    soul: { x: 450, y: 420, r: 8, speed: 5.06, invuln: 0 },
    bullets: [],

    enemyTimer: 0,
    enemyWarmup: 75,
    enemyDuration: 640,
    pattern: -1,
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
  };

  const menuItems = ["FIGHT", "ACT", "ITEM", "MERCY"];

  function nextBattleDialog() {
    const bossData = currentBossData();
    const battleDialog = bossData.battleDialog;
    const fallback = `* ${bossData.name} refuses to die.`;

    if (!Array.isArray(battleDialog) || battleDialog.length === 0) return fallback;

    if (!Number.isInteger(state.dialogIndex) || state.dialogIndex < 0) {
      state.dialogIndex = 0;
    }

    const index = Math.min(state.dialogIndex, battleDialog.length - 1);
    const line = battleDialog[index] || fallback;

    if (state.dialogIndex < battleDialog.length - 1) {
      state.dialogIndex++;
    }

    return line;
  }

  function beginMenu(message = "* What will you do?") {
    state.phase = PHASE.MENU;
    state.message = typeof message === "string" ? message : "* What will you do?";
    state.textTimer = 0;
    state.bullets = [];
    state.attack.active = false;
    state.attack.result = null;
    state.attack.damage = 0;
    state.soul.x = state.box.x + state.box.w / 2;
    state.soul.y = state.box.y + state.box.h / 2;
  }

  function beginItemSelection() {
    state.phase = PHASE.ITEM;
    state.selectedItem = clamp(state.selectedItem, 0, Math.max(0, state.inventory.length - 1));
    state.message = state.inventory.length > 0
      ? "* Pick an item. Press X/Esc to go back."
      : "* You have no items. Press X/Esc to go back.";
    state.textTimer = 0;
  }

  function beginAttack() {
    state.phase = PHASE.ATTACK;
    state.attack.markerX = 205;
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
    setTimeout(beginEnemyAttack, 2200);
  }

  function resolveAttack() {
    if (!state.attack.active) return;

    const center = W / 2;
    const dist = Math.abs(state.attack.markerX - center);
    const maxDist = 240;
    const accuracy = Math.max(0, 1 - dist / maxDist);
    const damage = Math.max(1, Math.round(6 + accuracy * accuracy * 28));

    state.attack.damage = damage;
    state.attack.result = accuracy > 0.82 ? "CRITICAL" : accuracy > 0.45 ? "HIT" : "WEAK";
    state.enemyHP = Math.max(0, state.enemyHP - damage);
    state.attack.active = false;
    state.attack.flash = 22;
    state.message = `* ${state.attack.result}! You dealt ${damage} damage.`;
    state.textTimer = 0;

    setTimeout(() => {
      if (state.enemyHP <= 0) {
        if (!state.phase2Started && beginPhase2Transition()) {
          return;
        }

        stopCurrentMusic();
        state.phase = PHASE.WIN;
        state.message = currentBossData().winMessage || enemyData.winMessage;
      } else {
        state.phase = PHASE.MESSAGE;
        state.message = nextBattleDialog();
        state.textTimer = 0;
        setTimeout(beginEnemyAttack, 2500);
      }
    }, 780);
  }

  function beginEnemyAttack() {
    const bossData = currentBossData();
    const attackPatterns = currentAttackPatterns();

    state.phase = PHASE.ENEMY;
    state.bullets = [];
    state.enemyTimer = -state.enemyWarmup;

    const patternCount = Array.isArray(attackPatterns)
      ? attackPatterns.length
      : 5;

    state.pattern = (state.pattern + 1) % patternCount;
    state.soul.x = state.box.x + state.box.w / 2;
    state.soul.y = state.box.y + state.box.h / 2;
    state.message = bossData.enemyWarmupMessage;
  }

  function useMenuSelection() {
    const item = menuItems[state.selected];

    if (item === "FIGHT") {
      beginAttack();
    }

    if (item === "ACT") {
      const bossData = currentBossData();

      state.phase = PHASE.MESSAGE;
      state.message = bossData.actMessage;
      state.textTimer = 0;
      setTimeout(beginEnemyAttack, 1050);
    }

    if (item === "ITEM") {
      beginItemSelection();
    }

    if (item === "MERCY") {
      const bossData = currentBossData();

      state.phase = PHASE.MESSAGE;
      state.message = state.enemyHP < bossData.mercyLowHpThreshold
        ? bossData.mercyLowHpMessage
        : bossData.mercyHighHpMessage;
      state.textTimer = 0;
      setTimeout(beginEnemyAttack, 1500);
    }
  }

  function useSelectedItem() {
    if (state.inventory.length === 0) return;

    const item = state.inventory[state.selectedItem];
    if (!item) return;

    playSound(sounds.itemUse);

    const heal = Math.min(item.heal, state.maxHP - state.playerHP);
    state.playerHP += heal;

    item.quantity--;

    if (item.quantity <= 0) {
      state.inventory.splice(state.selectedItem, 1);
      state.selectedItem = clamp(state.selectedItem, 0, Math.max(0, state.inventory.length - 1));
    }

    state.phase = PHASE.MESSAGE;
    state.message = heal > 0
      ? `* You used ${item.name}. Recovered ${heal} HP.`
      : `* You used ${item.name}. But your HP was already full.`;
    state.textTimer = 0;

    setTimeout(beginEnemyAttack, 1250);
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
      age: 0,
      update: null,
      ...b
    };

    state.bullets.push(bullet);
    return bullet;
  }

  function updateEnemyAttack() {
    const t = state.enemyTimer++;
    const box = state.box;
    const bossData = currentBossData();
    const attackPatterns = currentAttackPatterns();

    moveSoul();

    if (t < 0) {
      state.message = bossData.enemyWarmupMessage;
      return;
    }

    state.message = bossData.enemyAttackMessage;

    if (Array.isArray(attackPatterns)) {
      const attackPattern = attackPatterns[state.pattern];

      if (typeof attackPattern === "function") {
        attackPattern({
          t,
          box,
          state,
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

      if (!b.harmless && collides(state.soul, b) && state.soul.invuln <= 0) {
        state.playerHP = Math.max(0, state.playerHP - 3);
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
      beginMenu("* You survived the attack.");
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
      state.dialogIndex = 0;
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

    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) dx--;
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) dx++;
    if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) dy--;
    if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) dy++;

    if (dx && dy) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    soul.x = clamp(soul.x + dx * soul.speed, box.x + soul.r, box.x + box.w - soul.r);
    soul.y = clamp(soul.y + dy * soul.speed, box.y + soul.r, box.y + box.h - soul.r);
  }

  function collides(soul, b) {
    const rr = soul.r + b.r;
    const dx = soul.x - b.x;
    const dy = soul.y - b.y;
    return dx * dx + dy * dy < rr * rr * 0.72;
  }

  function update() {
    state.frame++;

    if (state.textTimer < 9999) state.textTimer++;
    if (state.shake > 0) state.shake--;

    const confirm =
      justPressed.has("Enter") ||
      justPressed.has(" ") ||
      justPressed.has("Spacebar") ||
      justPressed.has("z") ||
      justPressed.has("Z") ||
      mouseClick;

    const cancel =
      justPressed.has("Escape") ||
      justPressed.has("x") ||
      justPressed.has("X");

    const left =
      justPressed.has("ArrowLeft") ||
      justPressed.has("a") ||
      justPressed.has("A");

    const right =
      justPressed.has("ArrowRight") ||
      justPressed.has("d") ||
      justPressed.has("D");

    const up =
      justPressed.has("ArrowUp") ||
      justPressed.has("w") ||
      justPressed.has("W");

    const down =
      justPressed.has("ArrowDown") ||
      justPressed.has("s") ||
      justPressed.has("S");

    if (state.phase === PHASE.INTRO && confirm) {
      playMusic(sounds.battleTheme);
      beginMenu(nextBattleDialog());
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
    } else if (state.phase === PHASE.ITEM) {
      if (cancel) {
        beginMenu("* What will you do?");
      } else {
        if (up && state.inventory.length > 0) {
          state.selectedItem = (state.selectedItem + state.inventory.length - 1) % state.inventory.length;
          playSound(sounds.menuMove);
        }

        if (down && state.inventory.length > 0) {
          state.selectedItem = (state.selectedItem + 1) % state.inventory.length;
          playSound(sounds.menuMove);
        }

        if (mouseClick) {
          const itemIdx = itemHit(mouseClick.x, mouseClick.y);
          const backHit = itemBackHit(mouseClick.x, mouseClick.y);

          if (itemIdx !== -1) {
            if (itemIdx !== state.selectedItem) {
              playSound(sounds.menuMove);
            }

            state.selectedItem = itemIdx;
            useSelectedItem();
          } else if (backHit) {
            beginMenu("* What will you do?");
          }
        } else if (confirm && state.inventory.length > 0) {
          useSelectedItem();
        }
      }
    } else if (state.phase === PHASE.ATTACK) {
      if (state.attack.active) {
        state.attack.markerX += state.attack.speed * state.attack.direction;

        if (state.attack.markerX < 205 || state.attack.markerX > 695) {
          state.attack.direction *= -1;
        }

        if (confirm) resolveAttack();
      }

      if (state.attack.flash > 0) state.attack.flash--;
    } else if (state.phase === PHASE.ENEMY) {
      updateEnemyAttack();
    } else if (state.phase === PHASE.PHASE_TRANSITION) {
      updatePhaseTransition();
    } else if ((state.phase === PHASE.LOSE || state.phase === PHASE.WIN) && confirm) {
      resetGame();
    }

    mouseClick = null;
    justPressed.clear();
  }

  function menuHit(x, y) {
    const y0 = 578;

    for (let i = 0; i < menuItems.length; i++) {
      const bx = 65 + i * 205;
      if (x >= bx && x <= bx + 155 && y >= y0 && y <= y0 + 48) return i;
    }

    return -1;
  }

  function itemHit(x, y) {
    const menu = getItemMenuRect();
    const rowHeight = 34;

    if (x < menu.x || x > menu.x + menu.w) return -1;
    if (y < menu.y + 58 || y > menu.y + 58 + state.inventory.length * rowHeight) return -1;

    const index = Math.floor((y - (menu.y + 58)) / rowHeight);
    return index >= 0 && index < state.inventory.length ? index : -1;
  }

  function itemBackHit(x, y) {
    const menu = getItemMenuRect();
    const bx = menu.x + menu.w - 135;
    const by = menu.y + menu.h - 45;
    return x >= bx && x <= bx + 100 && y >= by && y <= by + 28;
  }

  function getItemMenuRect() {
    return {
      x: 205,
      y: 245,
      w: 490,
      h: 210
    };
  }

  function resetGame() {
    stopCurrentMusic();

    state.phase = PHASE.INTRO;
    state.bossPhase = 1;
    state.phase2Started = false;
    state.selected = 0;
    state.selectedItem = 0;
    state.playerHP = state.maxHP;
    state.enemyMaxHP = enemyData.maxHP;
    state.enemyHP = enemyData.maxHP;
    state.enemyName = enemyData.name;
    state.dialogIndex = 0;
    state.pattern = -1;
    state.inventory = createInventory(enemyData.items);
    state.bullets = [];
    state.message = enemyData.introMessage;
    state.textTimer = 0;
    state.hpFillTarget = 0;
    state.phaseTransition.timer = 0;
    state.phaseTransition.refillMessageTimer = 0;
    state.phaseTransition.refillStarted = false;
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

    if (state.phase === PHASE.ATTACK) drawAttackMeter();
    if (state.phase === PHASE.ENEMY) drawDefenseBox();
    if (state.phase === PHASE.ITEM) drawItemMenu();
    if (state.phase === PHASE.INTRO || state.phase === PHASE.WIN || state.phase === PHASE.LOSE) drawStartOverlay();

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
  }

  function drawEnemy() {
    const cx = W / 2;
    const cy = 135 + Math.sin(state.frame / 24) * 4;
    const spriteSize = 180;
    const transitionVisual = getPhaseTransitionVisual();
    const enemySprite = transitionVisual.spriteKey === "phase2Enemy"
      ? sprites.phase2Enemy
      : sprites.enemy;

    if (state.attack.flash > 0) {
      ctx.save();
      ctx.globalAlpha = state.attack.flash / 22;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    if (transitionVisual.alpha <= 0) {
      drawEnemyHealth();
      return;
    }

    ctx.save();
    ctx.globalAlpha = transitionVisual.alpha;

    if (enemySprite.ready) {
      ctx.drawImage(enemySprite, cx - spriteSize / 2, cy - spriteSize * 0.6, spriteSize, spriteSize);
    } else {
      ctx.translate(cx, cy);
      ctx.scale(0.9, 0.9);
      ctx.fillStyle = "#111";
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 4;

      ctx.beginPath();
      ctx.ellipse(0, 15, 72, 48, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-35, -18, 28, 42, -0.25, 0, Math.PI * 2);
      ctx.ellipse(35, -18, 28, 42, 0.25, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = "#fff";
      ctx.fillRect(-30, 4, 14, 6);
      ctx.fillRect(16, 4, 14, 6);
      ctx.fillRect(-20, 35, 40, 5);
    }

    ctx.restore();
    drawEnemyHealth();
  }

  function getPhaseTransitionVisual() {
    if (state.phase !== PHASE.PHASE_TRANSITION) {
      return {
        alpha: 1,
        spriteKey: state.bossPhase === 2 ? "phase2Enemy" : "enemy"
      };
    }

    const transition = state.phaseTransition;
    const t = transition.timer;
    const refillStart = transition.fadeOutDuration + transition.holdDuration;

    if (t < transition.fadeOutDuration) {
      return {
        alpha: 1 - t / transition.fadeOutDuration,
        spriteKey: "enemy"
      };
    }

    if (t < refillStart) {
      return {
        alpha: 0,
        spriteKey: "enemy"
      };
    }

    return {
      alpha: clamp((t - refillStart) / transition.fadeInDuration, 0, 1),
      spriteKey: "phase2Enemy"
    };
  }

  function drawEnemyHealth() {
    const x = 330;
    const y = 228;

    ctx.font = "22px Courier New";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.fillText(state.enemyName, W / 2, y - 14);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, 240, 18);

    ctx.fillStyle = "#fff";
    ctx.fillRect(x + 3, y + 3, Math.max(0, (234 * state.enemyHP) / state.enemyMaxHP), 12);
  }

  function drawUI() {
    drawDialogueBox();
    drawStats();

    if (state.phase === PHASE.MENU) {
      drawMenu();
    }
  }

  function drawDialogueBox() {
    const x = 60;
    const y = 455;
    const w = 780;
    const h = 92;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    ctx.fillStyle = "#fff";
    ctx.font = "24px Courier New";
    ctx.textAlign = "left";

    const message = typeof state.message === "string" ? state.message : "* ...";
    const visible = message.slice(0, Math.min(message.length, Math.floor(state.textTimer * 1.25)));

    wrapText(visible, x + 28, y + 38, w - 56, 30);
  }

  function drawStats() {
    ctx.fillStyle = "#fff";
    ctx.font = "22px Courier New";
    ctx.textAlign = "left";

    ctx.fillText("HERO", 65, 430);
    ctx.fillText("LV 1", 155, 430);
    ctx.fillText("HP", 260, 430);

    ctx.strokeStyle = "#fff";
    ctx.strokeRect(305, 413, 170, 20);

    ctx.fillStyle = "#fff";
    ctx.fillRect(309, 417, Math.max(0, 162 * state.playerHP / state.maxHP), 12);

    ctx.fillText(`${state.playerHP} / ${state.maxHP}`, 498, 430);
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
    }
  }

  function drawItemMenu() {
    const menu = getItemMenuRect();

    ctx.save();

    ctx.fillStyle = "rgba(0,0,0,0.82)";
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#000";
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.fillRect(menu.x, menu.y, menu.w, menu.h);
    ctx.strokeRect(menu.x, menu.y, menu.w, menu.h);

    ctx.fillStyle = "#fff";
    ctx.font = "26px Courier New";
    ctx.textAlign = "left";
    ctx.fillText("ITEMS", menu.x + 28, menu.y + 38);

    ctx.font = "18px Courier New";
    ctx.fillStyle = "#cfcfcf";
    ctx.fillText("Use ↑/↓, Enter/Z to use, X/Esc to go back", menu.x + 28, menu.y + menu.h - 22);

    if (state.inventory.length === 0) {
      ctx.fillStyle = "#fff";
      ctx.font = "22px Courier New";
      ctx.fillText("No items left.", menu.x + 28, menu.y + 92);
      drawBackButton(menu);
      ctx.restore();
      return;
    }

    const rowHeight = 34;

    for (let i = 0; i < state.inventory.length; i++) {
      const item = state.inventory[i];
      const rowY = menu.y + 76 + i * rowHeight;
      const selected = i === state.selectedItem;

      if (selected) {
        ctx.fillStyle = "#ffcc33";
        ctx.fillText(">", menu.x + 28, rowY);
      }

      ctx.fillStyle = selected ? "#ffcc33" : "#fff";
      ctx.font = "22px Courier New";
      ctx.textAlign = "left";
      ctx.fillText(item.name, menu.x + 58, rowY);

      ctx.textAlign = "right";
      ctx.fillText(`+${item.heal} HP`, menu.x + menu.w - 115, rowY);
      ctx.fillText(`x${item.quantity}`, menu.x + menu.w - 35, rowY);
    }

    drawBackButton(menu);

    ctx.restore();
  }

  function drawBackButton(menu) {
    const bx = menu.x + menu.w - 135;
    const by = menu.y + menu.h - 45;

    ctx.strokeStyle = "#fff";
    ctx.fillStyle = "#000";
    ctx.lineWidth = 2;
    ctx.fillRect(bx, by, 100, 28);
    ctx.strokeRect(bx, by, 100, 28);

    ctx.fillStyle = "#fff";
    ctx.font = "18px Courier New";
    ctx.textAlign = "center";
    ctx.fillText("BACK", bx + 50, by + 20);
  }

  function drawAttackMeter() {
    const x = 190;
    const y = 328;
    const w = 520;
    const h = 88;

    ctx.fillStyle = "#000";
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(x, y, w, h);

    const center = x + w / 2;

    ctx.fillStyle = "#333";
    ctx.fillRect(x + 20, y + 28, w - 40, 32);

    const zones = [
      { width: 230, alpha: 0.18 },
      { width: 122, alpha: 0.35 },
      { width: 34, alpha: 0.85 },
    ];

    for (const z of zones) {
      ctx.globalAlpha = z.alpha;
      ctx.fillStyle = "#fff";
      ctx.fillRect(center - z.width / 2, y + 22, z.width, 44);
    }

    ctx.globalAlpha = 1;

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center, y + 14);
    ctx.lineTo(center, y + h - 14);
    ctx.stroke();

    ctx.fillStyle = "#ff3333";
    ctx.fillRect(state.attack.markerX - 5, y + 12, 10, h - 24);

    if (state.attack.result) {
      ctx.fillStyle = "#fff";
      ctx.font = "30px Courier New";
      ctx.textAlign = "center";
      ctx.fillText(`${state.attack.result}  -${state.attack.damage}`, W / 2, y - 25);
    } else {
      ctx.fillStyle = "#fff";
      ctx.font = "22px Courier New";
      ctx.textAlign = "center";
      ctx.fillText("Strike near the center!", W / 2, y - 22);
    }
  }

  function drawDefenseBox() {
    const box = state.box;

    ctx.fillStyle = "#000";
    ctx.fillRect(box.x, box.y, box.w, box.h);

    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 4;
    ctx.strokeRect(box.x, box.y, box.w, box.h);

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

  function drawSoul() {
    const s = state.soul;

    if (state.soul.invuln > 0 && Math.floor(state.frame / 4) % 2 === 0) {
      return;
    }

    if (sprites.heart.ready) {
      ctx.drawImage(sprites.heart, s.x - 11, s.y - 11, 22, 22);
      return;
    }

    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.fillStyle = "#ff1e35";

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

    if (b.type === "diamond") {
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

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
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
