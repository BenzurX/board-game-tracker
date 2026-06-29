# CLAUDE.md — Board Game Tracker

## Pre-push gate (required every push)
Before any `git push`, always update all three:
1. **CHANGELOG.md** — document what changed
2. **README.md** — reflect any feature/UI changes

Do not skip this step even for small changes.

## Project stack
- Pure HTML / CSS / JS — no build step, no framework, no bundler
- Hosted on GitHub Pages (serve from `main` branch root)
- Single file per layer: `index.html`, `style.css`, `app.js`

## Architecture
- Single-page app: three screens (`screen-home`, `screen-setup`, `screen-tracker`) swapped by toggling `.active`
- State lives in the `state` object in `app.js`; no persistence beyond `localStorage` for theme/mode
- Bottom-sheet modals follow the pattern: `.modal > .modal-backdrop + .modal-sheet`; backdrop click closes modal
- Games are defined in the `GAMES` object; add new games there
- Theme system: `data-theme` + `data-mode` on `<html>`; 6 CSS variable blocks in `style.css` (3 themes × 2 modes)

## Do not use browser automation tools
The user handles all visual/responsive testing themselves. Never use `mcp__claude-in-chrome__*` tools for testing.
