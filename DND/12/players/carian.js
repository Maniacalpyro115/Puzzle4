window.PLAYER_DATA = window.PLAYER_DATA || [];
window.PLAYER_DATA.push({
  name: "CARIAN",
  maxHP: 50,
  hp: 50,
  cardColor: "#86251a",
  secondaryColor: "#c85f52",
  sprites: {
    default: "sprites/characters/carian/default.png",
    down: "sprites/characters/carian/down.png",
    icon: "sprites/characters/carian/icon.png",
    action: "sprites/characters/carian/attack.png",
    curtain_call: "sprites/characters/carian/curtain_call.png",
    starshot: "sprites/characters/carian/starshot/default-fire_0001.png",
    attack: "sprites/characters/carian/attack.png",
    item: "sprites/characters/carian/item.png"
  },
  defaultAnimation: {
    frames: [
      "sprites/characters/carian/default/default_0001.png",
      "sprites/characters/carian/default/default_0002.png",
      "sprites/characters/carian/default/default_0003.png",
      "sprites/characters/carian/default/default_0004.png",
      "sprites/characters/carian/default/default_0005.png"
    ],
    fps: 2
  },
  spriteAnimations: {
    starshot: {
      frames: [
        "sprites/characters/carian/starshot/default-fire_0001.png",
        "sprites/characters/carian/starshot/default-fire_0002.png",
        "sprites/characters/carian/starshot/default-fire_0003.png",
        "sprites/characters/carian/starshot/default-fire_0004.png",
        "sprites/characters/carian/starshot/default-fire_0005.png"
      ],
      fps: 2
    }
  },
  spriteScale: 1.5,
  defendTP: 16,
  damage: 16,
  acts: [
    {
      name: "Check",
      description: "Inspect the enemy",
      tpCost: 0,
      target: "none",
      effect: "check"
    },
    {
      name: "Curtain Call",
      description: "Massive damage shot",
      tpCost: 100,
      target: "enemy",
      effect: "damage",
      script: "curtainCall",
      sprite: "curtain_call",
      damage: 85
    },
    {
      name: "Crimson Rite",
      description: "Permanently increase damage by 20%",
      hpCost: 5,
      target: "none",
      effect: "damageBuff",
      damageMultiplier: 1.2,
      once: true
    },
    {
      name: "Starshot",
      description: "Deal double damage next turn",
      tpCost: 40,
      target: "none",
      effect: "nextTurnDamageBuff",
      damageMultiplier: 2
    }
  ]
});
