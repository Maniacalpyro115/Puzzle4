window.ENEMY_DATA = {
  name: "BLOODHUNTER",

  sprite: "sprites/bh.png",

  sceneSprites: {
    bhScene1: "sprites/bh_scene1.png",
    bhScene2: "sprites/bh_scene2.png"
  },

  maxHP: 500,
    music: {
    src: "sounds/bloodhunter.wav",
    loopStart: 13.593,
    loopEnd: 178.062
  },
  introMessage: "* A BLOODHUNTER approaches.",
  winMessage: "* The BLOODHUNTER falls silent.",
  defeatDialog: "Its time... for me... to... flake...",

  acts: [
    {
      name: "Search Barovia Village",
      dialog: "* No sign of Lunessa here..."
    },
    {
      name: "Search Vallaki",
      dialog: "* No sign of Lunessa here..."
    },
    {
      name: "Search Krezk",
      dialog: "* No sign of Lunessa here..."
    },
    {
      name: "Search Berez",
      dialog: "* No sign of Lunessa here..."
    }
  ],

  actConditions: [
    {
      act: 1,
      dialog: "* You hear mumblings of a lost child in Vallaki."
    },
    {
      act: 2,
      dialog: "* The townsfolk speak of a hag leaving with a girl."
    },
    {
      act: 4,
      dialog: "* You find a doll of the child bearing a tag - 'Blinsky's'."
    },
    {
      act: 2,
      dialog: "* The owner suggests asking around the Blue Water Inn."
    },
    {
      act: 2,
      dialog: "* A bystander proposes seeking out a 'Father Donavich'."
    },
    {
      act: 1,
      dialog: "* He mentions seeing someone of your description near Lake Zarovich"
    },
    {
      act: 2,
      dialog: "* A man on a boat saw a young lady with the Abbot to the North-West."
    },
    {
      act: 3,
      dialog: "* The Abbot suggests reflecting at the Pool of the White Sun."
    },
    {
      act: 3,
      dialog: "* In the waves of the pool, you can make out a gay red dragon."
    },
    {
      act: 2,
      dialog: "* He gayly advises asking around the Blood of the Vine Tavern."
    },
    {
      act: 1,
      dialog: "* The bartender even more gayly suggests checking with the Mongrelfolk."
    },
    {
      act: 3,
      dialog: "* The Mongrelfolk recall seeing the Burgomaster's wife care for a sick child."
    },
    {
      act: 3,
      dialog: "* The child is dead :( come back later."
    },
    {
      act: 3,
      dialog: "* He's alive! Oh wait he's dead again :("
    },
    {
      act: 3,
      dialog: "* He was retconned back to life. Give the mother a moment."
    },
    {
      act: 3,
      dialog: "* The Burgomaster's wife recalls seeing someone in the Vallaki Stocks."
    },
    {
      act: 2,
      dialog: "* You find a young girl matching the description!"
    },
  ],

  mercyFailure: "* The BLOODHUNTER isn't done with you yet.",
  mercySuccess: "* You reunite LUNESSA with CARIAN. The father and daughter leave.",
  mercyWinMessage: "OBISCWTPDNDWMFT.",

  enemyDialog: [
    "Does a 31 hit?",
  ],

  items: [
    {
      name: "Second Wind",
      heal: 18
    },
    {
      name: "Health Potion",
      heal: 12
    },
    {
      name: "Health Potion",
      heal: 12
    },
    {
      name: "Goodberry",
      heal: 1
    }
  ],

  battleDialog: [
    "* The BLOODHUNTER cuts himself. Take cover.",
    "* The SHARPSHOOTER ignores your 3/4 cover. Try again.",
    "* The BLOODHUNTER's crossbow glows bright.",
    "* The BLOODHUNTER switches to automatic fire.",
    "* The BLOODHUNTER attacks you at close range without disadvantage.",
    "* The BLOODHUNTER rolls 12 more damage dice.",
    "* The BLOODHUNTER looks possessed. Don't say anything for 3 weeks.",
    "* The BLOODHUNTER follows your tracks.",
    "* The BLOODHUNTER takes aim."
  ],

  lastStandMessage: "BLOODHUNTER reduces the damage! Prepare for the CURTAIN CALL.",
  lastStandAttack: {
    type: "green",
    duration: 1645,
    enemyDialog: "You won't keep me from her.",
    pattern: function bloodhunterLastStand({ t, box, state, spawnBullet, playSound, sounds }) {
      const openingStart = 12;
      const circleSpacing = 12;
      const backAndForthSpacing = 13;
      const circleDirections = [
        "right", "up", "left", "down",
        "right", "up", "left", "down",
        "right", "up", "left", "down"
      ];
      const backAndForthDirections = [
        "up", "down", "up", "down", "up", "down",
        "right", "left", "right", "left", "right", "left"
      ];
      const circleIndex = (t - openingStart) / circleSpacing;
      const backAndForthStart = openingStart + circleDirections.length * circleSpacing;
      const backAndForthIndex = (t - backAndForthStart) / backAndForthSpacing;
      const direction = Number.isInteger(circleIndex) && circleIndex >= 0 && circleIndex < circleDirections.length
        ? circleDirections[circleIndex]
        : Number.isInteger(backAndForthIndex) && backAndForthIndex >= 0 && backAndForthIndex < backAndForthDirections.length
          ? backAndForthDirections[backAndForthIndex]
          : null;

      if (direction) {
        spawnHunterArrow({
          box,
          spawnBullet,
          direction,
          speed: 5.25,
          distance: 330
        });
      }

      if (t === 380) {
        spawnHunterShieldBreakerArrow({
          box,
          spawnBullet,
          direction: randomHunterSide(),
          speed: 4.1,
          distance: 290
        });
      }

      const randomStart = 475;
      const randomEnd = 655;
      const wallStart = 725;
      const wallSpacing = 24;
      const wallCount = 12;
      const circleStart = wallStart + wallCount * wallSpacing + 40;
      const circleCount = 24;
      const circleRotations = 6;
      const circleTotal = circleCount * circleRotations;
      const circleStep = 3;

      if (t >= randomStart && t < randomEnd && (t - randomStart) % 15 === 0) {
        playSound(sounds.spearAppear);
        spawnHunterWarningArrow({
          box,
          state,
          spawnBullet,
          playSound,
          sounds,
          speed: 5.0,
          margin: 90,
          delay: 8
        });
      }

      if (t >= wallStart && t < wallStart + wallCount * wallSpacing && (t - wallStart) % wallSpacing === 0) {
        playSound(sounds.spearAppear);
        spawnHunterLastStandWallArrow({
          box,
          spawnBullet,
          playSound,
          sounds
        });
      }

      if (t >= circleStart && t < circleStart + circleTotal * circleStep && (t - circleStart) % circleStep === 0) {
        const circleIndex = (t - circleStart) / circleStep;

        playSound(sounds.spearAppear);
        spawnHunterLastStandCircleArrow({
          box,
          spawnBullet,
          index: circleIndex,
          count: circleCount,
          launchDelay: 30
        });

        if (circleIndex >= circleCount * 3) {
          spawnHunterLastStandCircleArrow({
            box,
            spawnBullet,
            index: circleIndex + circleCount / 2,
            count: circleCount,
            launchDelay: 30
          });
        }
      }
    }
  },

  turns: [
    {
      loop: false,
      type: "green",
      duration: 520,
      pattern: function basicGreenIntro({ t, box, spawnBullet }) {
        const shots = [
          { t: 16, direction: "left", speed: 2.55, distance: 175 },
          { t: 86, direction: "right", speed: 2.7, distance: 185 },
          { t: 156, direction: "up", speed: 2.85, distance: 190 },
          { t: 226, direction: "down", speed: 3.0, distance: 198 },
          { t: 304, direction: "left", speed: 3.15, distance: 205 },
          { t: 382, direction: "right", speed: 3.25, distance: 210 }
        ];

        scheduleHunterArrows({ t, box, spawnBullet, shots, minArrivalGap: 28 });
      }
    },
    {
      loop: false,
      type: "green",
      duration: 720,
      pattern: function tripletLesson({ t, box, spawnBullet }) {
        const groups = [
          { start: 10, burst: "left", single: "up" },
          { start: 118, burst: "right", single: "down" },
          { start: 226, burst: "up", single: "left" },
          { start: 334, burst: "down", single: "right" }
        ];
        const shots = groups.flatMap((group, groupIndex) => {
          const speed = 4.9 + groupIndex * 0.16;

          return [
            { t: group.start, direction: group.burst, speed, distance: 245 },
            { t: group.start + 8, direction: group.burst, speed: speed + 0.18, distance: 252 },
            { t: group.start + 16, direction: group.burst, speed: speed + 0.36, distance: 260 },
            { t: group.start + 24, direction: group.burst, speed: speed + 0.54, distance: 268 },
            { t: group.start + 52, direction: group.single, speed: 4.05 + groupIndex * 0.16, distance: 240 }
          ];
        });

        shots.push({ t: 580, direction: "left", speed: 3.35, distance: 230, yellow: true });

        scheduleHunterArrows({ t, box, spawnBullet, shots, minArrivalGap: 10 });
      }
    },
    {
      loop: false,
      type: "green",
      duration: 860,
      pattern: function yellowCrossfireTrial({ t, box, spawnBullet }) {
        const shots = [
          { t: 8, direction: "left", speed: 4.35, distance: 250 },
          { t: 32, direction: "up", speed: 4.55, distance: 265 },
          { t: 58, direction: "right", speed: 4.45, distance: 255 },
          { t: 86, direction: "down", speed: 4.65, distance: 270 },
          { t: 126, direction: "left", speed: 4.2, distance: 255, yellow: true },
          { t: 154, direction: "right", speed: 4.9, distance: 295 },
          { t: 182, direction: "up", speed: 4.3, distance: 260, yellow: true },
          { t: 218, direction: "down", speed: 5.0, distance: 305 },
          { t: 258, direction: "right", speed: 4.35, distance: 265, yellow: true },
          { t: 288, direction: "left", speed: 5.15, distance: 315 },
          { t: 318, direction: "up", speed: 5.05, distance: 305 },
          { t: 350, direction: "down", speed: 4.45, distance: 270, yellow: true },
          { t: 404, direction: "left", speed: 5.25, distance: 320 },
          { t: 432, direction: "right", speed: 5.25, distance: 320 },
          { t: 462, direction: "up", speed: 4.7, distance: 285, yellow: true },
          { t: 498, direction: "down", speed: 5.35, distance: 330 },
          { t: 542, direction: "right", speed: 4.75, distance: 288, yellow: true },
          { t: 586, direction: "left", speed: 5.4, distance: 335 },
          { t: 626, direction: "up", speed: 5.35, distance: 330 },
          { t: 666, direction: "down", speed: 5.45, distance: 340 }
        ];

        scheduleHunterArrows({ t, box, spawnBullet, shots, minArrivalGap: 14 });
      }
    },
    {
      loop: false,
      type: "green",
      duration: 760,
      pattern: function leftTopEscalation({ t, box, spawnBullet }) {
        const whiteShots = Array.from({ length: 12 }, (_, index) => ({
          t: 8 + index * 18,
          direction: index % 2 === 0 ? "left" : "up",
          speed: 5.1 + index * 0.06,
          distance: 305 + index * 4
        }));
        const yellowShots = Array.from({ length: 8 }, (_, index) => ({
          t: 286 + index * 18,
          direction: index % 2 === 0 ? "left" : "up",
          speed: 4.65 + index * 0.08,
          distance: 285 + index * 6,
          yellow: true
        }));
        const shots = whiteShots.concat(yellowShots);

        scheduleHunterArrows({
          t,
          box,
          spawnBullet,
          shots,
          minArrivalGap: 11,
          yellowArrivalGap: 11
        });

        if (t === 642) {
          spawnHunterRedArrow({ box, spawnBullet, direction: "left", speed: 4.15, distance: 280 });
        }
      }
    },
    {
      loop: false,
      type: "green",
      duration: 600,
      pattern: function redArrowPressure({ t, box, spawnBullet }) {
        const shots = [
          { t: 12, direction: "left", speed: 2.18, distance: 270 },
          { t: 36, direction: "up", speed: 2.22, distance: 276 },
          { t: 60, direction: "right", speed: 2.26, distance: 282 },
          { t: 84, direction: "down", speed: 2.3, distance: 288 },
          { t: 108, direction: "left", speed: 2.34, distance: 294 },
          { t: 132, direction: "right", speed: 2.38, distance: 300 },
          { t: 156, direction: "up", speed: 2.42, distance: 306 },
          { t: 180, direction: "down", speed: 2.46, distance: 312 },
          { t: 206, direction: "left", speed: 2.5, distance: 318 },
          { t: 232, direction: "up", speed: 2.54, distance: 324 },
          { t: 258, direction: "right", speed: 2.58, distance: 330 },
          { t: 284, direction: "down", speed: 2.62, distance: 336 },
          { t: 310, direction: "left", speed: 2.66, distance: 342 },
          { t: 336, direction: "right", speed: 2.7, distance: 348 },
          { t: 364, direction: "up", speed: 2.74, distance: 354 },
          { t: 392, direction: "down", speed: 2.78, distance: 360 }
        ];

        for (const shot of shots) {
          if (t === shot.t) {
            spawnHunterRedArrow({ box, spawnBullet, ...shot });
          }
        }
      }
    },
    {
      loop: false,
      type: "green",
      duration: 650,
      pattern: function hiddenRedFinale({ t, box, spawnBullet }) {
        const barrage = [
          { t: 28, direction: "up", speed: 5.65, distance: 350 },
          { t: 42, direction: "down", speed: 5.6, distance: 345 },
          { t: 56, direction: "right", speed: 5.75, distance: 360 },
          { t: 72, direction: "up", speed: 5.82, distance: 368 },
          { t: 86, direction: "right", speed: 5.9, distance: 376 },
          { t: 102, direction: "down", speed: 5.86, distance: 372 },
          { t: 118, direction: "down", speed: 5.98, distance: 384 },
          { t: 134, direction: "up", speed: 6.05, distance: 392 },
          { t: 152, direction: "right", speed: 6.12, distance: 400 },
          { t: 168, direction: "up", speed: 6.18, distance: 408 },
          { t: 186, direction: "down", speed: 6.12, distance: 402 },
          { t: 204, direction: "right", speed: 6.24, distance: 416 },
          { t: 224, direction: "up", speed: 6.3, distance: 424 },
          { t: 242, direction: "right", speed: 6.36, distance: 432 },
          { t: 262, direction: "down", speed: 6.32, distance: 428 },
          { t: 282, direction: "up", speed: 6.42, distance: 440 },
          { t: 304, direction: "down", speed: 6.46, distance: 446 },
          { t: 326, direction: "right", speed: 6.5, distance: 452 },
          { t: 350, direction: "down", speed: 6.55, distance: 458 },
          { t: 374, direction: "up", speed: 6.6, distance: 464 }
        ];

        if (t === 6) {
          spawnHunterRedArrow({
            box,
            spawnBullet,
            direction: "left",
            speed: 0.78,
            distance: 420,
            life: 760
          });
        }

        scheduleHunterArrows({ t, box, spawnBullet, shots: barrage, minArrivalGap: 8 });
      }
    },
    {
      loop: false,
      type: "normal",
      duration: 690,
      scene: createBloodhunterWatchOutScene(),
      pattern: function hunterPounceToned({ t, box, state, spawnBullet, playSound, sounds }) {
        if (t % 51 === 20) {
          playSound(sounds.spearAppear);
          spawnHunterArrowRing({
            spawnBullet,
            x: state.soul.x,
            y: state.soul.y,
            ringIndex: Math.floor(t / 51),
            duration: 142
          });
        }
      }
    },
    {
      loop: false,
      type: "normal",
      duration: 720,
      pattern: function outwardArrowRingsToned({ t, box, state, spawnBullet, playSound, sounds }) {
        if (t % 61 === 20) {
          playSound(sounds.spearAppear);
          spawnHunterOutwardArrowRing({
            spawnBullet,
            x: state.soul.x,
            y: state.soul.y,
            ringIndex: Math.floor(t / 61),
            flySpeed: 3.015
          });
        }
      }
    },
    {
      loop: false,
      type: "compact",
      duration: 720,
      pattern: function perimeterSnapShots({ t, box, state, spawnBullet, playSound, sounds }) {
        if (t % 25 === 0) {
          playSound(sounds.spearAppear);
          spawnHunterWarningArrow({
            box,
            state,
            spawnBullet,
            playSound,
            sounds,
            speed: 3.735
          });
        }
      },
      postAttackEvent: {
        steps: [
          { type: "flash", color: "#fff", duration: 34 },
          { type: "textbox", text: "BLOODHUNTER surges with action!", duration: 150 }
        ]
      }
    },
    {
      loop: false,
      type: "compact",
      duration: 515,
      box: { x: 398, y: 272, w: 105, h: 105 },
      setup: function prepareSurgeGrid({ box, state }) {
        state.soul.x = box.x + box.w / 2;
        state.soul.y = box.y + box.h / 2;
      },
      pattern: function surgeGridArrows({ t, box, spawnBullet, playSound, sounds }) {
        if (t % 100 === 22) {
          spawnHunterSurgeGrid({
            box,
            spawnBullet,
            playSound,
            sounds,
            speed: 4.68,
            safeColumn: Math.floor(Math.random() * 3),
            safeRow: Math.floor(Math.random() * 3)
          });
        }
      }
    },
    {
      loop: true,
      type: "green",
      duration: 720,
      setup: function prepareSplitFeints({ state }) {
        state.bloodhunterSplitFeints = { nextSet: 12 };
      },
      pattern: function splitFeintPairs({ t, box, state, spawnBullet }) {
        const sequence = state.bloodhunterSplitFeints || { nextSet: 12 };

        if (t < sequence.nextSet) return;

        const sides = randomHunterSidePair();
        const whiteFirst = Math.random() > 0.5;
        const whiteDirection = whiteFirst ? sides[0] : sides[1];
        const yellowDirection = whiteFirst ? sides[1] : sides[0];

        spawnHunterArrow({
          box,
          spawnBullet,
          direction: whiteDirection,
          speed: 5.7 + Math.random() * 0.35,
          distance: 330
        });
        spawnHunterArrow({
          box,
          spawnBullet,
          direction: yellowDirection,
          speed: 5.25 + Math.random() * 0.35,
          distance: 322,
          yellow: true
        });

        sequence.nextSet = t + randomInt(45, 56);
        state.bloodhunterSplitFeints = sequence;
      }
    },
    {
      loop: true,
      type: "green",
      duration: 780,
      setup: function prepareYellowBarrage({ state }) {
        state.bloodhunterYellowBarrage = { nextShot: 10 };
      },
      pattern: function whiteArrowBarrage({ t, box, state, spawnBullet }) {
        const barrage = state.bloodhunterYellowBarrage || { nextShot: 10 };

        if (t < barrage.nextShot) return;

        spawnHunterArrowAtTipDistance({
          box,
          spawnBullet,
          direction: randomHunterSide(),
          speed: 5.7,
          tipDistance: 336
        });

        barrage.nextShot = t + 15;
        state.bloodhunterYellowBarrage = barrage;
      }
    },
    {
      loop: true,
      type: "green",
      duration: 700,
      setup: function prepareSteadyYellowArrowStream({ state }) {
        const groups = [
          ["right", "left"],
          ["up", "left"],
          ["up", "down"],
          ["right", "down"]
        ];

        for (let i = groups.length - 1; i > 0; i--) {
          const swapIndex = Math.floor(Math.random() * (i + 1));
          [groups[i], groups[swapIndex]] = [groups[swapIndex], groups[i]];
        }

        state.bloodhunterSteadyYellowGroups = groups;
      },
      pattern: function steadyYellowArrowStream({ t, box, state, spawnBullet }) {
        const arrowSpacing = 20;
        const setGap = 20;
        const start = 16;
        const speed = 5.46;
        const distance = 315;
        const groups = state.bloodhunterSteadyYellowGroups || [
          ["right", "left"],
          ["up", "left"],
          ["up", "down"],
          ["right", "down"]
        ];

        for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
          const directions = [
            ...groups[groupIndex],
            ...groups[groupIndex],
            ...groups[groupIndex]
          ];

          for (let arrowIndex = 0; arrowIndex < directions.length; arrowIndex++) {
            const sequenceIndex = groupIndex * directions.length + arrowIndex;
            const spawnAt = start + sequenceIndex * arrowSpacing + groupIndex * setGap;

            if (t !== spawnAt) continue;

            spawnHunterArrow({
              box,
              spawnBullet,
              direction: directions[arrowIndex],
              speed,
              distance,
              yellow: true
            });
          }
        }
      }
    },
    {
      loop: true,
      type: "normal",
      duration: 690,
      pattern: function hunterPounce({ t, box, state, spawnBullet, playSound, sounds }) {
        if (t % 41 === 20) {
          playSound(sounds.spearAppear);
          spawnHunterArrowRing({
            spawnBullet,
            x: state.soul.x,
            y: state.soul.y,
            ringIndex: Math.floor(t / 41)
          });
        }
      }
    },
    {
      loop: true,
      type: "normal",
      duration: 720,
      pattern: function outwardArrowRings({ t, box, state, spawnBullet, playSound, sounds }) {
        if (t % 49 === 20) {
          playSound(sounds.spearAppear);
          spawnHunterOutwardArrowRing({
            spawnBullet,
            x: state.soul.x,
            y: state.soul.y,
            ringIndex: Math.floor(t / 49)
          });
        }
      }
    },
    {
      loop: true,
      type: "normal",
      duration: 720,
      pattern: function openFieldSnapShots({ t, box, state, spawnBullet, playSound, sounds }) {
        if (t % 19 === 0) {
          playSound(sounds.spearAppear);
          for (let i = 0; i < 2; i++) {
            spawnHunterWarningArrow({
              box,
              state,
              spawnBullet,
              playSound,
              sounds,
              speed: 5.6025
            });
          }
        }
      }
    },
    {
      loop: true,
      type: "compact",
      duration: 515,
      box: { x: 377, y: 251, w: 147, h: 147 },
      setup: function prepareHeavySurgeGrid({ box, state }) {
        state.soul.x = box.x + box.w / 2;
        state.soul.y = box.y + box.h / 2;
      },
      pattern: function heavySurgeGridArrows({ t, box, spawnBullet, playSound, sounds }) {
        if (t % 72 === 22) {
          spawnHunterSurgeGrid({
            box,
            spawnBullet,
            playSound,
            sounds,
            laneCount: 4,
            laneInset: 20,
            speed: 5.15,
            spawnOffset: 34,
            safeColumn: Math.floor(Math.random() * 4),
            safeRow: Math.floor(Math.random() * 4)
          });
        }
      }
    }
  ]
};

