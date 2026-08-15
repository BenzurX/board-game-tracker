# Changelog

Newest entries first. Version scheme: flat decimal starting at 0.01, incrementing by 0.01 per release (0.01, 0.02 … 0.09, 0.10 …). Version 1.0 is not assigned without explicit approval. Minor additions increment by 0.01; significant grouped releases may skip ahead by more at the author's discretion.

---

## 0.21 - 2026-08-15

### Added
- `Claude:` "Your turn" announcement in multiplayer. When the turn moves to a column this device is responsible for, a centre card pops in with a shimmer running through the title text (the gradient is clipped to the glyphs and slid across), then clears itself after 2.4s; tapping it dismisses early. It fires only on an actual turn *change* into one of this device's columns, so re-renders, reconnects and other players' turns stay silent, and it is suppressed on join/rejoin, once the game is over, and while the tracker screen is not showing. Group members and players who nominated this device as their scorer count as "yours" - those read "<Name>'s turn / You enter their score" rather than "Your turn". Honors `prefers-reduced-motion`. Four variants were staged in `stage/your-turn-toast.html` first; this is variant C.

### Changed
- `Claude:` The app version now appears in the top left of the home screen, reading from the same `APP_VERSION` constant as the settings popup. Shipped in a follow-up push that deliberately kept the version at 0.21 (see the note at the end of this entry).
- `Claude:` The your-turn card's border shimmers along with its title. Both use the same keyframes and the same highlight colour (`--turn-shimmer-hi`), so one highlight appears to pass over the whole card. The border ring is a gradient rectangle masked to the 1px border band, gated behind `@supports` for mask compositing - without that support the plain accent border is kept, since the fallback would be a gradient slab across the card.
- The home screen's settings button now reuses the shared `.btn-rules` / `.btn-settings-header` styling instead of its own bespoke `.btn-settings` rules, leaving `.btn-settings-home` to carry only its absolute positioning. Keeps the gear consistent with the other header buttons.
- The multiplayer setup hint now also mentions that in "Each Player Enters Score" rooms a player can nominate someone else to score for them, which was previously only discoverable during the join flow.

### Tests
- `Claude:` Two assertions for the home version label (present, and read from `APP_VERSION` rather than hardcoded) and two for the border shimmer (masked ring, shared keyframes).
- `Claude:` Four assertions covering the your-turn toast: that it fires only on a real turn change, that join/rejoin passes `announce: false`, that it is gated on `mpEntersScoresFor`, and that the shimmer clips its gradient to the text.

<!-- `Claude:` 0.21 covers two pushes. The second (home version label, border shimmer, sw.js CACHE v38) was released on Ben's explicit call to leave the version number where it was, so devices already on 0.21 pick those changes up on a later reload rather than through the update toast, which compares APP_VERSION and sees no change. -->

---

## 0.20 - 2026-08-09

### Changed
- `Codex:` One device can now claim up to all 8 seats in a room, not just 4. Creating a room lets the host allocate the full table from a single device; joining caps the dropdown to the room's remaining capacity.
- `Codex:` Reordered the multiplayer create/join modal: the player-count row now sits above the name fields rather than below, under a compact "Players:" label. The explanatory hint below the fields was dropped as redundant, and the count row stays visible (with the control disabled) when only one seat is available, instead of disappearing.

### Added
- `Claude:` `tests/regressions.mjs` - a dependency-free regression harness run with `node tests/regressions.mjs`. It reads `app.js`, `index.html`, and `worker/src/room.ts` as text and asserts that previously fixed behaviour is still present, plus one real unit test of the roster-reconciliation helper via `node:vm`. Now step 0 of the pre-push gate. Guards against silently regressing behaviour that has no automated coverage otherwise.

### Fixed
- `Codex:` Added proper inset spacing for the player-count dropdown chevron.

### Docs
- `Claude:` PROGRESS.md was still describing multiplayer as unshipped with an undeployed Worker and a placeholder URL; rewritten against the current state, with detail files added for group join and the v0.19 work. Three of the six beta scope cuts recorded in `progress/multiplayer-rooms.md` (custom win score, entry threshold, past-round editing) had since been lifted and are now marked as such. CLAUDE.md gained the test suite as step 0 of the pre-push gate, the `wrangler deploy -c wrangler.toml` requirement for the Worker (without it, wrangler run from `worker/` silently redeploys the static site instead), and a cross-agent provenance convention. `tests` and `progress` are now excluded from the public static deploy via `.assetsignore`.

