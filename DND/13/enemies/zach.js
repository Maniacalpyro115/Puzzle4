window.ENEMY_DATA = {
  name: "ZACH",

  sprite: "sprites/enemies/zach/default/default_0001.png",
  defaultAnimation: {
    frames: [
      "sprites/enemies/zach/default/default_0001.png",
      "sprites/enemies/zach/default/default_0002.png",
      "sprites/enemies/zach/default/default_0003.png",
      "sprites/enemies/zach/default/default_0004.png",
      "sprites/enemies/zach/default/default_0005.png"
    ],
    fps: 2
  },
  spriteAnimations: {
    linedance: {
      frames: [
        "sprites/enemies/zach/linedance/linedance_0001.png",
        "sprites/enemies/zach/linedance/linedance_0002.png",
        "sprites/enemies/zach/linedance/linedance_0003.png",
        "sprites/enemies/zach/linedance/linedance_0004.png",
        "sprites/enemies/zach/linedance/linedance_0005.png",
        "sprites/enemies/zach/linedance/linedance_0006.png",
        "sprites/enemies/zach/linedance/linedance_0007.png",
        "sprites/enemies/zach/linedance/linedance_0008.png",
        "sprites/enemies/zach/linedance/linedance_0009.png",
        "sprites/enemies/zach/linedance/linedance_0010.png",
        "sprites/enemies/zach/linedance/linedance_0011.png"
      ],
      fps: 8
    },
    vampire: {
      frames: [
        "sprites/enemies/zach/vampire/default_0001.png",
        "sprites/enemies/zach/vampire/default_0002.png",
        "sprites/enemies/zach/vampire/default_0003.png",
        "sprites/enemies/zach/vampire/default_0004.png",
        "sprites/enemies/zach/vampire/default_0005.png",
        "sprites/enemies/zach/vampire/default_0006.png",
        "sprites/enemies/zach/vampire/default_0007.png"
      ],
      fps: 6
    }
  },
  spriteBob: 0,
  enemyDialogDurationMultiplier: 1.5,
  music: {
    src: "sounds/zach.wav",
    loopStart: 11.571,
    loopEnd: 157.461,
    bpm: 180.958
  },
  sprites: {
    hit: "sprites/enemies/zach/hit.png",
    attack1: "sprites/enemies/zach/attack1.png",
    attack2: "sprites/enemies/zach/attack2.png",
    thinking: "sprites/enemies/zach/thinking.png",
    pointing: "sprites/enemies/zach/attack1.png",
    computer: "sprites/enemies/zach/attack2.png",
    lightbulb: "sprites/enemies/zach/thinking.png",
    wolfDefault: "sprites/enemies/minions/wolf/default.png",
    wolfLunge: "sprites/enemies/minions/wolf/lunge.png",
    batMinion: "sprites/enemies/minions/bat.png",
    flameSkull: "sprites/enemies/minions/flame_skull.png",
    treeBlight: "sprites/enemies/minions/tree_blight.png"
  },
  spriteSizes: {
    default: 150,
    hit: 150,
    attack1: 150,
    attack2: 150,
    thinking: 150,
    pointing: 150,
    computer: 150,
    lightbulb: 150,
    linedance: 150,
    vampire: 150
  },
  preserveSpriteAspectRatio: ["default", "hit", "thinking", "pointing", "computer", "lightbulb", "vampire"],
  spritePositions: {
    default: { x: 720, y: 168 },
    hit: { x: 720, y: 168 },
    attack1: { x: 720, y: 168 },
    attack2: { x: 720, y: 168 },
    thinking: { x: 720, y: 168 },
    pointing: { x: 720, y: 168 },
    computer: { x: 720, y: 168 },
    lightbulb: { x: 720, y: 168 },
    linedance: { x: 720, y: 168 },
    vampire: { x: 720, y: 168 }
  },
  spriteFlips: {
    default: { x: true },
    hit: { x: true },
    attack1: { x: true },
    attack2: { x: true },
    thinking: { x: true },
    pointing: { x: true },
    computer: { x: true },
    lightbulb: { x: true },
    linedance: { x: true },
    vampire: { x: true }
  },
  maxHP: 1000,
  hitSprite: "hit",

  introMessage: "* ZACH steps into the fight.",
  winMessage: "* ZACH decides that is probably enough.",
  defeatDialog: "Its time... for me... to... flake...",
  check: "You inspect the enemy, appears its just a line dancing little fellow",
  actMessage: "* You check ZACH. He is using basic red attacks.",

  mercyFailure: "* ZACH is still locked in.",
  mercySuccess: "* You spare ZACH.",
  mercyWinMessage: "ZACH backs down.",

  enemyDialog: [
  ],

  items: [
    { name: "Snack", heal: 14 },
    { name: "Water", heal: 18 },
    { name: "Bandage", heal: 22 }
  ],

  battleDialog: [
    "A DM approaches...",
    "Zach prepares to go easy on you.",
    "The creatures of Barovia lurk about.",
    "A dungeon wall looms in the distance...",
    "You enter the dungeon. A distant fire lights the dark hallway.",
    "Zach puts away his laptop and prepares to leave",
    "Awful music fills your ear. You wish you could escape.",
    "The floor grows increasingly sticky with beer.",
    "You return to DnD, Zach's suprisingly already there waiting for.",
    "The dungeon walls echo with terror.",
    "You enter the final room.",
    "The Vampire Spawn continue their barrage",
    "The last of the Vampire Spawn surround you.",
    "You learn of the vampire lord's location. You journey to his castle.",
    "Your journey continues",
    "You near the final castle.",
    "The castle seems too calm. Watch your step.",
    "You enter the Vampire Lord's chamber.",
    "You have defeated the Vampire Lord! Zach forgets about you and returns home (line dancing).",
    "Zach dances the night away",
    "Zach dances the night away",
    "Zach dances the night away",
    "Zach dances the night away",
    "Zach dances the night away",
    "Zach dances the night away"
  ],

  turns: [
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", sprite: "default", text: "Ready for your adventure, heroes?" },
          { type: "enemyDialog", sprite: "thinking", text: "Let me see if Claude is done writing it" },
          { type: "enemyDialog", sprite: "computer", text: "...barovia ...vampires ...wolves" },
          {
            type: "enemyDialog",
            sprite: "default",
            text: "Perfect, thanks for waiting 20 minutes while that loaded."
          },
          { type: "enemyDialog", sprite: "pointing", text: "A pack of wolves attack!" }
        ]
      },
      duration: 570,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      pattern: function barovianWolfLunges({ t, box, spawnBullet }) {
        spawnAlternatingWolfLunge({ t, box, spawnBullet });
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "As you approach the town, a hoard of bats descends!"
          }
        ]
      },
      duration: 590,
      damage: 15,
      box: { x: 394, y: 148, w: 112, h: 224 },
      setup: function resetBatRainBeat({ state }) {
        state.zachBatRainLastBeat = null;
      },
      pattern: function barovianBatRain({ box, state, musicBeat, spawnBullet }) {
        spawnBeatBatRain({ box, state, musicBeat, spawnBullet, stateKey: "zachBatRainLastBeat" });
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", sprite: "default", text: "You leave town on the trail." },
          { type: "enemyDialog", text: "You hear rustling in the bushes..." },
          { type: "enemyDialog", sprite: "pointing", text: "Twig Blights ambush you!" }
        ]
      },
      duration: 620,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function raiseTreeBlightPlatforms({ box, state, spawnBullet }) {
        const platforms = [
          { x: box.x + box.w - 42, y: box.y + box.h - 34 },
          { x: box.x + 42, y: box.y + box.h / 2 },
          { x: box.x + box.w - 42, y: box.y + 40 }
        ];

        for (const platform of platforms) {
          spawnBullet({
            x: platform.x,
            y: platform.y,
            r: 0,
            width: 66,
            height: 11,
            type: "platform",
            harmless: true,
            solidPlatform: true,
            noCull: true,
            life: 621
          });
        }

        state.soul.x = platforms[0].x;
        state.soul.y = platforms[0].y - state.soul.r;
        state.soul.vy = 0;
        state.soul.pitBounce = false;
      },
      pattern: function treeBlightVolley({ t, box, state, spawnBullet }) {
        const cycle = t % 108;
        const positions = [
          { x: box.x - 27, y: box.y + 42, facing: 1 },
          { x: box.x + box.w + 27, y: box.y + box.h / 2, facing: -1 },
          { x: box.x - 27, y: box.y + box.h - 42, facing: 1 }
        ];

        if (t === 0) {
          for (const position of positions) {
            spawnBullet({
              ...position,
              r: 15,
              type: "treeBlight",
              harmless: true,
              life: 620
            });
          }
        }

        if (cycle !== 24 && cycle !== 49 && cycle !== 74) return;

        for (const position of positions) {
          const dx = state.soul.x - position.x;
          const dy = state.soul.y - position.y;
          const length = Math.max(1, Math.hypot(dx, dy));
          const speed = 2.75;

          spawnBullet({
            x: position.x,
            y: position.y,
            vx: dx / length * speed,
            vy: dy / length * speed,
            r: 6,
            type: "blightNeedle",
            life: 115,
            angle: Math.atan2(dy, dx)
          });
        }
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "assignEnemyDefault", sprite: "default" },
          { type: "enemyDialog", sprite: "default", text: "Back to it, now!" },
          { type: "enemyDialog", sprite: "thinking", text: "Wait, where'd we leave off Claude?" },
          { type: "enemyDialog", sprite: "computer", text: ".....dungeon ...flame skulls ...combat" },
          {
            type: "enemyDialog",
            sprite: "lightbulb",
            text: "I've got it! We'll retcon the last session and re-fight the skulls!"
          },
          { type: "assignEnemyDefault", sprite: "default" }
        ]
      },
      duration: 600,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function raiseCrossfirePlatforms({ box, state, spawnBullet }) {
        state.zachCrossfireSafeLane = null;
        state.zachCrossfireSafeStreak = 0;
        for (const platform of [
          { heightRatio: 2 / 3, width: 64 * 1.1 },
          { heightRatio: 1 / 3, width: 64 * 0.9 }
        ]) {
          spawnBullet({
            x: box.x + box.w / 2,
            y: box.y + box.h * platform.heightRatio,
            r: 0,
            width: platform.width,
            height: 11,
            type: "platform",
            harmless: true,
            solidPlatform: true,
            noCull: true,
            life: 601
          });
        }
      },
      pattern: function flameskullCrossfire({ t, box, state, spawnBullet }) {
        if (t % 80 !== 0) return;

        const laneYs = [
          box.y + box.h / 6,
          box.y + box.h / 2,
          box.y + box.h * 5 / 6
        ];
        const availableSafeLanes = state.zachCrossfireSafeStreak >= 2
          ? [0, 1, 2].filter((index) => index !== state.zachCrossfireSafeLane)
          : [0, 1, 2];
        const safeLane = t === 0
          ? 2
          : availableSafeLanes[Math.floor(Math.random() * availableSafeLanes.length)];
        if (safeLane === state.zachCrossfireSafeLane) {
          state.zachCrossfireSafeStreak++;
        } else {
          state.zachCrossfireSafeLane = safeLane;
          state.zachCrossfireSafeStreak = 1;
        }
        const targetedLanes = laneYs
          .map((y, index) => ({ y, index }))
          .filter((lane) => lane.index !== safeLane);
        const swapSides = Math.random() < 0.5;

        targetedLanes.forEach((lane, index) => {
          const fromLeft = (index === 0) !== swapSides;
          spawnBullet({
            x: fromLeft ? box.x - 34 : box.x + box.w + 34,
            y: lane.y,
            r: 16,
            type: "flameSkull",
            harmless: true,
            facing: fromLeft ? 1 : -1,
            life: 72,
            fired: false,
            update: function fadeAndFire({ bullet, state, spawnBullet }) {
              if (bullet.fired || bullet.age < 36) return;

              bullet.fired = true;
              spawnBullet({
                x: bullet.x + (fromLeft ? 14 : -14),
                y: bullet.y - (box.h / 3 - 8) / 2,
                vx: fromLeft ? 11.25 : -11.25,
                r: 0,
                width: 110,
                height: box.h / 3 - 8,
                type: "greenFireBlast",
                life: 60,
                facing: fromLeft ? 1 : -1
              });
            }
          });
        });
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          {
            type: "enemyDialog",
            sprite: "default",
            text: "You aproach the dungeon wall. The door is stuck shut."
          },
          { type: "enemyDialog", sprite: "thinking", text: "Oh, you want to scale it?" },
          { type: "enemyDialog", sprite: "pointing", text: "Very well, roll acrobatics!" }
        ]
      },
      duration: 840,
      damage: 15,
      box: { x: 338, y: 4, w: 224, h: 642 },
      setup: function beginDescendingDungeon({ box, state, spawnBullet }) {
        const spikeHeight = 24;
        const floorY = box.y + box.h - spikeHeight;
        const platformSpeed = 2.7;
        state.zachLastPlatformSpiked = false;

        spawnBullet({
          x: box.x + box.w / 2,
          y: floorY,
          width: box.w,
          height: spikeHeight,
          type: "spikeFloor",
          superBounce: true,
          life: 841,
          noCull: true
        });

        let startingPlatform = null;
        for (let i = 0; i < 9; i++) {
          const width = randomPlatformWidth();
          const platform = spawnDescendingPlatform({
            spawnBullet,
            x: randomPlatformX(box, width),
            y: floorY - 48 - i * 70,
            speed: platformSpeed,
            width,
            life: 340,
            spiked: chooseRandomPlatformSpikes(state, i === 4)
          });
          if (i === 4) startingPlatform = platform;
        }

        state.soul.x = startingPlatform.x;
        state.soul.y = startingPlatform.y - state.soul.r;
        state.soul.vy = 0;
        state.soul.pitBounce = false;
      },
      pattern: function descendingDungeon({ t, box, state, spawnBullet }) {
        if (t % 22 !== 0) return;

        const width = randomPlatformWidth();
        const x = randomPlatformX(box, width);
        spawnDescendingPlatform({
          spawnBullet,
          x,
          y: box.y - 16,
          speed: 2.7,
          width,
          life: 300,
          spiked: chooseRandomPlatformSpikes(state)
        });

        if (Math.random() < 0.25) {
          const pairedWidth = randomPlatformWidth();
          const leftSide = x >= box.x + box.w / 2;
          const pairedX = leftSide
            ? box.x + 10 + pairedWidth / 2 + Math.random() * Math.max(1, box.w * 0.34 - pairedWidth)
            : box.x + box.w * 0.66 + Math.random() * Math.max(1, box.w * 0.34 - pairedWidth - 10);
          spawnDescendingPlatform({
            spawnBullet,
            x: pairedX,
            y: box.y - 16,
            speed: 2.7,
            width: pairedWidth,
            life: 300,
            spiked: chooseRandomPlatformSpikes(state)
          });
        }
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "Flaming Skulls attack through the walls!"
          }
        ]
      },
      duration: 600,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function raiseSyncopatedPlatforms({ box, state, spawnBullet }) {
        state.zachSyncopatedLeftLane = null;
        state.zachSyncopatedSafeLane = null;
        state.zachSyncopatedSafeStreak = 0;
        for (const platform of [
          { heightRatio: 2 / 3, width: 64 * 1.1 },
          { heightRatio: 1 / 3, width: 64 * 0.9 }
        ]) {
          spawnBullet({
            x: box.x + box.w / 2,
            y: box.y + box.h * platform.heightRatio,
            r: 0,
            width: platform.width,
            height: 11,
            type: "platform",
            harmless: true,
            solidPlatform: true,
            noCull: true,
            life: 601
          });
        }
      },
      pattern: function syncopatedFlameskulls({ t, box, state, spawnBullet }) {
        if (t % 38 !== 0) return;

        const spawnIndex = Math.floor(t / 38);
        const fromLeft = spawnIndex % 2 === 1;
        const laneYs = [
          box.y + box.h / 6,
          box.y + box.h / 2,
          box.y + box.h * 5 / 6
        ];
        let laneIndex;
        if (spawnIndex % 2 === 0) {
          const availableSafeLanes = state.zachSyncopatedSafeStreak >= 2
            ? [0, 1, 2].filter((index) => index !== state.zachSyncopatedSafeLane)
            : [0, 1, 2];
          const safeLane = availableSafeLanes[Math.floor(Math.random() * availableSafeLanes.length)];
          if (safeLane === state.zachSyncopatedSafeLane) {
            state.zachSyncopatedSafeStreak++;
          } else {
            state.zachSyncopatedSafeLane = safeLane;
            state.zachSyncopatedSafeStreak = 1;
          }

          let rightLanes = [0, 1, 2].filter((index) => index !== safeLane);
          if (spawnIndex === 0) rightLanes = rightLanes.filter((index) => index !== 2);
          laneIndex = rightLanes[Math.floor(Math.random() * rightLanes.length)];
          state.zachSyncopatedLeftLane = [0, 1, 2].find((index) =>
            index !== safeLane && index !== laneIndex
          );
        } else {
          laneIndex = state.zachSyncopatedLeftLane;
        }

        spawnBullet({
          x: fromLeft ? box.x - 34 : box.x + box.w + 34,
          y: laneYs[laneIndex],
          r: 16,
          type: "flameSkull",
          harmless: true,
          facing: fromLeft ? 1 : -1,
          life: 72,
          fired: false,
          update: function fadeAndFire({ bullet, spawnBullet }) {
            if (bullet.fired || bullet.age < 36) return;

            bullet.fired = true;
            spawnBullet({
              x: bullet.x + (fromLeft ? 14 : -14),
              y: bullet.y - (box.h / 3 - 8) / 2,
              vx: fromLeft ? 11.25 : -11.25,
              r: 0,
              width: 110,
              height: box.h / 3 - 8,
              type: "greenFireBlast",
              life: 60,
              facing: fromLeft ? 1 : -1
            });
          }
        });
      }
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          {
            type: "enemyDialog",
            sprite: "default",
            text: "Sorry y'all, I forgot I have to teach line dancing tonight."
          },
          { type: "enemyDialog", sprite: "pointing", text: "You're welcome to join!" },
          { type: "assignEnemyDefault", sprite: "linedance" }
        ]
      },
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      rhythmGrid: {
        dance: "RULDDLUR",
        inputWindow: 0.12
      },
      pattern: function rhythmGridDance() {}
    },
    {
      loop: true,
      type: "purple",
      sprite: "linedance",
      event: {
        steps: [
          { type: "enemyDialog", text: "That was an easy one, try this!" }
        ]
      },
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      rhythmGrid: {
        dance: "U_DDL[UD]R[RL]",
        inputWindow: 0.12
      },
      pattern: function halfBeatRhythmGridDance() {}
    },
    {
      loop: true,
      type: "purple",
      sprite: "linedance",
      event: {
        steps: [
          {
            type: "textbox",
            text: "Zach has forgotten you're here. Now's youre chance to get out."
          }
        ]
      },
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      rhythmGrid: {
        dance: "[RR][DU]UD[LL][UD]DU",
        inputWindow: 0.12
      },
      pattern: function doubledHalfBeatRhythmGridDance() {}
    },
    {
      loop: true,
      type: "purple",
      assignDefaultSprite: "linedance",
      sprite: "linedance",
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      rhythmGrid: {
        dance: "D[LL]URURLRDRUL",
        inputWindow: 0.12
      },
      pattern: function extendedRhythmGridDance() {}
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          { type: "enemyDialog", text: "As you walk the halls, arrows suddenly shoot out" },
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "Use the skills I taught you! Dance around them!"
          }
        ]
      },
      duration: 780,
      damage: 10,
      box: { x: 338, y: 193, w: 224, h: 134 },
      freestyleGrid: {},
      pattern: function freestyleRhythmGrid() {}
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", text: "You near the end of the dungeon" },
          { type: "enemyDialog", text: "A large ravine blocks your path" }
        ]
      },
      duration: 840,
      damage: 15,
      box: { x: 338, y: 92, w: 224, h: 336 },
      setup: function prepareSpikedBatPlatforms({ box, state, spawnBullet }) {
        const floorY = box.y + box.h;
        const platformY = floorY - 48;
        const platformXs = [box.x + 48, box.x + box.w - 48];

        spawnBullet({
          x: box.x + box.w / 2,
          y: floorY - 14,
          r: 0,
          width: box.w,
          height: 14,
          type: "spikeFloor",
          noCull: true,
          life: 9999
        });
        for (const x of platformXs) {
          spawnBullet({
            x,
            y: platformY,
            r: 0,
            width: 54,
            height: 10,
            type: "platform",
            harmless: true,
            solidPlatform: true,
            noCull: true,
            life: 9999
          });
        }

        state.soul.x = platformXs[0];
        state.soul.y = platformY - state.soul.r;
        state.soul.vy = 0;
        state.zachPlatformBatLastBeat = null;
        state.zachSpikePlatforms = {
          xs: platformXs,
          y: platformY,
          side: 1,
          nextActionBeat: null,
          action: "warning",
          warning: null,
          spikes: null
        };
      },
      pattern: function spikedPlatformBatRain({ box, state, musicBeat, spawnBullet }) {
        spawnBeatBatRain({
          box,
          state,
          musicBeat,
          spawnBullet,
          stateKey: "zachPlatformBatLastBeat",
          speed: 2.6
        });
        const platforms = state.zachSpikePlatforms;
        if (!platforms || !Number.isFinite(musicBeat)) return;

        if (!Number.isFinite(platforms.nextActionBeat)) {
          platforms.nextActionBeat = Math.ceil(musicBeat / 4) * 4 + 4;
          return;
        }

        while (musicBeat >= platforms.nextActionBeat) {
          if (platforms.action === "warning") {
            platforms.warning = spawnPlatformSpikeWarning({
              spawnBullet,
              x: platforms.xs[platforms.side],
              y: platforms.y - 31
            });
            platforms.action = "spikes";
          } else if (platforms.action === "spikes") {
            if (platforms.warning) platforms.warning.life = 0;
            platforms.warning = null;
            platforms.spikes = spawnGrowingPlatformSpikes({
              spawnBullet,
              x: platforms.xs[platforms.side],
              platformY: platforms.y,
              width: 54
            });
            platforms.action = "switch";
          } else {
            if (platforms.spikes) platforms.spikes.fading = true;
            platforms.spikes = null;
            platforms.side = 1 - platforms.side;
            platforms.warning = spawnPlatformSpikeWarning({
              spawnBullet,
              x: platforms.xs[platforms.side],
              y: platforms.y - 31
            });
            platforms.action = "spikes";
          }
          platforms.nextActionBeat += 4;
        }
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", text: "The dungeon revealed the vampire lord's location" },
          { type: "enemyDialog", text: "You continue your journey onward" },
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "Wolves and Bats surround your party!"
          }
        ]
      },
      duration: 720,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function resetCombinedBatBeat({ state }) {
        state.zachCombinedBatLastBeat = null;
      },
      pattern: function wolvesAndBats({ t, box, state, musicBeat, spawnBullet }) {
        spawnAlternatingWolfLunge({ t, box, spawnBullet });
        spawnBeatBatRain({
          box,
          state,
          musicBeat,
          spawnBullet,
          stateKey: "zachCombinedBatLastBeat"
        });
      }
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", text: "The castle is surrounded by moats and fire." },
          { type: "enemyDialog", sprite: "pointing", text: "Watch your step!" }
        ]
      },
      duration: 900,
      damage: 15,
      box: { x: 170, y: 112, w: 560, h: 316 },
      setup: function beginRisingStarPlatformCourse({ box, state, spawnBullet }) {
        const spikeHeight = 24;
        const spikeTop = box.y + box.h - spikeHeight;
        const platformY = spikeTop - 44;
        const platformSpeed = 1;
        const platformStartX = box.x + box.w - 55;
        const platformTurnaroundFrame = 450;
        const starRiseSpeed = 1.26;

        spawnBullet({
          x: box.x + box.w / 2,
          y: spikeTop,
          r: 0,
          width: box.w,
          height: spikeHeight,
          type: "spikeFloor",
          noCull: true,
          life: 901
        });

        spawnBullet({
          x: platformStartX,
          y: platformY,
          vx: -platformSpeed,
          r: 0,
          width: 52,
          height: 11,
          type: "platform",
          harmless: true,
          solidPlatform: true,
          noCull: true,
          life: 901,
          update: function shuttleAcrossPit({ bullet }) {
            bullet.x += bullet.vx;
            if (bullet.age >= platformTurnaroundFrame) bullet.vx = platformSpeed;
          }
        });

        const starColumns = [
          { x: box.x + box.w * 0.72, gapY: platformY - 8, encounter: 102 },
          {
            x: box.x + box.w * 0.54,
            gapY: platformY - 50,
            encounter: 203,
            returnGap: { gapY: platformY - 50, encounter: 697 }
          },
          {
            x: box.x + box.w * 0.36,
            gapY: platformY - 80,
            encounter: 303,
            returnGap: { gapY: platformY - 45, encounter: 597 }
          },
          {
            x: box.x + box.w * 0.18,
            gapY: platformY - 30,
            encounter: 404,
            returnGap: { gapY: platformY - 15, encounter: 496 }
          }
        ];

        for (const column of starColumns) {
          spawnRisingStarColumn({
            spawnBullet,
            x: column.x,
            topY: box.y + 12,
            bottomY: spikeTop - 10,
            gapWindows: [
              { gapY: column.gapY, encounter: column.encounter },
              ...(column.returnGap ? [column.returnGap] : [])
            ],
            gapHeight: 48,
            riseSpeed: starRiseSpeed
          });
        }

        state.soul.x = platformStartX;
        state.soul.y = platformY - state.soul.r;
        state.soul.vy = 0;
        state.soul.pitBounce = false;
      },
      pattern: function risingStarPlatformCourse() {}
    },
    {
      loop: true,
      type: "blue",
      event: {
        steps: [
          { type: "enemyDialog", text: "The Twig Blights return" },
          { type: "enemyDialog", sprite: "pointing", text: "They're ready for you this time!" }
        ]
      },
      duration: 840,
      damage: 15,
      box: { x: 338, y: 148, w: 224, h: 224 },
      setup: function prepareBlightBarragePlatform({ box, state, spawnBullet }) {
        const spikeHeight = 22;
        const spikeTop = box.y + box.h - spikeHeight;
        const platformY = spikeTop - 44;

        spawnBullet({
          x: box.x + box.w / 2,
          y: spikeTop,
          r: 0,
          width: box.w,
          height: spikeHeight,
          type: "spikeFloor",
          noCull: true,
          life: 841
        });

        spawnBullet({
          x: box.x + box.w / 2,
          y: platformY,
          r: 0,
          width: 52,
          height: 11,
          type: "platform",
          harmless: true,
          solidPlatform: true,
          noCull: true,
          life: 841
        });

        state.soul.x = box.x + box.w / 2;
        state.soul.y = platformY - state.soul.r;
        state.soul.vy = 0;
        state.soul.pitBounce = false;
      },
      pattern: function fadingBlightBarrages({ t, box, spawnBullet }) {
        if (t % 140 !== 0) return;

        const cycle = Math.floor(t / 140);
        const positions = [
          { x: box.x - 27, y: box.y + 48, facing: 1 },
          { x: box.x + box.w + 27, y: box.y + box.h - 54, facing: -1 },
          { x: box.x - 27, y: box.y + box.h / 2, facing: 1 },
          { x: box.x + box.w + 27, y: box.y + 46, facing: -1 }
        ];

        spawnBarrageTreeBlight({
          spawnBullet,
          ...positions[cycle % positions.length]
        });
      }
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          { type: "enemyDialog", text: "You look around the room." },
          {
            type: "enemyDialog",
            sprite: "pointing",
            text: "Vampire Spawn lunge from the shadows!"
          }
        ]
      },
      duration: 900,
      damage: 10,
      box: { x: 293, y: 148, w: 314, h: 224 },
      vampireGrid: {
        cols: 7,
        rows: 5
      },
      pattern: function vampireSoulDance() {}
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          { type: "enemyDialog", sprite: "pointing", text: "More Vampire Spawn emerge!" }
        ]
      },
      duration: 900,
      damage: 10,
      box: { x: 293, y: 148, w: 314, h: 224 },
      vampireGrid: {
        cols: 7,
        rows: 5,
        movesPerDownbeat: 2
      },
      pattern: function doubleStepVampireSoulDance() {}
    },
    {
      loop: true,
      type: "purple",
      event: {
        steps: [
          { type: "enemyDialog", sprite: "pointing", text: "This is it! Give it your all!" }
        ]
      },
      duration: 900,
      damage: 10,
      box: { x: 338, y: 103, w: 224, h: 314 },
      vampireGrid: {
        cols: 5,
        rows: 7,
        moveIntervalBeats: 2,
        attackDelayBeats: 1
      },
      pattern: function rapidVampireSoulDance() {}
    },
    {
      loop: true,
      event: {
        steps: [
          { type: "enemyDialog", sprite: "default", text: "You enter the final chamber." },
          { type: "enemyDialog", sprite: "default", text: "The vampire lord greets you." },
          { type: "enemyDialog", sprite: "default", text: "You explain you're not here to chat." },
          {
            type: "enemyTransform",
            sprite: "vampire",
            duration: 112,
            assignDefault: true,
            lockDefault: true
          },
          { type: "enemyDialog", text: "Roll Initiative!", duration: 180 }
        ]
      },
      type: "purple",
      duration: 1080,
      damage: 10,
      box: { x: 203, y: 34, w: 494, h: 494 },
      vampireLordGrid: {
        cols: 13,
        rows: 13
      },
      pattern: function vampireLordInitiative() {}
    }
  ]
};

