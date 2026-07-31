# CLAUDE.md - Board Game Tracker

## Pre-push gate (required every push, no exceptions)
Before any `git push`, update all four files and stage them in the same commit as the code changes:
1. **CHANGELOG.md** - prepend a new version entry documenting what changed
2. **README.md** - update any feature descriptions affected by the change
3. **sw.js** - bump the `CACHE` version string (e.g. `board-game-tracker-v3` → `board-game-tracker-v4`)
4. **app.js** - bump `APP_VERSION` to match the new CHANGELOG version (shown in the settings popup)

## Version scheme
- CHANGELOG uses flat decimal versions starting at 0.01, incrementing by 0.01 per release (0.01, 0.02 … 0.10 …)
- Version 1.0 is not assigned without explicit user approval
- APP_VERSION/CHANGELOG version only bumps at push time, never mid-session. Commit freely without bumping; fold multiple commits' changes into one pending CHANGELOG entry under the still-current version until a push actually happens, then bump once as part of that push's pre-push gate
- `sw.js` cache version tracks push count independently (v1, v2, v3 …) - bump it on every push

## Snapshots
- `snapshots/index.html` is the version history page - update it whenever a new version is released
- Each release that warrants a snapshot gets a copy of the app saved to `snapshots/vX.XX/` (index.html, style.css, app.js, sw.js if present)
- Snapshot copies are made from the working tree just before committing - they should reflect the released state

## Commit message style
Short imperative phrase describing the change. No ticket numbers, no scope prefixes.
Example: `add touch drag-to-reorder for pinned actions on mobile`

## Project stack
- Pure HTML / CSS / JS - no build step, no framework, no bundler
- Hosted on Cloudflare (Workers static-assets deploy, `wrangler deploy` from repo root using `wrangler.jsonc`) - deploy manually after pushing, git push alone does not update the live site
- Single file per layer: `index.html`, `style.css`, `app.js`
- PWA service worker in `sw.js` - caches static assets for offline use

## LAN-preview testing gotcha
`sw.js`'s fetch handler is cache-first (`caches.match(e.request).then(cached => cached || fetch(e.request))`). Once a browser registers the service worker against the LAN-preview origin/port, it keeps serving whatever it cached at install time - a normal hard-refresh does not bust this, only a byte-different `sw.js` being fetched, installed, and activated does. During a session with several rapid local commits (each bumping `CACHE`), a test device can end up stuck on an old cached snapshot of app.js/index.html, producing symptoms that look like real app bugs (stale UI, leftover state) but are actually just serving old code. If something breaks in LAN-preview testing that doesn't match the code just written, suspect this first. Fix: test in an Incognito/Private window (no persisted SW/cache), or in DevTools → Application → Service Workers, check "Update on reload" or Unregister for that origin.

## Architecture
- Single-page app: three screens (`screen-home`, `screen-setup`, `screen-tracker`) swapped by toggling `.active`
- State lives in the `state` object in `app.js`; no persistence beyond `localStorage` for theme/mode
- Bottom-sheet modals follow the pattern: `.modal > .modal-backdrop + .modal-sheet`; backdrop click closes modal
- Games are defined in the `GAMES` object; add new games there
- Theme system: `data-theme` + `data-mode` on `<html>`; 6 CSS variable blocks in `style.css` (3 themes × 2 modes)