const HUNTER_ARROW_MIN_ARRIVAL_GAP = 18;
const HUNTER_ARROW_YELLOW_ARRIVAL_GAP = 36;
const HUNTER_SIDES = ["left", "right", "up", "down"];

function createBloodhunterWatchOutScene() {
  return {
    duration: 305,
    skipEnemyDialog: true,
    setup: function setupBloodhunterWatchOutScene({ state }) {
      state.bloodhunterWatchOutScene = {
        dissolveStarted: false,
        particles: []
      };
    },
    update: function updateBloodhunterWatchOutScene({ state, timer, sprites, sounds, playSound }) {
      const data = state.bloodhunterWatchOutScene;

      if (!data) return;

      if (timer === 218 && !data.dissolveStarted) {
        data.dissolveStarted = true;
        data.particles = createBloodhunterSceneDissolveParticles(sprites.bhScene2);
        playSound(sounds.vaporized);
      }

      if (data.particles.length > 0) {
        for (const particle of data.particles) {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vy += 0.06;
          particle.life--;
        }

        data.particles = data.particles.filter((particle) => particle.life > 0);
      }
    },
    draw: function drawBloodhunterWatchOutScene({
      ctx,
      state,
      timer,
      sprites,
      width,
      height,
      clamp,
      drawSharedBox,
      wrapText,
      drawEnemyBody
    }) {
      const mainAlpha = timer < 24
        ? 1 - timer / 24
        : timer >= 265
          ? clamp((timer - 265) / 32, 0, 1)
          : 0;
      const scene1Alpha = timer < 24
        ? 0
        : timer < 56
          ? clamp((timer - 24) / 32, 0, 1)
          : timer >= 250
            ? clamp(1 - (timer - 250) / 28, 0, 1)
            : 1;
      const scene2Alpha = timer < 70
        ? 0
        : timer < 102
          ? clamp((timer - 70) / 32, 0, 1)
          : timer >= 218
            ? 0
            : 1;
      const mainSprite = sprites.enemy;
      const scene1 = sprites.bhScene1;
      const scene2 = sprites.bhScene2;
      const mainSize = 330;
      const sceneSize = 260;
      const scene1X = 90;
      const sceneY = 92;
      const scene2X = width - scene1X - sceneSize;

      if (mainAlpha > 0 && mainSprite) {
        ctx.save();
        ctx.globalAlpha = mainAlpha;
        drawEnemyBody(ctx, mainSprite, width / 2 - mainSize / 2, 5, mainSize);
        ctx.restore();
      }

      if (scene1Alpha > 0 && scene1) {
        drawBloodhunterSceneSprite(ctx, scene1, scene1X, sceneY, sceneSize, scene1Alpha);
      }

      if (scene2Alpha > 0 && scene2) {
        drawBloodhunterSceneSprite(ctx, scene2, scene2X, sceneY, sceneSize, scene2Alpha);
      }

      if (timer >= 46 && timer < 210) {
        const box = { x: scene1X + sceneSize + 18, y: 126, w: 210, h: 84 };

        drawBloodhunterSceneDialogBox(ctx, box);
        ctx.fillStyle = "#fff";
        ctx.font = "24px Courier New";
        ctx.textAlign = "left";
        wrapText("Watch out.", box.x + 20, box.y + 38, box.w - 40, 30);
      }

      if (timer >= 178 && timer < 218) {
        const progress = (timer - 178) / 40;
        const fromX = scene1X + sceneSize - 12;
        const fromY = sceneY + sceneSize * 0.48;
        const toX = scene2X + 28;
        const toY = sceneY + sceneSize * 0.48;
        const x = fromX + (toX - fromX) * progress;
        const y = fromY + (toY - fromY) * progress;

        drawBloodhunterSceneArrow(ctx, x, y, Math.atan2(toY - fromY, toX - fromX));
      }

      const data = state.bloodhunterWatchOutScene;

      if (data && data.particles.length > 0) {
        drawBloodhunterSceneParticles(ctx, data.particles, scene2X, sceneY);
      }
    }
  };
}