const postBossLoopTurns = [
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 780,
    damage: 10,
    box: { x: 338, y: 193, w: 224, h: 134 },
    rhythmGrid: {
      dance: "[LL][RR][UU][DD]DRUL[RR][LL][DD][UU]ULDR",
      inputWindow: 0.12
    },
    pattern: function postBossLineDanceOne() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 780,
    damage: 10,
    box: { x: 338, y: 193, w: 224, h: 134 },
    rhythmGrid: {
      dance: "LDRRUULD_R_L_L_L",
      inputWindow: 0.12
    },
    pattern: function postBossLineDanceTwo() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 780,
    damage: 10,
    box: { x: 383, y: 193, w: 134, h: 134 },
    freestyleGrid: {
      cols: 3,
      rows: 3,
      rowArrowCount: 2,
      colArrowCount: 2
    },
    pattern: function postBossFreestyleGrid() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 900,
    damage: 10,
    box: { x: 270.5, y: 125.5, w: 359, h: 269 },
    vampireGrid: {
      cols: 8,
      rows: 6,
      vampireCount: 4,
      seekSoul: true
    },
    pattern: function fourVampireSoulDance() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 900,
    damage: 10,
    box: { x: 270.5, y: 125.5, w: 359, h: 269 },
    vampireGrid: {
      cols: 8,
      rows: 6,
      vampireCount: 4,
      movesPerDownbeat: 2,
      seekSoul: true
    },
    pattern: function fourVampireDoubleStepDance() {}
  },
  {
    loop: true,
    type: "purple",
    sprite: "linedance",
    duration: 900,
    damage: 10,
    box: { x: 248, y: 103, w: 404, h: 314 },
    vampireGrid: {
      cols: 9,
      rows: 7,
      vampireCount: 4,
      moveIntervalBeats: 2,
      attackDelayBeats: 1,
      seekSoul: true
    },
    pattern: function fourVampireRapidDance() {}
  }
];

