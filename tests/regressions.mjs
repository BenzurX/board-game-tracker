import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('../style.css', import.meta.url), 'utf8');
const worker = fs.readFileSync(new URL('../worker/src/room.ts', import.meta.url), 'utf8');

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
assert.match(app, /showWinnerColumnFrame\(winIdx\)/,
  'game over must move the shared frame to the winning column');
assert.match(app, /querySelectorAll\('#score-table \.current-turn'\)/,
  'game over must remove current-turn highlighting');
const groupRowIndex = index.indexOf('id="group-size-row"');
const primaryNameIndex = index.indexOf('id="player-name-input"');
assert.ok(groupRowIndex !== -1 && groupRowIndex < primaryNameIndex,
  'player-count selection must appear before the primary name field');
assert.match(index, /class="group-size-label"[^>]*>Players:<\/label>/,
  'the compact player-count row must use the Players label');
assert.doesNotMatch(index, /Players on this device|You'll enter scores for everyone on this device/,
  'the old players-on-this-device lines must be removed');
assert.match(app, /const MP_MAX_GROUP_SIZE = 8/,
  'the client must allow one device to represent all eight room seats');
assert.match(worker, /const MAX_GROUP_SIZE = 8/,
  'the Worker must allow one device to represent all eight room seats');
assert.match(app, /Math\.min\(MP_MAX_GROUP_SIZE, seatsLeft\)/,
  'the join dropdown must cap device players at the remaining room seats');
assert.match(style, /\.group-size-select[\s\S]*?padding:\s*10px 38px 10px 14px/,
  'the player-count select must reserve space between its value and chevron');
assert.match(style, /\.group-size-select-wrap::after/,
  'the player-count select must use an inset custom chevron');
assert.match(app, /if \(announce && turnChanged\) mpAnnounceTurn\(nextTurn\)/,
  'the your-turn toast must fire only when the current turn actually changes');
assert.match(app, /msg\.currentTurnPlayerId, \{ announce: false \}\)/,
  'joining or rejoining a room must not fire the your-turn toast');
assert.match(app, /if \(!player \|\| !mpEntersScoresFor\(player\)\) return;/,
  'the your-turn toast must only fire for players this device scores for');
assert.match(style, /\.turn-toast-title[\s\S]*?-webkit-background-clip: text/,
  'the your-turn toast shimmer must clip its gradient to the text');
assert.match(style, /\.turn-toast::before[\s\S]*?mask-composite: exclude/,
  'the your-turn toast must shimmer its border via a masked gradient ring');
assert.match(style, /\.turn-toast\.visible::before \{ animation: turn-toast-shimmer/,
  'the border shimmer must reuse the title shimmer keyframes so both sweeps stay in step');
assert.match(index, /id="home-version"/,
  'the home screen must carry a version label');
assert.match(app, /getElementById\('home-version'\)\.textContent = `v\$\{APP_VERSION\}`/,
  'the home version label must read from APP_VERSION, not a hardcoded string');

console.log('Regression checks passed');
