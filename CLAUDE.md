# CLAUDE.md - Board Game Tracker

## Pre-push gate (required every push, no exceptions)
Before any `git push`, run the regression checks and update all five files, staging them in the same commit as the code changes:
0. **`node tests/regressions.mjs`** - must print `Regression checks passed`. Never delete or weaken an assertion to make it pass; if a change intentionally supersedes one, update the assertion and say so in the CHANGELOG entry
1. **CHANGELOG.md** - prepend a new version entry documenting what changed
2. **README.md** - update any feature descriptions affected by the change
3. **sw.js** - bump the `CACHE` version string (e.g. `board-game-tracker-v3` → `board-game-tracker-v4`) and `APP_VERSION` to match the new CHANGELOG version (the update-available toast reads it from here)
4. **app.js** - bump `APP_VERSION` to match the new CHANGELOG version (shown in the settings popup)
5. **PROGRESS.md** - refresh the work-item blurbs and the `## Next Session` list so they describe the state being pushed, not the state before it

## Version scheme
- CHANGELOG uses flat decimal versions starting at 0.01, incrementing by 0.01 per release (0.01, 0.02 … 0.10 …)
- Version 1.0 is not assigned without explicit user approval
- APP_VERSION/CHANGELOG version only bumps at push time, never mid-session. Commit freely without bumping; fold multiple commits' changes into one pending CHANGELOG entry under the still-current version until a push actually happens, then bump once as part of that push's pre-push gate
- `sw.js` cache version tracks push count independently (v1, v2, v3 …) - bump it on every push

## Snapshots
- `snapshots/index.html` is the version history page - update it whenever a new version is released
- Each release that warrants a snapshot gets a copy of the app saved to `snapshots/vX.XX/` (index.html, style.css, app.js, sw.js if present)
- Snapshot copies are made from the working tree just before committing - they should reflect the released state

## Cross-agent provenance
Both Claude and Codex edit this repo's docs asynchronously. Tag entries so authorship stays clear:
- Prefix new agent-authored headings or CHANGELOG bullets with the inline-code tag `` `Codex:` `` or `` `Claude:` ``
- Where a visible prefix hurts prose readability, use an adjacent Markdown comment instead: `` <!-- `Claude:` short note. --> ``
- The tag records who wrote or materially revised that entry - it is not an edit lock, either agent may still edit it
- Preserve the other agent's entries and their tags; correct stale facts explicitly rather than silently deleting
- Untagged pre-existing content stays valid; no retroactive tagging needed

## Tracker screen vocabulary (Ben's names for the three bars)
Ben refers to the tracker screen's three bars by name and by letter, and may use either. Map them to the code as follows:

- **Title Bar (A)** - `#screen-tracker > .screen-header`. The main header: game title, back button, `?` rules button, refresh button, settings gear.
- **Subtitle Bar / Room Code Bar (B)** - `#mp-room-bar`. Room code, invite/share button, score-assigner (✍) button. Multiplayer only; hidden in solo games.
- **Footer Bar (C)** - `.tracker-actions`. Enter Score and New Game buttons, pinned to the bottom of the score screen.

All three collapse when the board is scrolled away from the end each belongs to (`chrome-top-hidden` covers A and B, `chrome-bottom-hidden` covers C). The floating ⊕ button (`#btn-fab-score`) is C's stand-in while C is collapsed.

## Testing
- `node tests/regressions.mjs` - no install step, no dependencies. Mostly source-text assertions (it reads `app.js`, `index.html`, and `worker/src/room.ts` as strings) plus one real unit test of `reconcileRosterColumns` via `node:vm`
- Because the assertions match on source text, renaming a function or reformatting a matched line will fail the suite even when behaviour is unchanged - update the assertion to match the new source, don't drop it
- Add an assertion here whenever a bug is fixed that has no other automated coverage

## Commit message style
Short imperative phrase describing the change. No ticket numbers, no scope prefixes.
Example: `add touch drag-to-reorder for pinned actions on mobile`

## Project stack
- Pure HTML / CSS / JS - no build step, no framework, no bundler
- Hosted on Cloudflare (Workers static-assets deploy, `wrangler deploy` from repo root using `wrangler.jsonc`) - deploy manually after pushing, git push alone does not update the live site
- Two separate deploy targets, and they are easy to confuse. The static site is `wrangler deploy` from the repo root. The multiplayer Worker is `cd worker && npx wrangler deploy -c wrangler.toml`. **The `-c` flag is required**: without it, wrangler run from `worker/` still resolves the repo-root `wrangler.jsonc` and silently redeploys the static site instead, reporting success while the Worker stays on its old code
- `.assetsignore` keeps internal directories (`worker`, `stage`, `tests`, `progress`, docs) out of the public static deploy - add new internal-only paths there
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