// Run the adventure once, then loop selected encounters and all post-boss dance attacks forever.
const authoredZachTurns = window.ENEMY_DATA.turns;
window.ENEMY_DATA.turns = [
  ...authoredZachTurns.slice(0, 3),
  authoredZachTurns[4],
  authoredZachTurns[5],
  ...authoredZachTurns.slice(6, 9),
  authoredZachTurns[3],
  authoredZachTurns[11],
  authoredZachTurns[15],
  authoredZachTurns[16],
  authoredZachTurns[17],
  authoredZachTurns[12],
  authoredZachTurns[14],
  authoredZachTurns[13],
  authoredZachTurns[10],
  authoredZachTurns[18],
  authoredZachTurns[9],
  ...postBossLoopTurns
];

const repeatingZachPatterns = new Set([
  "spikedPlatformBatRain",
  "wolvesAndBats",
  "fadingBlightBarrages"
]);

window.ENEMY_DATA.turns.forEach((turn, index) => {
  turn.loop = index >= 18 || repeatingZachPatterns.has(turn.pattern?.name);
});

function spawnBeatBatRain({ box, state, musicBeat, spawnBullet, stateKey, speed = 5.2 }) {
  if (!Number.isFinite(musicBeat)) return;

  const beat = Math.floor(musicBeat);
  if (!Number.isFinite(state[stateKey])) {
    state[stateKey] = beat;
    return;
  }
  if (beat === state[stateKey]) return;
  state[stateKey] = beat;

  const flightAngle = (-20 + Math.random() * 40) * Math.PI / 180;
  spawnBullet({
    x: box.x + 20 + Math.random() * (box.w - 40),
    y: box.y - 22,
    vx: Math.sin(flightAngle) * speed,
    vy: Math.cos(flightAngle) * speed,
    r: 11,
    type: "barovianBat",
    life: 150,
    noCull: true,
    alpha: 1,
    fading: false,
    angle: -flightAngle,
    update: function descendAndFade({ bullet }) {
      if (bullet.fading) {
        bullet.alpha -= 0.16;
        if (bullet.alpha <= 0) bullet.life = 0;
        return;
      }

      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      if (bullet.y >= box.y + box.h - 10) {
        bullet.y = box.y + box.h - 10;
        bullet.vx = 0;
        bullet.vy = 0;
        bullet.harmless = true;
        bullet.fading = true;
      }
    }
  });
}

