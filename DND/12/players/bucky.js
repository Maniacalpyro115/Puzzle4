window.PLAYER_DATA = window.PLAYER_DATA || [];
window.PLAYER_DATA.push({
  name: "BUCKY",
  maxHP: 50,
  hp: 50,
  cardColor: "#168aad",
  secondaryColor: "#67c9e8",
  sprites: {
    default: "sprites/characters/bucky/default/default_0001.png",
    down: "sprites/characters/bucky/down.png",
    icon: "sprites/characters/bucky/icon.png",
    action: "sprites/characters/bucky/action.png",
    attack: "sprites/characters/bucky/attack.png",
    item: "sprites/characters/bucky/item.png",
    beast_sitting: "sprites/characters/bucky/misc/sitting.png",
    beast_attack: "sprites/characters/bucky/misc/attack.png",
    beast_nap: "sprites/characters/bucky/misc/nap.png"
  },
  defaultAnimation: {
    frames: [
      "sprites/characters/bucky/default/default_0001.png",
      "sprites/characters/bucky/default/default_0002.png",
      "sprites/characters/bucky/default/default_0003.png",
      "sprites/characters/bucky/default/default_0004.png",
      "sprites/characters/bucky/default/default_0005.png"
    ],
    fps: 2
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
      name: "Summon Beast",
      description: "Summon powerful beast to command",
      tpCost: 60,
      target: "none",
      effect: "summonBeast"
    },
    {
      name: "Command - Charge",
      description: "Command beast to charge enemy",
      tpCost: 0,
      target: "enemy",
      effect: "damage",
      script: "beastCharge",
      damage: 35,
      requiresBeast: true
    },
    {
      name: "Command - Dodge",
      description: "Command beast to block first damage this turn",
      tpCost: 24,
      target: "none",
      effect: "beastDodge",
      requiresBeast: true
    }
  ]
});
