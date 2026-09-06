# Board Game Tracker

A lightweight score-tracking web app for board games and dice games. No install, no accounts - just open and play.

**Live:** https://board-game-tracker.benzur.workers.dev

---

## Features

- **7 available built-in games** - Farkle, Pipzee, Cribbage, Euchre, Gin Rummy, Three Thirteen, and Skyjo, each with its own scoring rules and win condition
- **Pipzee scorecard** - a per-category dice scorecard with quick score choices, bonuses, turn order, multiplayer support, and a winner once every category is filled
- **Game-rule setup** - game-specific player limits and fixed endings replace generic controls where needed: Euchre is one to three teams, Gin Rummy and Three Thirteen support one or two scorekeepers, and Three Thirteen ends after 11 completed rounds. Entry Threshold appears only for games that use it
- **Generic Game** - a freeform score sheet for any game not on the list: name the game, log a score per round, no fixed rules
  - **Golf scoring toggle** - highest total wins, or lowest wins (golf)
  - **Negative scores** and an optional **no-limit target** (set to 0 to just track scores). The target only ends the game - the winner is then whichever total is best for the chosen direction, so in golf the player who crossed it is usually not the one who wins
  - **"Track who goes out first"** - opt-in per game; flags the round closer (⚑) next to their score
- **1–8 players, set with a die** - setup shows a large die with ± buttons, and its pips light up in each player's own colour as the count rises. Seven and eight pips are not faces a real die has; the die is the counter, not a simulation. Each player gets a name field below it, and typed names survive dropping the count and raising it again. A game can be set up with a single player, on one device or as a host opening a room before anyone else has arrived. Tab moves from one name field to the next rather than stopping at the colour dot in between. Columns stay colour-coded on the board; tap your colour dot on setup or mid-game to change it, including in multiplayer
- **Inline editing** - tap any score cell or player name to edit mid-game
- **Turn-ordered single-device entry** - Farkle, Cribbage, Pipzee and Skyjo enter one seat at a time, in turn order, on a single device too, not just in a multiplayer room: Enter Score offers only the current seat, a blank cell in the open round is only tappable for whoever's turn it actually is, and tapping a player's name gives single-device play its own **Make It Their Turn** control (the same override multiplayer's host has) to correct who is up. Every other game keeps the original all-players-at-once sheet
- **New and updated game markers** - compact right-aligned ticket tabs flag new games and recent rules work on the home game cards. Declare them manually in `GAME_CARD_TAGS` near the game definitions in `app.js`
- **Score cell marks** - `·` for a turn nobody has entered yet, `F` in Farkle for a turn that banked nothing (a Farkle, or a score that missed the entry threshold - the two are the same at the table), and `✗` in other games with an entry threshold, where being on the board is a state of its own
- **Enter Scores sheet** - enter one or more players' scores for a round in one step; fields begin empty and blanks are skipped, while explicit zeroes are recorded. The heading names the round, each row leads with the player's name on the same coloured chip the board uses, and the field being typed into is outlined in that player's own colour. A **New Total** column on the right answers "what will my score be", counting to the projected figure as the digits land rather than snapping to it. In Farkle it rounds to the nearest 50 exactly as the save does, so it never promises a total the board will not show. Save Scores leads, Cancel follows it. On a keyboard, Enter moves to the next field and saves the round from the last one
- **± sign toggle** - wherever negative scores are legal, a ± button sits beside each score field and flips the sign of what is typed. Phone keypads have no minus key and no `inputmode` setting adds one, so this is how a negative is entered on mobile; it works the same in the Enter Scores modal and in the tap-a-cell inline editor
- **Board animations** - totals count up to their new value, a new round slides in, a score that changed since you last looked flashes once, and the turn highlight fades onto the column that just took the turn. All of it is information, not decoration, and all of it is skipped under `prefers-reduced-motion`
- **Turn haptics** - choose Off, Short, Normal or Strong in Settings. Compatible devices use the selected cue when it becomes your turn; unsupported browsers simply use the visible turn notice
- **Winner banner + confetti** - detects wins and ties, then fires a confetti burst (honors `prefers-reduced-motion`); tapping the banner adds another, up to three at once, synced to everyone in multiplayer
- **Rules one tap from setup** - picking a game goes straight to setup, with a "See Scoring and Custom Rules" button. The old Basic Rules panel is gone: it printed the same intro text the popup already carries
- **Device back-button support** - hardware/gesture back navigates the same screen stack as the in-app back buttons, with the same in-progress-game confirmation guard
- **Rules modal** - built-in game rules (editable) plus custom house rules you can add at runtime, opened via the ? button
- **Confirmation modal** - warns before leaving an in-progress game
- **Auto-save + resume** - the active game persists to `localStorage` once at least one round is scored; reopening the app resumes an unfinished game right where it left off, scrolled to the round in progress
- **Auto-scroll to the live round** - entering a score, starting a round and resuming a game all bring the newest round into view just above the totals row, stopping short of the very bottom so the newest round sits clear of the sticky totals rather than tucked under it. These scrolls never bring the hidden bars back, so a round landing on someone else's device does not reshuffle your screen
- **Pip design system** - one theme in dark (mulberry plum) and light (cream paper) modes, plus system (follows OS); scrollbars are themed alongside everything else. Every control shares one physical model: a hard zero-blur offset shadow, and a press that drops the button by exactly that offset so it lands in its own shadow. Filled controls carry a 3px border in their own deep hue and always take dark ink text, never white. Tiles, chips and the die are tilted; the score table, totals and standings never are, because a run of comparable numbers has to stay level to be read
- **Sound** - a soft pop on every button press and a victory fanfare on a win (**Kalimba Sparkle**: a pentatonic thumb-piano run leaving a high shimmer behind it, chosen to survive being heard many times in one evening), each pitched slightly differently every time from five variants so repeated presses do not sound like one recording on loop. Everything is synthesized in the browser (`sfx.js`), so no audio files ship and the app still works offline. Volume lives in Settings and mutes at zero; audio only starts after your first tap, which is what browsers require
- **Self-hiding tracker bars** - the title bar, room-code bar and action bar collapse together after three seconds without a manual scroll, so a long game settles into being all score board. Any real input on the board - a finger drag, a wheel, an arrow key - brings all three back at once and restarts the countdown; the app's own auto-scrolls do not. A board too short to scroll keeps all three pinned, since there would be no gesture left to bring them back
- **Floating Enter Score button** - while the action bar is collapsed, a round ⊕ button takes its place in the bottom left, sitting over the round-number gutter and clear of both the totals row and the round being played. It rests at 72% opacity so the numbers underneath stay readable, and carries the same multiplayer turn lock as the bar it stands in for
- **Settings on every screen** - theme, mode, and app version are always one tap away; the version also sits in the top left of the home screen
- **Responsive** - mobile-first with clean tablet (700px) and desktop (1080px) breakpoints
- **No flash** - theme is applied before first paint via an inline script; persists across sessions
- **Splash screen** - the app opens on the Pip mark with its die spinning around the centre pip, which cycles through all eight player colours while the caption reads "Whose turn is it anyway?". It clears as soon as the first frame is ready rather than being held for a fixed minimum, so it is a cover for the load and never a delay added to it
- **404 page** - a broken or moved link lands on a styled page rather than the platform default, reading 404 as four, the die's centre pip, four. It carries a Back to Home button and the app's own ambient background, and Cloudflare is configured to serve it via `not_found_handling`
- **Installable PWA** - `manifest.json` and app icons let the app be added to a home screen or installed as a desktop app, supports screen rotation, and includes offline caching plus a dismissable notification that names the new version when it is ready to reload
- **Multiplayer Rooms** - host or join a 4-letter-code room to track scores together remotely; shareable invite link and QR code (Enter submits the code on the join screen), live roster, persistent player colors (duplicates allowed), host-controlled turn highlighting, per-player or host-only scoring, own-score-only editing, and host removal. Tapping a player name opens a sheet with Declare Current Turn, Rename Player and Remove from Game, stacked full width on a phone and sitting on one row from 640px up. That sheet also reports the seat's connection as a coloured dot: green in the game, amber away, red disconnected. Away appears within about ten seconds of a player leaving the tab and is purely cosmetic - the five-minute grace window below is untouched by it, so nothing about turn order or round advance changes while a dot is amber. Renaming is not self-only: you can rename your own seat and any seat you added in a group join, and the host can rename anyone. Same-device, same-name reconnects reclaim the existing player instead of creating a duplicate. In per-player-scoring rooms a joining player can nominate another player in the room to enter scores for them (picked during the join flow, changeable any time from the Scoring button in the room bar; below 640px the room bar drops the code so the invite and scoring buttons stay on one row, and the code is still on the invite sheet); the nominated player enters all their columns in one modal. Score entry follows the turn: a device holding several seats is asked only for the seat whose turn it is plus any of its seats queued directly behind that one, and off-turn the Enter Score button reads as locked and says whose turn it actually is. A Farkle table rolls off to decide who leads, so the host declares the first player from the same sheet and the round's turn order rotates from there. The same die that sets the player count on setup runs both room paths. Hosting shows it with the name fields before the room is created, and those names come into the room as the host's seats. Several people sharing one phone can join together the same way: a compact die starting at 1 allocates up to all 8 seats, capped to the room's remaining capacity, with one name field per person, and toasts which wall you hit - the room's maximum, one seat left, or N seats left. They all become full players, and that device keeps score for the whole group. When the turn moves to a column this device is responsible for, a "Your turn" card announces it in the centre of the screen, with one shimmer sweeping through its title and around its border. The screen dims behind it, and it clears itself after a couple of seconds (tapping the card or the dimmed area dismisses it early). It stays silent on join, rejoin, and on the turn handoff that ends the game - including in final-round games like Farkle, where the game is not decided the instant the target is crossed. Dropping out is forgiving: a closed connection starts a 5-minute grace window instead of marking you disconnected immediately, so a refresh, a locked phone or a throttled background tab does not strike your name out, skip your turn, or leave a gap in the round. The app pings the room every 25s, force-closes a socket that has gone silent, retries with backoff, and reconnects the moment a backgrounded tab is visible again; only when those retries are exhausted does a blocking Reconnect dialog appear, and reloading rejoins the room automatically. The board follows play on every device, scrolling down to a new round and sideways to centre the current player's column, and a join or rejoin lands on the latest round rather than round 1. A host with other players in the room can start a New Game in place - same room code, same roster, scores cleared, host on the first turn - while the Back button still closes the room outright. Removed and departed players take their score columns with them. Guests see the host's edited rules and house-rule list live for the duration of the room. Backed by a separate Cloudflare Worker (`worker/`) - see its README for deploy steps
- **Screen Wake Lock** - keeps the display on while a game is being tracked, so it doesn't auto-lock mid-round (requires HTTPS or localhost)

---

## Usage

Open `index.html` in a browser. No build step required.

1. Pick a game on the home screen - the Generic Game catch-all sits above the category groups (e.g. "Dice Games")
2. On setup, choose **Single Device** or **Multi-Device Room**, tap ± on the die to set 1–8 players and name them (tap "See Scoring and Custom Rules" for the game's rules), then set the win score and entry threshold
3. Tap **Enter Score** after each round to log scores
4. Tap any cell to correct a score; tap a player name to rename them (in multiplayer, any name you own, or any name at all if you are the host)
5. Change theme/mode anytime via the gear icon (⚙) on the home screen

---

## Project Structure

```
index.html         - markup and screen layout
404.html           - styled not-found page, served by Cloudflare via not_found_handling
style.css          - all styling; CSS custom properties for theming
app.js             - all game logic and DOM interaction
sw.js              - service worker; cache version bumped on every push for PWA auto-update
manifest.json      - PWA manifest (name, icons, theme color, install behavior)
sfx.js             - procedural Web Audio sound effects; no audio files
icons/             - app icons (Pip mark as SVG, plus 192/512/apple-touch/maskable PNGs)
qrcode.js          - vendored QR-code generator (multiplayer room join links)
wrangler.jsonc     - Cloudflare Workers static-assets deploy config for this site
.assetsignore      - files excluded from the Cloudflare deploy (dev-only dirs, internal docs)
worker/            - Cloudflare Worker + Durable Object backend for Multiplayer Rooms (separate deploy target, see worker/README.md)
tests/
  regressions.mjs  - dependency-free regression checks; run with `node tests/regressions.mjs`
progress/          - per-work-item detail files linked from PROGRESS.md (internal, not deployed)
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
- **Farkle** - dice game, first to 10,000 points (configurable), minimum 500 to get on the board (configurable); once someone crosses the target, everyone else gets one more turn to beat it before a winner is declared - whoever played after them finishes the current round, and whoever played before them takes their turn in the next one. Turn order counts from whoever led the round off, not from the leftmost column, so a player who goes first and crosses the target ends the game when that round completes
- **Skyjo** - card game, lowest running total wins, ends at 100 (configurable) once the score row that crosses it is complete. Negative scores are legal (cards run -2 to 12) and round-closer tracking flags who ended each round
- **Generic Game** - freeform round-by-round score sheet, with high/low (golf) scoring, negative scores (entered with the ± toggle), optional target, and opt-in round-closer tracking

More games planned (round-by-round and category-based scoring).

---

## Development

Pure HTML/CSS/JS - no framework, no bundler, no dependencies except Google Fonts (Commissioner).

Run the regression checks before pushing:

```sh
node tests/regressions.mjs
```

They need no install step - the harness reads `app.js`, `index.html`, `style.css`, `sfx.js`, `404.html`, `wrangler.jsonc` and `worker/src/room.ts` directly and asserts that previously fixed behaviour is still in place.

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