function spawnAlternatingWolfLunge({ t, box, spawnBullet }) {
  if (t % 50 !== 0) return;

  const fromLeft = Math.floor(t / 50) % 2 === 0;
  const direction = fromLeft ? 1 : -1;
  const arcOptions = [
    { vy: 0, gravity: 0 },
    { vy: -2, gravity: 0.06 },
    { vy: -4, gravity: 0.12 },
    { vy: -6, gravity: 0.18 },
    { vy: -8, gravity: 0.24 }
  ];
  const arc = arcOptions[Math.floor(Math.random() * arcOptions.length)];

  spawnBullet({
    x: fromLeft ? box.x - 38 : box.x + box.w + 38,
    y: box.y + box.h - 23,
    r: 19,
    type: "barovianWolf",
    life: 120,
    noCull: true,
    harmless: true,
    facing: direction,
    lunging: false,
    fading: false,
    alpha: 1,
    update: function waitLungeAndFade({ bullet }) {
      if (!bullet.lunging && bullet.age >= 30) {
        bullet.lunging = true;
        bullet.harmless = false;
        bullet.vx = direction * (4 + Math.random());
        bullet.vy = arc.vy;
        bullet.gravity = arc.gravity;
      }

      if (!bullet.lunging) return;

      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      bullet.vy += bullet.gravity;

      const leftBox = direction > 0
        ? bullet.x > box.x + box.w + 42
        : bullet.x < box.x - 42;
      if (leftBox || bullet.y > box.y + box.h + 42) {
        bullet.fading = true;
        bullet.harmless = true;
      }

      if (bullet.fading) {
        bullet.alpha -= 0.18;
        if (bullet.alpha <= 0) bullet.life = 0;
      }
    }
  });
}