---

## 0.19 - 2026-08-09

### Added
- Multiplayer turn indicator: the host starts as the current turn, can tap any player name to change it, and the selected player's full score column receives a strong highlight. The highlight advances to the next player after the current player's score is submitted.
- Invite sheet replaces Show QR, with a join link, copy and native Share actions, QR code, and room code. Added a tracker-header refresh button.
- Update-available toast: when a new service-worker build activates in the background, a top-of-screen notification shows the available app version, offers Reload, and can be dismissed with its X or by tapping outside it. Reload uses a cache-busted URL so the new build is fetched immediately.
- Proxy scoring in multiplayer rooms where the host chose "each player scores their own": a joining player can nominate another player already in the room to enter scores on their behalf. The picker appears in the join flow after the name step (the roster now rides along with the room-code existence check so it can be shown before joining), and the choice can be changed at any time from the new ✍ button in the room bar. The nominated player's Enter Score modal grows a row per player they're scoring for, all submitted together, and they can correct those players' cells in past rounds too. Nominations are one level deep only: a player who is already someone else's scorer can't hand their own entry off, and a player who has nominated someone can't be nominated in turn. If a scorer leaves or is removed, everyone who nominated them falls back to entering their own scores. Not offered in host-scoring rooms, where there's nothing to delegate.
- Group join: the name step of both the create-room and join-room flows now has a "Players on this device" dropdown (1-4). Picking more than one reveals a name field per extra person, and all of them join the room together as full players with their own score columns. The device that entered them keeps score for the whole group - its Enter Score modal shows a row per person, and it can correct their cells in past rounds - so several people at one table can play from a single phone. The group is fixed at join time; the host can still remove any of them individually, and removing the person holding the device removes everyone they entered. Group members go offline and come back with that device, and a refresh or reconnect restores the whole group. Names must all be different, and a group that no longer fits the 8-player room is told how many seats are left rather than just "room full". Because the device already scores for its group, it can't also nominate someone else to enter its own scores.

### Changed
- Enter Scores now drops down from the top. Installed PWAs may rotate to any screen orientation. Farkle zeroes use a stylized `F`, including before the entry threshold is met. Host-name stars were removed.
- Once a winner is declared, the current-turn highlight disappears and one continuous animated spectrum frame surrounds the winner's full score column.

### Fixed
- Player colors can be edited during multiplayer and now persist for everyone in the room.
- Voluntarily leaving or removing a player deletes that player's historical score column immediately; later joiners receive a new empty column instead of inheriting old scores.
- The tracker refresh button now uses a cache-busted navigation so it fetches the latest deployed build instead of reopening the service worker's stale cached copy.
- Leaving a hosted room now hides the room bar immediately but gives the WebSocket leave message time to reach the Worker before closing, preventing abandoned joinable rooms.
- Same-device, same-name reconnects now use a stable device identity as a fallback when the saved player session ID is unavailable.
- Unknown newer client message types return a non-fatal error instead of closing the WebSocket, preventing static-app/Worker deployment skew from desynchronizing the host.
- Score-entry fields now start empty. Blank fields are skipped instead of becoming zero, so a player scoring for several people can submit only the scores they have; an explicitly entered `0` still records a real zero/Farkle.
- Disconnected guests now keep a same-device identity reservation for 10 minutes, allowing refresh and hard-refresh reconnects to reclaim the existing names and score columns. Expired disconnected guests are pruned when the next player joins.
- Multiplayer turn advancement skips disconnected players and players who already scored, preventing proxy-scored columns from trapping the turn indicator on an ineligible player.

---

## 0.18 - 2026-07-31

### Added
- Screen Wake Lock keeps the display on while the tracker screen is active, so mid-game score entry isn't interrupted by the device auto-locking. Re-acquires automatically if the OS releases it (app switch, screen lock) while still on the tracker. Requires a secure context (HTTPS or localhost) - won't activate over plain-HTTP LAN preview.

---

## 0.17 - 2026-07-30

