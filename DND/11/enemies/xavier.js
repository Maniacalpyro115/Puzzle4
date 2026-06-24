window.ENEMY_DATA = {
  name: "XAVIER (FLAKER)",
  sprite: "sprites/xavier.png",

    music: {
    src: "sounds/tuba_battle.wav",
    loopStart: 14.047,
    loopEnd: 176.291
  },
  maxHP: 200,
  purpleLineCount: 5,

  introMessage: "* XAVIER (FLAKER) appears, already checking the time.",

  winMessage: "Cheater",

  actMessage: "* XAVIVER (FLAKER) stays a bit longer.",

  leaveOnNonAct: true,
  leaveMessage: "* Xavier says, \"Welp I gotta go.\"",

  acts: [
    {
      name: "Convince to play D&D",
      dialog: "* XAVIVER (FLAKER) stays a bit longer."
    },
    {
      name: "Convince to play D&D",
      dialog: "* XAVIVER (FLAKER) stays a bit longer."
    },
    {
      name: "Convince to play D&D",
      dialog: "* XAVIVER (FLAKER) stays a bit longer."
    },
    {
      name: "Convince to play D&D",
      dialog: "* XAVIVER (FLAKER) stays a bit longer."
    }
  ],

  mercyFailure: "* You attempt to spare XAVIER (FLAKER). He walks away.",
  mercySuccess: "* You spare XAVIER (FLAKER).",
  mercyWinMessage: "OBISCWTNPDNDWMFT",

  enemyDialog: [],

  battleDialog: [
    "* XAVIER (FLAKER) looks ready to flake on D&D.",
    "* XAVIER (FLAKER) has one foot out the door.",
    "* XAVIER (FLAKER) has other plans on the agreed upon D&D night.",
    "* XAVIER (FLAKER) attempts to flake."
  ],

  items: [
    {
      name: "NUTRL",
      heal: 20
    },
    {
      name: "PB Whiskey",
      heal: 25
    }
  ],

  turns: [
    {
      loop: false,
      attack: {
        type: "purple",
        duration: 720,
        pattern: function syncopatedStaffRush({ t, box, purpleLineYs, spawnBullet }) {
          const lanes = getStaffLanes(box, purpleLineYs);

          if (t % 28 === 0) {
            const safeLane = Math.floor(t / 84) % lanes.length;
            const fromLeft = Math.floor(t / 56) % 2 === 0;

            lanes.forEach((y, lane) => {
              if (lane === safeLane) return;

              spawnBullet({
                x: fromLeft ? box.x - 24 - lane * 5 : box.x + box.w + 24 + lane * 5,
                y,
                vx: fromLeft ? 3.6 + lane * 0.08 : -3.6 - lane * 0.08,
                r: lane === safeLane + 1 ? 9 : 7,
                type: "note",
                color: lane % 2 === 0 ? "#ffffff" : "#d9c2ff",
                spin: fromLeft ? 0.13 : -0.13,
                life: 165
              });
            });
          }

          if (t % 84 === 54) {
            const lane = (Math.floor(t / 84) * 2 + 1) % lanes.length;

            spawnBullet({
              x: box.x + box.w + 28,
              y: lanes[lane],
              vx: -5.1,
              r: 11,
              type: "note",
              color: "#ffeb8a",
              spin: -0.24,
              life: 115
            });
          }
        }
      }
    },

    {
      loop: false,
      attack: {
        type: "purple",
        duration: 760,
        pattern: function arpeggioZipper({ t, box, purpleLineYs, spawnBullet }) {
          const lanes = getStaffLanes(box, purpleLineYs);

          if (t % 18 === 0) {
            const step = Math.floor(t / 18);
            const lane = step % 8 < 4 ? step % 5 : 4 - (step % 5);
            const fromLeft = Math.floor(step / 10) % 2 === 0;
            const targetLane = clampLane(lane, lanes);

            spawnBullet({
              x: fromLeft ? box.x - 20 : box.x + box.w + 20,
              y: lanes[targetLane],
              vx: fromLeft ? 3.25 : -3.25,
              r: 7,
              type: "note",
              color: "#ffffff",
              spin: fromLeft ? 0.16 : -0.16,
              life: 175
            });
          }
        }
      }
    },

    {
      loop: true,
      attack: {
        type: "purple",
        duration: 900,
        pattern: function inescapableNoteWall({ t, box, purpleLineYs, spawnBullet }) {
          const lanes = getStaffLanes(box, purpleLineYs);

          if (t % 26 !== 0) return;

          const fromLeft = Math.floor(t / 52) % 2 === 0;
          const pulse = Math.floor(t / 26);

          lanes.forEach((y, lane) => {
            spawnBullet({
              x: fromLeft ? box.x - 34 - lane * 7 : box.x + box.w + 34 + lane * 7,
              y,
              vx: fromLeft ? 1.65 : -1.65,
              r: 14,
              type: "note",
              color: pulse % 2 === 0 ? "#ffffff" : "#d8c4ff",
              spin: fromLeft ? 0.055 : -0.055,
              life: 360
            });
          });

          if (pulse % 3 === 1) {
            lanes.forEach((y, lane) => {
              spawnBullet({
                x: fromLeft ? box.x + box.w + 50 + lane * 4 : box.x - 50 - lane * 4,
                y,
                vx: fromLeft ? -1.35 : 1.35,
                r: 11,
                type: "note",
                color: "#ffeb8a",
                spin: fromLeft ? -0.045 : 0.045,
                life: 380
              });
            });
          }
        }
      }
    }
  ]
};

function getStaffLanes(box, purpleLineYs) {
  if (Array.isArray(purpleLineYs) && purpleLineYs.length > 0) {
    return purpleLineYs;
  }

  return Array.from({ length: 5 }, (_, index) => box.y + box.h * (0.16 + index * 0.17));
}

function clampLane(lane, lanes) {
  return Math.max(0, Math.min(lanes.length - 1, lane));
}