function spawnPlatformSpikeWarning({ spawnBullet, x, y }) {
  return spawnBullet({
    x,
    y,
    r: 14,
    type: "platformSpikeWarning",
    harmless: true,
    noCull: true,
    life: 9999
  });
}

function spawnGrowingPlatformSpikes({ spawnBullet, x, platformY, width }) {
  return spawnBullet({
    x,
    y: platformY - 1,
    baseY: platformY,
    r: 0,
    width,
    height: 1,
    targetHeight: 24,
    type: "platformSpikes",
    noCull: true,
    life: 9999,
    alpha: 1,
    fading: false,
    update: function growAndFadePlatformSpikes({ bullet }) {
      if (bullet.fading) {
        bullet.harmless = true;
        bullet.alpha -= 0.14;
        if (bullet.alpha <= 0) bullet.life = 0;
        return;
      }

      const growth = Math.min(1, bullet.age / 7);
      bullet.height = Math.max(1, bullet.targetHeight * growth);
      bullet.y = bullet.baseY - bullet.height;
    }
  });
}

function spawnDescendingPlatform({ spawnBullet, x, y, speed, width, life, spiked = false }) {
  const movement = function accelerateDownward({ bullet, state }) {
    const progress = Math.max(0, Math.min(1, state.enemyTimer / 840));
    bullet.y += speed + (4 - speed) * progress;
  };
  const platform = spawnBullet({
    x,
    y,
    r: 0,
    width,
    height: 11,
    type: "platform",
    harmless: true,
    solidPlatform: true,
    platformCarryTolerance: speed * 2 + 1,
    noCull: true,
    life,
    update: movement
  });

  if (spiked) {
    spawnBullet({
      x,
      y: y - 9,
      r: 0,
      width,
      height: 9,
      type: "platformSpikes",
      noCull: true,
      life,
      update: movement
    });
  }

  return platform;
}

