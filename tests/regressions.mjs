import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../worker/src/room.ts', import.meta.url), 'utf8');
const notFound = fs.readFileSync(new URL('../404.html', import.meta.url), 'utf8');
const wrangler = fs.readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
const sfx = fs.readFileSync(new URL('../sfx.js', import.meta.url), 'utf8');

const rosterHelper = app.match(/function reconcileRosterColumns[\s\S]*?\n}\n/);
assert.ok(rosterHelper, 'roster reconciliation helper must exist');
const context = {};
vm.runInNewContext(`${rosterHelper[0]}; this.reconcile = reconcileRosterColumns`, context);

const result = context.reconcile(
  [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
  [{ id: 'a' }, { id: 'c' }, { id: 'd' }],
  [[10, 20, 30], [40, 50, 60]],
  [true, false, true],
);
assert.deepEqual(JSON.parse(JSON.stringify(result)), {
  rounds: [[10, 30, null], [40, 60, null]],
  roundSubmitted: [true, true, false],
}, 'leaving players must take their score columns with them');

assert.doesNotMatch(app, /if \(state\.multiplayer\) return; \/\/ color is assigned/,
  'multiplayer color editing must not be disabled');
assert.match(app, /type: 'update-color'/, 'color changes must be sent to the room');
assert.match(worker, /case "update-color"/, 'the room must accept color changes');
assert.match(app, /td\.textContent = 'F'/, 'Farkle zeroes must render as F');
assert.match(worker, /this\.room\.gameKey === "farkle" && value === 0/,
  'the room must preserve below-threshold Farkles');
assert.match(app, /const MP_DEVICE_ID_KEY/, 'multiplayer must keep a stable device identity');
assert.match(app, /deviceId: mpDeviceId\(\)/, 'joins must send stable device identity');
assert.match(worker, /player\.deviceId === message\.deviceId/, 'same-device same-name joins must reclaim the existing player');
// crypto.randomUUID is secure-context only, so a bare call broke joins entirely
// on the plain-http LAN preview - the throw happened inside the socket's open
// handler and the join message was never sent.
assert.match(app, /typeof crypto\.randomUUID === 'function'/, 'device id must fall back when crypto.randomUUID is unavailable');
assert.equal((app.match(/crypto\.randomUUID\(\)/g) || []).length, 1, 'crypto.randomUUID must only be called from the guarded mpRandomId helper');
assert.match(app, /setTimeout\([\s\S]*?socket\.close\(\)[\s\S]*?mpRenderRoomBar\(\)/,
  'leaving must hide the room bar and give the leave message time to flush');
assert.match(worker, /this\.send\(ws,[\s\S]*?Unsupported message type/,
  'newer harmless message types must not disconnect an older client');
assert.doesNotMatch(worker, /PLAYER_COLORS\.includes\(color\)[\s\S]*?some\([^)]*candidate\.color/,
  'multiplayer colors must not be unique');
assert.match(app, /class="turn-score-input" value=""/,
  'score inputs must start blank');
assert.match(app, /filter\(entry => entry\.value !== null\)/,
  'blank proxy-scoring entries must not be submitted');
assert.match(worker, /roundSubmitted\[index\] \|\| Number\.isFinite\(values\[index\]\)/,
  'blank host-scoring entries must remain unsubmitted');
assert.match(worker, /REJOIN_RESERVATION_MS = 10 \* 60 \* 1000/,
  'disconnected player identity must be reserved for ten minutes');
assert.match(worker, /reconnectUntil: number \| null/,
  'player state must persist reconnect reservation expiry');
assert.match(app, /url\.searchParams\.set\('_refresh', Date\.now\(\)\.toString\(\)\)/,
  'the refresh button must bypass HTTP and service-worker caches');
assert.match(app, /registration => registration\.unregister\(\)/,
  'hard refresh must unregister the currently controlling service worker');
assert.match(app, /key\.startsWith\('board-game-tracker-'\)/,
  'hard refresh must clear old app caches');
assert.match(worker, /currentTurnPlayerId = player\.id/,
  'new rooms must start with the host as the current turn');
assert.match(worker, /currentTurnPlayerId \?\?[\s\S]*?this\.room\.players\.find\(\(player\) => player\.isHost\)\?\.id/,
  'persisted rooms without turn state must default to the host');
assert.match(worker, /findNextUnsubmittedPlayerId\([\s\S]*?roundSubmitted/,
  'turn advancement must scan for the next player who has not scored');
assert.match(worker, /!player\.connected \|\| room\.roundSubmitted\[candidateIndex\]/,
  'turn advancement must skip disconnected and already-scored players');
assert.match(index, /New version \(v\$\{version\}\) available/,
  'the update toast must show the available app version');
assert.match(index, /id="winner-column-frame"/,
  'the score table must provide one shared winner-column frame');
assert.match(app, /fireConfetti\(\);[\s\S]{0,40}?window\.sfx\.play\('victory'\);/,
  'the victory fanfare must sit inside the celebrated gate - checkWin reruns on every render once a game is decided');
assert.equal((app.match(/window\.sfx\.play\('victory'\)/g) || []).length, 1,
  'the app must have exactly one victory-fanfare trigger');
assert.match(app, /function openVictoryScreen\([\s\S]*?navigateTo\('screen-victory'\)[\s\S]*?window\.sfx\.play\('victory'\)/,
  'the fanfare must trigger only after the final-score screen becomes active');
assert.match(index, /id="screen-victory"[\s\S]*id="victory-winner-card"[\s\S]*id="victory-standings-list"/,
  'a completed game must have a dedicated victory screen with a replayable winner card and final standings');
assert.match(index, /victory-winner-name[\s\S]*victory-winner-label">1st Place - Winner/,
  'the winner name must sit above the first-place label');
assert.match(app, /victory-winner-card'[\s\S]{0,180}replayCelebration\(\)/,
  'tapping the first-place card must replay the celebration');
assert.match(app, /victory-winner-card'[\s\S]{0,180}replayCelebration\(\);[\s\S]{0,80}mpSend\(\{ type: 'celebrate' \}\)/,
  'a multiplayer winner-card tap must celebrate locally before relaying to the room');
assert.match(worker, /case "celebrate":[\s\S]{0,420}this\.broadcast\(\{ type: "celebrate" \}, ws\)/,
  'the room must exclude the tapping socket from the relayed celebration to prevent a duplicate burst');
assert.match(app, /if \(activeScreen === 'screen-victory'\) return;\s*navigateTo\('screen-victory'\)/,
  'the results screen must only replace the tracker after the final victor is settled');
assert.match(app, /function resetForRematch\(rounds = \[\]\)[\s\S]*?state\.rounds = rounds;[\s\S]*?state\.gameOver = false;/,
  'a rematch must explicitly replace the completed rounds and clear game-over state');
assert.match(app, /btn-victory-rematch'[\s\S]*?resetForRematch\(\)/,
  'a local rematch must start through the full score-reset path');
assert.match(app, /function mpOnGameReset\(msg\)[\s\S]*?resetForRematch\(msg\.rounds\)/,
  'a multiplayer rematch must replace the old scoreboard with the Worker reset payload');
// Superseded in v0.26: the fill moved OFF the frame and into the cells. The
// frame is a positioned element above the table, so filling it washed player
// colour over the scores, the name chip and the Farkle red - contrast the text
// could not get back. The cells paint the tint under their own content
// instead, and the end cells round it so the corners still match the outline.
assert.match(style, /\.turn-column-frame \{[\s\S]*?background: transparent;/,
  'the frame draws the outline only - a fill on it covers the scores');
assert.match(style, /#score-table tbody tr:nth-child\(odd\) td\.current-turn \{\s*background: linear-gradient\(var\(--turn-tint\), var\(--turn-tint\)\), var\(--row-a\);/,
  'the tint is a cell background layer over the zebra ground, beneath the text');
assert.doesNotMatch(style, /#score-table tfoot td\.current-turn \{[^}]*border-radius:/,
  'rounding the cell itself clips its ground too, biting notches out of the totals bar');
assert.match(style, /#score-table thead th\.current-turn,\s*#score-table tfoot td\.current-turn \{ isolation: isolate; \}/,
  'without a stacking context on the cell, a z-index -1 tint falls behind the cell background and vanishes');
assert.match(style, /#score-table tfoot td\.current-turn::before \{\s*inset: calc\(-1 \* var\(--accent-border\)\) 0 0 0;/,
  'the tint must reach over the 3px rule above the totals, which sits outside the padding box');
assert.match(style, /#score-table tfoot td\.current-turn::before \{ border-radius: 0 0 12px 12px; \}/,
  'the tint rounds to the frame while the cell ground stays square behind it');
assert.match(app, /tailRow\.appendChild\(document\.createElement\('td'\)\);/,
  'the scroll tail needs real cells - a colspan leaves the tinted column bare above the totals');
assert.match(app, /table\.style\.setProperty\('--turn-color', turnColor\);/,
  'the cells cannot inherit from the frame - the colour must be set on the table too');
assert.match(style, /\.btn-back \{[\s\S]*?flex-shrink: 0;/,
  'the back button must not shrink when the header runs out of width');
assert.match(app, /showWinnerColumnFrame\(winIdx\)/,
  'game over must move the shared frame to the winning column');
assert.match(app, /querySelectorAll\('#score-table \.current-turn'\)/,
  'game over must remove current-turn highlighting');
const groupRowIndex = index.indexOf('id="group-size-row"');
const primaryNameIndex = index.indexOf('id="player-name-input"');
assert.ok(groupRowIndex !== -1 && groupRowIndex < primaryNameIndex,
  'player-count selection must appear before the primary name field');
assert.match(index, /id="group-count-die"[\s\S]*?class="die-cell"/,
  'the join sheet must pick its player count with the die control');
assert.match(app, /function paintDieFace\(die, count, colors\)/,
  'the setup die and the join die must paint faces through one function');
assert.doesNotMatch(index, /Players on this device|You'll enter scores for everyone on this device/,
  'the old players-on-this-device lines must be removed');
// The Worker assigns seat colours from its own copy of the palette and validates
// every update-color against it. When the app moved to the Pip palette and the
// Worker did not, auto-assigned seats got colours the client had no ink/border
// pairing for, and every manual colour change was silently rejected server-side.
// Nothing caught it, so this compares the two lists directly.
const clientPalette = (app.match(/const PLAYER_COLORS = \[([\s\S]*?)\];/) || [])[1] || '';
const workerPalette = (worker.match(/const PLAYER_COLORS = \[([\s\S]*?)\];/) || [])[1] || '';
const hexes = (text) => (text.match(/#[0-9a-fA-F]{6}/g) || []).map((h) => h.toUpperCase());
assert.ok(hexes(clientPalette).length === 8, 'the client palette must list eight player colours');
assert.deepStrictEqual(hexes(workerPalette), hexes(clientPalette),
  'the Worker player palette must match app.js exactly, in the same order');

assert.match(app, /const MP_MAX_GROUP_SIZE = 8/,
  'the client must allow one device to represent all eight room seats');
assert.match(worker, /const MAX_GROUP_SIZE = 8/,
  'the Worker must allow one device to represent all eight room seats');
assert.match(app, /Math\.min\(MP_MAX_GROUP_SIZE, seatsLeft\)/,
  'the join die must cap device players at the remaining room seats');
assert.match(style, /\.count-die-row--compact \.count-die[\s\S]*?width:\s*104px/,
  'the join sheet must use the smaller die so it fits beside the name fields');
assert.match(app, /function mpStepGroupSize\(delta\)[\s\S]*?showToast\(`This room only has \$\{cap\} seats left\.`\)/,
  'trying to add more players than the room can seat must say so in a toast');
assert.match(app, /if \(announce && turnChanged\) mpAnnounceTurn\(nextTurn\)/,
  'the your-turn toast must fire only when the current turn actually changes');
assert.match(app, /msg\.currentTurnPlayerId, \{ announce: false, roundStarts: msg\.roundStarts \}\)/,
  'joining or rejoining a room must not fire the your-turn toast');
assert.match(app, /if \(!player \|\| !mpEntersScoresFor\(player\)\) return;/,
  'the your-turn toast must only fire for players this device scores for');
assert.match(style, /\.turn-toast-title[\s\S]*?-webkit-background-clip: text/,
  'the your-turn toast shimmer must clip its gradient to the text');
assert.match(style, /\.section-label \{[^}]*font-size: 0\.78rem;[^}]*letter-spacing: 0\.18em;/,
  'global section labels must match the Home category-label typography');
assert.match(style, /\.modal-title \{[^}]*font-family: var\(--font-display\);[^}]*font-size: 1\.75rem;[^}]*text-transform: uppercase;/,
  'all modal titles must share the Enter Score title treatment');
assert.match(style, /\.modal-title-row \.btn-rules \{[^}]*width: 36px;[^}]*height: 36px;[^}]*font-size: 1\.1rem;/,
  'the Enter Score rules button must remain legible beside the enlarged title');
assert.match(style, /button, input, select, textarea \{ font: inherit; \}/,
  'native controls must not fall back to browser Arial');
assert.match(style, /@media \(max-width: 420px\)[\s\S]*?\.modal-title \{ font-size: 1\.45rem; \}/,
  'long modal titles must step down on narrow phones');
assert.match(style, /\.po-label \{[^}]*font-size: 0\.78rem;[^}]*letter-spacing: 0\.18em;/,
  'Player Options labels must use the shared section-label scale');
assert.match(style, /\.custom-rules-heading \{[^}]*font-size: 0\.78rem;[^}]*font-weight: 900;[^}]*letter-spacing: 0\.18em;/,
  'Custom Rules must use the shared section-label treatment');
