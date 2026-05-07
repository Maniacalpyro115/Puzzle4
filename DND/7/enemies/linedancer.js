window.ENEMY_DATA = {
  name: "LINEDANCER",

  sprite: "sprites/linedancer.png",

  maxHP: 320,

  introMessage: "* A boot-scootin' LINEDANCER steps into your path.",

  winMessage: "* The LINEDANCER tips his hat and two-steps away.",

  actMessage: "* You try to follow the steps. The LINEDANCER judges your rhythm.",

  mercyLowHpThreshold: 25,
  mercyLowHpMessage: "* The LINEDANCER refuses to leave before the song ends.",
  mercyHighHpMessage: "* 'You ain't gonna flake. That's MY job!'",

  enemyAttackMessage: "* Keep step or get stomped.",
  enemyWarmupMessage: "* The music picks up...",

  items: [
    {
      name: "Mom Water",
      heal: -10,
      quantity: 1
    },
    {
      name: "Bapple",
      heal: 16,
      quantity: 3
    },
    {
      name: "Old Fashioned",
      heal: 30,
      quantity: 1
    }
  ],

  battleDialog: [
    "* LINEDANCER taps one boot. Then the other.",
    "* LINEDANCER looks up the answer on Claude. He feels safe now.",
    "* LINEDANCER's boots squeak with dangerous confidence.",
    "* LINEDANCER spins under an invisible disco ball.",
    "* LINEDANCER claps twice. Somehow, the room claps back.",
    "* LINEDANCER says, \"This ain't my first rodeo.\"",
    "* LINEDANCER is counting beats under his breath.",
    "* LINEDANCER refuses to miss the chorus."
  ],

attackPatterns: [
    // 0: Heel-Toe Stomp
    // Warning stars appear first, then boots stomp straight down in marked columns.
    function heelToeStomp({ t, box, spawnBullet }) {
    const columns = 7;
    const colW = box.w / columns;
    const cycleLength = 110;
    const stompDelay = 34;

    const beat = Math.floor(t / cycleLength);
    const safeCol = beat % columns;

    if (t % cycleLength === 0) {
        for (let col = 0; col < columns; col++) {
        if (col === safeCol) continue;

        const x = box.x + colW * col + colW / 2;

        spawnBullet({
            x,
            y: box.y + 18,
            r: 6,
            type: "star",
            harmless: true,
            life: stompDelay,
            spin: 0.2
        });
        }
    }

    if (t % cycleLength === stompDelay) {
        for (let col = 0; col < columns; col++) {
        if (col === safeCol) continue;

        const x = box.x + colW * col + colW / 2;

        spawnBullet({
            x,
            y: box.y - 35,
            r: 13,
            type: "boot",
            life: 90,
            spin: 0.02,
            update: ({ bullet }) => {
            if (bullet.age < 8) return;
            bullet.y += 5;
            }
        });
        }
    }
    },

    // 1: Grapevine
    // Boots cross horizontally, but weave up/down like dance steps.
    function grapevine({ t, box, spawnBullet }) {
        if (t % 26 === 0) {
        const laneCount = 4;
        const lane = Math.floor((t / 26) % laneCount);
        const fromLeft = Math.floor(t / 52) % 2 === 0;

        const baseY = box.y + 32 + lane * ((box.h - 64) / (laneCount - 1));

        spawnBullet({
            x: fromLeft ? box.x - 24 : box.x + box.w + 24,
            y: baseY,
            baseY,
            vx: fromLeft ? 2.7 : -2.7,
            r: 10,
            type: "boot",
            life: 180,
            spin: fromLeft ? 0.06 : -0.06,
            update: ({ bullet }) => {
            bullet.x += bullet.vx;
            bullet.y = bullet.baseY + Math.sin(bullet.age / 6) * 18;
            }
        });
        }

        if (t % 104 === 52) {
        for (let i = 0; i < 5; i++) {
            spawnBullet({
            x: box.x + 25 + i * 70,
            y: box.y - 18,
            vy: 2.4,
            r: 6,
            type: "note",
            life: 120,
            spin: 0.1
            });
        }
        }
    },

    // 2: Lasso Loop
    // Horseshoes spiral outward from the center instead of flying straight.
    function lassoLoop({ t, box, spawnBullet }) {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;

        if (t % 40 === 0) {
        const startAngle = (t / 20) * 0.9;

        for (let i = 0; i < 2; i++) {
            spawnBullet({
            centerX: cx,
            centerY: cy,
            radius: 8,
            theta: startAngle + i * Math.PI,
            x: cx,
            y: cy,
            r: 9,
            type: "horseshoe",
            life: 250,
            spin: 0.8,
            update: ({ bullet }) => {
                bullet.radius += 1;
                bullet.theta += 0.01;

                bullet.x = bullet.centerX + Math.cos(bullet.theta) * bullet.radius;
                bullet.y = bullet.centerY + Math.sin(bullet.theta) * bullet.radius;
            }
            });
        }
        }
    },

    // 3: Honky-Tonk Ricochet
    // Notes bounce around inside the box like loud music.
    function honkyTonkRicochet({ t, box, spawnBullet }) {
        if (t % 36 === 0) {
        const fromTop = Math.floor(t / 36) % 2 === 0;

        spawnBullet({
            x: box.x + 35 + Math.random() * (box.w - 70),
            y: fromTop ? box.y + 18 : box.y + box.h - 18,
            vx: Math.random() > 0.5 ? 2.3 : -2.3,
            vy: fromTop ? 2.4 : -2.4,
            r: 7,
            type: "note",
            life: 230,
            spin: 0.12,
            update: ({ bullet, box }) => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            if (bullet.x < box.x + bullet.r || bullet.x > box.x + box.w - bullet.r) {
                bullet.vx *= -1;
            }

            if (bullet.y < box.y + bullet.r || bullet.y > box.y + box.h - bullet.r) {
                bullet.vy *= -1;
            }
            }
        });
        }

        if (t % 120 === 60) {
        const y = box.y + 35 + Math.random() * (box.h - 70);

        spawnBullet({
            x: box.x - 20,
            y,
            vx: 3.5,
            r: 11,
            type: "boot",
            life: 130,
            spin: 0.05
        });

        spawnBullet({
            x: box.x + box.w + 20,
            y: box.y + box.h - (y - box.y),
            vx: -3.5,
            r: 11,
            type: "boot",
            life: 130,
            spin: -0.05
        });
        }
    },

    // 4: Kickline Finale
    // Boots march in a wave, then stars burst between the gaps.
    function kicklineFinale({ t, box, spawnBullet }) {
        if (t % 32 === 0) {
        const rowCount = 6;
        const row = Math.floor(t / 32) % rowCount;
        const fromLeft = Math.floor(t / 108) % 2 === 0;

        const y = box.y + 22 + row * ((box.h - 44) / (rowCount - 1));

        spawnBullet({
            x: fromLeft ? box.x - 22 : box.x + box.w + 22,
            y,
            baseY: y,
            vx: fromLeft ? 2 : -2,
            r: 10,
            type: "boot",
            life: 150,
            spin: fromLeft ? 0.08 : -0.08,
            update: ({ bullet }) => {
            bullet.x += bullet.vx;
            bullet.y = bullet.baseY + Math.sin(bullet.age / 4) * 10;
            }
        });
        }

        if (t % 150 === 45) {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;

        for (let i = 0; i < 8; i++) {
            const a = (Math.PI * 2 * i) / 8;

            spawnBullet({
            x: cx,
            y: cy,
            vx: Math.cos(a) * 1.2,
            vy: Math.sin(a) * 1.2,
            r: 7,
            type: "star",
            life: 105,
            spin: 0.16
            });
        }
        }

        if (t % 200 === 100) {
        for (let i = 0; i < 4; i++) {
            spawnBullet({
            x: box.x + 45 + i * 80,
            y: box.y + box.h + 20,
            vy: -1,
            r: 9,
            type: "horseshoe",
            life: 120,
            spin: -0.1
            });
        }
        }
    },
    // 5: Horseshoe U-Turn
    // Horseshoes enter from any side, travel deep across the box,
    // decelerate into a U-turn, then accelerate back out.
    function horseshoeUTurn({ t, box, spawnBullet }) {
    if (t % 34 !== 0) return;

    const side = Math.floor(Math.random() * 4);
    const margin = 34;

    let startX;
    let startY;
    let endX;
    let endY;
    let controlX;
    let controlY;

    if (side === 0) {
        // From left, U-turn near the right side, back out left
        startX = box.x - margin;
        startY = box.y + 25 + Math.random() * (box.h - 50);

        endX = box.x - margin;
        endY = box.y + 25 + Math.random() * (box.h - 50);

        controlX = box.x + box.w * (1 + Math.random() * 0.08);
        controlY = box.y + 25 + Math.random() * (box.h - 50);
    } else if (side === 1) {
        // From right, U-turn near the left side, back out right
        startX = box.x + box.w + margin;
        startY = box.y + 25 + Math.random() * (box.h - 50);

        endX = box.x + box.w + margin;
        endY = box.y + 25 + Math.random() * (box.h - 50);

        controlX = box.x + box.w * (0.02 + Math.random() * 0.08);
        controlY = box.y + 25 + Math.random() * (box.h - 50);
    } else if (side === 2) {
        // From top, U-turn near the bottom, back out top
        startX = box.x + 25 + Math.random() * (box.w - 50);
        startY = box.y - margin;

        endX = box.x + 25 + Math.random() * (box.w - 50);
        endY = box.y - margin;

        controlX = box.x + 25 + Math.random() * (box.w - 50);
        controlY = box.y + box.h * (1 + Math.random() * 0.08);
    } else {
        // From bottom, U-turn near the top, back out bottom
        startX = box.x + 25 + Math.random() * (box.w - 50);
        startY = box.y + box.h + margin;

        endX = box.x + 25 + Math.random() * (box.w - 50);
        endY = box.y + box.h + margin;

        controlX = box.x + 25 + Math.random() * (box.w - 50);
        controlY = box.y + box.h * (0.02 + Math.random() * 0.08);
    }

    spawnBullet({
        x: startX,
        y: startY,
        startX,
        startY,
        endX,
        endY,
        controlX,
        controlY,
        progress: 0,
        speed: 0.01,
        r: 11,
        type: "horseshoe",
        life: 260,
        spin: Math.random() > 0.5 ? 0.1 : -0.1,

        update: ({ bullet }) => {
        const p = Math.min(1, bullet.progress);
        const oneMinusP = 1 - p;

        // Quadratic bezier U-turn path
        bullet.x =
            oneMinusP * oneMinusP * bullet.startX +
            2 * oneMinusP * p * bullet.controlX +
            p * p * bullet.endX;

        bullet.y =
            oneMinusP * oneMinusP * bullet.startY +
            2 * oneMinusP * p * bullet.controlY +
            p * p * bullet.endY;

        // Slow near the turn, then accelerate out
        if (p < 0.5) {
            bullet.speed = Math.max(0.0065, bullet.speed - 0.00035);
        } else {
            bullet.speed += 0.00075;
        }

        bullet.progress += bullet.speed;

        if (bullet.progress >= 1) {
            bullet.life = 0;
        }
        }
    });
    },
    // 6: Heel-Toe Stomp 2
    // Warning stars appear first, then boots stomp straight down in marked columns.
    function heelToeStomp({ t, box, spawnBullet }) {
    const columns = 7;
    const colW = box.w / columns;
    const cycleLength = 80;
    const stompDelay = 34;

    const beat = Math.floor(t / cycleLength);
    const safeCol = beat % columns;

    if (t % cycleLength === 0) {
        for (let col = 0; col < columns; col++) {
        if (col === safeCol) continue;

        const x = box.x + colW * col + colW / 2;

        spawnBullet({
            x,
            y: box.y + 18,
            r: 6,
            type: "star",
            harmless: true,
            life: stompDelay,
            spin: 0.2
        });
        }
    }

    if (t % cycleLength === stompDelay) {
        for (let col = 0; col < columns; col++) {
        if (col === safeCol) continue;

        const x = box.x + colW * col + colW / 2;

        spawnBullet({
            x,
            y: box.y - 35,
            r: 13,
            type: "boot",
            life: 90,
            spin: 0.02,
            update: ({ bullet }) => {
            if (bullet.age < 8) return;
            bullet.y += 6;
            }
        });
        }
    }
    },
    // 7: Lasso Loop 2
    // Horseshoes spiral outward from the center instead of flying straight.
    function lassoLoop({ t, box, spawnBullet }) {
        const cx = box.x + box.w / 2;
        const cy = box.y + box.h / 2;

        if (t % 30 === 0) {
        const startAngle = (t / 20) * 0.9;

        for (let i = 0; i < 2; i++) {
            spawnBullet({
            centerX: cx,
            centerY: cy,
            radius: 8,
            theta: startAngle + i * Math.PI,
            x: cx,
            y: cy,
            r: 9,
            type: "horseshoe",
            life: 250,
            spin: 0.8,
            update: ({ bullet }) => {
                bullet.radius += 1;
                bullet.theta += 0.02;

                bullet.x = bullet.centerX + Math.cos(bullet.theta) * bullet.radius;
                bullet.y = bullet.centerY + Math.sin(bullet.theta) * bullet.radius;
            }
            });
        }
        }
    },
]
};