### Added
- Tapping the victory banner replays the win bounce animation and confetti burst. In multiplayer, a tap by any player (host or guest) syncs the replay to everyone in the room.
- Farkle house rule: once a player crosses the winning score target, every other player gets one more full round to beat it before a winner is crowned - works identically for solo scoring, host-scoring multiplayer, and each-player-scores-their-own multiplayer, since it's derived purely from the shared round history rather than a separately tracked flag.
- Enter Scores modal (renamed from "Add Scores") now shows each player's current total (before this round) next to their score input, under a "Total" column heading and in bold, so it's visible while entering new scores instead of only after saving. Added a rules shortcut to the modal header too, since the score inputs were previously unreachable behind the modal while checking a rule.

### Fixed
- PWA installed on mobile devices failed to open ("can't reach" the URL) because `manifest.json` `start_url` pointed at `./index.html`, which Cloudflare Workers static-assets redirects (308) to `./` — standalone launch didn't follow it reliably. `start_url` now matches `./` directly.

---

## 0.16 - 2026-07-26

### Added
- Removed guest now sees a dismissable toast on the home screen ("The host has removed you from the game.") instead of a blocking alert
- Standardized toast duration to 8 seconds, with optional close button

### Changed
- Static site now hosted on Cloudflare (Workers static-assets deploy) instead of GitHub Pages

### Fixed
- Editing an earlier still-off-board round after a later round already put the player on board no longer skips the entry-threshold check

## 0.15 - 2026-07-26

### Added
- **Live-synced house rules for multiplayer rooms** - guests now see the host's edited rule text and house-rule list for the duration of the room instead of their own saved rules; a callout banner at the top of the rules sheet tells the host their rules are shared, and tells guests whose rules they're viewing. Guests get a read-only view (no edit/delete controls); everything reverts to their own saved rules on leaving the room.

### Changed
- Room code display now visually distinguishes the "Room Code:" label from the code itself, both in the room bar and the QR modal
- Rules modal's "Reset to default" button redesigned as an icon-only control

## 0.14 - 2026-07-24

### Added
- **Multiplayer Rooms** - Jackbox-style joinable rooms for remote score tracking, backed by a Cloudflare Worker + Durable Object (SQLite storage, WebSocket Hibernation API), deployed separately from the static site
  - Host declares scoring mode in setup before opening the room - each player enters their own score (default), or host scores for everyone
  - 4-letter join code, plus a QR code that deep-links straight into the app with the code pre-filled
  - Room capacity capped at 8 players; duplicate names in a lobby are rejected
  - Round auto-advances once every player has submitted, unless a player has already won
  - Players can only enter/edit their own score; host can remove a player from the scoreboard (with confirmation)
  - Reconnect support - a dropped WiFi connection or reload silently rejoins the same room as the same player
  - Beta scope: no payment gating yet (deferred to before v1.0); unavailable for Solitaire, Generic Game, and Crazy Eights; no host reassignment if the host disconnects mid-game (documented in `worker/README.md`)
- **App now deployed to Cloudflare Workers (static assets)**, separate from the public GitHub repo, so beta testers get a private link instead of a public-repo GitHub Pages URL

---

## 0.13 - 2026-07-21

### Added
- **Device back-button support** - screen changes now push into browser/PWA history, so the hardware/gesture back button navigates the same screen stack as the in-app back buttons instead of closing the app; leaving an in-progress tracker still triggers the confirmation modal
- **Collapsible Basic Rules text** - long game intros on the setup screen clamp to 4 lines with a "Show more/less" toggle
- **Per-game default player count** - each built-in game now sets its own default player count instead of always defaulting to 4
- **Solitaire single-player support** - games with `defaultPlayers: 1` (Solitaire) allow starting and playing with a single player instead of requiring a minimum of 2
- Replaced emoji gear/back icons with inline SVG icons for consistent rendering across platforms

### Fixed
- **Crazy Eights round-closer tracking** - `trackCloser` is now actually read from the game definition instead of being hardcoded to `false`, so "went out first" is flagged as intended

## 0.12 - 2026-07-20

