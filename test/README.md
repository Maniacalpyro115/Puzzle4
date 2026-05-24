# Soul Battle

A static browser combat mini-game inspired by classic bullet-dodge RPG battles.

## Run

Open `index.html` in a browser, or drop this folder into your GitHub Pages repo.

## Controls

- Arrow Keys / WASD: move the heart during enemy attacks
- Enter / Z: select, confirm, or strike during the attack meter
- Space / Click: also confirms or strikes
- Esc / X: cancel out of item selection

Purple attacks change movement: left/right still move normally, but up/down jumps the soul between the three ropes.

## Files

- `index.html`: chooses which enemy file loads
- `game.js`: shared battle engine
- `engine/`: reusable constants, input, assets, and utility helpers used by `game.js`
- `styles.css`: page styling
- `enemies/`: enemy definition files
- `sprites/`: enemy and projectile images
- `sounds/`: music and sound effects

## Make A New Character

Create a new file in `enemies/`, for example `enemies/myenemy.js`, and assign `window.ENEMY_DATA`:

```js
window.ENEMY_DATA = {
  name: "MY ENEMY",
  sprite: "sprites/enemy.png",
  music: "sounds/my_song.wav",
  maxHP: 100,

  introMessage: "* MY ENEMY blocks your path.",
  winMessage: "* You won.",
  actMessage: "* You checked MY ENEMY.",

  mercyLowHpThreshold: 25,
  mercyLowHpMessage: "* MY ENEMY is almost ready to leave.",
  mercyHighHpMessage: "* Try lowering its health more.",

  items: [
    { name: "Snack", heal: 12 }
  ],

  battleDialog: [
    "* MY ENEMY watches you carefully.",
    "* MY ENEMY is still here."
  ],

  enemyDialog: [
    "* Get ready...",
    "* Keep your soul intact."
  ],

  attackPatterns: [
    {
      type: "normal",
      pattern: function simpleAttack({ t, box, state, spawnBullet }) {
        if (t % 40 === 0) {
          spawnBullet({
            x: box.x - 12,
            y: box.y + 20 + Math.random() * (box.h - 40),
            vx: 3,
            r: 7,
            type: "dot",
            life: 140
          });
        }
      }
    }
  ]
};
```

Then update `index.html` to load your file before `game.js`:

```html
<script src="enemies/myenemy.js"></script>
<script src="engine/constants.js"></script>
<script src="engine/utils.js"></script>
<script src="engine/assets.js"></script>
<script src="engine/input.js"></script>
<script src="game.js"></script>
```

## Enemy Options

Top-level `ENEMY_DATA` fields:

- `name`: enemy name shown above the HP bar
- `sprite`: image path for the enemy sprite
- `music`: optional battle music path
- `maxHP`: enemy HP for phase 1
- `introMessage`: message shown before the fight starts
- `winMessage`: message shown after winning
- `actMessage`: message shown after choosing ACT
- `mercyLowHpThreshold`: HP value where MERCY switches to the low-HP message
- `mercyLowHpMessage`: MERCY message when enemy HP is below the threshold
- `mercyHighHpMessage`: MERCY message when enemy HP is at or above the threshold
- `items`: inventory entries for the player
- `battleDialog`: messages shown between player turns
- `enemyDialog`: messages shown in the enemy speech bubble before enemy attacks
- `attackPatterns`: enemy bullet patterns
- `phase2`: optional second-phase override block

If a field is missing, `game.js` uses a default from `DEFAULT_ENEMY_DATA`.

## Items

Each item supports:

```js
{ name: "Snack", heal: 12 }
```

- `name`: item label in the ITEM menu
- `heal`: HP restored when used

Each entry is one use. To give the player two of the same item, add the same item twice.

## Battle Dialog

`battleDialog` is an array of strings. The current line is the default message shown between actions. The game advances one line after each completed player attack. After the final line, it keeps repeating the final line.

## Enemy Dialog

`enemyDialog` is an array of strings. After the player finishes a turn, the current line appears in a speech bubble near the enemy, then the enemy attack starts. The game advances one line each time it shows one. Once the list is exhausted, the speech bubble is skipped and the enemy attacks immediately.

## Attack Patterns

`attackPatterns` is an array. The game cycles through it one attack at a time.

Preferred format:

```js
{
  type: "purple",
  pattern: function threadedAttack({ t, box, state, spawnBullet }) {
    // spawn bullets here
  }
}
```

Old shorthand still works and defaults to `normal`:

```js
function normalAttack({ t, box, state, spawnBullet }) {
  // spawn bullets here
}
```

Supported attack types:

- `normal`: free movement inside the battle box
- `purple`: purple soul movement locked to three horizontal ropes

Pattern arguments:

- `t`: attack timer, starting at `0` after the warmup
- `box`: battle box rectangle, with `x`, `y`, `w`, and `h`
- `state`: game state, including `state.soul`, `state.playerHP`, and `state.enemyHP`
- `purpleLineYs`: current purple-line Y positions, or `null` for non-purple attacks
- `spawnBullet`: function that adds a bullet to the attack

## Bullets

Call `spawnBullet({...})` inside an attack pattern.

Common bullet fields:

- `x`, `y`: starting position
- `vx`, `vy`: velocity used by the default bullet update
- `r`: collision and draw radius
- `type`: draw style
- `life`: frames before the bullet disappears
- `spin`: rotation speed
- `angle`: starting rotation
- `harmless`: if `true`, the bullet does not damage the player
- `noCull`: if `true`, the bullet is not removed when outside the box margin
- `update`: optional custom function called every frame

Supported bullet draw types:

- `dot`
- `diamond`
- `bone`
- `boot`
- `star`
- `horseshoe`
- `note`
- `claw`
- `shadow`
- `eye`

Custom update example:

```js
spawnBullet({
  x: box.x + box.w / 2,
  y: box.y - 20,
  r: 8,
  type: "diamond",
  life: 120,
  update: ({ bullet, box, state, spawnBullet }) => {
    bullet.y += 3;
    bullet.x += Math.sin(bullet.age / 8) * 1.5;
  }
});
```

## Phase 2

Add a `phase2` object to make a two-phase boss. When phase 1 reaches 0 HP, music stops, transition text plays, the HP bar refills, and phase 2 starts.

```js
phase2: {
  name: "MY ENEMY EX",
  sprite: "sprites/enemy_phase2.png",
  music: "sounds/phase2.wav",
  maxHP: 200,

  fadeOutDuration: 90,
  holdDuration: 150,
  fadeInDuration: 100,
  hpFillSpeed: 1.35,
  refillMessageMinDuration: 180,

  transitionMessage: "* The room goes quiet.",
  refillMessage: "* The HP bar starts crawling back.",
  startMessage: "* MY ENEMY EX appears.",
  winMessage: "* You won for real.",

  actMessage: "* The new form stares back.",
  mercyLowHpThreshold: 25,
  mercyLowHpMessage: "* Almost.",
  mercyHighHpMessage: "* Not yet.",
  battleDialog: [
    "* MY ENEMY EX refuses to quit."
  ],

  enemyDialog: [
    "* The second phase winds up...",
    "* The attack changes shape."
  ],

  attackPatterns: [
    // phase 2 patterns here
  ]
}
```

Phase 2 can override the same fields as phase 1. Anything omitted falls back to the top-level enemy data.

## Sprites And Sounds

Sprite paths are relative to the project folder. Enemy files can point to any image in `sprites/`.

Shared sprites used by the engine:

- `sprites/heart.png`: optional red heart sprite for normal attacks
- `sprites/projectile.png`: optional image for `dot` bullets

If a sprite is missing, the game uses drawn placeholder art.
