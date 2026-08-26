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
      FIGHT_QTE: "fightQte",
      PLAYER_EFFECT: "playerEffect",
      SPELL_ACTION: "spellAction",
      PERSISTENT_EFFECT: "persistentEffect",
      ACT: "act",
      ACT_TARGET: "actTarget",
      ACT_ENEMY_TARGET: "actEnemyTarget",
      ITEM: "item",
      ITEM_TARGET: "itemTarget",
      MERCY_TARGET: "mercyTarget",
      MERCY_MESSAGE: "mercyMessage",
      MERCY_FADE: "mercyFade",
      ULTIMATE_TRANSITION: "ultimateTransition",
      ATTACK: "attack",
      DAMAGE_RESULT: "damageResult",
      LAST_STAND_EVENT: "lastStandEvent",
      DEFEAT_DISSOLVE: "defeatDissolve",
      TURN_EVENT: "turnEvent",
      SCENE: "scene",
      ENEMY_DIALOG: "enemyDialog",
      ENEMY: "enemy",
      MESSAGE: "message",
      BOX_MORPH: "boxMorph",
      PHASE_TRANSITION: "phaseTransition",
      WIN: "win",
      SPARED: "spared",
      LOSE: "lose",
    },
    ATTACK_TYPE: {
      NORMAL: "normal",
      PURPLE: "purple",
      BLUE: "blue",
      GREEN: "green",
      COMPACT: "compact",
      ULTIMATE: "ultimate",
    },
    PURPLE_LINE_COUNT: 3,
    BOX_RECT: {
      TEXT: { x: 0, y: 488, w: 900, h: 162 },
      BATTLE: { x: 282, y: 148, w: 336, h: 224 },
      GREEN: { x: 407, y: 282, w: 86, h: 86 },
      COMPACT: { x: 386, y: 260, w: 129, h: 129 },
      FULL: { x: 4, y: 4, w: 892, h: 642 },
    },
    MENU_ITEMS: ["FIGHT", "ACT", "ITEM", "DEFEND"],
    DEFAULT_ENEMY_DATA: {
      name: "ENEMY",
      sprite: "sprites/enemy.png",
      maxHP: 100,

      introMessage: "* An enemy blocks your path.",
      winMessage: "* You won.",
      actMessage: "* Nothing happens.",
      actConditions: [],

      mercySuccess: "* You spare the enemy.",
      mercyFailure: "* The enemy is not ready to be spared.",
      mercyWinMessage: "You won without fighting.",

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
