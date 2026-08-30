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
assert.match(style, /\.turn-column-frame[\s\S]*?background: color-mix\(in srgb, var\(--turn-color/,
  'the turn highlight fill must be the rounded frame, not a square background on the cells');
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
assert.match(app, /type: 'rename-self', name: newName, playerId: p\.id/,
  'renames must name the seat being renamed, not just the sender');
assert.match(index, /id="btn-rename-player"/,
  'the player options sheet must offer a rename');
const cancelIndex = index.indexOf('id="btn-cancel-player-options"');
const removeIndex = index.indexOf('id="btn-remove-player"');
assert.ok(removeIndex !== -1 && cancelIndex > removeIndex,
  'Cancel must sit below Remove from Game, not alongside it');

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
assert.match(app, /function mpOnGameReset[\s\S]*?forgetBoardMemory\(\);/,
  'a host reset lands a blank board - it must not be diffed against the finished game');
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
assert.match(app, /const CONFETTI_MAX_BURSTS = 3;/,
  'bursts are capped so hammering the banner cannot pile up unbounded particles');
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
assert.match(app, /if \(allowNeg\) row\.appendChild\(makeSignToggle\(row\.querySelector\('\.turn-score-input'\)\)\);/,
  'the sign toggle is added to Enter Score rows wherever negatives are legal');
assert.match(app, /if \(allowNeg\) wrap\.appendChild\(makeSignToggle\(input\)\);/,
  'the inline cell editor gets the same sign toggle - a phone must be able to correct a cell to a negative');
assert.match(app, /btn\.addEventListener\('pointerdown', e => e\.preventDefault\(\)\);\s*btn\.addEventListener\('mousedown', e => e\.preventDefault\(\)\);/,
  'the toggle must not take focus: the inline editor commits on blur, so a focus-stealing tap would close it before the click landed');
assert.match(app, /if \(text === '' \|\| text === '-'\) return null;/,
  'a field holding only "-" is blank, not zero - reading it mid-edit must not commit a score');
assert.match(app, /Math\.max\(allowNeg \? -SCORE_INPUT_MAX : 0, Math\.min\(SCORE_INPUT_MAX, /,
  'text inputs have no min/max attributes, so both entry paths must clamp the range themselves');

console.log('Regression checks passed');