assert.match(style, /\.went-out-label \{[^}]*font-size: 0\.78rem;[^}]*font-weight: 900;[^}]*letter-spacing: 0\.18em;/,
  'the closer picker label must use the shared section-label treatment');
assert.doesNotMatch(style, /font-weight:\s*1000/,
  'Nunito is loaded only through weight 900, so unsupported synthetic 1000 must not return');
assert.match(style, /--shadow-tile:\s+0 6px 0 rgba\(0, 0, 0, \.367\)/,
  'dark-mode raised tiles must use the softer approved shadow opacity');
assert.match(style, /--shadow-tile:\s+0 6px 0 rgba\(33, 19, 31, \.147\)/,
  'light-mode raised tiles must use the softer approved shadow opacity');
assert.match(style, /--shadow:\s+0 5px 0 rgba\(0, 0, 0, \.367\)/,
  'dark-mode buttons and chips must use the softer approved shadow opacity');
assert.match(style, /--shadow:\s+0 5px 0 rgba\(33, 19, 31, \.147\)/,
  'light-mode buttons and chips must use the softer approved shadow opacity');
assert.match(app, /row\.style\.setProperty\('--player-color', color\)/,
  'each setup name field must start with its selected player color');
assert.match(app, /dot\.dataset\.color = newColor;\s*row\.style\.setProperty\('--player-color', newColor\)/,
  'changing a setup player color must immediately update the name-field focus border');