function spawnRisingStarColumn({
  spawnBullet,
  x,
  topY,
  bottomY,
  gapWindows,
  gapHeight,
  riseSpeed
}) {
  const spacing = 24;
  const slotCount = Math.floor((bottomY - topY) / spacing) + 1;
  const wrapSpan = slotCount * spacing;
  const wrapY = (y) => topY + ((y - topY) % wrapSpan + wrapSpan) % wrapSpan;
  const initialGapCenters = gapWindows.map(({ gapY, encounter }) =>
    wrapY(gapY + riseSpeed * encounter)
  );

  for (let slot = 0; slot < slotCount; slot++) {
    const y = topY + slot * spacing;
    const insideGap = initialGapCenters.some((gapCenter) => {
      const directGapDistance = Math.abs(y - gapCenter);
      const circularGapDistance = Math.min(directGapDistance, wrapSpan - directGapDistance);
      return circularGapDistance <= gapHeight / 2;
    });
    if (insideGap) continue;

    spawnBullet({
      x,
      y,
      r: 8,
      type: "star",
      noCull: true,
      life: 9999,
      spin: slot % 2 === 0 ? 0.08 : -0.08,
      update: function riseAndRefillStarColumn({ bullet }) {
        bullet.y -= riseSpeed;
        if (bullet.y < topY) bullet.y += wrapSpan;
      }
    });
  }
}