function drawBloodhunterSceneSprite(ctx, sprite, x, y, size, alpha) {
  if (!sprite || !sprite.ready) return;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sprite, x, y, size, size);
  ctx.restore();
}

function drawBloodhunterSceneDialogBox(ctx, box) {
  const tailY = box.y + box.h / 2;

  ctx.save();
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;

  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.strokeRect(box.x, box.y, box.w, box.h);

  ctx.beginPath();
  ctx.moveTo(box.x, tailY - 13);
  ctx.lineTo(box.x - 26, tailY);
  ctx.lineTo(box.x, tailY + 13);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawBloodhunterSceneArrow(ctx, x, y, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = "#fff";
  ctx.fillRect(-28, -3, 42, 6);
  ctx.beginPath();
  ctx.moveTo(28, 0);
  ctx.lineTo(10, -12);
  ctx.lineTo(10, 12);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function createBloodhunterSceneDissolveParticles(sprite) {
  const particles = [];
  const spriteSize = 260;
  const pixelSize = 8;

  if (!sprite || !sprite.ready) return particles;

  const source = document.createElement("canvas");
  source.width = spriteSize;
  source.height = spriteSize;
  const sourceCtx = source.getContext("2d");
  sourceCtx.drawImage(sprite, 0, 0, spriteSize, spriteSize);
  const pixels = sourceCtx.getImageData(0, 0, spriteSize, spriteSize).data;

  for (let y = 0; y < spriteSize; y += pixelSize) {
    for (let x = 0; x < spriteSize; x += pixelSize) {
      const sampleX = Math.min(spriteSize - 1, x + Math.floor(pixelSize / 2));
      const sampleY = Math.min(spriteSize - 1, y + Math.floor(pixelSize / 2));
      const index = (sampleY * spriteSize + sampleX) * 4;
      const alpha = pixels[index + 3];

      if (alpha < 24) continue;

      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 2.2,
        vy: -1.2 - Math.random() * 2.4,
        size: pixelSize,
        life: 44 + Math.random() * 34,
        maxLife: 78,
        color: `rgba(${pixels[index]}, ${pixels[index + 1]}, ${pixels[index + 2]}, ${alpha / 255})`
      });
    }
  }

  return particles;
}

