window.PLAYER_DATA = window.PLAYER_DATA || [];
window.PLAYER_DATA.push({
  name: "TARHUN",
  maxHP: 65,
  hp: 65,
  cardColor: "#fffdd0",
  secondaryColor: "#fffdd0",
  sprites: {
    default: "sprites/characters/tarhun/default/default_0001.png",
    down: "sprites/characters/tarhun/down.png",
    icon: "sprites/characters/tarhun/icon.png",
    attack: "sprites/characters/tarhun/attack.png",
    rage: "sprites/characters/tarhun/rage/rage-v2_0001.png",
    "rage-item": "sprites/characters/tarhun/rage-item.png",
    "rage-attack": "sprites/characters/tarhun/rage-attack.png",
    reckless: "sprites/characters/tarhun/reckless.png",
    item: "sprites/characters/tarhun/item.png"
  },
  defaultAnimation: {
    frames: [
      "sprites/characters/tarhun/default/default_0001.png",
      "sprites/characters/tarhun/default/default_002.png",
      "sprites/characters/tarhun/default/default_0003.png",
      "sprites/characters/tarhun/default/default_0004.png",
      "sprites/characters/tarhun/default/default_0005.png"
    ],
    fps: 2
  },
  spriteAnimations: {
    rage: {
      frames: [
        "sprites/characters/tarhun/rage/rage-v2_0001.png",
        "sprites/characters/tarhun/rage/rage-v2_0002.png",
        "sprites/characters/tarhun/rage/rage-v2_0003.png",
        "sprites/characters/tarhun/rage/rage-v2_0004.png",
        "sprites/characters/tarhun/rage/rage-v2_0005.png",
        "sprites/characters/tarhun/rage/rage-v2_0006.png",
        "sprites/characters/tarhun/rage/rage-v2_0007.png"
      ],
      fps: 2
    }
  },
  spriteScale: 1.5,
  preserveBattleSpriteAspectRatio: true,
  battleSpriteRoleScales: {
    attack: 1.53,
    "rage-attack": 1.53
  },
  defendTP: 16,
  damage: 15,
  acts: [
    {
      name: "Rage",
      description: "Gain 20% resistance and 20% base damage until downed",
      tpCost: 0,
      target: "none",
      effect: "rage",
      baseDamageBonus: 0.2,
      damageResistance: 0.2
    },
    {
      name: "Reckless Attack",
      description: "High damage slash. Tarhun takes double damage this turn",
      tpCost: 20,
      target: "enemy",
      effect: "damage",
      script: "recklessAttack",
      sprite: "reckless",
      damage: 40
    },
    {
      name: "Interception",
      description: "All attacks target Tarhun first this turn",
      tpCost: 12,
      target: "none",
      effect: "interception"
    },
    {
      name: "Attack of Oppurtunity",
      description: "Whenever a party member is struck, deal damage back the following turn",
      tpCost: 60,
      target: "enemy",
      effect: "persistent",
      script: "attackOfOpportunity",
      persistentId: "attackOfOpportunity",
      damage: 4,
      once: true,
      persistsWhenDown: true
    }
  ]
});
