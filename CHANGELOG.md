# Changelog

All notable changes to this project are documented here.

---

## [Unreleased] — 2026-06-27 / 2026-06-28

### Added
- **Color themes + light/dark mode** (Task 9)
  - Three themes: Ember (gold on dark brown), Ocean (teal on navy), Forest (lime on dark green)
  - Each theme has a dark and light mode — 6 CSS variable blocks total
  - Settings gear button in home-screen header opens a bottom-sheet settings modal
  - Theme and mode selections persist in `localStorage`; inline `<script>` in `<head>` prevents flash on reload
  - `--on-accent` CSS variable adapts text color on accent-colored surfaces per theme/mode

- **Responsive breakpoints** (Task 10)
  - Tablet max-width: 700px (≥ 640px viewport)
  - Desktop max-width: 1080px (≥ 1024px viewport)
  - Modals remain full-width below breakpoints; constrained above

- **Confirmation modal on back-during-game** (Task 11)
  - Tapping Back during an active game shows a "Leave game?" bottom-sheet modal
  - Only triggers when at least one turn has been recorded; bypassed on empty games

- **Rules button on setup screen** (Task 12)
  - "?" button added to the setup screen header (mirrors the tracker screen button)
  - Opens the same rules modal populated from the current game's rules array

- **Entry threshold mechanic** (Task 1)
  - Players must score ≥ threshold (default 500) in a single turn to get on the board
  - Scores below threshold are stored as `null` and excluded from totals
  - Configurable "Entry Threshold" field on setup screen; set to 0 to disable
  - Not-on-board cells render with a `✗` symbol on an accent-tinted background

- **Inline player name editing** (Task 2)
  - Tapping a player's name in the score table header opens an inline text input
  - Commits on blur or Enter; cancels on Escape

- **Inline score editing** (Task 3)
  - Tapping any score cell opens an inline number input
  - Commits on blur or Enter; recalculates totals and win check immediately; cancels on Escape

- **Custom notes in rules modal** (Task … Rules feature)
  - Players can add and delete house-rule notes at runtime (stored in memory for the session)

### Changed
- **Default theme** — Ocean dark is now the default for first-time visitors (previously Ember dark)
- **Font** (Task 7) — Commissioner (Google Fonts, weights 700/800/900) replaces system sans-serif
- **Global font size** (Task 4) — base size increased from 16px to 18px; score table scaled proportionally
- **Player input gap** (Task 5) — added vertical spacing between player name rows on setup screen
- **Back button style** (Task 6) — now rendered with border + border-radius (pill-style)
- **App subtitle** (Task 8) — "Pick a game to get started" styled with letter-spacing and lighter weight
- **Not-on-board cell** — changed indicator from `—` (muted, italic) to `✗` on accent-dim background for clearer visual distinction

---

## [0.1.0] — Initial scaffold

- Single-page app: Home → Setup → Tracker screens
- Farkle implemented with running totals and first-to-10,000 win condition
- Add Turn bottom-sheet modal with per-player score inputs
- Rules modal with built-in Farkle rules
- Six player colors; 2–6 players supported
- Winner banner on win condition reached