function spawnBarrageTreeBlight({ spawnBullet, x, y, facing }) {
  const shotAges = [38, 68, 98];
  const fadeInDuration = 28;
  const fadeOutStart = 110;
  const fadeOutDuration = 26;

  spawnBullet({
    x,
    y,
    r: 15,
    type: "treeBlight",
    facing,
    harmless: true,
    noCull: true,
    alpha: 0,
    life: 140,
    update: function fadeAndFireBlight({ bullet, state, spawnBullet }) {
      if (bullet.age <= fadeInDuration) {
        bullet.alpha = bullet.age / fadeInDuration;
      } else if (bullet.age >= fadeOutStart) {
        bullet.alpha = Math.max(0, 1 - (bullet.age - fadeOutStart) / fadeOutDuration);
      } else {
        bullet.alpha = 1;
      }

      if (!shotAges.includes(bullet.age)) return;

      const baseAngle = Math.atan2(state.soul.y - bullet.y, state.soul.x - bullet.x);
      for (const spread of [-0.12, 0, 0.12]) {
        const angle = baseAngle + spread;
        const speed = 2.8;
        spawnBullet({
          x: bullet.x,
          y: bullet.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          r: 6,
          type: "blightNeedle",
          life: 120,
          angle
        });
      }
    }
  });
}

function randomPlatformWidth() {
  return 26 + Math.floor(Math.random() * 33);
}

function randomPlatformX(box, width) {
  const margin = 8 + width / 2;
  return box.x + margin + Math.random() * Math.max(1, box.w - margin * 2);
}

function chooseRandomPlatformSpikes(state, forceSafe = false) {
  const spiked = !forceSafe && !state.zachLastPlatformSpiked && Math.random() < 0.25;
  state.zachLastPlatformSpiked = spiked;
  return spiked;
}
