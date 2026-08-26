window.ENEMY_DATA = {
  name: "BRAVOURÖS",

  sprite: "sprites/bravouros.png",
  ultimateSprite: "sprites/bravouros2.png",
  music: {
    src: "sounds/bravouros.wav",
    loopStart: 22.388,
    loopEnd: 163.570
  },
  backgroundModifier: function starwovenSky({ ctx, state, width, height }) {
    drawStarwovenSky({ ctx, frame: state.frame, width, height });
  },

  maxHP: 400,

  introMessage: "* Something small approaches...",
  winMessage: "* Nice.",
  defeatDialog: "Its time... for me... to... flake...",
  acts: [
    {
      name: "Drive to Michigan",
      dialog: "* You can't drive there yet! There's DND tomorrow..."
    },
    {
      name: "Fact Check",
      dialog: "* You attempt to fact check. It appears BRAVOURÖS was right..."
    },
    {
      name: "Hide Everclear",
      dialog: "* You hide the Everclear. It wasn't in danger..."
    },
    {
      name: "Play Smash Ultimate",
      dialog: "* You have better things to do..."
    }
  ],
  actConditions: [
    {
      act: 2,
      dialog: "* You successfully fact check BRAVOURÖS! He retreats home."
    },
    {
      act: 1,
      dialog: "* You find the gnome in Michigan. He attempts to drink away his sorrow."
    },
    {
      act: 3,
      dialog: "* You hide the Everclear. He tells you a story on the way back to Madison."
    },
    {
      act: 2,
      dialog: "* You catch a faulty detail. He challenges you to a dual."
    },
    {
      act: 4,
      dialog: "* You beat his Ike. He wants best 2 out of 3."
    },
    {
      act: 4,
      dialog: "* Ike's forward smash KO's you at 20%. On to the tie-breaker"
    },
    {
      act: 4,
      dialog: "* You beat his Ike again. He plans multiple events out of town to retaliate."
    },
    {
      act: 1,
      dialog: "* You attend the first event. He ignores you."
    },
        {
      act: 1,
      dialog: "* You attend the second event. You catch a faint smile."
    },
        {
      act: 1,
      dialog: "* You attend the final event. He's glad you came."
    }
  ],

  mercyFailure: "* BRAVOURÖS isn't done with you yet.",
  mercySuccess: "* You spare BRAVOURÖS. Or he spared you?.",
  mercyWinMessage: "OBISCWTPDNDWMFT.",

  enemyDialog: [
    "* Looks like its a woe day... for you.",
    "* Is this supposed to be difficult?",
    "* Shillelagh",
    "* I don't need the material components to cast this right",
    "* Where did my 400GP go?",
  ],

  items: [
    {
      name: "Blanc de Blanc",
      heal: 18
    },
    {
      name: "Hot Pot",
      heal: 25
    },
    {
      name: "Dorito",
      heal: 12
    },
    {
      name: "Dorito",
      heal: 12
    }
  ],

  battleDialog: [
    "* BRAVOURÖS prepares to ensnare you.",
    "* BRAVOURÖS consults the stars.",
    "* BRAVOURÖS is hardly trying.",
    "* BRAVOURÖS attempts to summon an elemental.",
    "* BRAVOURÖS prepares another spell.",
    "* BRAVOURÖS casts SPIKE GROWTH. Beware of the ground!",
    "* The stars shine brightly above. Something is coming...",
    "* BRAVOURÖS' CUP PREPARES TO RUNETH OVER.",
    "* BRAVOURÖS is done warming up.",
    "* BRAVOURÖS casts MOONBEAM.",
    "* BRAVOURÖS takes out his ruler. You're within range.",
    "* BRAVOURÖS prepares to descend the stars.",
    "* BRAVOURÖS grows inpatient.",
  ],

  turns: [
    {
      loop: false,
      event: {
        steps: [
          { type: "textbox", text: "BRAVOURÖS casts WEB." },
          { type: "flash", color: "#9d5cff", duration: 42 },
          { type: "textbox", text: "Your movement's been restricted!" }
        ]
      },
      type: "purple",
      pattern: function needleRun({ t, box, purpleLineYs, spawnBullet }) {
        const lanes = getLaneYs(box, purpleLineYs);

        if (t % 36 === 0) {
          const lane = Math.floor(t / 36) % lanes.length;
          const fromLeft = Math.floor(t / 108) % 2 === 0;

          spawnBullet({
            x: fromLeft ? box.x - 18 : box.x + box.w + 18,
            y: lanes[lane],
            vx: fromLeft ? 3.2 : -3.2,
            r: 8,
            type: "diamond",
            life: 130,
            spin: fromLeft ? 0.14 : -0.14
          });
        }

        if (t % 96 === 48) {
          const safeLane = Math.floor(t / 96) % lanes.length;

          for (let lane = 0; lane < lanes.length; lane++) {
            if (lane === safeLane) continue;

            spawnBullet({
              x: box.x + box.w / 2,
              y: lanes[lane],
              r: 11,
              type: "shadow",
              harmless: true,
              life: 28,
              spin: 0.04
            });

            spawnBullet({
              x: box.x - 20,
              y: lanes[lane],
              vx: 4.4,
              r: 10,
              type: "note",
              life: 105,
              delay: 28,
              update: ({ bullet }) => {
                if (bullet.age < bullet.delay) return;
                bullet.x += bullet.vx;
              }
            });
          }
        }
      }
    },
    {
      loop: false,
      type: "purple",
      duration: 690,
      pattern: function crossStitchBarrage({ t, box, purpleLineYs, spawnBullet, state }) {
        const lanes = getLaneYs(box, purpleLineYs);

        if (t % 44 === 0) {
          const lane = Math.floor(t / 44) % lanes.length;
          const fromLeft = Math.floor(t / 132) % 2 === 0;

          spawnBullet({
            x: fromLeft ? box.x - 20 : box.x + box.w + 20,
            y: lanes[lane],
            vx: fromLeft ? 4.35 : -4.35,
            r: 9,
            type: "diamond",
            life: 112,
            spin: fromLeft ? 0.18 : -0.18
          });
        }

        if (t === 142 || t === 400) {
          spawnConstellationWarning({
            box,
            spawnBullet,
            points: [[0.22, 0.18], [0.5, 0.5], [0.78, 0.82]],
            duration: 36
          });
        }

        if (t === 178 || t === 436) {
          spawnConstellation({
            box,
            state,
            spawnBullet,
            points: [[0.22, 0.18], [0.5, 0.5], [0.78, 0.82]],
            launchDelay: 52,
            speed: 4.4,
            closed: false
          });
        }
      }
    },
    {
      loop: false,
      type: "purple",
      duration: 720,
      pattern: function constellationSnare({ t, box, purpleLineYs, spawnBullet, state }) {
        const lanes = getLaneYs(box, purpleLineYs);

        if (t === 0 || t === 232 || t === 474) {
          const upper = t !== 232;
          spawnConstellationWarning({
            box,
            spawnBullet,
            points: upper
              ? [[0.2, 0.18], [0.38, 0.5], [0.58, 0.18], [0.8, 0.5]]
              : [[0.18, 0.82], [0.38, 0.5], [0.6, 0.82], [0.82, 0.5]],
            duration: 36
          });
        }

        if (t === 36 || t === 268 || t === 510) {
          const upper = t !== 268;
          spawnConstellation({
            box,
            state,
            spawnBullet,
            points: upper
              ? [[0.2, 0.18], [0.38, 0.5], [0.58, 0.18], [0.8, 0.5]]
              : [[0.18, 0.82], [0.38, 0.5], [0.6, 0.82], [0.82, 0.5]],
            launchDelay: 62,
            speed: 4.6,
            closed: false
          });
        }

        if (t % 84 === 18) {
          const openLane = Math.floor(t / 84 + 1) % lanes.length;

          for (let lane = 0; lane < lanes.length; lane++) {
            if (lane === openLane) continue;
            spawnBullet({
              x: box.x + box.w + 20,
              y: lanes[lane],
              vx: -4,
              r: 9,
              type: "star",
              life: 118,
              spin: -0.18
            });
          }
        }

      }
    },
    {
      loop: false,
      type: "normal",
      duration: 720,
      pattern: function pyreElemental({ t, box, state, spawnBullet }) {
        const sourceX = box.x + box.w / 2;
        const sourceY = box.y + 48;

        if (t === 0) {
          spawnBullet({
            x: sourceX,
            y: sourceY,
            r: 24,
            type: "fireElemental",
            harmless: true,
            noCull: true,
            life: 720
          });
        }

        if (t % 58 === 18) {
          const dx = state.soul.x - sourceX;
          const dy = state.soul.y - sourceY;
          const angle = Math.atan2(dy, dx);

          spawnBullet({
            x: sourceX,
            y: sourceY + 12,
            vx: Math.cos(angle) * 4.25,
            vy: Math.sin(angle) * 4.25,
            r: 11,
            type: "fireball",
            life: 116,
            angle,
            spin: 0.14
          });
        }

        if (t % 174 === 92) {
          const baseAngle = Math.atan2(state.soul.y - sourceY, state.soul.x - sourceX);

          for (let i = -2; i <= 2; i++) {
            const angle = baseAngle + i * 0.23;

            spawnBullet({
              x: sourceX,
              y: sourceY + 12,
              vx: Math.cos(angle) * 3.65,
              vy: Math.sin(angle) * 3.65,
              r: 9,
              type: "fireball",
              life: 132,
              angle,
              spin: i * 0.08
            });
          }
        }

        if (t % 124 === 70) {
          const fromLeft = Math.floor(t / 124) % 2 === 0;

          spawnBullet({
            x: fromLeft ? box.x - 16 : box.x + box.w + 16,
            y: box.y + box.h - 34,
            vx: fromLeft ? 3.85 : -3.85,
            vy: -0.62,
            r: 12,
            type: "fireball",
            life: 106,
            angle: fromLeft ? 0 : Math.PI,
            spin: fromLeft ? 0.1 : -0.1
          });
        }
      }
    },
    {
      loop: false,
      event: {
        steps: [
          { type: "textbox", text: "BRAVOURÖS casts EARTHBIND." },
          { type: "flash", color: "#39a7ff", duration: 42 },
          { type: "textbox", text: "You've been grounded!" }
        ]
      },
      type: "blue",
      duration: 690,
      pattern: function cometVault({ t, box, spawnBullet, state }) {
        const floorY = box.y + box.h - 8;

        if (t % 72 === 0) {
          const fromLeft = Math.floor(t / 72) % 2 === 0;
          spawnBullet({
            x: fromLeft ? box.x - 24 : box.x + box.w + 24,
            y: floorY - 11,
            vx: fromLeft ? 4 : -4,
            r: 13,
            type: "bone",
            life: 106,
            angle: fromLeft ? 0 : Math.PI
          });
        }

        if (t % 96 === 34) {
          for (let i = 0; i < 2; i++) {
            const x = box.x + 70 + ((Math.floor(t / 96) + i * 2) % 4) * 64;

            spawnBullet({
              x,
              y: box.y - 18 - i * 30,
              vy: 3.85,
              r: 10,
              type: "star",
              life: 92,
              spin: i === 0 ? 0.16 : -0.16
            });
          }
        }

        if (t === 192 || t === 472) {
          spawnConstellation({
            box,
            state,
            spawnBullet,
            points: [[0.24, 0.24], [0.5, 0.12], [0.76, 0.24]],
            launchDelay: 58,
            speed: 4.45,
            closed: true
          });
        }
      }
    },
    {
      loop: false,
      type: "blue",
      duration: 720,
      setup: function beginSpikeGrowth({ box, spawnBullet, state }) {
        const floorY = box.y + box.h - 8;
        const platformSpeed = 2.45;

        spawnBullet({
          x: box.x + box.w / 2,
          y: box.y + box.h - 26,
          width: box.w,
          height: 26,
          type: "spikeFloor",
          life: 721,
          noCull: true
        });

        const startingPlatform = spawnMovingPlatform({
          spawnBullet,
          x: box.x + box.w * 0.3,
          y: floorY - 38,
          speed: platformSpeed,
          life: 230
        });

        spawnMovingPlatform({
          spawnBullet,
          x: box.x + box.w * 0.76,
          y: floorY - 126,
          speed: platformSpeed,
          life: 250
        });

        spawnMovingPlatform({
          spawnBullet,
          x: box.x + box.w + 73,
          y: floorY - 50,
          speed: platformSpeed,
          life: 270
        });

        state.soul.x = startingPlatform.x;
        state.soul.y = startingPlatform.y - state.soul.r;
        state.soul.vy = 0;
      },
      pattern: function spikeGrowth({ t, box, spawnBullet, state }) {
        const floorY = box.y + box.h - 8;
        const platformSpeed = 2.45;
        const platformYs = [floorY - 116, floorY - 34, floorY - 132, floorY - 48, floorY - 122, floorY - 38];
        const platformTimes = [94, 188, 282, 376, 470, 564, 658];
        const platformIndex = platformTimes.indexOf(t);

        if (platformIndex !== -1) {
          spawnMovingPlatform({
            spawnBullet,
            x: box.x + box.w + 56,
            y: platformYs[platformIndex % platformYs.length],
            speed: platformSpeed,
            life: 240
          });
        }

        if (t === 228 || t === 540) {
          spawnConstellation({
            box,
            state,
            spawnBullet,
            points: t === 228
              ? [[0.56, 0.18], [0.68, 0.28], [0.8, 0.18]]
              : [[0.2, 0.2], [0.32, 0.3], [0.44, 0.2]],
            launchDelay: 92,
            speed: 2.35,
            closed: false
          });
        }
      }
    },
    {
      loop: false,
      type: "blue",
      duration: 740,
      pattern: function astralHighJump({ t, box, spawnBullet, state }) {
        const floorY = box.y + box.h - 8;

        if (t === 24 || t === 274 || t === 524) {
          spawnConstellation({
            box,
            state,
            spawnBullet,
            points: [[0.16, 0.28], [0.34, 0.12], [0.52, 0.28], [0.7, 0.12], [0.86, 0.28]],
            launchDelay: 68,
            speed: 4.7,
            closed: false
          });
        }

        if (t % 82 === 46) {
          const fromLeft = Math.floor(t / 82) % 2 === 0;

          spawnBullet({
            x: fromLeft ? box.x - 22 : box.x + box.w + 22,
            y: floorY - 10,
            vx: fromLeft ? 4.35 : -4.35,
            r: 14,
            type: "claw",
            life: 104,
            angle: fromLeft ? 0 : Math.PI
          });
        }

        if (t % 118 === 82) {
          const fromLeft = Math.floor(t / 118) % 2 === 1;

          spawnBullet({
            x: fromLeft ? box.x - 20 : box.x + box.w + 20,
            y: floorY - 70,
            vx: fromLeft ? 3.65 : -3.65,
            r: 11,
            type: "star",
            life: 116,
            spin: fromLeft ? 0.18 : -0.18
          });
        }
      }
    },
    {
      loop: false,
      type: "ultimate",
      duration: 1260,
      enemyDialog: "BRAVOURÖS' CUP PREPARES TO RUNETH OVER.",
      pattern: function starwovenFirmament({ t, box, state, spawnBullet }) {
        const centerX = box.x + box.w / 2;
        const centerY = box.y + box.h / 2;
        const constellations = [
          // Chalice: rim, bowl, stem, and base in one continuous star stroke.
          [[0.27, 0.22], [0.73, 0.22], [0.68, 0.34], [0.62, 0.43], [0.55, 0.49], [0.52, 0.62], [0.66, 0.72], [0.34, 0.72], [0.48, 0.62], [0.45, 0.49], [0.38, 0.43], [0.32, 0.34], [0.27, 0.22]],
          // Archery bow: curved stave followed by the taut string and nocked arrow.
          [[0.27, 0.18], [0.2, 0.3], [0.17, 0.5], [0.2, 0.7], [0.27, 0.82], [0.42, 0.5], [0.27, 0.18], [0.42, 0.5], [0.76, 0.5], [0.67, 0.41], [0.76, 0.5], [0.67, 0.59]],
          // Dragon: head and horn, ridged back, wing, tail, and hooked jaw.
          [[0.18, 0.55], [0.28, 0.43], [0.24, 0.3], [0.36, 0.37], [0.46, 0.25], [0.57, 0.34], [0.71, 0.21], [0.64, 0.47], [0.82, 0.55], [0.67, 0.6], [0.76, 0.76], [0.57, 0.65], [0.47, 0.76], [0.4, 0.59], [0.29, 0.65], [0.18, 0.55], [0.28, 0.56], [0.34, 0.49]]
        ];
        const formationTimes = [24, 276, 528, 780, 1032];
        const formationOrder = [0, 1, 2, 0, 2];
        const formationIndex = formationTimes.indexOf(t);

        if (formationIndex !== -1) {
          spawnConstellation({
            box,
            state,
            spawnBullet,
            points: constellations[formationOrder[formationIndex]],
            launchDelay: 100,
            speed: 3.8 + formationIndex * 0.12,
            closed: formationOrder[formationIndex] !== 1
          });
        }

        if (t % 34 === 0) {
          const fromLeft = Math.floor(t / 34) % 2 === 0;
          const x = fromLeft ? box.x - 18 : box.x + box.w + 18;
          const y = box.y + 28 + Math.random() * (box.h - 56);
          const dx = state.soul.x - x;
          const dy = state.soul.y - y;
          const distance = Math.max(1, Math.hypot(dx, dy));

          spawnBullet({
            x,
            y,
            vx: dx / distance * 3.9,
            vy: dy / distance * 3.9,
            r: 9,
            type: "star",
            life: 300,
            spin: fromLeft ? 0.13 : -0.13
          });
        }

        if (t % 58 === 14) {
          const column = Math.floor(t / 58) % 7;
          const x = box.x + 72 + column * ((box.w - 144) / 6);

          spawnBullet({
            x,
            y: box.y - 18,
            vx: Math.sin(t / 18) * 0.7,
            vy: 4.25,
            r: 10,
            type: "star",
            life: 210,
            spin: 0.17
          });

          spawnBullet({
            x: box.x + box.w - (x - box.x),
            y: box.y + box.h + 18,
            vx: -Math.sin(t / 18) * 0.7,
            vy: -4.25,
            r: 10,
            type: "star",
            life: 210,
            spin: -0.17
          });
        }

        if (t % 196 === 108) {
          for (let i = 0; i < 12; i++) {
            const angle = Math.PI * 2 * i / 12 + t * 0.018;

            spawnBullet({
              x: centerX,
              y: centerY,
              vx: Math.cos(angle) * 2.8,
              vy: Math.sin(angle) * 2.8,
              r: 8,
              type: "star",
              life: 270,
              spin: i % 2 === 0 ? 0.1 : -0.1
            });
          }
        }

        if (t > 820 && t % 86 === 30) {
          const angle = Math.atan2(state.soul.y - centerY, state.soul.x - centerX);

          for (let i = -2; i <= 2; i++) {
            const shotAngle = angle + i * 0.16;

            spawnBullet({
              x: centerX,
              y: centerY,
              vx: Math.cos(shotAngle) * 4.7,
              vy: Math.sin(shotAngle) * 4.7,
              r: 11,
              type: "star",
              life: 220,
              spin: 0.18 * i
            });
          }
        }
      }
    },
    {
      loop: true,
      event: {
        steps: [
          { type: "textbox", text: "BRAVOURÖS casts WEB." },
          { type: "flash", color: "#9d5cff", duration: 42 },
          { type: "textbox", text: "Your movement's been restrained!" }
        ]
      },
      type: "purple",
      duration: 760,
      pattern: function astralWebstorm({ t, box, purpleLineYs, state, spawnBullet }) {
        const lanes = getLaneYs(box, purpleLineYs);

        if (t % 48 === 0) {
          const lane = Math.floor(t / 48) % lanes.length;
          const fromLeft = Math.floor(t / 144) % 2 === 0;

          spawnBullet({
            x: fromLeft ? box.x - 88 : box.x + box.w + 88,
            y: lanes[lane],
            vx: fromLeft ? 4.35 : -4.35,
            r: 10,
            type: "star",
            life: 120,
            noCull: true,
            spin: fromLeft ? 0.18 : -0.18
          });
        }

        if (t % 124 === 32) {
          const column = Math.floor(t / 124) % 3;
          spawnFallingStar({
            box,
            spawnBullet,
            x: box.x + box.w * (0.24 + column * 0.26),
            speed: 3.75,
            size: 9,
            drift: column === 1 ? 0 : column === 0 ? 0.24 : -0.24
          });
        }

        if (t === 140 || t === 464) {
          spawnConstellationWarning({
            box,
            spawnBullet,
            points: [[0.12, 0.22], [0.27, 0.48], [0.42, 0.18], [0.58, 0.48], [0.73, 0.18], [0.88, 0.44]],
            duration: 36
          });
        }

        if (t === 176 || t === 500) {
          spawnConstellation({
            box,
            state,
            spawnBullet,
            points: [[0.12, 0.22], [0.27, 0.48], [0.42, 0.18], [0.58, 0.48], [0.73, 0.18], [0.88, 0.44]],
            launchDelay: 62,
            speed: 4.5,
            closed: false
          });
        }
      }
    },
    {
      loop: true,
      type: "purple",
      duration: 780,
      pattern: function radiantRowSalvo({ t, box, purpleLineYs, spawnBullet }) {
        const lanes = getLaneYs(box, purpleLineYs);

        if (t % 60 === 0) {
          const volley = Math.floor(t / 60);
          const safeLane = volley === 0 ? 1 : Math.floor(Math.random() * lanes.length);
          const targetedLanes = lanes
            .map((laneY, index) => ({ laneY, index }))
            .filter((lane) => lane.index !== safeLane);

          spawnLaneBlastVolley({
            box,
            spawnBullet,
            lanes: targetedLanes.map((lane) => lane.laneY),
            swapSides: volley % 2 === 1
          });
        }
      }
    },
    {
      loop: true,
      type: "purple",
      duration: 790,
      pattern: function celestialOrrery({ t, box, purpleLineYs, state, spawnBullet }) {
        const lanes = getLaneYs(box, purpleLineYs);

        if (t === 34 || t === 278 || t === 522) {
          spawnOrrery({
            box,
            state,
            spawnBullet,
            clockwise: t !== 278,
            holdDuration: 94,
            speed: 4.65
          });
        }

        if (t % 64 === 28) {
          const lane = Math.floor(t / 64 + 1) % lanes.length;
          const fromLeft = Math.floor(t / 128) % 2 === 0;

          spawnBullet({
            x: fromLeft ? box.x - 68 : box.x + box.w + 68,
            y: lanes[lane],
            vx: fromLeft ? 3.8 : -3.8,
            r: 9,
            type: "star",
            life: 126,
            noCull: true,
            spin: fromLeft ? 0.15 : -0.15
          });
        }
      }
    },
    {
      loop: true,
      type: "normal",
      duration: 800,
      setup: function beginTwinMeteorShower({ box, spawnBullet }) {
        spawnMeteorSource({ box, spawnBullet, x: box.x + box.w * 0.08, life: 876 });
        spawnMeteorSource({ box, spawnBullet, x: box.x + box.w * 0.92, life: 876 });
      },
      pattern: function twinMeteorShower({ t, box, spawnBullet }) {
        if (t % 4 === 0) {
          const leftSourceX = box.x + box.w * 0.08;
          const rightSourceX = box.x + box.w * 0.92;
          const sourceY = box.y - 112;
          const leftAngle = Math.PI * (0.12 + Math.random() * 0.76);
          const rightAngle = Math.PI * (0.12 + Math.random() * 0.76);
          const speed = 1.42;

          spawnMeteorStar({
            spawnBullet,
            x: leftSourceX,
            y: sourceY,
            angle: leftAngle,
            speed
          });
          spawnMeteorStar({
            spawnBullet,
            x: rightSourceX,
            y: sourceY,
            angle: rightAngle,
            speed
          });
        }
      }
    },
    {
      loop: true,
      event: {
        steps: [
          { type: "textbox", text: "BRAVOURÖS casts EARTHBIND." },
          { type: "flash", color: "#39a7ff", duration: 42 },
          { type: "textbox", text: "You feel the stars push down on you!" }
        ]
      },
      type: "blue",
      duration: 860,
      pattern: function stellarGateCourse({ t, box, spawnBullet }) {
        const floorY = box.y + box.h - 8;
        const gates = [
          { t: 24, gap: floorY - 34, height: 32, fromLeft: false, speed: 3.1 },
          { t: 142, gap: floorY - 122, height: 30, fromLeft: true, speed: 3.25 },
          { t: 256, gap: floorY - 68, height: 48, fromLeft: false, speed: 3.3 },
          { t: 356, gap: floorY - 112, height: 48, fromLeft: false, speed: 3.45 },
          { t: 374, gap: floorY - 46, height: 34, fromLeft: true, speed: 3.45 },
          { t: 494, gap: floorY - 84, height: 34, fromLeft: true, speed: 3.5 },
          { t: 610, gap: floorY - 32, height: 48, fromLeft: false, speed: 3.6 },
          { t: 712, gap: floorY - 126, height: 34, fromLeft: true, speed: 3.6 }
        ];
        const gate = gates.find((entry) => entry.t === t);

        if (gate) {
          spawnStarGate({
            box,
            spawnBullet,
            fromLeft: gate.fromLeft,
            gapCenter: gate.gap,
            gapHeight: gate.height,
            speed: gate.speed
          });
        }

        const hurdleTimes = [86, 204, 448, 556, 770];
        const hurdleIndex = hurdleTimes.indexOf(t);

        if (hurdleIndex !== -1) {
          spawnStarHurdle({
            box,
            spawnBullet,
            fromLeft: hurdleIndex % 2 === 1,
            height: hurdleIndex === 2 || hurdleIndex === 4 ? 3 : 2,
            speed: 3.45 + hurdleIndex * 0.08
          });
        }
      }
    },
    {
      loop: true,
      type: "blue",
      duration: 800,
      setup: function beginAstralSpikeRise({ box, spawnBullet, state }) {
        const floorY = box.y + box.h - 8;

        spawnBullet({
          x: box.x + box.w / 2,
          y: box.y + box.h - 24,
          width: box.w,
          height: 24,
          type: "spikeFloor",
          life: 801,
          noCull: true
        });

        const start = spawnMovingPlatform({
          spawnBullet,
          x: box.x + box.w * 0.28,
          y: floorY - 42,
          speed: 2.8,
          life: 190,
          width: 84
        });

        spawnMovingPlatform({
          spawnBullet,
          x: box.x + box.w * 0.78,
          y: floorY - 132,
          speed: 2.8,
          life: 220,
          width: 126
        });

        state.soul.x = start.x;
        state.soul.y = start.y - state.soul.r;
        state.soul.vy = 0;
      },
      pattern: function astralSpikeRise({ t, box, state, spawnBullet }) {
        const floorY = box.y + box.h - 8;
        const platformWaves = [
          { t: 38, y: floorY - 38, width: 78 },
          { t: 122, y: floorY - 134, width: 128 },
          { t: 206, y: floorY - 52, width: 64 },
          { t: 264, y: floorY - 72, width: 142 },
          { t: 288, y: floorY - 116, width: 86 },
          { t: 394, y: floorY - 42, width: 72 },
          { t: 488, y: floorY - 136, width: 132 },
          { t: 566, y: floorY - 58, width: 58 },
          { t: 600, y: floorY - 90, width: 138 },
          { t: 704, y: floorY - 38, width: 78 }
        ];
        const wave = platformWaves.find((entry) => entry.t === t);

        if (wave) {
          spawnMovingPlatform({
            spawnBullet,
            x: box.x + box.w + 58,
            y: wave.y,
            speed: 2.8,
            life: 206,
            width: wave.width
          });
        }

        if (t === 230 || t === 548) {
          spawnConstellation({
            box,
            state,
            spawnBullet,
            points: [[0.12, -0.5], [0.3, -0.26], [0.5, -0.56], [0.7, -0.26], [0.88, -0.5]],
            launchDelay: 86,
            speed: 3.45,
            closed: false
          });
        }
      }
    },
    {
      loop: true,
      type: "blue",
      duration: 900,
      pattern: function starWindowRelay({ t, box, state, spawnBullet }) {
        const floorY = box.y + box.h - 8;
        const gates = [
          { t: 22, fromLeft: false, gap: floorY - 122, height: 40, speed: 3.3 },
          { t: 64, fromLeft: true, gap: floorY - 118, height: 38, speed: 3.35 },
          { t: 168, fromLeft: false, gap: floorY - 42, height: 36, speed: 3.45 },
          { t: 194, fromLeft: true, gap: floorY - 76, height: 34, speed: 3.45 },
          { t: 306, fromLeft: true, gap: floorY - 128, height: 48, speed: 3.55 },
          { t: 342, fromLeft: false, gap: floorY - 52, height: 45, speed: 3.55 },
          { t: 468, fromLeft: false, gap: floorY - 92, height: 45, speed: 3.65 },
          { t: 492, fromLeft: true, gap: floorY - 34, height: 36, speed: 3.65 },
          { t: 628, fromLeft: true, gap: floorY - 112, height: 36, speed: 3.75 },
          { t: 650, fromLeft: false, gap: floorY - 62, height: 36, speed: 3.75 },
          { t: 790, fromLeft: false, gap: floorY - 38, height: 36, speed: 3.82 }
        ];
        const gate = gates.find((entry) => entry.t === t);

        if (gate) {
          spawnStarGate({
            box,
            spawnBullet,
            fromLeft: gate.fromLeft,
            gapCenter: gate.gap,
            gapHeight: gate.height,
            speed: gate.speed
          });
        }

        if (t === 244 || t === 570) {
          spawnConstellation({
            box,
            state,
            spawnBullet,
            points: t === 244
              ? [[0.16, -0.42], [0.32, -0.18], [0.48, -0.46], [0.64, -0.18], [0.82, -0.42]]
              : [[0.1, -0.34], [0.25, -0.58], [0.4, -0.27], [0.56, -0.54], [0.72, -0.24], [0.88, -0.48]],
            launchDelay: 78,
            speed: t === 244 ? 3.9 : 4.15,
            closed: false
          });
        }

        if (t === 126 || t === 414 || t === 734 || t === 848) {
          spawnStarHurdle({
            box,
            spawnBullet,
            fromLeft: t === 414 || t === 848,
            height: t === 734 ? 3 : 2,
            speed: 3.65
          });
        }
      }
    },
    {
      loop: true,
      type: "blue",
      duration: 896,
      pattern: function closingStarWindows({ t, box, spawnBullet }) {
        const floorY = box.y + box.h - 8;
        const openingY = floorY - 50;
        const waveTimes = [
          16, 49, 82, 115, 148, 181, 214, 247, 280, 313, 346, 379, 412,
          445, 478, 511, 544, 577, 610, 643, 676, 709, 742, 775, 808, 841
        ];
        const wave = waveTimes.includes(t);

        if (!wave) return;

        spawnStarGate({
          box,
          spawnBullet,
          fromLeft: true,
          gapCenter: openingY,
          gapHeight: 42,
          speed: 3.41
        });
        spawnStarGate({
          box,
          spawnBullet,
          fromLeft: false,
          gapCenter: openingY,
          gapHeight: 42,
          speed: 3.41
        });
      }
    }
  ]
};