function drawBloodhunterSceneParticles(ctx, particles, originX, originY) {
  for (const particle of particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.fillRect(originX + particle.x, originY + particle.y, particle.size, particle.size);
    ctx.restore();
  }
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomHunterSide() {
  return HUNTER_SIDES[Math.floor(Math.random() * HUNTER_SIDES.length)];
}

function randomHunterSidePair() {
  const firstIndex = Math.floor(Math.random() * HUNTER_SIDES.length);
  let secondIndex = Math.floor(Math.random() * (HUNTER_SIDES.length - 1));

  if (secondIndex >= firstIndex) {
    secondIndex++;
  }

  return [HUNTER_SIDES[firstIndex], HUNTER_SIDES[secondIndex]];
}

function spawnHunterArrowAtTipDistance({ box, spawnBullet, direction, speed, tipDistance }) {
  const arrowLength = 36;

  spawnHunterArrow({
    box,
    spawnBullet,
    direction,
    speed,
    distance: tipDistance + arrowLength / 2
  });
}

function spawnHunterShieldBreakerArrow({ box, spawnBullet, direction, speed, distance }) {
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  let x = centerX;
  let y = centerY;
  let vx = 0;
  let vy = 0;
  let angle = 0;

  if (direction === "left") {
    x = box.x - distance;
    vx = speed;
  } else if (direction === "right") {
    x = box.x + box.w + distance;
    vx = -speed;
    angle = Math.PI;
  } else if (direction === "down") {
    y = box.y + box.h + distance;
    vy = -speed;
    angle = -Math.PI / 2;
  } else {
    y = box.y - distance;
    vy = speed;
    angle = Math.PI / 2;
  }

  spawnBullet({
    x,
    y,
    vx,
    vy,
    r: 8,
    type: "arrow",
    blue: true,
    shatterShield: true,
    length: 40,
    width: 11,
    life: 210,
    noCull: true,
    angle
  });
}

function spawnHunterLastStandCircleArrow({ box, spawnBullet, index, count, launchDelay }) {
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  const radius = Math.max(box.w, box.h) / 2 + 96;
  const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
  const x = centerX + Math.cos(angle) * radius;
  const y = centerY + Math.sin(angle) * radius;
  const speed = 6.9355;

  spawnBullet({
    x,
    y,
    vx: 0,
    vy: 0,
    r: 8,
    type: "arrow",
    length: 38,
    width: 10,
    life: launchDelay + 130,
    noCull: true,
    angle: angle + Math.PI,
    update: ({ bullet }) => {
      if (bullet.age <= launchDelay) return;

      if (!bullet.launched) {
        const dx = centerX - bullet.x;
        const dy = centerY - bullet.y;
        const travelDistance = Math.max(1, Math.hypot(dx, dy));

        bullet.launched = true;
        bullet.vx = dx / travelDistance * speed;
        bullet.vy = dy / travelDistance * speed;
        bullet.angle = Math.atan2(bullet.vy, bullet.vx);
      }

      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
    }
  });
}

function spawnHunterLastStandWallSet({ box, spawnBullet, playSound, sounds, safeColumn, safeRow }) {
  const laneCount = 3;
  const laneInset = 20;
  const delay = 29;
  const speed = 5.8;
  const laneX = (column) => box.x + laneInset + column * ((box.w - laneInset * 2) / (laneCount - 1));
  const laneY = (row) => box.y + laneInset + row * ((box.h - laneInset * 2) / (laneCount - 1));
  const launchSound = { played: false };

  for (let column = 0; column < laneCount; column++) {
    if (column === safeColumn) continue;

    spawnHunterDelayedGridArrow({
      spawnBullet,
      playSound,
      sounds,
      x: laneX(column),
      y: box.y + box.h + 34,
      vx: 0,
      vy: -speed,
      angle: -Math.PI / 2,
      delay,
      launchSound
    });
  }

  for (let row = 0; row < laneCount; row++) {
    if (row === safeRow) continue;

    spawnHunterDelayedGridArrow({
      spawnBullet,
      playSound,
      sounds,
      x: box.x + box.w + 34,
      y: laneY(row),
      vx: -speed,
      vy: 0,
      angle: Math.PI,
      delay,
      launchSound
    });
  }
}

function spawnHunterLastStandWallArrow({ box, spawnBullet, playSound, sounds }) {
  const laneCount = 3;
  const laneInset = 20;
  const delay = 29;
  const speed = 5.8;
  const laneIndex = randomInt(0, laneCount * 2 - 1);
  const laneX = (column) => box.x + laneInset + column * ((box.w - laneInset * 2) / (laneCount - 1));
  const laneY = (row) => box.y + laneInset + row * ((box.h - laneInset * 2) / (laneCount - 1));
  const launchSound = { played: false };

  if (laneIndex < laneCount) {
    spawnHunterDelayedGridArrow({
      spawnBullet,
      playSound,
      sounds,
      x: laneX(laneIndex),
      y: box.y + box.h + 34,
      vx: 0,
      vy: -speed,
      angle: -Math.PI / 2,
      delay,
      launchSound
    });
    return;
  }

  spawnHunterDelayedGridArrow({
    spawnBullet,
    playSound,
    sounds,
    x: box.x + box.w + 34,
    y: laneY(laneIndex - laneCount),
    vx: -speed,
    vy: 0,
    angle: Math.PI,
    delay,
    launchSound
  });
}

function scheduleHunterArrows({
  t,
  box,
  spawnBullet,
  shots,
  minArrivalGap = HUNTER_ARROW_MIN_ARRIVAL_GAP,
  yellowArrivalGap = HUNTER_ARROW_YELLOW_ARRIVAL_GAP
}) {
  for (const shot of resolveHunterArrowSchedule(box, shots, minArrivalGap, yellowArrivalGap)) {
    if (shot.spawnAt === t) {
      spawnHunterArrow({ box, spawnBullet, ...shot });
    }
  }
}

function resolveHunterArrowSchedule(box, shots, minArrivalGap, yellowArrivalGap) {
  const scheduled = shots.map((shot) => {
    const travelFrames = estimateHunterArrowTravelFrames(box, shot);
    const requestedArrival = Number.isFinite(shot.arrive) ? shot.arrive : shot.t + travelFrames;

    return {
      ...shot,
      travelFrames,
      requestedArrival,
      arrival: requestedArrival
    };
  }).sort((a, b) => a.requestedArrival - b.requestedArrival);

  let previousArrival = -Infinity;
  let previousArrivalYellow = false;

  for (const shot of scheduled) {
    const gap = shot.yellow || previousArrivalYellow
      ? Math.max(minArrivalGap, yellowArrivalGap)
      : minArrivalGap;

    shot.arrival = Math.max(shot.arrival, previousArrival + gap);
    shot.spawnAt = Math.max(0, Math.round(shot.arrival - shot.travelFrames));
    previousArrival = shot.arrival;
    previousArrivalYellow = shot.yellow;
  }

  return scheduled;
}

function estimateHunterArrowTravelFrames(box, shot) {
  const speed = Math.max(0.1, Number.isFinite(shot.speed) ? shot.speed : 2.75);
  const distance = Number.isFinite(shot.distance) ? shot.distance : 170;
  const turnDistance = Number.isFinite(shot.yellowTurnDistance) ? shot.yellowTurnDistance : 112;
  const turnDuration = Number.isFinite(shot.yellowTurnDuration) ? shot.yellowTurnDuration : 24;
  const yellowSpeed = Math.max(0.1, Number.isFinite(shot.yellowSpeed) ? shot.yellowSpeed : speed);
  const halfBox = shot.direction === "left" || shot.direction === "right" ? box.w / 2 : box.h / 2;
  const startRadius = distance + halfBox;

  if (!shot.yellow) {
    return startRadius / speed;
  }

  const framesUntilTurn = Math.max(0, startRadius - turnDistance) / speed;
  const framesAfterTurn = turnDistance / yellowSpeed;

  return framesUntilTurn + turnDuration + framesAfterTurn;
}

function spawnHunterArrow({ box, spawnBullet, direction, speed = 2.75, distance = 170, yellow = false }) {
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;

  if (direction === "left") {
    spawnBullet({
      x: box.x - distance,
      y: centerY,
      vx: speed,
      r: 8,
      type: "arrow",
      length: 36,
      life: 190,
      noCull: true,
      yellow,
      yellowTurnDistance: 112,
      yellowTurnDuration: 24,
      yellowSpeed: speed,
      angle: yellow ? Math.PI : 0
    });
    return;
  }

  if (direction === "right") {
    spawnBullet({
      x: box.x + box.w + distance,
      y: centerY,
      vx: -speed,
      r: 8,
      type: "arrow",
      length: 36,
      life: 190,
      noCull: true,
      yellow,
      yellowTurnDistance: 112,
      yellowTurnDuration: 24,
      yellowSpeed: speed,
      angle: yellow ? 0 : Math.PI
    });
    return;
  }

  if (direction === "down") {
    spawnBullet({
      x: centerX,
      y: box.y + box.h + distance,
      vy: -speed,
      r: 8,
      type: "arrow",
      length: 36,
      life: 190,
      noCull: true,
      yellow,
      yellowTurnDistance: 112,
      yellowTurnDuration: 24,
      yellowSpeed: speed,
      angle: yellow ? Math.PI / 2 : -Math.PI / 2
    });
    return;
  }

  spawnBullet({
    x: centerX,
    y: box.y - distance,
    vy: speed,
    r: 8,
    type: "arrow",
    length: 36,
    life: 190,
    noCull: true,
    yellow,
    yellowTurnDistance: 112,
    yellowTurnDuration: 24,
    yellowSpeed: speed,
    angle: yellow ? -Math.PI / 2 : Math.PI / 2
  });
}

function spawnHunterRedArrow({ box, spawnBullet, direction, speed = 3.4, distance = 250, life = 210 }) {
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  let x = centerX;
  let y = centerY;

  if (direction === "left") {
    x = box.x - distance;
  } else if (direction === "right") {
    x = box.x + box.w + distance;
  } else if (direction === "down") {
    y = box.y + box.h + distance;
  } else {
    y = box.y - distance;
  }

  const dx = centerX - x;
  const dy = centerY - y;
  const travelDistance = Math.max(1, Math.hypot(dx, dy));
  const fadeDuration = Math.max(1, travelDistance / speed / 2);

  spawnBullet({
    x,
    y,
    vx: dx / travelDistance * speed,
    vy: dy / travelDistance * speed,
    r: 8,
    type: "arrow",
    red: true,
    alpha: 1,
    length: 38,
    width: 10,
    life,
    noCull: true,
    angle: Math.atan2(dy, dx),
    update: ({ bullet }) => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      bullet.alpha = Math.max(0, 1 - bullet.age / fadeDuration);
    }
  });
}

