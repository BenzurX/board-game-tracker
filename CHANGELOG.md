# Changelog

Newest entries first. Version scheme: flat decimal starting at 0.01, incrementing by 0.01 per release (0.01, 0.02 … 0.09, 0.10 …). Version 1.0 is not assigned without explicit approval. Minor additions increment by 0.01; significant grouped releases may skip ahead by more at the author's discretion.

---

## 0.04 — 2026-07-06

Milestone release: second game type, plus win/round-tracking flair.

### Added
- **Custom Game tracker** — a freeform score sheet for games like Skyjo: name the game, log a score per player per round, no fixed rules. Selectable from a new "Custom Game" card on the home screen
- **Golf scoring toggle** — per custom game, choose "Highest wins" or "Lowest wins (golf)"; the winner banner and the totals-row 👑 leader marker both respect the direction
- **Negative round scores** in custom games (Skyjo can go below zero); the Add Turn modal and inline cell editing both accept them
- **No-limit target** — a custom game's win target can be set to 0 to just track scores with no automatic end
- **Win confetti** — a classic confetti burst (colored from the player palette) fires when a game is won, with a subtle pop on the winner banner; fires once per win and honors `prefers-reduced-motion`
- **"Track who goes out first"** — an opt-in per-custom-game toggle. When on, the Add Turn modal shows a tap-to-toggle "Who went out first?" selector, and that round's closer gets a ⚑ flag next to their score

### Fixed
- Theme class-name collision: the scoring-direction buttons shared the `.mode-btn` class and were triggering the theme handler, which wrote an invalid mode to `localStorage` and blanked the theme (white screen). Scoring buttons now use a dedicated `.dir-btn` class
- Hardened theme loading — invalid stored `theme`/`mode` values fall back to Ocean/Dark instead of leaving CSS variables unresolved

---

## 0.03 — 2026-06-30

### Added
- Service worker (`sw.js`) for PWA offline support and cache-first asset serving; cache version bumped on every push so installed Android PWAs auto-update on next launch
- Version history page (`snapshots/index.html`) — timeline of milestones with live links to each saved snapshot; snapshots stored in `snapshots/vX.XX/`

---

## 0.02 — 2026-06-28

### Added
- Color themes (Ember, Ocean, Forest) × dark/light mode; 6 CSS variable blocks; Ocean dark is the default
- Settings gear button on home screen opens a bottom-sheet theme/mode picker; preference persists in `localStorage`
- Anti-flash inline script in `<head>` applies saved theme before first paint
- Entry threshold mechanic — players must score ≥ 500 in one turn to get on the board; scores below threshold stored as `null` and shown as `✗` on an accent-tinted cell
- Inline player name editing — tap a column header to rename mid-game
- Inline score editing — tap any cell to correct a score; totals and win check recalculate immediately
- Confirmation modal when tapping Back during an active game
- Rules button on the setup screen (mirrors the tracker screen button)
- Custom house-rule notes in the rules modal (add/delete at runtime, session-only)
- Responsive breakpoints: tablet 700px, desktop 1080px
- Commissioner font (Google Fonts, weights 700/800/900)

### Changed
- Global base font size increased from 16px to 17px
- Back button styled with border + border-radius
- App subtitle styled with letter-spacing, uppercase, and decorative rule lines
- Player name inputs now have consistent vertical gap
- Not-on-board indicator changed from muted italic `—` to `✗` on accent-dim background
- Default theme changed to Ocean dark

---

## 0.01 — 2026-06-27

### Added
- Single-page app: Home → Setup → Score Tracker screens
- Farkle with running totals and configurable first-to-10,000 win condition
- Add Turn bottom-sheet modal with per-player score inputs
- Rules modal with built-in Farkle rules
- 2–6 players with distinct color-coded columns
- Winner banner on win condition reached
