window.ENEMY_DATA = {
  name: "THREADKEEPER",

  sprite: "sprites/enemy.png",

  maxHP: 125,

  introMessage: "* THREADKEEPER lowers three violet threads across the box.",
  winMessage: "* THREADKEEPER ties one last knot and leaves.",
  actMessage: "* You inspect the threads. They hum when your soul gets close.",

  mercyLowHpThreshold: 25,
  mercyLowHpMessage: "* THREADKEEPER loosens the threads, but keeps fighting.",
  mercyHighHpMessage: "* THREADKEEPER is still weaving the pattern.",

  enemyDialog: [
    "* The threads pull tight...",
    "* Your soul is caught on the threads."
  ],

  items: [
    {
      name: "Thread Tea",
      heal: 18
    },
    {
      name: "Thread Tea",
      heal: 18
    },
    {
      name: "Pin Cushion",
      heal: 30
    }
  ],

  battleDialog: [
    "* THREADKEEPER counts stitches under her breath.",
    "* THREADKEEPER tugs the top thread.",
    "* THREADKEEPER watches your movement from behind the web.",
    "* THREADKEEPER knots a warning into the air.",
    "* THREADKEEPER smiles like the pattern is almost finished."
  ],

  attackPatterns: [
    {
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
      type: "purple",
      pattern: function fallingPins({ t, box, purpleLineYs, spawnBullet }) {
        const lanes = getLaneYs(box, purpleLineYs);

        if (t % 42 === 0) {
          const gapLane = Math.floor(t / 42) % lanes.length;

          for (let lane = 0; lane < lanes.length; lane++) {
            if (lane === gapLane) continue;

            spawnBullet({
              x: box.x + 30 + Math.random() * (box.w - 60),
              y: box.y - 18,
              targetY: lanes[lane],
              r: 7,
              type: "diamond",
              life: 150,
              spin: 0.18,
              update: ({ bullet }) => {
                bullet.y += 3.4;

                if (bullet.y > bullet.targetY) {
                  bullet.y = bullet.targetY;
                  bullet.x += Math.sin(bullet.age / 8) * 1.4;
                }
              }
            });
          }
        }

        if (t % 120 === 62) {
          const lane = Math.floor(Math.random() * lanes.length);

          spawnBullet({
            x: box.x + box.w + 22,
            y: lanes[lane],
            vx: -3.7,
            r: 12,
            type: "bone",
            life: 115,
            angle: Math.PI
          });
        }
      }
    },
    {
      type: "purple",
      pattern: function threadShuttle({ t, box, purpleLineYs, spawnBullet, state }) {
        const lanes = getLaneYs(box, purpleLineYs);

        if (t % 70 === 0) {
          const playerLane = nearestLane(state.soul.y, lanes);

          for (let lane = 0; lane < lanes.length; lane++) {
            if (lane === playerLane) continue;

            spawnBullet({
              x: box.x + box.w / 2,
              y: lanes[lane],
              r: 10,
              type: "shadow",
              harmless: true,
              life: 34,
              spin: 0.04
            });

            spawnBullet({
              x: lane % 2 === 0 ? box.x - 22 : box.x + box.w + 22,
              y: lanes[lane],
              vx: lane % 2 === 0 ? 3.9 : -3.9,
              r: 9,
              type: "claw",
              life: 130,
              delay: 34,
              update: ({ bullet }) => {
                if (bullet.age < bullet.delay) return;
                bullet.x += bullet.vx;
              }
            });
          }
        }

        if (t % 26 === 13) {
          const lane = Math.floor(t / 26) % lanes.length;

          spawnBullet({
            x: box.x + 24 + Math.random() * (box.w - 48),
            y: lanes[lane] - 34,
            vy: 2.2,
            r: 6,
            type: "star",
            life: 62,
            spin: 0.22
          });
        }
      }
    },
    {
      type: "normal",
      pattern: function looseThreads({ t, box, spawnBullet }) {
        if (t % 30 === 0) {
          const fromLeft = Math.floor(t / 60) % 2 === 0;

          spawnBullet({
            x: fromLeft ? box.x - 20 : box.x + box.w + 20,
            y: box.y + 24 + Math.random() * (box.h - 48),
            vx: fromLeft ? 2.7 : -2.7,
            vy: Math.sin(t / 18) * 1.2,
            r: 8,
            type: "note",
            life: 150,
            spin: fromLeft ? 0.12 : -0.12
          });
        }

        if (t % 100 === 35) {
          const cx = box.x + box.w / 2;
          const cy = box.y + box.h / 2;

          for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 * i) / 8;

            spawnBullet({
              x: cx,
              y: cy,
              vx: Math.cos(angle) * 1.8,
              vy: Math.sin(angle) * 1.8,
              r: 6,
              type: "diamond",
              life: 120,
              spin: 0.12
            });
          }
        }
      }
    }
  ]
};

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
