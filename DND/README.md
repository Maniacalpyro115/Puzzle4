# D&D Mini Selector

This is a GitHub Pages-friendly site for browsing STL files stored under a `database/` folder.

## What it does
- Loads minis from `database/manifest.json`
- Filters by class and race
- Searches by name or description
- Previews STL files in the browser with Three.js
- Lets a user select a mini
- Includes a submit form that is already wired to POST JSON when you add a backend endpoint

## Folder structure

```text
.
├── index.html
├── styles.css
├── app.js
├── generate_manifest.py
└── database/
    ├── manifest.json
    ├── Fighter/
    │   └── Human/
    │       └── some-mini.stl
    └── Wizard/
        └── Elf/
            └── some-other-mini.stl
```

## How to add your STL files
1. Copy your STL folders into `database/`.
2. Use the pattern `database/Class/Race/file.stl`.
3. Run:
   ```bash
   python generate_manifest.py
   ```
4. Commit and push the updated files to GitHub Pages.

## GitHub Pages deployment
1. Create a GitHub repo.
2. Put these files in the repo root.
3. In GitHub, go to **Settings → Pages**.
4. Set the source branch (often `main`) and root folder (`/root`).
5. Save.

## About submissions
GitHub Pages is static hosting only. That means the page can display minis and let users choose one, but it cannot save selections by itself.

When you want real submissions, set `SUBMIT_ENDPOINT` in `app.js` to an API URL. The frontend will POST JSON like this:

```json
{
  "playerName": "Jake",
  "notes": "Prefer the shield pose",
  "selectedMini": {
    "name": "Human Fighter",
    "class": "Fighter",
    "race": "Human",
    "file": "./database/Fighter/Human/human-fighter.stl",
    "description": ""
  },
  "submittedAt": "2026-04-19T12:00:00.000Z"
}
```

Good backend options:
- Supabase Edge Function + table
- Firebase Functions / Firestore
- Netlify Forms or Netlify Functions
- Cloudflare Workers

## Notes
- Browsers cannot automatically list files in folders on GitHub Pages, so the `manifest.json` file is required.
- If an STL preview does not load, make sure the `file` path in the manifest matches the actual file location exactly.
