# Board Game Tracker

A lightweight score-tracking web app for board games and dice games. No install, no accounts — just open and play.

**Live:** [GitHub Pages link — add after first deploy]

---

## Features

- **Farkle** — running totals, configurable win score, entry threshold ("getting on the board")
- **Custom Game** — a freeform score sheet for games like Skyjo: name the game, log a score per round, no fixed rules
  - **Golf scoring toggle** — highest total wins, or lowest wins (golf)
  - **Negative scores** and an optional **no-limit target** (set to 0 to just track scores)
  - **"Track who goes out first"** — opt-in per game; flags the round closer (⚑) next to their score
- **2–6 players** with distinct color-coded columns
- **Inline editing** — tap any score cell or player name to edit mid-game
- **Add Turn modal** — enter all players' scores for a round in one step
- **Winner banner + confetti** — detects the win, then fires a confetti burst (honors `prefers-reduced-motion`)
- **Rules modal** — built-in rules per game plus custom house-rule notes you can add at runtime
- **Confirmation modal** — warns before leaving an in-progress game
- **Color themes** — Ember, Ocean, Forest, each with dark and light mode
- **Responsive** — mobile-first with clean tablet (700px) and desktop (1080px) breakpoints
- **No flash** — theme is applied before first paint via an inline script; persists across sessions

---

## Usage

Open `index.html` in a browser. No build step required.

1. Pick a game on the home screen
2. Add 2–6 players, set the win score and entry threshold
3. Tap **+ Add Turn** after each round to log scores
4. Tap any cell to correct a score; tap a player name to rename them
5. Change theme/mode anytime via the gear icon (⚙) on the home screen

---

## Project Structure

```
index.html         — markup and screen layout
style.css          — all styling; CSS custom properties for theming
app.js             — all game logic and DOM interaction
sw.js              — service worker; cache version bumped on every push for PWA auto-update
snapshots/
  index.html       — version history timeline with live snapshot links
  v0.01/           — initial scaffold
  v0.02/           — full feature release
  v0.03/           — PWA service worker + version tracking
  v0.04/           — Custom Game (Skyjo), golf scoring, confetti, round-closer flag
stage/             — standalone design-preview pages (not part of the shipped app)
CLAUDE.md          — instructions for AI-assisted development on this project
CHANGELOG.md       — history of changes
```

---

## Games

Currently implemented:
- **Farkle** — dice game, first to 10,000 points (configurable), minimum 500 to get on the board (configurable)
- **Custom Game** — freeform round-by-round score sheet (e.g. Skyjo), with high/low (golf) scoring, negative scores, optional target, and opt-in round-closer tracking

More games planned (round-by-round and category-based scoring).

---

## Development

Pure HTML/CSS/JS — no framework, no bundler, no dependencies except Google Fonts (Commissioner).

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

Then add a game card button in `index.html` with `data-game="mygame"`.