### Added
- **Installable as a PWA** - added `manifest.json`, app icons (`icons/icon-192.png`, `icons/icon-512.png`, `icons/apple-touch-icon.png`), and manifest/icon/theme-color links in `index.html` so the app can be installed to a home screen or desktop; service worker cache list now includes the new assets

---

## 0.11 - 2026-07-19

### Fixed
- **Qwirkle's home-screen icon rendered as an oversized fallback glyph** - the icon used an unassigned Unicode codepoint (`&#126124;`) instead of the mahjong tile emoji, so browsers rendered it as a tall "tofu" box; swapped in the correct mahjong tile codepoint (`&#126980;`, the mahjong tile emoji)
- Restored the "More Coming" placeholder card under the Custom Games and More section, which had been dropped from the home screen

---

## 0.10 - 2026-07-19

### Added
- **Version-history snapshots for v0.06 and v0.09** - `snapshots/v0.06/` and `snapshots/v0.09/` now hold live copies of the app at those releases, filling gaps left since v0.04. v0.05, v0.07, and v0.08 were never committed as standalone states (each got folded into the following version's commit before it was pushed), so there's no accurate code to snapshot for them - the version-history timeline still lists them with their changelog summary, but says so instead of linking to a snapshot that doesn't exist

---

## 0.09 - 2026-07-19

### Added
- **10 new built-in games** - Yahtzee, Qwirkle, Cribbage, Euchre, Crazy Eights, Left Right Center, Poker, Gin Rummy, Liar's Dice, and Solitaire, each with a full intro and scoring-rules reference, joining Farkle on the home screen under new Dice/Card/Tile Game category dividers
- **Per-game score entry rules** - fixed (non-Custom) games now declare their own score step, whether negative scores are allowed, and win direction (highest or lowest total wins), instead of every non-Custom game reusing Farkle's rounding-to-50 and floor-at-zero behavior

### Fixed
- **Score entry silently corrupted non-Farkle fixed games** - the Add Turn modal and inline score editor rounded every non-Custom game's scores to the nearest 50 and blocked negative values, which is only correct for Farkle's dice combinations; other fixed games would have had small scores (e.g. Euchre's 1-4 point hands) rounded down to 0
- **Fixed games with no natural win target defaulted to a bogus 10,000-point target** - leaving the win-score field at 0 (intended as "no target," same as Custom Game supports) fell through to a hardcoded fallback instead of being honored

---

## 0.08 - 2026-07-19

### Added
- **Up to 8 players per game** (was 6) - the player color palette already had 8 colors defined but the setup screen capped adding players at 6
- **Basic Rules on the setup screen** - picking a game now goes straight to setup, with a Basic Rules panel (the game's intro) shown above the player list and a "See Scoring and Custom Rules" button that opens the full Rules modal (the ? button) for individual scoring lines and house rules. No more pop-up between the tile and setup
- **Home screen category grouping** - the Custom Game catch-all is now pinned above all category sections; Farkle sits under a new "Dice Games" divider, with a "More Coming" divider above the placeholder tile

### Changed
- **Elaborated Farkle rules** - rewrote the intro as three paragraphs covering turn order, the "still rolling!" (hot dice) mechanic, and a full worked example turn; added "still rolling" as its own rule line
- Bumped the in-app version string (Settings) to match CHANGELOG, which had drifted a release behind

### Fixed
- **System display mode didn't stick** - the Settings sheet was reading the resolved dark/light value instead of the stored preference, so the System button never showed as selected on reopen, and switching color themes while in System mode silently pinned the mode to whichever it currently resolved to. Both now read/write the actual `system` preference
- **Hard refresh resumed a game with no scores** - the auto-save resume check only looked at player count, so a brand-new game (0 rounds logged) auto-resumed on reload instead of returning to the home screen. Resume now requires at least one scored round

---

## 0.07 - 2026-07-19

### Changed
- **Forest dark theme accent color** - swapped the neon lime accent (#5ca832/#78cc44) for a muted sage green (#6b9c52/#85b869) that reads calmer against the dark background; Forest light mode is unchanged

---

## 0.06 - 2026-07-16

### Added
- **Player color customization** - the color dot next to each player is now a tappable button on both the setup screen and the active tracker header; opens a palette popover to pick a different color mid-game. Dots enlarged for easier tapping on mobile. Two new palette colors (pink, indigo) added, and Player 1's default color changed from red to blue
- **Settings button on every screen** - the gear icon now appears on the setup and tracker screens, not just Home
- **App version shown in Settings** - displayed at the bottom of the Settings sheet
- **System display mode** - Settings now include a System option (follows OS light/dark preference) alongside Dark/Light, listed first; System is the default for new visitors

### Changed
- Unified the rule-edit button styling across the built-in rules intro, scoring lines, and custom house rules into one square, rounded-corner icon button, replacing the old bullet/text-link styles
- Renamed "Custom Notes" to "Custom Rules" in the rules modal, and simplified the modal's title to a static "Game Rules"
- Restyled the delete-custom-rule button as a square, red-bordered danger button
- Swept stray em dashes into regular dashes across the app and docs

---

## 0.05 - 2026-07-09

### Added
- **Auto-save + resume** - the active game saves to `localStorage` on every change (scores, renames, house rules, win state). Closing the tab or locking the phone mid-game no longer loses the scores: reopening the app resumes the unfinished game directly on the tracker screen. Finished games are not resumed, and deliberately leaving a game (Back -> Leave) clears the save

### Fixed
- Inline score editing now applies the same entry-threshold rule as the Add Turn modal: a player not yet on the board must reach the minimum score in a single turn, otherwise the edited cell stays off the board (`✗`). Previously any edited score above 0 incorrectly put the player on the board
- Backing out of a resumed game no longer lands on an empty setup form

---

## 0.04 - 2026-07-06

Milestone release: second game type, plus win/round-tracking flair.

### Added
- **Custom Game tracker** - a freeform score sheet for games like Skyjo: name the game, log a score per player per round, no fixed rules. Selectable from a new "Custom Game" card on the home screen
- **Golf scoring toggle** - per custom game, choose "Highest wins" or "Lowest wins (golf)"; the winner banner and the totals-row 👑 leader marker both respect the direction
- **Negative round scores** in custom games (Skyjo can go below zero); the Add Turn modal and inline cell editing both accept them
- **No-limit target** - a custom game's win target can be set to 0 to just track scores with no automatic end
- **Win confetti** - a classic confetti burst (colored from the player palette) fires when a game is won, with a subtle pop on the winner banner; fires once per win and honors `prefers-reduced-motion`
- **"Track who goes out first"** - an opt-in per-custom-game toggle. When on, the Add Turn modal shows a tap-to-toggle "Who went out first?" selector, and that round's closer gets a ⚑ flag next to their score

### Fixed
- Theme class-name collision: the scoring-direction buttons shared the `.mode-btn` class and were triggering the theme handler, which wrote an invalid mode to `localStorage` and blanked the theme (white screen). Scoring buttons now use a dedicated `.dir-btn` class
- Hardened theme loading - invalid stored `theme`/`mode` values fall back to Ocean/Dark instead of leaving CSS variables unresolved

---

## 0.03 - 2026-06-30

### Added
- Service worker (`sw.js`) for PWA offline support and cache-first asset serving; cache version bumped on every push so installed Android PWAs auto-update on next launch
- Version history page (`snapshots/index.html`) - timeline of milestones with live links to each saved snapshot; snapshots stored in `snapshots/vX.XX/`

---

## 0.02 - 2026-06-28

### Added
- Color themes (Ember, Ocean, Forest) × dark/light mode; 6 CSS variable blocks; Ocean dark is the default
- Settings gear button on home screen opens a bottom-sheet theme/mode picker; preference persists in `localStorage`
- Anti-flash inline script in `<head>` applies saved theme before first paint
- Entry threshold mechanic - players must score ≥ 500 in one turn to get on the board; scores below threshold stored as `null` and shown as `✗` on an accent-tinted cell
- Inline player name editing - tap a column header to rename mid-game
- Inline score editing - tap any cell to correct a score; totals and win check recalculate immediately
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

## 0.01 - 2026-06-27

### Added
- Single-page app: Home → Setup → Score Tracker screens
- Farkle with running totals and configurable first-to-10,000 win condition
- Add Turn bottom-sheet modal with per-player score inputs
- Rules modal with built-in Farkle rules
- 2–6 players with distinct color-coded columns
- Winner banner on win condition reached