function drawStarwovenSky({ ctx, frame, width, height }) {
  ctx.save();

  for (let i = 0; i < 82; i++) {
    const seed = i * 997.37;
    const x = 18 + ((Math.sin(seed * 0.017) * 10000 + seed) % (width - 36) + (width - 36)) % (width - 36);
    const y = 16 + ((Math.cos(seed * 0.013) * 10000 + seed * 0.7) % (height - 32) + (height - 32)) % (height - 32);
    const twinkle = (Math.sin(frame * (0.025 + (i % 5) * 0.008) + seed) + 1) / 2;
    const visible = Math.max(0, (twinkle - 0.22) / 0.78);
    const radius = 0.8 + (i % 4) * 0.45 + visible * 0.9;

    if (visible <= 0) continue;

    ctx.globalAlpha = 0.12 + visible * 0.62;
    ctx.fillStyle = i % 7 === 0 ? "#b9dbff" : "#fff";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    if (visible > 0.72 && i % 6 === 0) {
      ctx.globalAlpha = (visible - 0.72) * 1.75;
      ctx.strokeStyle = "#d8ecff";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x - radius * 3, y);
      ctx.lineTo(x + radius * 3, y);
      ctx.moveTo(x, y - radius * 3);
      ctx.lineTo(x, y + radius * 3);
      ctx.stroke();
    }
  }

  ctx.restore();
}

