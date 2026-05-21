window.ENEMY_DATA = {
  name: "BUCKY'S PANTHER",

  sprite: "sprites/panther1.png",
  music: "sounds/Panther_Party.wav",
  maxHP: 75,

  introMessage: "* BUCKY'S PANTHER emerges from the trees.",
  winMessage: "* The BUCKY'S PANTHER melts back into the treeline.",
  actMessage: "* You stand perfectly still. The BUCKY'S PANTHER circles slower.",

  mercyLowHpThreshold: 25,
  mercyLowHpMessage: "* The BUCKY'S PANTHER bares its teeth. Not yet.",
  mercyHighHpMessage: "* It watches your mercy like prey watches thunder.",

  enemyAttackMessage: "* Claws cut through the dark.",
  enemyWarmupMessage: "* The brush goes silent...",

  items: [
    {
      name: "CURE WOUNDS SELF",
      heal: 24,
      quantity: 1
    },
    {
      name: "Nova's Coffee",
      heal: 15,
      quantity: 2
    }
  ],

  battleDialog: [
    "* BUCKY'S PANTHER's attacks. He's been here all along.",
    "* BUCKY'S PANTHER, friend of all, attacks.",
    "* BUCKY'S PANTHER analyzes the stock market. Its a bull day",
    "* BUCKY'S PANTHER crouches so low it becomes a shadow.",
    "* BUCKY'S PANTHER listens to your heartbeat."
  ],

  attackPatterns: [
    // Warning shadows mark pounces, then claws tear across those lanes.
    function stalkingPounce({ t, box, spawnBullet }) {
      const laneCount = 5;
      const laneHeight = box.h / laneCount;

      if (t % 72 === 0) {
        const safeLane = Math.floor(Math.random() * laneCount);

        for (let lane = 0; lane < laneCount; lane++) {
          if (lane === safeLane) continue;

          const y = box.y + laneHeight * lane + laneHeight / 2;

          spawnBullet({
            x: box.x + box.w / 2,
            y,
            r: 12,
            type: "shadow",
            harmless: true,
            life: 34,
            spin: 0.03
          });

          spawnBullet({
            x: box.x - 38,
            y,
            vx: 4.4,
            r: 13,
            type: "claw",
            life: 110,
            spin: 0.05,
            delay: 34,
            update: ({ bullet }) => {
              if (bullet.age < bullet.delay) return;
              bullet.x += bullet.vx;
            }
          });
        }
      }

      if (t % 48 === 24) {
        const fromTop = Math.floor(t / 48) % 2 === 0;

        spawnBullet({
          x: box.x + 28 + Math.random() * (box.w - 56),
          y: fromTop ? box.y - 24 : box.y + box.h + 24,
          vy: fromTop ? 2.8 : -2.8,
          vx: Math.random() * 1.4 - 0.7,
          r: 7,
          type: "diamond",
          life: 130,
          spin: 0.14
        });
      }
    },

    // Eye glints orbit outward while claw swipes cross from both sides.
    function yellowEyes({ t, box, spawnBullet }) {
      const cx = box.x + box.w / 2;
      const cy = box.y + box.h / 2;

      if (t % 30 === 0) {
        const start = t * 0.09;

        for (let i = 0; i < 2; i++) {
          spawnBullet({
            centerX: cx,
            centerY: cy,
            radius: 10,
            theta: start + i * Math.PI,
            x: cx,
            y: cy,
            r: 7,
            type: "eye",
            life: 190,
            spin: 0.18,
            update: ({ bullet }) => {
              bullet.radius += 1.05;
              bullet.theta += 0.025;
              bullet.x = bullet.centerX + Math.cos(bullet.theta) * bullet.radius;
              bullet.y = bullet.centerY + Math.sin(bullet.theta) * bullet.radius;
            }
          });
        }
      }

      if (t % 54 === 18) {
        const y = box.y + 28 + Math.random() * (box.h - 56);

        spawnBullet({
          x: box.x - 28,
          y,
          vx: 3.5,
          r: 12,
          type: "claw",
          life: 120,
          spin: 0.05
        });

        spawnBullet({
          x: box.x + box.w + 28,
          y: box.y + box.h - (y - box.y),
          vx: -3.5,
          r: 12,
          type: "claw",
          life: 120,
          spin: -0.05
        });
      }
    },

    // The panther sprints around the edge, sending angled slashes inward.
    function canopyRush({ t, box, spawnBullet }) {
      if (t % 22 !== 0) return;

      const side = Math.floor(t / 22) % 4;
      const targetX = box.x + box.w / 2;
      const targetY = box.y + box.h / 2;
      let x;
      let y;

      if (side === 0) {
        x = box.x + Math.random() * box.w;
        y = box.y - 24;
      } else if (side === 1) {
        x = box.x + box.w + 24;
        y = box.y + Math.random() * box.h;
      } else if (side === 2) {
        x = box.x + Math.random() * box.w;
        y = box.y + box.h + 24;
      } else {
        x = box.x - 24;
        y = box.y + Math.random() * box.h;
      }

      const angle = Math.atan2(targetY - y, targetX - x);

      spawnBullet({
        x,
        y,
        vx: Math.cos(angle) * 2.8,
        vy: Math.sin(angle) * 2.8,
        r: 9,
        type: "claw",
        life: 150,
        angle,
        spin: 0
      });
    }
  ],

  phase2: {
    name: "BUCKY'S PANTHER - PRIMAL COMPANION",
    sprite: "sprites/panther2.png",
    music: "sounds/Panther_Party_2.wav",
    maxHP: 325,

    fadeOutDuration: 95,
    holdDuration: 180,
    fadeInDuration: 120,
    hpFillSpeed: 1.45,
    refillMessageMinDuration: 210,

    transitionMessage: "* BUCKY'S PANTHER collapses into a pool of shadow.",
    refillMessage: "* BUCKY believes his panther back to life.",
    startMessage: "* PRIMAL COMPANION glows blue.",
    winMessage: "* OBISCWTPDNDWMFT",

    actMessage: "* The panther appears fake, but you keep this to yourself",
    mercyLowHpThreshold: 25,
    mercyLowHpMessage: "* Yes, the panther is '''''real'''''",
    mercyHighHpMessage: "* Yes, the panther is '''''real'''''",
    enemyAttackMessage: "* The dark starts hunting.",
    enemyWarmupMessage: "* The moon disappears...",

    battleDialog: [
      "* PRIMAL COMPANION attacks with its totally real claws",
      "* PRIMAL COMPANION (real btw) attacks",
      "* PRIMAL COMPANION, which does exist, charges.",
      "* PRIMAL COMPANION lunges with its non-fictional legs.",
      "* PRIMAL COMPANION 'attacks'.",
    ],

    attackPatterns: [
      // Shadow columns blink in, then claw walls rake down with moving gaps.
      function eclipseRake({ t, box, spawnBullet }) {
        const columns = 7;
        const colW = box.w / columns;

        if (t % 64 === 0) {
          const safeCol = Math.floor(Math.random() * columns);
          eclipseRake.safeCol = safeCol;

          for (let col = 0; col < columns; col++) {
            if (col === safeCol) continue;

            spawnBullet({
              x: box.x + col * colW + colW / 2,
              y: box.y + box.h / 2,
              r: 10,
              type: "shadow",
              harmless: true,
              life: 28,
              spin: 0.04
            });
          }
        }

        if (t % 64 === 28) {
          const safeCol = Number.isInteger(eclipseRake.safeCol)
            ? eclipseRake.safeCol
            : Math.floor(Math.random() * columns);

          for (let col = 0; col < columns; col++) {
            if (col === safeCol) continue;

            spawnBullet({
              x: box.x + col * colW + colW / 2,
              y: box.y - 26,
              vy: 5.1,
              r: 12,
              type: "claw",
              life: 90,
              angle: Math.PI / 2
            });
          }
        }

        if (t % 38 === 18) {
          spawnBullet({
            x: box.x - 28,
            y: box.y + 24 + Math.random() * (box.h - 48),
            vx: 4.1,
            r: 8,
            type: "eye",
            life: 120,
            spin: 0.12
          });
        }
      },

      // Eyes spiral outward, then shadows chase the player's half of the box.
      function eclipseHunt({ t, box, spawnBullet, state }) {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;

        if (t % 18 === 0) {
          const a = t * 0.12;
          const radius = 12 + (t % 84);

          spawnBullet({
            x: cx + Math.cos(a) * radius,
            y: cy + Math.sin(a) * radius,
            vx: Math.cos(a + Math.PI / 2) * 1.35,
            vy: Math.sin(a + Math.PI / 2) * 1.35,
            r: 6,
            type: "eye",
            life: 120,
            spin: 0.16
          });

          spawnBullet({
            x: cx + Math.cos(a + Math.PI) * radius,
            y: cy + Math.sin(a + Math.PI) * radius,
            vx: Math.cos(a - Math.PI / 2) * 1.35,
            vy: Math.sin(a - Math.PI / 2) * 1.35,
            r: 6,
            type: "eye",
            life: 120,
            spin: -0.16
          });
        }

        if (t % 96 === 44) {
          const laneCount = 6;
          const laneHeight = box.h / laneCount;
          const fromLeft = state.soul.x > box.x + box.w / 2;
          const playerLane = Math.floor((state.soul.y - box.y) / laneHeight);
          const safeLane = Math.max(0, Math.min(laneCount - 1, playerLane));

          spawnBullet({
            x: box.x + box.w / 2,
            y: box.y + safeLane * laneHeight + laneHeight / 2,
            r: 8,
            type: "shadow",
            harmless: true,
            life: 40,
            spin: 0.04
          });

          for (let lane = 0; lane < laneCount; lane++) {
            if (lane === safeLane || lane === safeLane - 1) continue;

            spawnBullet({
              x: fromLeft ? box.x - 24 : box.x + box.w + 24,
              y: box.y + lane * laneHeight + laneHeight / 2,
              vx: fromLeft ? 2.35 : -2.35,
              r: 8,
              type: "shadow",
              life: 170,
              spin: 0.035
            });
          }
        }
      },

      // Faster version of the rake walls, with no extra random bullets.
      function rapidEclipseRake({ t, box, spawnBullet }) {
        const columns = 8;
        const colW = box.w / columns;
        const safeCol = Math.floor(t / 34) % columns;
        const secondSafeCol = (safeCol + 1) % columns;

        if (t % 34 === 0) {
          for (let col = 0; col < columns; col++) {
            if (col === safeCol || col === secondSafeCol) continue;

            spawnBullet({
              x: box.x + col * colW + colW / 2,
              y: box.y + box.h / 2,
              r: 8,
              type: "shadow",
              harmless: true,
              life: 14,
              spin: 0.04
            });
          }
        }

        if (t % 34 === 14) {
          for (let col = 0; col < columns; col++) {
            if (col === safeCol || col === secondSafeCol) continue;

            spawnBullet({
              x: box.x + col * colW + colW / 2,
              y: box.y - 26,
              vy: 6.7,
              r: 11,
              type: "claw",
              life: 72,
              angle: Math.PI / 2
            });
          }
        }
      },

      // Final pattern: crossing claw diagonals and delayed pounce marks.
      function blackMoonPounce({ t, box, spawnBullet }) {
        if (t % 44 === 0) {
          const fromLeft = Math.floor(t / 44) % 2 === 0;

          for (let i = 0; i < 4; i++) {
            const y = box.y + 26 + i * ((box.h - 52) / 3);
            const angle = fromLeft ? 0.45 : Math.PI - 0.45;

            spawnBullet({
              x: fromLeft ? box.x - 30 : box.x + box.w + 30,
              y,
              vx: fromLeft ? 3.2 : -3.2,
              vy: i % 2 === 0 ? 1.25 : -1.25,
              r: 10,
              type: "claw",
              life: 135,
              angle
            });
          }
        }

        if (t % 110 === 60) {
          const x = box.x + 35 + Math.random() * (box.w - 70);
          const y = box.y + 35 + Math.random() * (box.h - 70);

          spawnBullet({
            x,
            y,
            r: 15,
            type: "shadow",
            harmless: true,
            life: 32,
            spin: 0.08
          });

          spawnBullet({
            x,
            y: box.y - 36,
            vy: 5.5,
            r: 15,
            type: "claw",
            life: 95,
            delay: 32,
            angle: Math.PI / 2,
            update: ({ bullet }) => {
              if (bullet.age < bullet.delay) return;
              bullet.y += bullet.vy;
            }
          });
        }
      },

      // Claws drop in a sine-wave curtain with a moving valley-shaped gap.
      function sineClawCurtain({ t, box, spawnBullet }) {
        const columns = 11;
        const colW = box.w / columns;
        const valleyX = box.x + box.w / 2 + Math.sin(t / 62) * (box.w * 0.34);

        if (t % 40 === 0) {
          spawnBullet({
            x: valleyX,
            y: box.y + 14,
            r: 9,
            type: "shadow",
            harmless: true,
            life: 34,
            spin: 0.03
          });
        }

        if (t % 20 !== 0) return;

        for (let col = 0; col < columns; col++) {
          const startX = box.x + col * colW + colW / 2;
          const distanceFromValley = Math.abs(startX - valleyX);

          if (distanceFromValley < colW * 1.15) continue;

          spawnBullet({
            x: startX,
            y: box.y - 28,
            startX,
            phase: col * 0.7 + t * 0.02,
            amplitude: 13,
            vy: 2.45,
            r: 9,
            type: "claw",
            life: 135,
            angle: Math.PI / 2,
            update: ({ bullet }) => {
              bullet.y += bullet.vy;
              bullet.x = bullet.startX + Math.sin(bullet.age / 12 + bullet.phase) * bullet.amplitude;
            }
          });
        }
      },

      // A top corner becomes a rotating burst point for radiating claws.
      function cornerClawStar({ t, box, spawnBullet }) {
        if (t % 50 === 0) {
          for (const originX of [box.x + 18, box.x + box.w - 18]) {
            spawnBullet({
              x: originX,
              y: box.y + 18,
              r: 14,
              type: "shadow",
              harmless: true,
              life: 42,
              spin: 0.1
            });
          }
        }

        if (t % 8 !== 0) return;

        for (const emitter of [
          { x: box.x + 18, baseAngle: 0.25, spinDir: 1 },
          { x: box.x + box.w - 18, baseAngle: Math.PI - 0.25, spinDir: -1 }
        ]) {
          const spin = t * 0.08 * emitter.spinDir;

          for (let i = -2; i <= 2; i++) {
            const angle = emitter.baseAngle + spin + i * 0.32;

            spawnBullet({
              x: emitter.x,
              y: box.y + 18,
              vx: Math.cos(angle) * 3.15,
              vy: Math.sin(angle) * 3.15,
              r: 9,
              type: "claw",
              life: 135,
              angle
            });
          }
        }
      },

      // Shadow pawprints march in staggered lanes, leaving alternating safe lanes.
      function silentPawprints({ t, box, spawnBullet }) {
        const lanes = 6;
        const laneHeight = box.h / lanes;
        const safeLane = Math.floor(t / 72) % lanes;

        if (t % 24 !== 0) return;

        const fromLeft = Math.floor(t / 72) % 2 === 0;

        for (let lane = 0; lane < lanes; lane++) {
          if (lane === safeLane || lane === (safeLane + 1) % lanes) continue;

          const offset = lane % 2 === 0 ? 0 : 18;

          spawnBullet({
            x: fromLeft ? box.x - 28 - offset : box.x + box.w + 28 + offset,
            y: box.y + lane * laneHeight + laneHeight / 2,
            vx: fromLeft ? 2.6 : -2.6,
            r: 9,
            type: "shadow",
            life: 155,
            spin: fromLeft ? 0.05 : -0.05
          });
        }
      },

      // Claw rings collapse inward with one or two random openings.
      function collapsingClawRing({ t, box, spawnBullet }) {
        if (t % 75 !== 0) return;

        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;
        const slots = 30;
        const missingSlot = Math.floor(Math.random() * slots);
        const startRadius = Math.min(box.w, box.h) * 1;
        const endRadius = 10;
        const collapseSpeed = 1.9;

        for (let slot = 0; slot < slots; slot++) {
          if (slot === missingSlot) continue;
          if (slot === (missingSlot + 1) % 30) continue;
          if (slot === (missingSlot + 2) % 30) continue;

          const theta = (Math.PI * 2 * slot) / slots;

          spawnBullet({
            centerX: cx,
            centerY: cy,
            theta,
            radius: startRadius,
            endRadius,
            collapseSpeed,
            x: cx + Math.cos(theta) * startRadius,
            y: cy + Math.sin(theta) * startRadius,
            r: 9,
            type: "claw",
            noCull: true,
            life: 120,
            angle: theta + Math.PI / 2,
            update: ({ bullet }) => {
              bullet.radius = Math.max(bullet.endRadius, bullet.radius - bullet.collapseSpeed);
              bullet.x = bullet.centerX + Math.cos(bullet.theta) * bullet.radius;
              bullet.y = bullet.centerY + Math.sin(bullet.theta) * bullet.radius;
              bullet.angle = bullet.theta + Math.PI / 2;

              if (bullet.radius <= bullet.endRadius + 0.5) {
                bullet.life = 0;
              }
            }
          });
        }
      },

      // Bullets trace one wall, then the other, each aimed at the player.
      function wallStalkerVolley({ t, box, spawnBullet, state }) {
        const rows = 22;
        const drawInterval = 1;
        const holdDuration = 5;
        const drawDuration = rows * drawInterval;
        const launchTime = drawDuration + holdDuration;
        const cycleDuration = launchTime + 5;
        const cycleTime = t % cycleDuration;
        const wallIndex = Math.floor(t / cycleDuration);
        const fromRight = wallIndex % 2 === 0;

        if (cycleTime === 0) {
          wallStalkerVolley.bullets = [];
        }

        if (cycleTime < drawDuration && cycleTime % drawInterval === 0) {
          const row = Math.floor(cycleTime / drawInterval);
          const x = fromRight ? box.x + box.w + 18 : box.x - 18;
          const y = box.y + row * (box.h / (rows - 1));
          const bullet = {
            x,
            y,
            vx: 0,
            vy: 0,
            r: 6,
            type: "dot",
            life: 220,
            armed: false,
            noCull: true,
            update: ({ bullet }) => {
              if (!bullet.armed) return;
              bullet.x += bullet.vx;
              bullet.y += bullet.vy;
            }
          };

          wallStalkerVolley.bullets.push(spawnBullet(bullet));
        }

        if (cycleTime === launchTime) {
          const targetX = state.soul.x;
          const targetY = state.soul.y;
          const speed = 6;

          for (const bullet of wallStalkerVolley.bullets || []) {
            const dx = targetX - bullet.x;
            const dy = targetY - bullet.y;
            const length = Math.hypot(dx, dy) || 1;

            bullet.vx = (dx / length) * speed;
            bullet.vy = (dy / length) * speed;
            bullet.armed = true;
            bullet.noCull = false;
          }
        }
      }
    ]
  }
};
