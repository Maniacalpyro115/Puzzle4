# Soul Battle

A static browser combat mini-game inspired by classic bullet-dodge RPG battles.

## Run

Open `index.html` in a browser, or drop this folder into your GitHub Pages repo.

## Controls

- Arrow Keys / WASD: move the heart during enemy attacks
- Enter / Z: select, confirm, or strike during the attack meter
- Space / Click: also confirms or strikes
- Esc / X: cancel out of Fight, Act, Item, or Mercy selection

Purple attacks change movement: left/right still move normally, but up/down jumps the soul between the three ropes.
Blue attacks apply gravity: left/right move along the ground, and up jumps. Holding up makes the jump higher than tapping it.

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
  music: {
    src: "sounds/my_song.wav",
    loopStart: 12.5,
    loopEnd: 84.75
  },
  maxHP: 100,

  introMessage: "* MY ENEMY blocks your path.",
  winMessage: "* You won.",
  acts: [
    { name: "Check", dialog: "* You checked MY ENEMY." },
    { name: "Wave", dialog: "* You wave. MY ENEMY does not react." }
  ],
  actConditions: [
    { act: 2, dialog: "* MY ENEMY hesitantly waves back." },
    { act: 1, dialog: "* MY ENEMY looks ready to be spared." }
  ],

  mercyFailure: "* MY ENEMY is not ready to leave.",
  mercySuccess: "* You spare MY ENEMY.",
  mercyWinMessage: "MY ENEMY accepted your mercy.",

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

  turns: [
    {
      loop: true,
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
- `ultimateSprite`: optional replacement sprite permanently shown after the first `ultimate` attack
- `music`: audio path string for full-track looping, or `{ src, loopStart, loopEnd }` in seconds to play the intro once and loop only the marked section
- `backgroundModifier`: optional post-ultimate canvas renderer for enemy-specific background effects
- `music`: optional battle music path
- `maxHP`: enemy HP for phase 1
- `introMessage`: message shown before the fight starts
- `winMessage`: message shown after winning
- `acts`: up to four ACT menu options, each with a `name` and default `dialog`
- `actConditions`: ordered ACT requirements that advance toward MERCY
- `actMessage`: legacy single `Check` message used when `acts` is omitted
- `mercyFailure`: dialog shown when MERCY is selected before every ACT condition is complete
- `mercySuccess`: dialog shown when a mercy-able enemy is spared
- `mercyWinMessage`: message shown on the ending screen after a successful spare
- `items`: inventory entries for the player
- `battleDialog`: messages shown between player turns
- `enemyDialog`: messages shown in the enemy speech bubble before enemy attacks
- `turns`: preferred ordered attack/event pairings
- `attackPatterns`: legacy attack-only sequence
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

## Acts

`acts` is an array of up to four menu options:

```js
acts: [
  { name: "Check", dialog: "* You checked the enemy." },
  { name: "Joke", dialog: "* Your joke falls flat." },
  { name: "Smile", dialog: "* You smile politely." }
]
```

`actConditions` defines the required sequence using 1-based ACT option numbers:

```js
actConditions: [
  { act: 2, dialog: "* The enemy laughs." },
  { act: 1, dialog: "* You notice the enemy relax." },
  { act: 3, dialog: "* The enemy smiles back." },
  { act: 2, dialog: "* The enemy no longer wants to fight." }
]
```

Choosing the next required ACT advances the sequence and shows that condition's `dialog`. Any other ACT does not reset or advance progress and instead shows the chosen option's default `dialog`.

Once every condition is complete, the enemy name appears yellow in the MERCY target menu. Selecting it shows `mercySuccess`, fades the enemy sprite away, and ends the battle with `mercyWinMessage`. Selecting MERCY before that point shows `mercyFailure` and the fight continues.

An enemy with no `actConditions` is Mercy-able immediately.

Reducing the final enemy phase to 0 HP dissolves its sprite into top-down pixel dust before the victory screen appears. Mercy continues to use its separate fade-away ending.

## Battle Dialog

`battleDialog` is an array of strings. The current line is the default message shown between actions. The game advances one line after each non-ending FIGHT, ACT, ITEM, or unsuccessful MERCY action. After the final line, it keeps repeating the final line.

## Enemy Dialog

`enemyDialog` is an array of strings. After any optional turn event, the current line appears in a speech bubble near the enemy, then the enemy attack starts. The game advances one line each time it shows one. Once the list is exhausted, the speech bubble is skipped and the enemy attacks immediately.

## Turns And Attacks

`turns` is the preferred array for organizing enemy turns. After a non-ending FIGHT, ACT, ITEM, or unsuccessful MERCY action, the engine selects the next turn, runs its optional `event`, shows ordinary `enemyDialog`, then begins its required attack.

Preferred format:

```js
{
  loop: false,
  event: {
    steps: [
      { type: "textbox", text: "The enemy casts WEB" },
      { type: "flash", color: "#9d5cff", duration: 42 },
      { type: "textbox", text: "Your movement's been restricted!" }
    ]
  },
  type: "purple",
  duration: 640,
  setup: function prepareAttack({ box, state, spawnBullet }) {
    // Optional setup shown during the GET READY warmup.
  },
  pattern: function threadedAttack({ t, box, state, spawnBullet }) {
    // spawn bullets here
  }
}
```

Every `turns` entry must contain an attack `pattern`. Use `loop: false` for a one-shot attack/event pairing; omitted `loop` and `loop: true` keep the turn in future cycles. An enemy that can continue indefinitely should have at least one repeating turn.

Event step types:

- `textbox`: displays `text` in the lower shared text box
- `enemyDialog`: displays `text` in the enemy speech bubble
- `flash`: fills the screen with `color` for `duration` simulation ticks

`duration` is optional for text steps and is automatically sized to make their messages readable.

Legacy `attackPatterns` arrays and function shorthand still work; they repeat and do not include events. A shorthand pattern defaults to `normal`:

```js
function normalAttack({ t, box, state, spawnBullet }) {
  // spawn bullets here
}
```

Supported attack types:

- `normal`: free movement inside the battle box
- `purple`: purple soul movement locked to three horizontal ropes
- `blue`: blue soul movement with gravity and variable-height jumping
- `ultimate`: red free-moving soul; on its first use the enemy fades into `ultimateSprite`, then the defense box expands to the full battle window

Turn attacks may set `duration` to override the default `640` simulation ticks for that individual defense turn. They may set `setup` to create persistent arena elements or place the soul before the `GET READY` warmup is shown.

For quick browser-console testing, use `setUpcomingAttack(number)` with a 1-based turn number. For example, `setUpcomingAttack(6)` makes the sixth configured turn run after your next action. Selecting a turn after an `ultimate` attack also enables its transformed visual state so post-transformation patterns can be tested in context.

When an ultimate transformation is active, an enemy may provide an optional background callback:

```js
backgroundModifier: function drawTransformedBackground({ ctx, state, width, height }) {
  // Draw behind the enemy and battle UI.
}
```

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
- `damageOnlyWhileMoving`: if `true`, collision only damages the player while their soul is moving
- `damageOnlyWhileStill`: if `true`, collision only damages the player while their soul is not moving
- `width`, `height`: optional rectangular hitbox, anchored at the bullet's top center
- `noCull`: if `true`, the bullet is not removed when outside the box margin
- `solidPlatform`: if `true`, a blue soul can stand on and jump from this harmless moving rectangle
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
- `blueLine`: translucent blue rectangular hazard for movement-sensitive sweeps
- `orangeLine`: translucent orange rectangular hazard that is safe while moving
- `spikeFloor`: upward spike bed hazard for platforming attacks
- `platform`: moving outlined platform usable by a blue soul
- `meteorSource`: outlined stationary orb used as a visible projectile source

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
  music: {
    src: "sounds/phase2.wav",
    loopStart: 8.25,
    loopEnd: 72.5
  },
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
  mercyFailure: "* Not yet.",
  mercySuccess: "* You spare the new form.",
  mercyWinMessage: "MY ENEMY EX accepted your mercy.",
  battleDialog: [
    "* MY ENEMY EX refuses to quit."
  ],

  enemyDialog: [
    "* The second phase winds up...",
    "* The attack changes shape."
  ],

  turns: [
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