function spawnConstellation({ box, state, spawnBullet, points, launchDelay, speed, closed }) {
  const stars = points.map(([px, py], index) => spawnBullet({
    x: box.x + box.w * px,
    y: box.y + box.h * py,
    r: 11,
    type: "star",
    life: launchDelay + 280,
    harmless: true,
    noCull: true,
    spin: index % 2 === 0 ? 0.1 : -0.1,
    launched: false,
    update: ({ bullet }) => {
      if (bullet.age < launchDelay) return;

      if (!bullet.launched) {
        const dx = state.soul.x - bullet.x;
        const dy = state.soul.y - bullet.y;
        const distance = Math.max(1, Math.hypot(dx, dy));

        bullet.vx = dx / distance * speed;
        bullet.vy = dy / distance * speed;
        bullet.harmless = false;
        bullet.launched = true;
      }

      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
    }
  }));

  spawnBullet({
    x: 0,
    y: 0,
    r: 0,
    type: "constellationLine",
    points: stars,
    closed,
    harmless: true,
    noCull: true,
    life: launchDelay
  });
}

function spawnOrrery({ box, state, spawnBullet, clockwise, holdDuration, speed }) {
  const centerX = box.x + box.w / 2;
  const centerY = box.y + box.h / 2;
  const direction = clockwise ? 1 : -1;
  const radius = Math.min(box.w, box.h) * 0.32;
  const stars = [];

  for (let i = 0; i < 6; i++) {
    const offset = i * Math.PI / 3;
    const star = spawnBullet({
      x: centerX + Math.cos(offset) * radius,
      y: centerY + Math.sin(offset) * radius,
      r: 10,
      type: "star",
      harmless: true,
      noCull: true,
      life: holdDuration + 250,
      spin: direction * 0.14,
      launched: false,
      orbitOffset: offset,
      update: ({ bullet }) => {
        if (bullet.age < holdDuration) {
          const angle = bullet.orbitOffset + bullet.age * 0.045 * direction;
          bullet.x = centerX + Math.cos(angle) * radius;
          bullet.y = centerY + Math.sin(angle) * radius;
          return;
        }

        if (!bullet.launched) {
          const dx = state.soul.x - bullet.x;
          const dy = state.soul.y - bullet.y;
          const distance = Math.max(1, Math.hypot(dx, dy));

          bullet.vx = dx / distance * speed;
          bullet.vy = dy / distance * speed;
          bullet.harmless = false;
          bullet.launched = true;
        }

        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
      }
    });

    stars.push(star);
  }

  spawnBullet({
    x: 0,
    y: 0,
    r: 0,
    type: "constellationLine",
    points: stars,
    closed: true,
    harmless: true,
    noCull: true,
    life: holdDuration
  });
}

