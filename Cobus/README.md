# Destiny Raid History

This is a static website that reads public Destiny 2 raid history through the Bungie API. It displays the most recent completed run for each raid, the character class used, and any weapons recorded in that activity's post-game report.

Bungie's historical activity report does not provide an equipped subclass snapshot. Weapon data is recorded weapon usage during the completion; checkpoint completions can return no weapons.

## Local Preview

1. Open this folder in VS Code.
2. Open `index.html`.
3. Click **Go Live**.
4. Search for a full Bungie name, such as `Pyro#0222`.

The embedded Bungie API key must allow the exact browser origin that Live Server opens, typically `http://127.0.0.1:5500` or `http://localhost:5500`. If the origin does not match the Bungie application settings, the API returns `OriginHeaderDoesNotMatchKey`.

## GitHub Pages

Publish the repository with GitHub Pages using the repository root as the site source. The page consists only of:

- `index.html`
- `styles.css`
- `app.js`

The current `app.js` contains an embedded Bungie API key for local/private use. Do not publish this repository unless that key has been removed or rotated.

For GitHub Pages use, the key must likewise allow the exact deployed Pages origin, for example `https://username.github.io`.

## Optional Terminal Script

The existing `cobus.py` terminal script now reads its key from the `BUNGIE_API_KEY` environment variable:

```powershell
$env:BUNGIE_API_KEY = "your-api-key"
python .\cobus.py "Pyro#0222" --max-pages 1 --limit 10
```