assert.match(style, /\.table-scroll-wrap \{[^}]*background-image: radial-gradient\([^}]*var\(--grain-dot\)[^}]*background-size: 3px 3px;/,
  'the open tracker board must preserve the redesign\'s faint dot-grid grain');
assert.match(style, /@keyframes amb-a \{[\s\S]*?23%[\s\S]*?51%[\s\S]*?78%/,
  'ambient color must drift through several gentle waypoints instead of a mechanical two-point loop');
assert.match(style, /background-color: color-mix\(in srgb, var\(--row-b\) 68%, transparent\)/,
  'the dotted tracker surface must let the moving ambient color faintly show through');
assert.match(style, /--grain-dot:[^;]+;[\s\S]*--grain-dot:[^;]+;/,
  'dark and light modes must each define the same effective dot treatment used across the app');
assert.match(style, /\.table-scroll-wrap \{[^}]*var\(--grain-dot\)/,
  'the score screen must use the shared app-grid opacity instead of a stronger local grid');
assert.match(style, /#screen-setup \.screen-header,\s*#screen-tracker \.screen-header \{[^}]*border-radius: 0 0 16px 16px;/,
  'Setup and Score title bars must share their rounded lower corners');
assert.match(style, /#mp-room-bar\.hidden ~ \.table-scroll-wrap \{\s*margin-top: 12px;/,
  'single-player boards must have matching title-bar and footer-bar gaps');
assert.match(style, /@keyframes amb-a \{[\s\S]*?translate3d\(16%/,
  'ambient drift must travel far enough to be perceptible through the blurred background');
assert.match(style, /\.ambient i:nth-child\(1\) \{\s*top: 8%; left: 12%; width: 65%; height: 45%;/,
  'the upper ambient blob must remain inset enough for its full animated envelope');
assert.match(style, /\.ambient i:nth-child\(2\) \{[\s\S]*?bottom: max\(10%, 72px\); right: 10%; width: 66%; height: 38%;/,
  'the lower ambient blob must keep a blur-safe inset even on short viewports');
assert.match(style, /\.ambient u \{[^}]*mix-blend-mode: var\(--grain-blend\)/,
  'stationary dots must brighten locally as ambient color passes beneath them');
assert.match(index, /class="ambient"[^>]*><i><\/i><i><\/i><i><\/i><b><\/b><b><\/b><b><\/b><u><\/u>/,
  'each ambient color field needs a matching moving dot-glow layer');
assert.match(style, /\.ambient b \{[^}]*background-image: radial-gradient\(var\(--dot-glow\)[^}]*opacity: \.16;/,
  'passing ambient fields must create a clearly visible colored lift in the dot grid');
assert.match(style, /\.ambient b \{[^}]*inset: 0;[^}]*will-change: mask-position;/,
  'dot highlights must keep a full-viewport stationary texture while only their masks move');
assert.doesNotMatch(style, /\.ambient b:nth-of-type\([^)]*\)[^{]*\{[^}]*animation: amb-/,
  'highlight dot blocks must never transform with the ambient blobs');
assert.match(app, /if \(!state\.multiplayer \|\| !playerId \|\| mpGameDecided\(\)\) return;/,
  'the your-turn toast must stay silent once the board decides the game, not just once gameOver is set');
assert.match(app, /function mpGameDecided\(\)[\s\S]*?return finalLapSettled\(trigger\)/,
  'game-decided must be recomputed from the score data, since turn-update does not run checkWin');
assert.match(app, /function checkWin\(\)[\s\S]*?if \(!finalLapSettled\(trigger\)\)/,
  'checkWin and the turn announcement must share one final-round rule');
assert.match(app, /function findWinTrigger\(\)[\s\S]*?return \{ round: r, playerIndex: crosser \}/,
  'the final round must know which seat crossed the target, not just when');
assert.match(app, /const crosser = mpTurnOrder\(r\)\.find\(pi => running\[pi\] >= state\.winScore\)/,
  'the crosser is the first seat in turn order over the target, not the leftmost column - two seats can cross in one rotated round');
assert.match(app, /function finalLapSettled\(trigger\)[\s\S]*?const order = mpTurnOrder\(trigger\.round\)[\s\S]*?for \(let i = 0; i < crosserPos; i\+\+\)/,
  'the Farkle final round must end once the seats that played before the crosser have played again, measured in turn order, not after a whole extra row');
assert.match(app, /if \(state\.multiplayer && crosserPos === 0\) return roundIsComplete\(trigger\.round\)/,
  'a multiplayer crosser who led the round off ends the game with that round - everyone already answered inside it. Solo is excluded: a solo round is entered whole, so nobody has answered the crossing yet and a real extra round is still owed');
assert.match(app, /const isBlank = !state\.rounds\[ri\] \|\| state\.rounds\[ri\]\[pi\] === null;\s*if \(isOpenRound && isBlank && finalLapClosedSeats\(\)\.has\(pi\)\) return;/,
  'tapping an empty cell must not walk around the final-lap exclusion the Enter Score modal enforces - correcting a played score stays allowed');
assert.match(app, /if \(finalLapClosedSeats\(\)\.has\(state\.players\.indexOf\(player\)\)\) return;/,
  'the your-turn card must not announce a seat the final lap has closed - the Worker still cycles the turn onto it');
assert.match(app, /function finalLapClosedSeats\(\)[\s\S]*?if \(state\.rounds\.length - 1 <= trigger\.round\) return closed;[\s\S]*?for \(let i = crosserPos; i < order\.length; i\+\+\) closed\.add\(order\[i\]\)/,
  'once the extra round opens, every seat from the crosser onward in turn order is done - the Worker still offers them the turn, so the client must refuse');
assert.match(app, /if \(mpRoundSubmitted\[pi\] \|\| player\.connected === false \|\| closed\.has\(pi\)\) continue;/,
  'a device holding several seats must not be offered a score for one the final lap has closed - this is the bug where a host owning 1-3 was still asked for the crosser');
assert.match(app, /const hostPending = mpEach\s*\?\s*\[\]\s*:\s*state\.players\.filter\(\(_, pi\) => !hostClosed\.has\(pi\)\)/,
  'host-scoring rooms enter the whole round at once, so the final-lap exclusion must be applied to the host list too');
assert.match(index, /id="turn-toast-backdrop"/,
  'the your-turn toast must dim the screen behind it');
assert.match(app, /getElementById\('turn-toast-backdrop'\)\.addEventListener\('click', hideTurnToast\)/,
  'tapping the dimmed backdrop must dismiss the your-turn toast');
assert.match(style, /\.turn-toast::before[\s\S]*?mask-composite: exclude/,
  'the your-turn toast must shimmer its border via a masked gradient ring');
assert.match(style, /\.turn-toast\.visible::before \{ animation: turn-toast-shimmer/,
  'the border shimmer must reuse the title shimmer keyframes so both sweeps stay in step');
assert.match(index, /id="home-version"/,
  'the home screen must carry a version label');
assert.match(app, /getElementById\('home-version'\)\.textContent = `v\$\{APP_VERSION\}`/,
  'the home version label must read from APP_VERSION, not a hardcoded string');

assert.match(worker, /const PRESENCE_GRACE_MS = 5 \* 60 \* 1000/,
  'a dropped socket must keep its seat for five minutes before counting as gone');
assert.match(worker, /player\.graceUntil = Date\.now\(\) \+ PRESENCE_GRACE_MS/,
  'a closing socket must open a grace window instead of disconnecting the player outright');
const closeHandler = worker.slice(
  worker.indexOf('async webSocketClose('),
  worker.indexOf('async webSocketError('),
);
assert.ok(closeHandler.length > 0 && !closeHandler.includes('connected = false'),
  'a closing socket must not strike the player out immediately');
assert.match(worker, /private expireGracePeriods\(\)[\s\S]*?player\.connected = false/,
  'only an expired grace window may mark a player disconnected');
assert.match(worker, /private async refreshAlarm\(\)[\s\S]*?Math\.min\(\.\.\.deadlines\)/,
  'one alarm must serve both the grace windows and the abandoned-room deletion');
assert.match(app, /mpSend\(\{ type: 'ping' \}\)/,
  'the client must keep its socket warm so idle connections are not dropped');
assert.match(worker, /case "ping":/, 'the room must accept keepalive pings');
assert.match(app, /function mpScheduleReconnect\(\)[\s\S]*?mpShowDisconnectedModal\(\)/,
  'a dropped connection must retry silently before telling the player');
assert.match(app, /function mpConnect\(join\)[\s\S]*?mpClearReconnectTimer\(\)/,
  'starting a retry must not reset the attempt budget, or the backoff never grows and the modal never shows');
assert.match(app, /const mpDeliberateCloses = new WeakSet\(\)/,
  'a deliberate close must be tracked per socket - the close event fires too late for a shared flag');
assert.match(app, /if \(!wasCurrent \|\| mpDeliberateCloses\.has\(ws\)\) return;/,
  'a superseded socket closing late must not stop the live connection keepalive or trigger a reconnect');
assert.match(index, /id="modal-disconnected"/,
  'a lost connection must raise a modal, not a toast that times out');
assert.match(app, /getElementById\('btn-disconnected-reconnect'\)[\s\S]*?window\.location\.reload\(\)/,
  'the disconnected modal must offer one-tap reconnection');
assert.match(app, /function scrollTableToLatestRound/,
  'the table must follow new rounds down');
assert.match(app, /function scrollTableToCurrentTurn/,
  'the table must follow the current turn across');
assert.match(app, /if \(roundAdded\) scrollTableToLatestRound\(\)/,
  'a new round must scroll every device to the live row');
assert.match(app, /requestAnimationFrame\(\(\) => \{\s*scrollTableToLatestRound\(\{ smooth: false \}\)/,
  'rejoining must land on the latest round, not round 1');
assert.match(worker, /case "reset-game":/, 'the room must accept an in-place game reset');
assert.match(worker, /private async handleResetGame\([\s\S]*?this\.room\.rounds = \[\]/,
  'an in-place reset must blank the scoreboard while keeping the roster');
assert.match(app, /function mpCanResetRoom\(\)[\s\S]*?state\.players\.length > 1/,
  'New Game must restart in place only for a host with other players in the room');
assert.match(worker, /const isOwnGroupMember = player\.groupLeaderId === attachment\.playerId/,
  'players must be able to rename anyone they added on their own device');
assert.match(app, /type: 'rename-self', name: newName, playerId: player\.id/,
  'renames must name the seat being renamed, not just the sender');
// The rename button is gone: the player panel edits the name in place, so what
// has to exist is the field, not a button that opens one somewhere else.
assert.match(index, /id="player-options-name-input"/,
  'the player panel must offer a rename field');
assert.match(index, /id="player-options-swatches"/,
  'the player panel must offer the colour picker that replaced the header dot');
assert.doesNotMatch(app, /player-color-dot--header/,
  'the header colour dot moved into the player panel and must not come back');
const cancelIndex = index.indexOf('id="btn-cancel-player-options"');
const removeIndex = index.indexOf('id="btn-remove-player"');
assert.ok(removeIndex !== -1 && cancelIndex > removeIndex,
  'the way out must sit below Remove From Game, not alongside it');

assert.match(worker, /roundStarts: string\[\]/,
  'the room must record which seat led each round off, since the host declares the first player');
assert.match(worker, /private openRound\(\)[\s\S]*?this\.room\.roundStarts\.push\(/,
  'every new round row must record its starting seat in one place');
assert.equal((worker.match(/rounds\.push\(/g) || []).length, 1,
  'only openRound may open a round row, or some round ends up with no starting seat recorded');
assert.match(worker, /type: "turn-update",\s*currentTurnPlayerId: playerId,\s*roundStarts: this\.room\.roundStarts,/,
  'declaring the first player must tell every device where the round now begins');
assert.match(worker, /roundSubmitted\.every\(\(submitted\) => !submitted\)[\s\S]*?roundStarts\[openRoundIndex\] = playerId/,
  'declaring a turn may only move the round start while nobody has scored in it');
assert.match(worker, /room\.roundStarts = room\.roundStarts\.map\(\(starterId\) =>[\s\S]*?doomed\.has\(candidate\)/,
  'removing a player must hand any round they led off to the next surviving seat, or that round silently falls back to column order');
assert.match(worker, /this\.room\.roundStarts = \[\];/,
  'an in-place reset must clear the recorded turn order with the scores');
assert.match(app, /function mpTurnOrder\(ri\)[\s\S]*?order\.slice\(start\)\.concat\(order\.slice\(0, start\)\)/,
  'the client must read a round as rotating from its starting seat, not from column one');
assert.match(app, /function mpTurnEntryRun\(\)[\s\S]*?if \(!player \|\| !mpEntersScoresFor\(player\)\) break;/,
  'the Enter Score run must stop at the first seat another device plays');
assert.match(app, /mpEachPending = mpTurnEntryRun\(\);/,
  'Enter Score must offer the seat whose turn it is, not every seat this device holds');
assert.match(app, /It's \$\{up\.name\}'s turn right now\./,
  'tapping Enter Score off-turn must say whose turn it actually is');
assert.match(app, /const nothingLeft = targets\.length === 0 \|\| mpTurnEntryRun\(\)\.length === 0;/,
  'the Enter Score button must read as locked while the turn sits on another device');
assert.match(app, /function mpApplyCurrentTurn\(playerId, \{ announce = true, roundStarts \} = \{\}\)[\s\S]*?mpUpdateEnterScoreButtonState\(\)/,
  'a turn change must re-evaluate whether this device may enter a score');
assert.match(app, /if \(Array\.isArray\(roundStarts\)\) mpRoundStarts = roundStarts;/,
  'a payload from an older Worker must not silently reset the recorded turn order');

assert.match(style, /scrollbar-color: var\(--accent-dim\) transparent/,
  'scrollbars must be painted from theme variables so they follow a theme or mode switch');
assert.match(style, /\*::-webkit-scrollbar-thumb \{[\s\S]*?background: var\(--accent-dim\)/,
  'WebKit needs the pseudo-element form too - scrollbar-color alone leaves Chrome and Safari unthemed');
assert.match(style, /#screen-tracker\.chrome-top-hidden \.screen-header,[\s\S]*?#screen-tracker\.chrome-bottom-hidden \.tracker-actions \{[\s\S]*?max-height: 0;/,
  'the tracker bars must collapse to reclaim vertical space when scrolled away from their end');
assert.match(app, /if \(!collapsed\) chromeExpandedViewport = wrap\.clientHeight;/,
  'the collapse guard must measure the expanded viewport, or a board that only just overflows flickers');
assert.match(app, /screen\.classList\.toggle\('chrome-top-hidden', collapsed\);\s*screen\.classList\.toggle\('chrome-bottom-hidden', collapsed\);/,
  'all three bars share one collapse state - they hide and return together on the idle timer');
assert.match(app, /function revealTrackerChrome\(\) \{\s*setTrackerChromeCollapsed\(false\);\s*scheduleTrackerChromeHide\(\);/,
  'any manual activity must both bring the bars back and restart the countdown');

assert.match(index, /id="btn-fab-score"[^>]*aria-label="Enter Score"/,
  'the floating Enter Score button is an icon, so it needs a label for screen readers');
assert.match(style, /#screen-tracker\.chrome-bottom-hidden \.btn-fab-score \{[\s\S]*?opacity: 0\.72;/,
  'the floating button must appear only while the action bar is collapsed, resting translucent');
assert.match(style, /\.btn-fab-score\.mp-locked \{[^}]*opacity: 0;/,
  'an off-turn multiplayer FAB must remain invisible while the action bar is visible');
assert.match(style, /#screen-tracker\.active ~ \.toast \{[\s\S]*?bottom:/,
  'tracker toasts must clear the Enter Score and New Game action bar');
assert.match(app, /fab\.addEventListener\('click', \(\) => document\.getElementById\('btn-add-turn'\)\.click\(\)\)/,
  'the floating button must delegate to the action button, or the off-turn toast is lost');
assert.match(app, /function syncScoreFabState\(\)[\s\S]*?fab\.classList\.toggle\('mp-locked', btn\.classList\.contains\('mp-locked'\)\)/,
  'the floating button must mirror the action button\'s locked state rather than deriving it separately');
assert.match(app, /totalsRow\.offsetHeight \+ activeRow\.offsetHeight \+ 10/,
  'the floating button must clear both the totals row and the round being played');

assert.match(app, /const top = tail \? Math\.max\(0, maxScroll - tail\.offsetHeight\) : maxScroll;/,
  'the auto-scroll must stop short of the true bottom, or it brings the action bar straight back');
assert.match(app, /tailRow\.className = 'scroll-tail';/,
  'the newest round needs blank slack under it to clear the sticky totals row without reaching the bottom');
assert.match(app, /#score-body tr:not\(\.scroll-tail\)/,
  'the floating button clearance must measure a real round row, not the blank tail');
assert.doesNotMatch(app, /scrollWrap\.scrollTo\(\{ top: scrollWrap\.scrollHeight/,
  'adding a round must go through scrollTableToLatestRound, not scroll to the raw bottom');

assert.match(app, /const animate = boardMemoryPrimed && !prefersReducedMotion\(\);/,
  'board animations must be suppressed on a board\'s first paint and under reduced motion');
assert.match(app, /function forgetBoardMemory\(\)/,
  'a board arriving fresh must drop the previous board, or every cell flashes at once');
assert.match(app, /function resetForRematch[\s\S]*?forgetBoardMemory\(\);/,
  'every rematch must drop finished-board animation memory before painting the blank board');
assert.match(app, /if \(!record\.td\.isConnected\) \{ runningTotals\.delete\(key\); return; \}/,
  'the total count-up must stop when its cell leaves the document, and let go of its slot');
assert.match(app, /const record = \(live && live\.to === to\) \? live : \{/,
  'a re-render mid-count must adopt the running count, not restart or abandon it');
assert.match(app, /if \(animate && inFlight && inFlight\.to === total\) \{/,
  'a render that finds a count already heading for this total must hand it the new cell - otherwise the count dies the instant an unrelated render lands, which is what killed the last column\'s count-up');
assert.match(app, /function forgetBoardMemory\(\)[\s\S]*?runningTotals\.clear\(\);/,
  'counts in flight belong to the board being replaced');
assert.match(style, /#score-table \.turn-claim::after \{[\s\S]*?animation: turn-claim/,
  'the turn highlight must animate via an overlay - .current-turn sets background !important, which beats an animation');
assert.match(style, /#score-table tbody td\.cell-flash::before \{[\s\S]*?animation: cell-flash/,
  'the changed-cell flash must be an overlay too - .current-turn and .score-cell:hover both set background !important');
assert.match(style, /#score-table tbody td\.turn-claim \{ position: relative; \}/,
  'only tbody cells may be given position - the header and totals cells are sticky and would come loose');
assert.match(style, /#score-table tbody td\.cell-flash::before,\s*#score-table \.turn-claim::after \{\s*display: none;/,
  'both overlays must be removed under reduced motion, not just frozen mid-fade');
assert.match(style.slice(style.lastIndexOf('@media (prefers-reduced-motion: reduce)')), /\.btn-qr:active,/,
  'the reduced-motion block must be last in the file - .btn-danger:active and .btn-qr:active are declared later and would otherwise win');
assert.ok(style.lastIndexOf('@media (prefers-reduced-motion: reduce)') > style.lastIndexOf('.btn-qr:active { transform'),
  'the reduced-motion block must come after the button rules it overrides; a media query carries no extra weight');

// Farkle marks a missed entry threshold the same as a Farkle: both bank zero.
// The ✗ still exists for games that have a threshold without a Farkle concept,
// so the branch must stay gated on the game key rather than being replaced.
assert.match(app, /\} else if \(score === null && state\.gameKey === 'farkle'\) \{/,
  'in Farkle a below-threshold turn banks nothing, exactly like a Farkle - it must read F, not ✗');
assert.match(app, /\} else if \(score === null\) \{\s*td\.className = 'score-cell not-on-board';/,
  'games with an entry threshold but no Farkle must keep the ✗');

// The bars now hide on an idle timer rather than on scroll position, so the old
// oscillation guards (a band measured from scrollTop to the end of the content)
// no longer exist to protect - the collapse is no longer read from any
// measurement the collapse itself moves. What has to hold instead:
assert.match(app, /wrap\.addEventListener\('touchstart', manualScroll, \{ passive: true \}\)/,
  'the reveal must hang off real input events - a scroll listener cannot tell an auto-scroll from a finger');
assert.match(app, /wrap\.addEventListener\('scroll', \(\) => \{\s*if \(chromeManualScrolling\) manualScroll\(\);/,
  'scroll events may only count as activity while a manual gesture is live, or every auto-scroll would reveal the bars');
assert.match(app, /chromeMomentumTimer = setTimeout\(\(\) => \{ chromeManualScrolling = false; \}, CHROME_MOMENTUM_MS\)/,
  'touch momentum outlives touchend - without the grace period the bars vanish mid-glide');
assert.match(app, /const shift = collapsed \? -chromeTopBarsHeight : chromeTopBarsHeight;\s*wrap\.scrollTop = Math\.max\(0, wrap\.scrollTop \+ shift\)/,
  'collapsing the top bars grows the scrollport upwards - without the scrollTop correction the board slides under the finger');
assert.match(app, /chromeTopBarsHeight = Math\.max\(chromeTopBarsHeight, visible\(header\) \+ visible\(roomBar\)\)/,
  'a bar height sampled mid-transition under-reads, and an under-read correction is a visible jump');
assert.match(app, /function trackerChromeMayCollapse\(\)[\s\S]*?return overflow > CHROME_MIN_OVERFLOW;/,
  'a board too short to scroll must never hide its bars - there would be no gesture left to bring them back');
assert.match(app, /resize[\s\S]{0,200}?resetChromeMetrics\(\);/,
  'remembered heights must be dropped on resize - a stale one is worse than none');

// Confetti stacks rather than restarting, so celebrating twice reads as more
// confetti instead of an interruption.
assert.match(app, /const CONFETTI_MAX_BURSTS = 8;/,
  'eight live bursts are allowed while still bounding repeated winner-card taps');
assert.match(app, /const live = confettiBursts\.filter\(burst => !burst\.retiring\);\s*if \(live\.length > CONFETTI_MAX_BURSTS\) live\[0\]\.retiring = true;/,
  'past the cap the oldest burst fades out instead of vanishing, and bursts already on their way out must not count against the cap - counting them retires a live burst to make room for nothing');
assert.match(app, /burst\.t < CONFETTI_LIFE && burst\.fade < CONFETTI_FADE/,
  'a retiring burst must actually be removed once faded, or the loop never ends');
assert.match(app, /if \(confettiRAF\) return;/,
  'a second burst must join the running loop, not start a rival one fighting it for the canvas');
assert.doesNotMatch(app, /cancelAnimationFrame\(confettiRAF\)/,
  'firing confetti must no longer cancel the burst already in flight');

// A custom game's scoring direction must be read from the scoring section only.
// `.dir-btn` is a shared button style the multiplayer section also uses, and its
// active button (Solo / Same Device) sits earlier in the document with no
// `data-dir`, so an unscoped query made every golf game score as highest-wins.
assert.match(app, /document\.querySelector\('#scoring-section \.dir-btn\.active\[data-dir\]'\)\?\.dataset\.dir \|\| 'high'/,
  "the custom game's direction must be read from #scoring-section's active [data-dir] button, not the first .dir-btn.active in the document");
// Crossing the target ends the game; it does not decide who won. In golf the
// crosser is usually the loser, so the winner is always the best total.
assert.match(app, /const best = state\.scoreDirection === 'low' \? Math\.min\(\.\.\.totals\) : Math\.max\(\.\.\.totals\);\s*const winIdx = totals\.indexOf\(best\);/,
  'the winner is the best total by scoring direction, never whoever crossed the target');

// Mobile keypads have no minus key, so score fields carry a ± button and are
// text inputs (a number input cannot hold the bare "-" mid-typing).
assert.doesNotMatch(app, /class="turn-score-input"[^>]*type="number"/,
  'score inputs must not be type=number - a number input rejects the lone "-" the ± button leaves behind');
assert.match(app, /<input type="text" class="turn-score-input"[^>]*inputmode="numeric"/,
  'the Enter Score field stays on the numeric keypad even as a text input');
assert.match(app, /if \(allowNeg\) row\.querySelector\('\.turn-input-slot'\)\.appendChild\(makeSignToggle\(input\)\);/,
  'the sign toggle is added to Enter Score rows wherever negatives are legal');
assert.match(app, /if \(allowNeg\) wrap\.appendChild\(makeSignToggle\(input\)\);/,
  'the inline cell editor gets the same sign toggle - a phone must be able to correct a cell to a negative');
assert.match(app, /btn\.addEventListener\('pointerdown', e => e\.preventDefault\(\)\);\s*btn\.addEventListener\('mousedown', e => e\.preventDefault\(\)\);/,
  'the toggle must not take focus: the inline editor commits on blur, so a focus-stealing tap would close it before the click landed');
assert.match(app, /if \(text === '' \|\| text === '-'\) return null;/,
  'a field holding only "-" is blank, not zero - reading it mid-edit must not commit a score');
assert.match(app, /Math\.max\(allowNeg \? -SCORE_INPUT_MAX : 0, Math\.min\(SCORE_INPUT_MAX, /,
  'text inputs have no min/max attributes, so both entry paths must clamp the range themselves');

// .btn-danger was defined twice: once with the shared physical button model and
// again 600 lines later as a flat square chip. The later block won every
// declaration it repeated, including font-weight 700 on Lilita One, a
// single-weight face the browser then synthetically smeared. The variant block
// may only carry what makes danger danger - fill, ink, border - and must never
// restate type, radius, padding or press, which belong to the shared model.
// A standalone block is preceded by the close of the previous rule; the shared
// group list's last selector is also `.btn-danger {` on its own line, but is
// preceded by a comma, so anchoring on `}` tells the two apart.
const dangerBlocks = style.match(/\}\s*\.btn-danger \{[^}]*\}/g) || [];
assert.strictEqual(dangerBlocks.length, 1,
  '.btn-danger must have exactly one standalone block, or a later one silently overrides the shared button model');
assert.ok(!/font-weight|font-size|border-radius|padding|transition/.test(dangerBlocks[0]),
  '.btn-danger must not restate type, radius, padding or transition - those come from the shared button model');
assert.match(dangerBlocks[0], /border: var\(--accent-border\) solid var\(--danger-bd\)/,
  '.btn-danger is an accent fill, so it carries a deep 3px border like every other filled control');

// The update toast's reload button is the toast-scale Enter Score: ink on
// marigold. White on any accent fill in this palette fails the contrast floor.
assert.match(style, /\.update-reload \{[^}]*color: var\(--p2-fg\)[^}]*background: var\(--p2\)/,
  'the update-reload button must be ink on marigold, matching the primary action');


// The 404 page. It is never reached from inside the app, so nothing else would
// notice if the deploy config or the way out stopped working.
assert.match(wrangler, /"not_found_handling": "404-page"/,
  'without not_found_handling the static deploy serves the platform default 404, not ours');
assert.match(notFound, /<a class="btn-primary" href="\/">Back to Home<\/a>/,
  'the way out must be a root-absolute link - the 404 is served at paths of any depth');
assert.match(notFound, /viewBox="7 -10 118 118"/,
  'the tipped plate needs the square viewBox centred on the pivot, or it clips');
assert.match(style, /\.err404-four:first-child \{ margin-right: -1\.1em; \}/,
  'the 4s tuck over the plate - set beside it the line stops reading as 404');

// Presence (the amber Away dot) is cosmetic. The moment anything branches on it,
// a locked phone starts skipping turns - which is exactly what the five-minute
// grace window exists to prevent.
assert.doesNotMatch(worker, /if \([^)]*\.present[^)]*\)/,
  'nothing may branch on presence - turn order and round advance read connected');
assert.match(worker, /case "presence":\s*return "visible" in value && typeof value\.visible === "boolean";/,
  'the presence message must be validated like every other client message');
assert.match(worker, /seat\.present = false;/,
  'a closed socket marks the device away immediately, without touching connected');
assert.match(app, /mpAwayTimer = setTimeout\(\(\) => mpSendPresence\(false\), MP_AWAY_DELAY_MS\);/,
  'going away is debounced; only coming back is instant');
assert.match(app, /player\.present === false\) \{\s*parts\.push\('<span class="po-conn is-away">/,
  'away must be checked after disconnected - a dropped player is not merely away');
assert.match(style, /\.po-conn\.is-away \{ color: var\(--p2\); \}/,
  'the away dot is amber, distinct from both the green and the red');

// Enter Score, reworked from the Pip mock in v0.26.
assert.match(app, /turn-modal-title'\)\.textContent = `Round \$\{state\.rounds\.length \+ 1\}`/,
  'the sheet title states the round; who is being scored for belongs to the hint');
const saveIndex = index.indexOf('id="btn-save-turn"');
const cancelTurnIndex = index.indexOf('id="btn-cancel-turn"');
assert.ok(saveIndex !== -1 && saveIndex < cancelTurnIndex,
  'Save Scores leads and Cancel follows it');
assert.match(index, /id="btn-save-turn">Save Scores</,
  'the label says what is saved - a round is entered for several players at once');
assert.match(app, /input\.dispatchEvent\(new Event\('input', \{ bubbles: true \}\)\)/,
  'flipping the sign must fire input, or the projected total goes stale');
assert.match(app, /totalCell\.classList\.toggle\('is-pending', pending !== base\)/,
  'the right-hand column projects the new total rather than restating the old one');

assert.match(app, /<span class="turn-header-total">New Total<\/span>/,
  'the column heading names the projected total, not the current one');

// A device holding several seats writes them all in one submission. The server
// permission check has to know about groups or it silently drops every seat but
// the leader's, and the turn bounces back to the seat it just discarded.
assert.match(worker, /if \(target\.groupLeaderId === actorId\) \{\s*return true;/,
  'a group leader may score for the seats their device brought into the room');

// A guard that reads only the top bar cannot see the footer stuck collapsed,
// which leaves the floating button hovering over a board whose bars are back.
assert.match(app, /screen\.classList\.contains\('chrome-top-hidden'\)\s*&& screen\.classList\.contains\('chrome-bottom-hidden'\)/,
  'the collapse guard reads both chrome classes so they cannot drift apart');

// The projected total counts the same way the board's totals row does, on its
// own key namespace so the two counts never hand each other cells.
assert.match(app, /countUpTotal\(totalCell, countKey, shown, pending, '', TURN_COUNT_MS\)/,
  'the projected total counts to its value rather than snapping to it');
assert.match(app, /const countKey = `turn:\$\{boardKeyFor\(p, pi\)\}`;\s*runningTotals\.delete\(countKey\);/,
  'the sheet clears its own count on build so a stale one cannot resume');

// Farkle rounds to the nearest 50 on save, so the projection must round too or
// it names a total the board will never show.
assert.match(app, /const farkle = !state\.generic && state\.gameKey === 'farkle';/,
  'the projection knows whether this game rounds, on the same terms as the save path');
assert.match(app, /const scored = farkle \? normalizeFarkleScore\(typed\) : typed;/,
  'the projection rounds through the same function the save path uses');

// The victory fanfare is Kalimba Sparkle as of v0.26, replacing round 1's
// Arcade Jackpot. The run is pentatonic on purpose: play() applies a random
// pitch variant of up to two semitones, and a scale with semitones in it would
// let that variant land the phrase on a dissonance.
assert.match(sfx, /\[784, 880, 1047, 1319, 1568, 2093\]\.forEach/,
  'the fanfare run stays pentatonic so the random pitch variant cannot sour it');
assert.match(sfx, /var p = this\.variant\(\) \* \(opts\.pitch \|\| 1\);/,
  'one full five-way pitch variant must be selected for each victory fanfare play');
assert.match(sfx, /Sfx\.prototype\.pluck = function/,
  'the fanfare is built from plucks; tone alone cannot give a tine its attack');
assert.match(sfx, /this\.tone\(\{ freq: o\.freq \* 2, dur: len \* 0\.45/,
  'the pluck’s octave partial must die faster than its body or it reads as an organ');

console.log('Regression checks passed');