function spawnConstellationWarning({ box, spawnBullet, points, duration }) {
  for (const [px, py] of points) {
    spawnBullet({
      x: box.x + box.w * px,
      y: box.y + box.h * py,
      r: 15,
      type: "constellationWarning",
      harmless: true,
      noCull: true,
      life: duration
    });
  }
}

function spawnLaneBlastVolley({ box, spawnBullet, lanes, swapSides }) {
  const warningDuration = 27;

  lanes.forEach((laneY, index) => {
    const warnFromLeft = (index === 0) !== swapSides;

    spawnBullet({
      x: warnFromLeft ? box.x + 12 : box.x + box.w - 12,
      y: laneY,
      r: 13,
      type: "laneBlastWarning",
      harmless: true,
      noCull: true,
      life: warningDuration
    });

    spawnBullet({
      x: box.x + box.w / 2,
      y: laneY - 10,
      width: box.w,
      height: 20,
      type: "laneBlast",
      harmless: true,
      noCull: true,
      delay: warningDuration,
      life: warningDuration + 30,
      update: ({ bullet }) => {
        bullet.harmless = bullet.age < bullet.delay;
      }
    });
  });
}

function spawnMovingPlatform({ spawnBullet, x, y, speed, life, width = 112 }) {
  return spawnBullet({
    x,
    y,
    vx: -speed,
    r: 0,
    width,
    height: 12,
    type: "platform",
    harmless: true,
    solidPlatform: true,
    life
  });
}

