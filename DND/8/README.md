# Soul Battle

A static browser combat mini-game inspired by classic bullet-dodge RPG battles.

## Run

Open `index.html` in a browser, or drop this entire `soul-battle` folder into your GitHub Pages repo.

## Controls

- Arrow Keys / WASD: move the heart during enemy attacks
- Enter / Z: select, confirm, or strike during the attack meter
- Click: also confirms / strikes
- Esc / X: reserved for future cancel behavior

## Sprite filenames

Put your custom sprites in the `sprites/` folder with these exact names:

- `enemy.png` — main enemy sprite
- `heart.png` — player soul/heart sprite
- `projectile.png` — enemy projectile sprite

The game works without these files by using drawn placeholder art.

## Files

- `index.html`
- `styles.css`
- `game.js`
- `sprites/`

## Controls update
- Click FIGHT, then click again or press Space/Enter/Z when the moving red bar is near the center.
- Enemy attacks now have about a 1-second GET READY window before projectiles spawn.

## Dialogue lines

Edit `battleDialog` near the top of `game.js`:

```js
const battleDialog = [
  "* First line at the start of combat.",
  "* Second line after your first attack.",
  "* Third line after your second attack."
];
```

The game advances one line at a time. Once it reaches the final line, it keeps repeating that final line until combat ends.

## Two-phase bosses

Enemy files can define a `phase2` block. When phase 1 reaches 0 HP, the current music stops, transition dialogue plays, the HP bar refills, and phase 2 starts with its own `music`, `battleDialog`, and `attackPatterns`.