function spawnHunterArrowRing({ spawnBullet, x, y, ringIndex = 0, duration = 128 }) {
  const count = 6;
  const startRadius = 182;
  const endRadius = 6;
  const turnAmount = Math.PI * 0.4025;
  const turnDirection = ringIndex % 2 === 0 ? 1 : -1;
  const startOffset = ringIndex * Math.PI / count;

  for (let i = 0; i < count; i++) {
    const startAngle = startOffset + i * Math.PI * 2 / count;

    spawnBullet({
      x: x + Math.cos(startAngle) * startRadius,
      y: y + Math.sin(startAngle) * startRadius,
      r: 10,
      type: "arrow",
      length: 50,
      width: 13,
      life: duration + 8,
      noCull: true,
      angle: startAngle + Math.PI,
      update: ({ bullet }) => {
        const progress = Math.min(1, bullet.age / duration);
        const easedCollapse = 1 - Math.pow(1 - progress, 2);
        const easedTurn = 1 - Math.pow(1 - progress, 3);
        const radius = startRadius + (endRadius - startRadius) * easedCollapse;
        const angle = startAngle + turnDirection * turnAmount * easedTurn;

        bullet.x = x + Math.cos(angle) * radius;
        bullet.y = y + Math.sin(angle) * radius;
        bullet.angle = angle + Math.PI;

        if (progress >= 1) {
          bullet.life = 0;
        }
      }
    });
  }
}

