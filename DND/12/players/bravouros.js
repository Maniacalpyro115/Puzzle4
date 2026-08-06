window.PLAYER_DATA = window.PLAYER_DATA || [];
window.PLAYER_DATA.push({
  name: "BRAVOUROS",
  maxHP: 45,
  hp: 45,
  cardColor: "#199428",
  secondaryColor: "#62cf72",
  sprites: {
    default: "sprites/characters/bravouros/default.png",
    down: "sprites/characters/bravouros/down.png",
    icon: "sprites/characters/bravouros/icon.png",
    action: "sprites/characters/bravouros/action.png",
    starry_archer: "sprites/characters/bravouros/misc/archer/default_0001.png",
    starry_chalice: "sprites/characters/bravouros/misc/chalice/default_0001.png",
    attack: "sprites/characters/bravouros/attack.png",
    item: "sprites/characters/bravouros/item.png"
  },
  defaultAnimation: {
    frames: [
      "sprites/characters/bravouros/default/default_0001.png",
      "sprites/characters/bravouros/default/default_0002.png",
      "sprites/characters/bravouros/default/default_0003.png",
      "sprites/characters/bravouros/default/default_0004.png",
      "sprites/characters/bravouros/default/default_0005.png"
    ],
    fps: 2
  },
  spriteAnimations: {
    starry_archer: {
      frames: [
        "sprites/characters/bravouros/misc/archer/default_0001.png",
        "sprites/characters/bravouros/misc/archer/default_0002.png",
        "sprites/characters/bravouros/misc/archer/default_0003.png",
        "sprites/characters/bravouros/misc/archer/default_0004.png",
        "sprites/characters/bravouros/misc/archer/default_0005.png"
      ],
      fps: 2
    },
    starry_chalice: {
      frames: [
        "sprites/characters/bravouros/misc/chalice/default_0001.png",
        "sprites/characters/bravouros/misc/chalice/default_0002.png",
        "sprites/characters/bravouros/misc/chalice/default_0003.png",
        "sprites/characters/bravouros/misc/chalice/default_0004.png",
        "sprites/characters/bravouros/misc/chalice/default_0005.png"
      ],
      fps: 2
    }
  },
  spriteScale: 1.5,
  defendTP: 16,
  damage: 15,
  acts: [
    {
      name: "Check",
      description: "Inspect the enemy",
      tpCost: 0,
      target: "none",
      effect: "check"
    },
    {
      name: "Cure Wounds",
      description: "Restores 12 HP to one player",
      tpCost: 24,
      target: "ally",
      effect: "heal",
      heal: 12,
      popupText: "+hp"
    },
    {
      name: "Starry Form Archer",
      description: "Attacks every turn. Fades when down. Only one Starry Form may be active.",
      tpCost: 8,
      target: "enemy",
      effect: "persistent",
      script: "starryFormArcher",
      persistentId: "starryFormArcher",
      persistentGroup: "starryForm",
      persistentSprite: "starry_archer",
      damage: 16
    },
    {
      name: "Starry Form Chalice",
      description: "Heals lowest HP player every turn. Fades when down. Only one Starry Form may be active.",
      tpCost: 8,
      target: "none",
      effect: "persistent",
      script: "starryFormChalice",
      persistentId: "starryFormChalice",
      persistentGroup: "starryForm",
      persistentSprite: "starry_chalice",
      heal: 6
    },
    {
      name: "Guiding Bolt",
      description: "Deal Medium Damage. First attack on target next turn deals 25% more damage",
      tpCost: 40,
      target: "enemy",
      effect: "damage",
      script: "guidingBolt",
      damage: 25
    }
  ]
});
