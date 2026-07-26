# Board Game Tracker

A lightweight score-tracking web app for board games and dice games. No install, no accounts - just open and play.

**Live:** https://board-game-tracker.benzur.workers.dev

---

## Features

- **11 built-in games** - Farkle, Yahtzee, Left Right Center, Liar's Dice, Cribbage, Euchre, Crazy Eights, Poker, Gin Rummy, Three Thirteen, and Qwirkle, each with its own scoring rules and win condition
- **Generic Game** - a freeform score sheet for games like Skyjo: name the game, log a score per round, no fixed rules
  - **Golf scoring toggle** - highest total wins, or lowest wins (golf)
  - **Negative scores** and an optional **no-limit target** (set to 0 to just track scores)
  - **"Track who goes out first"** - opt-in per game; flags the round closer (⚑) next to their score
- **2–8 players** with distinct color-coded columns; tap a player's color dot on setup or mid-game to change it
- **Inline editing** - tap any score cell or player name to edit mid-game
- **Add Score modal** - enter all players' scores for a round in one step
- **Winner banner + confetti** - detects the win, then fires a confetti burst (honors `prefers-reduced-motion`)
- **Basic Rules on setup** - picking a game goes straight to setup, with the game's intro shown above the player list (clamped to 4 lines with a "Show more/less" toggle) and a "See Scoring and Custom Rules" button
- **Device back-button support** - hardware/gesture back navigates the same screen stack as the in-app back buttons, with the same in-progress-game confirmation guard
- **Rules modal** - built-in game rules (editable) plus custom house rules you can add at runtime, opened via the ? button
- **Confirmation modal** - warns before leaving an in-progress game
- **Auto-save + resume** - the active game persists to `localStorage` once at least one round is scored; reopening the app resumes an unfinished game right where it left off
- **Color themes** - Ember, Ocean, Forest, each with dark, light, and system (follows OS) mode
- **Settings on every screen** - theme, mode, and app version are always one tap away
- **Responsive** - mobile-first with clean tablet (700px) and desktop (1080px) breakpoints
- **No flash** - theme is applied before first paint via an inline script; persists across sessions
- **Installable PWA** - `manifest.json` and app icons let the app be added to a home screen or installed as a desktop app, on top of the existing offline service-worker caching
- **Multiplayer Rooms** - host or join a 4-letter-code room to track scores together remotely; QR-code join, live roster, per-player or host-only scoring, own-score-only editing, host can remove players, reconnect-safe. Backed by a separate Cloudflare Worker (`worker/`) - see its README for deploy steps

---

## Usage

Open `index.html` in a browser. No build step required.

1. Pick a game on the home screen - the Generic Game catch-all sits above the category groups (e.g. "Dice Games")
2. On setup, read the Basic Rules panel (or tap "See Scoring and Custom Rules" for the full list), then add 2–8 players and set the win score and entry threshold
3. Tap **+ Add Score** after each round to log scores
4. Tap any cell to correct a score; tap a player name to rename them
5. Change theme/mode anytime via the gear icon (⚙) on the home screen

---

## Project Structure

```
index.html         - markup and screen layout
style.css          - all styling; CSS custom properties for theming
app.js             - all game logic and DOM interaction
sw.js              - service worker; cache version bumped on every push for PWA auto-update
manifest.json      - PWA manifest (name, icons, theme color, install behavior)
icons/             - app icons (192, 512, apple-touch-icon)
qrcode.js          - vendored QR-code generator (multiplayer room join links)
wrangler.jsonc     - Cloudflare Workers static-assets deploy config for this site
.assetsignore      - files excluded from the Cloudflare deploy (dev-only dirs, internal docs)
worker/            - Cloudflare Worker + Durable Object backend for Multiplayer Rooms (separate deploy target, see worker/README.md)
snapshots/
  index.html       - version history timeline with live snapshot links
  v0.01/           - initial scaffold
  v0.02/           - full feature release
  v0.03/           - PWA service worker + version tracking
  v0.04/           - Custom Game (Skyjo), golf scoring, confetti, round-closer flag
  v0.06/           - forest theme accent color
  v0.09/           - 10 new built-in games, score-entry rules fix
  v0.11/           - Qwirkle icon fix, Custom Games and More section restored
  v0.12/           - installable PWA (manifest.json, icons)
  v0.13/           - device back-button support, collapsible rules text, per-game player defaults
  v0.14/           - Multiplayer Rooms, Cloudflare deploy
stage/             - standalone design-preview pages (not part of the shipped app)
CLAUDE.md          - instructions for AI-assisted development on this project
CHANGELOG.md       - history of changes
```

---

## Games

Currently implemented:
- **Farkle** - dice game, first to 10,000 points (configurable), minimum 500 to get on the board (configurable)
- **Generic Game** - freeform round-by-round score sheet (e.g. Skyjo), with high/low (golf) scoring, negative scores, optional target, and opt-in round-closer tracking

More games planned (round-by-round and category-based scoring).

---

## Development

Pure HTML/CSS/JS - no framework, no bundler, no dependencies except Google Fonts (Commissioner).

To add a new game, add an entry to the `GAMES` object in `app.js`:

```js
GAMES.mygame = {
  name: 'My Game',
  icon: '🎯',
  defaultWinScore: 500,
  defaultMinScore: 0,
  rules: ['Rule one', 'Rule two'],
};
```

Then add a game card button in `index.html` with `data-game="mygame"`, placed under the appropriate `.category-divider` in the `.game-grid` (or add a new divider for a new category).