function spawnHunterOutwardArrowRing({ spawnBullet, x, y, ringIndex = 0, flySpeed = 3.35 }) {
  const count = 6;
  const radius = 150;
  const spinDuration = 50;
  const startOffset = ringIndex * Math.PI / count;

  for (let i = 0; i < count; i++) {
    const startAngle = startOffset + i * Math.PI * 2 / count;
    const startX = x + Math.cos(startAngle) * radius;
    const startY = y + Math.sin(startAngle) * radius;
    const facingCenter = startAngle + Math.PI;

    spawnBullet({
      x: startX,
      y: startY,
      r: 10,
      type: "arrow",
      length: 50,
      width: 13,
      life: 135,
      noCull: true,
      angle: facingCenter,
      update: ({ bullet }) => {
        if (bullet.age <= spinDuration) {
          const progress = bullet.age / spinDuration;

          bullet.x = startX;
          bullet.y = startY;
          bullet.angle = facingCenter + Math.PI * 2 * progress;
          return;
        }

        if (!bullet.launched) {
          const dx = x - bullet.x;
          const dy = y - bullet.y;
          const distance = Math.max(1, Math.hypot(dx, dy));

          bullet.launched = true;
          bullet.vx = dx / distance * flySpeed;
          bullet.vy = dy / distance * flySpeed;
          bullet.angle = Math.atan2(bullet.vy, bullet.vx);
        }

        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
      }
    });
  }
}

