# CLAUDE.md — Board Game Tracker

## Pre-push gate (required every push, no exceptions)
Before any `git push`, update all three files and stage them in the same commit as the code changes:
1. **CHANGELOG.md** — prepend a new version entry documenting what changed
2. **README.md** — update any feature descriptions affected by the change
3. **sw.js** — bump the `CACHE` version string (e.g. `board-game-tracker-v3` → `board-game-tracker-v4`)

## Version scheme
- CHANGELOG uses flat decimal versions starting at 0.01, incrementing by 0.01 per release (0.01, 0.02 … 0.10 …)
- Version 1.0 is not assigned without explicit user approval
- `sw.js` cache version tracks push count independently (v1, v2, v3 …) — bump it on every push

## Snapshots
- `snapshots/index.html` is the version history page — update it whenever a new version is released
- Each release that warrants a snapshot gets a copy of the app saved to `snapshots/vX.XX/` (index.html, style.css, app.js, sw.js if present)
- Snapshot copies are made from the working tree just before committing — they should reflect the released state

## Commit message style
Short imperative phrase describing the change. No ticket numbers, no scope prefixes.
Example: `add touch drag-to-reorder for pinned actions on mobile`

## Project stack
- Pure HTML / CSS / JS — no build step, no framework, no bundler
- Hosted on GitHub Pages (serve from `main` branch root)
- Single file per layer: `index.html`, `style.css`, `app.js`
- PWA service worker in `sw.js` — caches static assets for offline use

## Architecture
- Single-page app: three screens (`screen-home`, `screen-setup`, `screen-tracker`) swapped by toggling `.active`
- State lives in the `state` object in `app.js`; no persistence beyond `localStorage` for theme/mode
- Bottom-sheet modals follow the pattern: `.modal > .modal-backdrop + .modal-sheet`; backdrop click closes modal
- Games are defined in the `GAMES` object; add new games there
- Theme system: `data-theme` + `data-mode` on `<html>`; 6 CSS variable blocks in `style.css` (3 themes × 2 modes)

## Do not use browser automation tools
The user handles all visual/responsive testing themselves. Never use `mcp__claude-in-chrome__*` tools for testing.