function spawnMeteorSource({ box, spawnBullet, x, life }) {
  spawnBullet({
    x,
    y: box.y - 112,
    r: 18,
    type: "meteorSource",
    harmless: true,
    noCull: true,
    life
  });
}

function spawnMeteorStar({ spawnBullet, x, y, angle, speed }) {
  spawnBullet({
    x,
    y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    r: 7,
    type: "star",
    noCull: true,
    life: 420,
    spin: Math.cos(angle) < 0 ? -0.12 : 0.12
  });
}

function spawnStarGate({ box, spawnBullet, fromLeft, gapCenter, gapHeight, speed }) {
  const x = fromLeft ? box.x - 44 : box.x + box.w + 44;
  const vx = fromLeft ? speed : -speed;

  for (let y = box.y + 12; y <= box.y + box.h - 12; y += 20) {
    if (Math.abs(y - gapCenter) <= gapHeight / 2) continue;

    spawnBullet({
      x,
      y,
      vx,
      r: 9,
      type: "star",
      life: 160,
      noCull: true,
      spin: fromLeft ? 0.14 : -0.14
    });
  }
}

function spawnStarHurdle({ box, spawnBullet, fromLeft, height, speed }) {
  const floorY = box.y + box.h - 15;
  const startX = fromLeft ? box.x - 42 : box.x + box.w + 42;
  const vx = fromLeft ? speed : -speed;

  for (let column = 0; column < 2; column++) {
    for (let row = 0; row < height; row++) {
      spawnBullet({
        x: startX + (fromLeft ? -column * 20 : column * 20),
        y: floorY - row * 20,
        vx,
        r: 9,
        type: "star",
        life: 150,
        noCull: true,
        spin: fromLeft ? 0.14 : -0.14
      });
    }
  }
}

function spawnFallingStar({ box, spawnBullet, x, speed, size, drift, startY = box.y - 72 }) {
  spawnBullet({
    x,
    y: startY,
    vx: drift,
    vy: speed,
    r: size,
    type: "star",
    noCull: true,
    life: 128,
    spin: drift < 0 ? -0.19 : 0.19
  });
}

function getLaneYs(box, purpleLineYs) {
  if (Array.isArray(purpleLineYs) && purpleLineYs.length > 0) {
    return purpleLineYs;
  }

  return [
    box.y + box.h * 0.18,
    box.y + box.h * 0.5,
    box.y + box.h * 0.82
  ];
}

function nearestLane(y, lanes) {
  let closestLane = 0;
  let closestDistance = Infinity;

  for (let i = 0; i < lanes.length; i++) {
    const distance = Math.abs(y - lanes[i]);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestLane = i;
    }
  }

  return closestLane;
}