function spawnHunterWarningArrow({ box, state, spawnBullet, playSound, sounds, speed = 4.15, delay = 12, margin = 66 }) {
  const side = Math.floor(Math.random() * 4);
  let x;
  let y;

  if (side === 0) {
    x = box.x + Math.random() * box.w;
    y = box.y - margin;
  } else if (side === 1) {
    x = box.x + box.w + margin;
    y = box.y + Math.random() * box.h;
  } else if (side === 2) {
    x = box.x + Math.random() * box.w;
    y = box.y + box.h + margin;
  } else {
    x = box.x - margin;
    y = box.y + Math.random() * box.h;
  }

  spawnBullet({
    x,
    y,
    r: 8,
    type: "arrow",
    length: 38,
    width: 10,
    life: 118,
    noCull: true,
    angle: Math.atan2(state.soul.y - y, state.soul.x - x),
    update: ({ bullet, state }) => {
      if (bullet.age <= delay) {
        bullet.angle = Math.atan2(state.soul.y - bullet.y, state.soul.x - bullet.x);
        return;
      }

      if (!bullet.launched) {
        const dx = state.soul.x - bullet.x;
        const dy = state.soul.y - bullet.y;
        const distance = Math.max(1, Math.hypot(dx, dy));

        bullet.launched = true;
        bullet.vx = dx / distance * speed;
        bullet.vy = dy / distance * speed;
        bullet.angle = Math.atan2(bullet.vy, bullet.vx);
        playSound(sounds.arrow);
      }

      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
    }
  });
}

