(() => {
  "use strict";

  window.SoulBattle = window.SoulBattle || {};

  window.SoulBattle.constants = {
    W: 900,
    H: 650,
    FIXED_STEP_MS: 1000 / 60,
    MAX_FRAME_MS: 250,
    PHASE: {
      INTRO: "intro",
      MENU: "menu",
      FIGHT_TARGET: "fightTarget",
      ITEM: "item",
      ATTACK: "attack",
      DAMAGE_RESULT: "damageResult",
      ENEMY_DIALOG: "enemyDialog",
      ENEMY: "enemy",
      MESSAGE: "message",
      BOX_MORPH: "boxMorph",
      PHASE_TRANSITION: "phaseTransition",
      WIN: "win",
      LOSE: "lose",
    },
    ATTACK_TYPE: {
      NORMAL: "normal",
      PURPLE: "purple",
    },
    PURPLE_LINE_COUNT: 3,
    BOX_RECT: {
      TEXT: { x: 60, y: 440, w: 780, h: 92 },
      BATTLE: { x: 285, y: 325, w: 330, h: 190 },
    },
    MENU_ITEMS: ["FIGHT", "ACT", "ITEM", "MERCY"],
    DEFAULT_ENEMY_DATA: {
      name: "ENEMY",
      sprite: "sprites/enemy.png",
      maxHP: 100,

      introMessage: "* An enemy blocks your path.",
      winMessage: "* You won.",
      actMessage: "* Nothing happens.",

      mercyLowHpThreshold: 25,
      mercyLowHpMessage: "* The enemy refuses to surrender.",
      mercyHighHpMessage: "* Try lowering its health more.",

      music: "sounds/linedance_battle.wav",
      phase2: null,

      items: [
        {
          name: "Snack",
          heal: 8
        }
      ],

      battleDialog: [
        "* The enemy stares at you."
      ],

      enemyDialog: [
        "* ..."
      ]
    }
  };
})();