function spawnHunterSurgeGrid({
  box,
  spawnBullet,
  playSound,
  sounds,
  safeColumn,
  safeRow,
  speed = 5.2,
  laneCount = 3,
  laneInset = 18,
  spawnOffset = 32
}) {
  const delay = 32;
  const bottomY = box.y + box.h + spawnOffset;
  const rightX = box.x + box.w + spawnOffset;
  const laneX = (column) => box.x + laneInset + column * ((box.w - laneInset * 2) / (laneCount - 1));
  const laneY = (row) => box.y + laneInset + row * ((box.h - laneInset * 2) / (laneCount - 1));
  const launchSound = { played: false };

  playSound(sounds.spearAppear);

  for (let column = 0; column < laneCount; column++) {
    if (column === safeColumn) continue;

    spawnHunterDelayedGridArrow({
      spawnBullet,
      playSound,
      sounds,
      x: laneX(column),
      y: bottomY,
      vx: 0,
      vy: -speed,
      angle: -Math.PI / 2,
      delay,
      launchSound
    });
  }

  for (let row = 0; row < laneCount; row++) {
    if (row === safeRow) continue;

    spawnHunterDelayedGridArrow({
      spawnBullet,
      playSound,
      sounds,
      x: rightX,
      y: laneY(row),
      vx: -speed,
      vy: 0,
      angle: Math.PI,
      delay,
      launchSound
    });
  }
}

function spawnHunterDelayedGridArrow({ spawnBullet, playSound, sounds, x, y, vx, vy, angle, delay, launchSound, red = false }) {
  spawnBullet({
    x,
    y,
    vx: 0,
    vy: 0,
    r: 8,
    type: "arrow",
    red,
    length: 36,
    width: 10,
    life: 118,
    noCull: true,
    angle,
    update: ({ bullet }) => {
      if (bullet.age <= delay) return;

      if (!bullet.launched) {
        bullet.launched = true;
        bullet.vx = vx;
        bullet.vy = vy;
        if (!launchSound.played) {
          launchSound.played = true;
          playSound(sounds.arrow);
        }
      }

      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
    }
  });
}
