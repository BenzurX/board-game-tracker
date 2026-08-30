// ── App Version ──────────────────────────────────────────
// Bumped alongside CHANGELOG.md per the pre-push gate - single source of truth
// for the version shown in Settings and on the home screen.
const APP_VERSION = '0.26';
document.getElementById('settings-version').textContent = `v${APP_VERSION}`;
document.getElementById('home-version').textContent = `v${APP_VERSION}`;

// ── Theme Management ─────────────────────────────────────
// One theme, two modes. The three colour themes (Ember/Ocean/Forest) were
// removed in v0.25: the Pip palette is part of the identity now, not a
// preference, so the only stored display setting is dark/light/system.
const THEME = 'pip';
const MODES = ['dark', 'light', 'system'];

// 'system' is stored as the user's preference but never written to the DOM -
// resolve it to the OS's actual light/dark scheme so the theme CSS blocks (which
// only know dark/light) always have a real value to match against.
function resolveMode(mode) {
  if (mode !== 'system') return mode;
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}

function applyMode(mode) {
  if (!MODES.includes(mode)) mode = 'system';
  document.documentElement.dataset.theme = THEME;
  document.documentElement.dataset.mode  = resolveMode(mode);
  localStorage.setItem('mode', mode);
  updateSettingsUI(mode);
}

// Live-follow the OS theme while 'system' mode is selected.
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('mode') === 'system') applyMode('system');
  });
}

function updateSettingsUI(mode) {
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

// Apply persisted mode on load (also set by inline script in <head> to prevent flash)
applyMode(localStorage.getItem('mode') || 'system');

// The gear button appears on every screen (home, setup, tracker) - all wired to the same modal.
['btn-settings', 'btn-settings-setup', 'btn-settings-tracker'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    // Use the stored preference, not dataset.mode - dataset.mode holds the resolved
    // dark/light value and is never literally 'system', which would make the System
    // button never show as active.
    updateSettingsUI(localStorage.getItem('mode') || 'system');
    document.getElementById('modal-settings').classList.remove('hidden');
  });
});
document.getElementById('settings-backdrop').addEventListener('click', closeSettingsModal);
document.getElementById('btn-close-settings').addEventListener('click', closeSettingsModal);

function closeSettingsModal() {
  document.getElementById('modal-settings').classList.add('hidden');
}

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => applyMode(btn.dataset.mode));
});

// ── Volume and button sounds ─────────────────────────────
// The slider drives the one shared mixer in sfx.js. Zero is the mute: there is
// no separate on/off switch to get out of sync with it.
const VOLUME_KEY = 'bgt-volume';
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const savedVolume = parseInt(localStorage.getItem(VOLUME_KEY));
volumeSlider.value = isNaN(savedVolume) ? 80 : Math.min(100, Math.max(0, savedVolume));
volumeValue.textContent = `${volumeSlider.value}%`;
applyVolume();
volumeSlider.addEventListener('input', () => {
  volumeValue.textContent = `${volumeSlider.value}%`;
  localStorage.setItem(VOLUME_KEY, volumeSlider.value);
  applyVolume();
  // Dragging the slider is itself a button-shaped action, and hearing the level
  // you just set is the only way to judge it.
  if (window.sfx) window.sfx.play('pop');
});

function applyVolume() {
  if (window.sfx) window.sfx.setVolume(volumeSlider.value / 100);
}

// One delegated listener rather than a call at every call site: every button in
// the app pops, including ones rendered later. pointerdown, not click, so the
// sound lands with the finger instead of after it - and disabled buttons emit
// no pointer events, so they stay silent for free.
document.addEventListener('pointerdown', e => {
  if (!window.sfx) return;
  // The context can only be created inside a gesture, so the first tap both
  // unlocks audio and plays through it.
  window.sfx.unlock();
  const btn = e.target.closest('button');
  if (!btn || btn.classList.contains('coming-soon')) return;
  window.sfx.play('pop');
}, true);

// ── Game Definitions ────────────────────────────────────
const GAMES = {
  farkle: {
    name: 'Farkle',
    icon: '🎲',
    defaultWinScore: 10000,
    defaultMinScore: 500,
    defaultPlayers: 4,
    finalRoundOnWin: true, // once someone crosses winScore, everyone else gets one more full round to beat it
    intro: `Turns go in order: Player 1 rolls all 6 dice, sets aside any scoring dice, then chooses to bank their points and end their turn, or keep rolling the remaining (non-scoring) dice to try to add more. You must set aside at least one scoring die every time you roll - if a roll scores nothing, that's a Farkle and you lose every point banked so far that turn. Once a turn ends (by banking or Farkling), play passes to Player 2, and so on around the table. Traditionally, each player must also clear a one-time points threshold in a single turn before they're "on the board" and can start banking toward the game total.

If all 6 dice end up scoring across a turn, you can say "still rolling!" and continue - reset to rolling all 6 again and keep building your total before banking.

Example turn: you roll 1, 1, 5, 3, 3, 4. You set aside both 1s (100 each) and the 5 (50), worth 250, and bank rather than risk re-rolling the leftover 3, 3, 4. Next turn you roll 1, 2, 2, 5, 5, 5 - the three 5s alone are worth 500 (three-of-a-kind = face value × 100), so you could bank immediately, or set them aside and re-roll the remaining 1 and two 2s for a chance at more.`,
    rules: [
      '1s = 100 pts, 5s = 50 pts',
      'Three of a kind = face value × 100 (three 1s = 1,000 pts)',
      'Four of a kind = three-of-a-kind × 2',
      'Five of a kind = four-of-a-kind × 2',
      'Six of a kind = five-of-a-kind × 2',
      'Three pairs = 1,500 pts',
      'Straight (1–2–3–4–5–6) = 3,000 pts',
      'Still rolling: score with all 6 dice in a turn and you can keep going - roll all 6 again, adding to the same turn total.',
      'You must score at least 500 in a single turn to get on the board.',
      'Once a player reaches the winning score, all other players get one final turn.',
    ],
  },
  yahtzee: {
    name: 'Yahtzee',
    icon: '🎲',
    defaultWinScore: 0, // no running target - 13 fixed rounds, highest total when the scorecard is full wins
    defaultMinScore: 0,
    defaultPlayers: 4,
    intro: `Each turn, roll 5 dice up to three times (re-rolling any you want to keep aside), then write your result into one of 13 scoring categories - each category is used exactly once across the game. After all 13 categories are filled for every player, whoever has the highest total wins.

Use "Enter Score" to log the score each player wrote down for that round's category (enter 0 for a category they scratched). The Upper Section (Ones through Sixes) earns a 35-point bonus if those six categories add up to 63 or more - add that bonus in as its own turn once it's earned.

Example: rolling 4, 4, 4, 2, 6 - you could score it as three 4s in the "Fours" category (12 pts) or as 28 in "Chance" (sum of all 5 dice).`,
    rules: [
      'Upper Section (Ones-Sixes): sum of just the matching dice; total 63+ across all six earns a 35-pt bonus',
      'Three/Four of a Kind: sum of all 5 dice if at least 3 (or 4) match, else 0',
      'Full House (3 of one, 2 of another): 25 pts',
      'Small Straight (4 sequential dice): 30 pts',
      'Large Straight (5 sequential dice): 40 pts',
      'Yahtzee (all 5 dice match): 50 pts',
      'Chance: sum of all 5 dice, any combination',
      'Extra Yahtzees after the first: 100-pt bonus each, in addition to the category they fill',
      'Each of the 13 categories is used exactly once per player per game',
    ],
  },
  qwirkle: {
    name: 'Qwirkle',
    icon: '🀄',
    defaultWinScore: 0, // no running target - game ends when the tile bag/hands run out, highest total wins
    defaultMinScore: 0,
    defaultPlayers: 4,
    intro: `Players take turns placing tiles from their hand to extend lines on the table - tiles in a line must all share either the same color or the same shape (never both), and no line may repeat a tile. Score 1 point per tile in every line your placement is part of or extends; a placement that completes two lines at once scores both.

Complete a line of all 6 shapes (or all 6 colors) - a "Qwirkle" - and it scores double (12 pts instead of 6), plus you draw back up to 6 tiles. Whoever plays their last tile when the bag empties gets a 6-point bonus; the highest total when the game ends wins.

Example: placing a tile that extends one line to 3 tiles and completes a second line at 4 tiles scores 3 + 4 = 7 for that single move.`,
    rules: [
      '1 point per tile in every line your placed tile is part of',
      'A move that touches two lines scores both lines added together',
      'Completing a 6-tile line ("Qwirkle") scores double: 12 pts, plus draw an extra tile',
      'Lines mix by color OR by shape only, never both, and never repeat a tile',
      'Playing your last tile when the bag runs out earns a 6-pt bonus',
      'Highest total when tiles run out wins',
    ],
  },
  cribbage: {
    name: 'Cribbage',
    icon: '📌',
    defaultWinScore: 121,
    defaultMinScore: 0,
    defaultPlayers: 2,
    intro: `Deal 6 cards each (2-player); each player discards down to 4, with the extra 2 going into the dealer's "crib." Players take turns playing cards face-up while counting the running total out loud (never exceeding 31), scoring points for 15s, pairs, and runs formed during play - then each hand (plus the crib) is counted again against the starter card for its own points.

Use "Enter Score" to log each player's total pegged for that hand (play + hand + crib, if applicable). First to 121 wins - Score board points as they're won.

Example hand: 5, 5, 5, J against a starter of 5 scores 12 for four 5s (six different combinations of two summing to 15) plus 12 for four-of-a-kind = 24 total, plus 2 for "his heels" if the starter itself was a Jack.`,
    rules: [
      'Fifteens: any combination of cards summing to 15 = 2 pts each',
      'Pairs: 2 pts; three of a kind = 6 pts (3 pairs); four of a kind = 12 pts (6 pairs)',
      'Runs: 1 pt per card in a run of 3+ consecutive ranks (suits don\'t matter)',
      'Flush: 4 pts for 4 cards of the same suit in hand, 5 if the starter matches too (crib flush needs all 5)',
      'His Heels: dealer scores 2 pts if the starter card is a Jack',
      'His Nobs: 1 pt for holding the Jack matching the starter\'s suit',
      'Go / Last Card: 1 pt for the last card played in a sequence (2 pts if it hits exactly 31)',
      'First to 121 points wins',
    ],
  },
  euchre: {
    name: 'Euchre',
    icon: '♠️',
    defaultWinScore: 10,
    defaultMinScore: 0,
    defaultPlayers: 4,
    intro: `Played in fixed partnerships (partners sit across from each other), 4 players, 5 tricks per hand. Only the 9s through Aces are used. One suit is named trump each hand - the Jack of trump (the "right bower") is the highest card in play, and the same-color Jack (the "left bower") becomes the second-highest, counting as trump.

The team that named trump must take at least 3 of the 5 tricks to score; taking all 5 ("a march") scores extra. Failing to take 3 tricks ("getting euchred") hands the points to the other team instead.

Use "Enter Score" to log each team's points after a hand is scored (usually one team gets 0 and the other gets 1-4). First team to 10 points wins.`,
    rules: [
      'Only 9, 10, J, Q, K, A are in the deck (24 cards total)',
      'Jack of trump ("right bower") is the highest card; same-color Jack ("left bower") is second-highest and counts as trump',
      'The calling team taking 3-4 of 5 tricks scores 1 pt',
      'The calling team taking all 5 tricks ("a march") scores 2 pts (4 pts if going alone)',
      'The calling team taking fewer than 3 tricks ("euchred") gives the opposing team 2 pts',
      'First team to 10 points wins',
    ],
  },
  ginrummy: {
    name: 'Gin Rummy',
    icon: '♥️',
    defaultWinScore: 100,
    defaultMinScore: 0,
    defaultPlayers: 2,
    intro: `2 players, 10 cards each. Draw one card, then discard one, trying to form your hand into sets (3-4 of the same rank) and runs (3+ sequential cards, same suit). "Knock" once your unmatched ("deadwood") card value is 10 or less, ending the hand - you score the difference between your opponent's deadwood and yours.

Knocking with 0 deadwood is "Gin," worth a 25-point bonus on top of the deadwood difference. If your opponent's deadwood is actually lower than yours when you knock, they "undercut" you and score the difference plus a 25-point bonus instead.

Use "Enter Score" to log each player's points from the hand. First to 100 wins.`,
    rules: [
      'Sets = 3-4 cards of the same rank; Runs = 3+ sequential cards in the same suit',
      'Knock once your unmatched ("deadwood") card total is 10 or less, ending the hand',
      'Score the difference between your opponent\'s deadwood and your own',
      'Knocking with 0 deadwood ("Gin") adds a 25-pt bonus',
      'If your opponent\'s deadwood is lower than yours when you knock, they "undercut" you: they score the difference plus a 25-pt bonus instead',
      'First to 100 points wins',
    ],
  },
  threethirteen: {
    name: 'Three Thirteen',
    icon: '🎴',
    defaultWinScore: 0, // no running target - 11 fixed hands, lowest total when complete wins
    defaultMinScore: 0,
    scoreDirection: 'low', // penalty scoring - lowest total across all 11 hands wins
    trackCloser: true, // going out ends the hand and scores 0 for the player who did
    defaultPlayers: 4,
    intro: `Eleven hands are dealt, growing by one card each time: hand 1 deals 3 cards per player, hand 2 deals 4, up through hand 11 dealing 13. Each hand's wild rank matches its number - 3s are wild in the hand of three, all the way up to Kings wild in the hand of thirteen.

Draw and discard each turn, melding your hand into sets (3+ of the same rank) and runs (3+ sequential cards, same suit), using wilds to fill gaps. Once your whole hand is melded except one card, discard it to "go out" and end the hand immediately.

Use "Enter Score" to log each player's points after a hand: the player who went out scores 0, everyone else totals the value of the cards still in their hand. Play all 11 hands - lowest running total when the last hand ends wins.

Card values: 2-10 = face value, J/Q/K = 10 pts, Ace = 15 pts, that hand's wild rank = 20 pts.`,
    rules: [
      'Eleven hands are dealt, hand sizes increasing from 3 cards up to 13',
      "Each hand's wild rank matches its number - 3s wild in the hand of three, up to Kings wild in the hand of thirteen",
      'Meld cards into sets (3+ of the same rank) or runs (3+ sequential, same suit), using wilds to fill gaps',
      'Going out (melding everything but one discarded card) ends the hand immediately and scores 0 for that player',
      'Everyone else scores unmelded cards left in hand: 2-10 = face value, J/Q/K = 10, Ace = 15, that hand\'s wild rank = 20',
      'Lowest running total after all 11 hands wins',
    ],
  },
  generic: {
    name: 'Generic Game',
    icon: '📝',
    generic: true,        // freeform score sheet, no built-in scoring rules
    defaultWinScore: 100, // starting target; set to 0 for no limit, just track
    defaultMinScore: 0,
    intro: '',
    rules: [],
  },
};

// Seats are handed out in this order, not palette order: the sequence alternates
// warm and cool so no two adjacent seats sit close together on the wheel, and
// the lightness spread across them is what keeps four filled chips apart in one
// table header for red-green colour blindness. Fills only - the matching deep
// border hue for each is PLAYER_COLOR_BORDERS below, at the same index.
const PLAYER_COLORS = ['#3FBE9A', '#F576A8', '#7C93EE', '#A8C64F', '#F5B02E', '#F2604C', '#4FC3E8', '#C48BF0'];
const PLAYER_COLOR_BORDERS = {
  '#3FBE9A': '#0F6F58', // jade
  '#F576A8': '#A82F6A', // bubblegum
  '#7C93EE': '#3A4EAF', // cornflower
  '#A8C64F': '#4F6B14', // pistachio
  '#F5B02E': '#8A5709', // marigold
  '#F2604C': '#B23A28', // punch
  '#4FC3E8': '#14607F', // lagoon
  '#C48BF0': '#6B33A8', // orchid
};
// Text on any accent fill is always ink. Never cream, never white.
const PLAYER_INK = '#21131F';

function playerBorderColor(color) {
  return PLAYER_COLOR_BORDERS[color] || 'rgba(33, 19, 31, 0.35)';
}

// ── Player Color Picker ──────────────────────────────────
// Shared popover used by both the setup screen's player dots and the tracker
// header's color dot, so there's one color-picking UI in the whole app.
let colorPopoverEl = null;
let colorPopoverOutsideHandler = null;

function closeColorPicker() {
  if (colorPopoverEl) {
    colorPopoverEl.remove();
    colorPopoverEl = null;
  }
  if (colorPopoverOutsideHandler) {
    document.removeEventListener('pointerdown', colorPopoverOutsideHandler, true);
    colorPopoverOutsideHandler = null;
  }
}

function openColorPicker(anchorEl, currentColor, onSelect) {
  closeColorPicker();

  const pop = document.createElement('div');
  pop.className = 'color-popover';
  PLAYER_COLORS.forEach(color => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'color-swatch-btn' + (color === currentColor ? ' selected' : '');
    swatch.style.background = color;
    swatch.setAttribute('aria-label', `Use color ${color}`);
    swatch.addEventListener('click', e => {
      e.stopPropagation();
      onSelect(color);
      closeColorPicker();
    });
    pop.appendChild(swatch);
  });
  document.body.appendChild(pop);

  const rect = anchorEl.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  let left = Math.min(rect.left, window.innerWidth - popRect.width - 8);
  left = Math.max(8, left);
  pop.style.top = `${rect.bottom + 6}px`;
  pop.style.left = `${left}px`;

  colorPopoverEl = pop;
  // Deferred so the same click/tap that opened the popover doesn't immediately close it.
  colorPopoverOutsideHandler = e => {
    if (!pop.contains(e.target) && e.target !== anchorEl) closeColorPicker();
  };
  setTimeout(() => document.addEventListener('pointerdown', colorPopoverOutsideHandler, true), 0);
}

// ── State ────────────────────────────────────────────────
const state = {
  gameKey: null,
  gameName: null,   // display name (editable for custom games)
  generic: false,   // true for the freeform custom tracker
  scoreDirection: 'high', // 'high' = highest total wins, 'low' = golf (lowest wins)
  players: [],      // [{ name, color }]
  rounds: [],       // [[score|null, ...], ...]  null = below entry threshold
  winScore: 10000,
  minScore: 500,    // 0 = disabled
  onBoard: [],      // [bool, ...]  true once a player has met minScore in one turn
  customRules: [],
  mpHostRuleOverrides: null, // guest-only, in-memory: host's rule overrides synced live for a multiplayer room
  gameOver: false,
  celebrated: false, // true once the win confetti has fired for the current win
  finalRoundAnnounced: false, // true once the "final round" toast has fired for the current trigger
  trackCloser: false, // track who "goes out first" each round (custom games)
  closers: [],       // [playerIndex|null, ...]  parallel to rounds
  multiplayer: false,    // true when this game is a synced multiplayer room
  mpRoomCode: null,
  mpScoringMode: 'each', // 'each' = every player submits their own score, 'host' = host enters for everyone
  mpPlayerId: null,      // this device's player id, assigned by the server
  mpIsHost: false,
  startedAt: null,
};

let turnCloser = null; // selected closer while the Add Turn modal is open

// ── Game Persistence ─────────────────────────────────────
// The active game auto-saves to localStorage on every change, so an accidental
// tab close / phone lock mid-game night doesn't wipe the scores. Finished games
// are not resumed (nothing to lose); leaving a game deliberately clears the save.
const SAVE_KEY = 'bgt-active-game';

function saveGame() {
  // Only an in-progress game on the tracker screen is worth saving (the rules
  // modal can trigger renders from the setup screen with stale state).
  if (!document.getElementById('screen-tracker').classList.contains('active')) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage full/blocked: play on without saving */ }
}

function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
}

// House rules and edited/reverted baseline rules are keyed per game type (not
// per session) so they survive "New Game" and only go away if the user removes
// them - unlike the rest of `state`, which resets on every new game.
const CUSTOM_RULES_KEY = 'bgt-custom-rules';
const RULE_OVERRIDES_KEY = 'bgt-rule-overrides';

function loadCustomRules(gameKey) {
  try {
    const all = JSON.parse(localStorage.getItem(CUSTOM_RULES_KEY)) || {};
    return Array.isArray(all[gameKey]) ? all[gameKey] : [];
  } catch (e) { return []; }
}
function saveCustomRules(gameKey, rules) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(CUSTOM_RULES_KEY)) || {}; } catch (e) { /* ignore */ }
  all[gameKey] = rules;
  try { localStorage.setItem(CUSTOM_RULES_KEY, JSON.stringify(all)); } catch (e) { /* storage full/blocked */ }
}

function loadRuleOverrides(gameKey) {
  try {
    const all = JSON.parse(localStorage.getItem(RULE_OVERRIDES_KEY)) || {};
    return all[gameKey] || {};
  } catch (e) { return {}; }
}
function saveRuleOverrides(gameKey, overrides) {
  let all = {};
  try { all = JSON.parse(localStorage.getItem(RULE_OVERRIDES_KEY)) || {}; } catch (e) { /* ignore */ }
  all[gameKey] = overrides;
  try { localStorage.setItem(RULE_OVERRIDES_KEY, JSON.stringify(all)); } catch (e) { /* storage full/blocked */ }
}

// Baseline rule text merged with any per-line overrides for this game type.
function getEffectiveRules(gameKey) {
  const game = GAMES[gameKey];
  const overrides = (state.multiplayer && !state.mpIsHost && state.mpHostRuleOverrides)
    ? state.mpHostRuleOverrides
    : loadRuleOverrides(gameKey);
  const intro = overrides.intro != null ? overrides.intro : (game.intro || '');
  const rules = (game.rules || []).map((r, i) =>
    (overrides.rules && overrides.rules[i] != null) ? overrides.rules[i] : r);
  return { intro, rules, overrides };
}

function resumeSavedGame() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return; }
  if (!saved || !Array.isArray(saved.players) || saved.players.length < 1 || saved.gameOver ||
      !Array.isArray(saved.rounds) || saved.rounds.length === 0 || saved.multiplayer) {
    // Multiplayer games resume via mpBoot()/the mp session key, never through this
    // local snapshot - a stale saved.multiplayer:true here is unrecoverable (no
    // live socket, no reconnect attempted) and must never be restored.
    clearSavedGame();
    return;
  }
  Object.assign(state, saved);
  // Build the setup screen too, so backing out of the resumed game doesn't land on an empty form.
  buildSetupScreen(state.gameKey);
  history.pushState({ screen: 'screen-setup' }, '', '#screen-setup');
  buildTrackerScreen();
  navigateTo('screen-tracker');
  // Land on the round in progress rather than round 1, the same way rejoining a
  // room does. Deferred a frame: the table has no measurable height until the
  // screen it lives on has been laid out.
  requestAnimationFrame(() => scrollTableToLatestRound({ smooth: false }));
}

// ── Screen Navigation ────────────────────────────────────
// Every screen change is mirrored to browser/PWA history so the device back
// button (hardware or gesture) drives the same screen stack as the in-app
// back buttons, instead of falling through to closing the app.
let activeScreen = 'screen-home';
let awaitingConfirmedLeave = false; // set right before an intentional history.back() past the tracker guard

function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
  activeScreen = id;
  // Overflow can only be measured once the screen is actually laid out (not display:none).
  if (id === 'screen-tracker') requestWakeLock(); else releaseWakeLock();
  // Arriving at the board shows all three bars, then starts the same countdown a
  // manual scroll would; leaving cancels it so it cannot fire against a screen
  // that is no longer on show.
  if (id === 'screen-tracker') requestAnimationFrame(() => revealTrackerChrome());
  else { clearTimeout(chromeHideTimer); chromeHideTimer = 0; }
}

// ── Screen Wake Lock ─────────────────────────────────────
// Keep screen on while tracker is active so mid-game score entry doesn't get
// interrupted by auto-lock. Lock auto-releases when tab hidden (app switch,
// screen lock), so re-acquire on visibilitychange while still on tracker.
let wakeLock = null;

async function requestWakeLock() {
  if (!('wakeLock' in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request('screen');
  } catch (err) {
    wakeLock = null;
  }
}

function releaseWakeLock() {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && activeScreen === 'screen-tracker' && !wakeLock) {
    requestWakeLock();
  }
});

// Forward navigation: pushes a new history entry so the back button can undo it.
function navigateTo(id) {
  showScreen(id);
  history.pushState({ screen: id }, '', '#' + id);
}

history.replaceState({ screen: 'screen-home' }, '', '#screen-home');

window.addEventListener('popstate', e => {
  const target = (e.state && e.state.screen) || 'screen-home';

  if (awaitingConfirmedLeave) {
    awaitingConfirmedLeave = false;
    showScreen(target);
    return;
  }

  // Leaving an in-progress game (tracker has logged turns) needs confirmation,
  // whether triggered by the on-screen back button or the device back button -
  // both route through this same popstate handler via history.back().
  if (activeScreen === 'screen-tracker' && state.rounds.length > 0 && target !== 'screen-tracker') {
    confirmLeaveAction = 'back';
    history.pushState({ screen: 'screen-tracker' }, '', '#screen-tracker'); // cancel the back nav visually
    openConfirmLeaveModal();
    return;
  }

  showScreen(target);
});

// ── Home Screen ──────────────────────────────────────────
document.querySelectorAll('.game-card:not(.coming-soon)').forEach(card => {
  card.addEventListener('click', () => {
    const key = card.dataset.game;
    state.gameKey = key;
    buildSetupScreen(key);
    navigateTo('screen-setup');
  });
});

document.getElementById('btn-back-home').addEventListener('click', () => history.back());

// ── Setup Screen ─────────────────────────────────────────
function buildSetupScreen(key) {
  const game = GAMES[key];
  const generic = !!game.generic;
  state.generic = generic;
  state.customRules = loadCustomRules(key); // house rules persist per game type, not per session

  document.getElementById('setup-title').textContent = `${generic ? 'Generic Game' : game.name} - Setup`;

  // Rules panel: just the way into the rules sheet. The intro text used to be
  // reprinted here, which duplicated the first thing that sheet already shows.
  const { intro } = getEffectiveRules(key);
  document.getElementById('basic-rules-section').classList.toggle('hidden', !intro);

  // Game name (custom games only)
  document.getElementById('game-name-section').classList.toggle('hidden', !generic);
  if (generic) document.getElementById('game-name-input').value = '';

  // Scoring direction toggle (custom games only)
  document.getElementById('scoring-section').classList.toggle('hidden', !generic);
  setScoringDirectionUI('high');

  // Win condition - relabel for custom games (target ends game; 0 = no limit)
  document.getElementById('win-score').value = game.defaultWinScore;
  document.getElementById('win-lead-label').textContent = generic ? 'Game ends at' : 'First to';
  document.getElementById('win-hint').classList.toggle('hidden', !generic);

  // Entry threshold (Farkle-style games only)
  document.getElementById('min-score-section').classList.toggle('hidden', generic);
  document.getElementById('min-score').value = game.defaultMinScore ?? 0;

  // Multiplayer rooms aren't offered for solo games (nothing to share) or Custom
  // Game (its win condition/name aren't part of the room join contract yet).
  const mpEligible = !generic && game.defaultPlayers !== 1 && !game.trackCloser;
  document.getElementById('multiplayer-section').classList.toggle('hidden', !mpEligible);
  resetMultiplayerSetupUI();

  // Fresh rows for a fresh game: renderPlayerInputs deliberately keeps whatever
  // is already typed, which must not leak from the last game that was set up.
  document.getElementById('player-inputs').innerHTML = '';
  renderPlayerInputs(game.defaultPlayers ?? 4);
}

function setScoringDirectionUI(dir) {
  document.querySelectorAll('#scoring-section .dir-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dir === dir);
  });
}

document.querySelectorAll('#scoring-section .dir-btn').forEach(btn => {
  btn.addEventListener('click', () => setScoringDirectionUI(btn.dataset.dir));
});

const MAX_SETUP_PLAYERS = 8;

// Which of the die's nine cells are lit for each count. 1-6 are the real die
// faces; 7 adds the centre to the six, and 8 lights the whole outer ring. A
// six-sided die has no seven or eight face, but the app allows eight players
// and one pip per player is the clearest way to show the count, so the
// sequence is extended rather than capped. Cells number left to right, top to
// bottom.
const DIE_FACES = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
  7: [1, 3, 4, 5, 6, 7, 9],
  8: [1, 2, 3, 4, 6, 7, 8, 9],
};

function minSetupPlayers() {
  return GAMES[state.gameKey]?.defaultPlayers === 1 ? 1 : 2;
}

function setupPlayerCount() {
  return document.querySelectorAll('.player-input-row').length;
}

// Renders `count` name rows, preserving whatever was already typed and any
// colour a player picked - shrinking to 3 and growing back to 5 must not wipe
// the first three names.
function renderPlayerInputs(count) {
  const container = document.getElementById('player-inputs');
  const kept = Array.from(container.querySelectorAll('.player-input-row')).map(row => ({
    name: row.querySelector('.player-name-input').value,
    color: row.querySelector('.player-color-dot').dataset.color,
  }));
  container.innerHTML = '';
  for (let i = 0; i < count; i++) addPlayerRow(container, i, kept[i]);
  renderCountDie();
}

// The die face and the name rows are one piece of state: every pip takes its
// colour from the row it stands for, so recolouring a player recolours a pip.
function paintDieFace(die, count, colors) {
  const lit = DIE_FACES[count] || [];
  die.querySelectorAll('.die-cell').forEach((cell, i) => {
    const seat = lit.indexOf(i + 1);
    const on = seat !== -1;
    cell.classList.toggle('is-on', on);
    cell.style.background = on ? (colors[seat] || PLAYER_COLORS[seat % PLAYER_COLORS.length]) : '';
  });
  die.setAttribute('aria-label', count + (count === 1 ? ' player' : ' players'));
}

function renderCountDie() {
  const count = setupPlayerCount();
  paintDieFace(
    document.getElementById('count-die'),
    count,
    Array.from(document.querySelectorAll('#player-inputs .player-color-dot')).map(dot => dot.dataset.color),
  );
  document.getElementById('count-label').textContent =
    count + (count === 1 ? ' Player' : ' Players');
  document.getElementById('btn-count-down').disabled = count <= minSetupPlayers();
  document.getElementById('btn-count-up').disabled = count >= MAX_SETUP_PLAYERS;
}

function stepPlayerCount(delta) {
  const count = setupPlayerCount();
  const min = minSetupPlayers();
  const next = count + delta;
  if (next > MAX_SETUP_PLAYERS) { showToast(`A game holds ${MAX_SETUP_PLAYERS} players at most.`); return; }
  if (next < min) { showToast(min === 1 ? 'A game needs at least one player.' : `A game needs at least ${min} players.`); return; }
  renderPlayerInputs(next);
}

document.getElementById('btn-count-up').addEventListener('click', () => stepPlayerCount(1));
document.getElementById('btn-count-down').addEventListener('click', () => stepPlayerCount(-1));

function addPlayerRow(container, index, kept) {
  const color = (kept && kept.color) || PLAYER_COLORS[index % PLAYER_COLORS.length];
  const row = document.createElement('div');
  row.className = 'player-input-row';
  row.innerHTML = `
    <button type="button" class="player-color-dot" style="background:${color}" data-color="${color}" aria-label="Change player color" title="Tap to change color"></button>
    <input type="text" class="player-name-input" placeholder="Player ${index + 1}" maxlength="20">
  `;
  row.style.setProperty('--player-color', color);
  row.querySelector('.player-name-input').value = (kept && kept.name) || '';

  const dot = row.querySelector('.player-color-dot');
  dot.addEventListener('click', e => {
    e.stopPropagation();
    openColorPicker(dot, dot.dataset.color, newColor => {
      dot.style.background = newColor;
      dot.dataset.color = newColor;
      row.style.setProperty('--player-color', newColor);
      renderCountDie();
    });
  });

  container.appendChild(row);
}

document.getElementById('btn-start-game').addEventListener('click', () => {
  if (mpToggleOn) { mpStartHostFlow(); return; }
  const nameInputs = document.querySelectorAll('.player-name-input');
  const colorDots = document.querySelectorAll('.player-color-dot');
  const names = Array.from(nameInputs).map((el, i) => el.value.trim() || `Player ${i + 1}`);
  const minPlayers = GAMES[state.gameKey]?.defaultPlayers === 1 ? 1 : 2;
  if (names.length < minPlayers) return;

  state.players = names.map((name, i) => ({
    name,
    color: colorDots[i]?.dataset.color || PLAYER_COLORS[i % PLAYER_COLORS.length],
  }));

  if (state.generic) {
    state.gameName = document.getElementById('game-name-input').value.trim() || 'Generic Game';
    // Scoped to the scoring section on purpose: `.dir-btn` is a shared button
    // style, and the multiplayer section uses it too. An unscoped query matches
    // that section's active button first, which carries no `data-dir`, so every
    // custom game silently came out 'high' and golf games crowned the highest
    // total instead of the lowest.
    state.scoreDirection = document.querySelector('#scoring-section .dir-btn.active[data-dir]')?.dataset.dir || 'high';
    const rawWin = parseInt(document.getElementById('win-score').value);
    state.winScore = isNaN(rawWin) ? 0 : Math.max(0, rawWin); // 0 = no target
    state.minScore = 0;
    state.trackCloser = true; // always on for custom games
  } else {
    const game = GAMES[state.gameKey];
    state.gameName = game.name;
    state.scoreDirection = game.scoreDirection || 'high';
    const rawWin = parseInt(document.getElementById('win-score').value);
    state.winScore = isNaN(rawWin) ? (game.defaultWinScore || 0) : Math.max(0, rawWin); // 0 = no target
    state.minScore = parseInt(document.getElementById('min-score').value) || 0;
    state.trackCloser = !!game.trackCloser;
  }

  state.rounds = [];
  state.closers = [];
  state.onBoard = state.players.map(() => state.minScore === 0);
  state.gameOver = false;
  state.celebrated = false;
  state.finalRoundAnnounced = false;
  state.startedAt = Date.now();

  buildTrackerScreen();
  navigateTo('screen-tracker');
  saveGame(); // the render inside buildTrackerScreen ran before the tracker screen was active
});

// ── Tracker Screen ───────────────────────────────────────
// Routes through history.back() so this shares the same popstate guard as the device back button.
document.getElementById('btn-back-setup').addEventListener('click', () => history.back());

// Which flow opened modal-confirm: the popstate back-guard, or the New Game
// button - decides what btn-confirm-leave does once the user confirms.
let confirmLeaveAction = 'back';

// True when this device can restart the game without tearing the room down:
// the host, with at least one other player still in it.
function mpCanResetRoom() {
  return !!(state.multiplayer && state.mpIsHost && state.players.length > 1);
}

// The same confirm sheet covers three outcomes, so its wording is set per flow.
function openConfirmLeaveModal() {
  const resetting = confirmLeaveAction === 'reset';
  document.getElementById('confirm-leave-title').textContent =
    resetting ? 'Start a new game?' : 'Leave game?';
  document.getElementById('confirm-leave-hint').textContent = resetting
    ? 'Everyone stays in the room and every score resets to zero.'
    : 'Your current scores will be lost.';
  document.getElementById('btn-confirm-leave').textContent =
    resetting ? 'New Game' : 'Leave';
  document.getElementById('modal-confirm').classList.remove('hidden');
}

document.getElementById('confirm-backdrop').addEventListener('click', closeConfirmModal);
document.getElementById('btn-confirm-stay').addEventListener('click', closeConfirmModal);
document.getElementById('btn-confirm-leave').addEventListener('click', () => {
  closeConfirmModal();

  // Restarting in place keeps the room, the roster and the saved game - only
  // the scoreboard goes back to the start.
  if (confirmLeaveAction === 'reset') {
    mpSend({ type: 'reset-game' });
    return;
  }

  clearSavedGame(); // leaving is deliberate - don't offer this game for resume
  if (state.multiplayer) {
    if (state.mpIsHost) { mpLeavingSelf = true; mpSend({ type: 'host-leave' }); }
    else mpSend({ type: 'leave-self' }); // frees the player's name/slot for a later rejoin
    mpLeaveMultiplayer({ graceful: true });
  }
  if (confirmLeaveAction === 'newgame') {
    // Replace, not push - otherwise a later Back from setup can walk back into
    // the tracker screen for the game just abandoned.
    history.replaceState({ screen: 'screen-setup' }, '', '#screen-setup');
    showScreen('screen-setup');
  } else {
    awaitingConfirmedLeave = true;
    history.back(); // pop past the guard entry pushed by the popstate handler
  }
});

function closeConfirmModal() {
  document.getElementById('modal-confirm').classList.add('hidden');
}

function buildTrackerScreen() {
  document.getElementById('tracker-title').textContent = state.gameName;
  document.getElementById('winner-banner').classList.add('hidden');
  hideWinnerColumnFrame();
  forgetBoardMemory();
  // The room bar is present in a multiplayer game and absent in a solo one, so
  // the heights measured for the last game do not describe this one.
  resetChromeMetrics();
  renderTable();
}

// A board arriving on screen - new game, resumed game, room joined, host reset -
// is entirely "new" as far as the render diff is concerned. Dropping the previous
// board is what stops every cell flashing at once on that first paint.
function forgetBoardMemory() {
  boardMemoryPrimed = false;
  lastTotalsById = new Map();
  lastCellsByKey = new Map();
  lastRenderedRoundCount = 0;
  lastRenderedTurnId = null;
  // Any total still counting belongs to the board being replaced; its target is
  // meaningless against the new one.
  runningTotals.clear();
}

document.getElementById('btn-refresh').addEventListener('click', async () => {
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(registration => registration.unregister()));
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.filter(key => key.startsWith('board-game-tracker-')).map(key => caches.delete(key)));
    }
  } catch (error) {
    console.warn('Could not fully clear cached app files:', error);
  }
  const url = new URL(window.location.href);
  url.searchParams.set('_refresh', Date.now().toString());
  window.location.replace(url.toString());
});

function renderTable() {
  const { players, rounds } = state;

  // What changed since the last paint. Everything animated below keys off these
  // three, and all of them stay false on the first render of a board so a
  // resumed or joined game does not light up every cell at once.
  const animate = boardMemoryPrimed && !prefersReducedMotion();
  const roundAdded = animate && rounds.length > lastRenderedRoundCount;
  const turnMoved = animate && mpCurrentTurnPlayerId !== lastRenderedTurnId;

  const totals = getTotals();
  const leaders = getLeaders(totals);

  // Header
  const headerRow = document.getElementById('player-header-row');
  headerRow.innerHTML = '<th class="col-round"><span class="col-round-short">Rd.</span><span class="col-round-full">Round</span></th>';
  players.forEach((p, pi) => {
    const th = document.createElement('th');
    const wrap = document.createElement('span');
    wrap.className = 'player-header-inner';

    const span = document.createElement('span');
    span.className = 'player-name-label';
    span.classList.toggle('mp-disconnected-name', state.multiplayer && p.connected === false);
    span.classList.toggle('is-leader', leaders.includes(pi));
    span.style.setProperty('--chip', p.color);
    span.style.setProperty('--chip-bd', playerBorderColor(p.color));
    span.style.setProperty('--chip-fg', PLAYER_INK);
    const proxyScorer = state.multiplayer && p.scorerId
      ? players.find(other => other.id === p.scorerId)
      : null;
    // One panel for every case now, so the chip is the only tap target in the
    // header - the colour dot that used to sit beside it lives inside the panel.
    const editable = canOpenPlayerOptions(p);
    span.title = proxyScorer
      ? `${p.name} - scores entered by ${proxyScorer.name}`
      : (editable ? `${p.name} - tap to edit` : p.name);
    span.classList.toggle('is-locked', !editable);
    span.addEventListener('click', () => {
      if (editable) openPlayerOptions(pi);
    });

    const shortName = document.createElement('span');
    shortName.className = 'player-name-short';
    shortName.textContent = p.name.slice(0, 3);
    const fullName = document.createElement('span');
    fullName.className = 'player-name-full';
    fullName.textContent = p.name;
    span.append(shortName, fullName);

    wrap.append(span);
    th.appendChild(wrap);
    th.classList.toggle('current-turn', p.id === mpCurrentTurnPlayerId);
    // Fade the highlight onto the column that just took the turn. At 6-8 players
    // the turn can jump right across the screen, and a hard cut between two
    // columns is easy to miss entirely.
    th.classList.toggle('turn-claim', turnMoved && p.id === mpCurrentTurnPlayerId);
    th.classList.toggle('mp-disconnected-col', state.multiplayer && p.connected === false);
    headerRow.appendChild(th);
  });

  // Body
  const tbody = document.getElementById('score-body');
  tbody.innerHTML = '';
  rounds.forEach((round, ri) => {
    const tr = document.createElement('tr');
    // The board scrolls to the newest round the moment it appears; without an
    // entrance the row is simply already there and the scroll reads as a jump.
    if (roundAdded && ri === rounds.length - 1) tr.className = 'row-enter';
    tr.innerHTML = `<td class="col-round">${ri + 1}</td>`;
    round.forEach((score, pi) => {
      const td = document.createElement('td');
      // A null in the current multiplayer round can mean two different things:
      // the player hasn't submitted yet (unscored - the round is still open),
      // or they submitted and missed the entry threshold. Only the latter
      // should read as the ✗ "below threshold" mark.
      const isUnscored = score === null && state.multiplayer &&
        ri === rounds.length - 1 && mpRoundSubmitted[pi] === false;
      if (score === '') {
        td.className = 'score-cell unscored';
        td.textContent = '·';
        td.title = 'Not scored';
      } else if (isUnscored) {
        td.className = 'score-cell unscored';
        td.textContent = '·';
        td.title = 'Not yet entered';
      } else if (score === null && state.gameKey === 'farkle') {
        // Farkle only: rolling 300 when the entry threshold is 500 banks exactly
        // as much as rolling nothing at all - zero. Marking one F and the other ✗
        // implied a difference that does not exist at the table, so both read as
        // a Farkle here. Games with an entry threshold but no Farkle concept keep
        // the ✗, where "not on the board yet" really is its own state.
        td.className = 'score-cell farkle';
        td.textContent = 'F';
        td.title = 'Farkle (below entry threshold - banked nothing) - tap to edit';
      } else if (score === null) {
        td.className = 'score-cell not-on-board';
        td.textContent = '✗';
        td.title = 'Below entry threshold - tap to edit';
      } else if (score === 0 && state.gameKey === 'farkle') {
        td.className = 'score-cell farkle';
        td.textContent = 'F';
        td.title = 'Farkle - tap to edit';
      } else {
        td.className = 'score-cell';
        td.title = 'Tap to edit';
        if (state.trackCloser && state.closers[ri] === pi) {
          // Keep the score number the centered element: a hidden spacer of the
          // same width as the flag balances the flex row so the number doesn't
          // drift off-center when the flag is added.
          const inner = document.createElement('span');
          inner.className = 'score-cell-inner';
          const spacer = document.createElement('span');
          spacer.className = 'closer-flag closer-flag-spacer';
          spacer.textContent = '⚑';
          const value = document.createElement('span');
          value.className = 'score-value';
          value.textContent = score.toLocaleString();
          const flag = document.createElement('span');
          flag.className = 'closer-flag';
          flag.textContent = '⚑';
          flag.style.color = state.players[pi].color;
          flag.title = `${state.players[pi].name} went out first`;
          inner.append(spacer, value, flag);
          td.appendChild(inner);
        } else {
          td.textContent = score.toLocaleString();
        }
      }
      const isCurrentTurnCol = state.players[pi]?.id === mpCurrentTurnPlayerId;
      td.classList.toggle('current-turn', isCurrentTurnCol);
      td.classList.toggle('turn-claim', turnMoved && isCurrentTurnCol);

      // A score that changed since the last paint - most often another device
      // entering theirs while you were looking elsewhere - gets a one-shot tint
      // so the eye lands on it. `has` rather than a truthy check: a cell going
      // from empty to a real score is exactly the case worth flashing.
      const cellKey = `${boardKeyFor(state.players[pi], pi)}|${ri}`;
      if (animate && lastCellsByKey.has(cellKey) && lastCellsByKey.get(cellKey) !== score) {
        td.classList.add('cell-flash');
      }

      td.addEventListener('click', () => {
        if (state.multiplayer) {
          if (state.mpScoringMode === 'host') {
            // Host authority - can correct any already-recorded round, not just the current
            // one, including a cell currently below the entry threshold (✗).
            if (!state.mpIsHost) return;
            // Correcting a score that was actually played stays allowed, the
            // crosser's own included. What must not happen is a *new* score
            // dropped into the open round for a seat the final lap has closed:
            // the Enter Score modal refuses that, and tapping the empty cell
            // would otherwise walk straight around it.
            const isOpenRound = ri === state.rounds.length - 1;
            const isBlank = !state.rounds[ri] || state.rounds[ri][pi] === null;
            if (isOpenRound && isBlank && finalLapClosedSeats().has(pi)) return;
          } else {
            // Each player can correct their own score in any round, current or
            // past - needed to fix a round they missed while disconnected. A
            // player who nominated a scorer gives up that right; their scorer
            // gets it instead.
            const isOwn = mpEntersScoresFor(state.players[pi]);
            const isCurrentRound = ri === state.rounds.length - 1;
            const alreadySubmitted = !isCurrentRound || (state.rounds[ri] && state.rounds[ri][pi] !== null);
            if (!isOwn || !alreadySubmitted) return;
          }
        }
        editScore(td, ri, pi);
      });
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  // A blank row below the last round. The totals row is stuck to the bottom of
  // the scrollport, so the newest round is only fully clear of it at the exact
  // bottom of the scroll - and the exact bottom is also where the action bar
  // comes back. This row buys the slack to be at one without the other: the
  // auto-scroll stops SCROLL_TAIL_SLACK short of the end, which puts the newest
  // round flush above the totals row while the bar stays collapsed. It sits
  // inside the table rather than being padding on the scrollport so the totals
  // row keeps sticking to the true bottom edge.
  if (rounds.length > 0) {
    const tailRow = document.createElement('tr');
    tailRow.className = 'scroll-tail';
    tailRow.setAttribute('aria-hidden', 'true');
    // One cell per column rather than a single colspan: the turn tint is painted
    // by the cells now, so a merged cell here leaves a bare strip across the
    // highlighted column just above the totals row.
    tailRow.appendChild(document.createElement('td'));
    players.forEach((p, pi) => {
      const td = document.createElement('td');
      td.classList.toggle('current-turn', p.id === mpCurrentTurnPlayerId);
      tailRow.appendChild(td);
    });
    tbody.appendChild(tailRow);
  }

  // Totals footer
  const totalsRow = document.getElementById('totals-row');
  totalsRow.innerHTML = '<td class="col-round totals-label"><span class="totals-label-short">Tot.</span><span class="totals-label-full">Total</span></td>';
  totals.forEach((total, i) => {
    const td = document.createElement('td');
    td.style.color = state.players[i].color;
    // The crown now hangs off the leader's header chip, so the total carries
    // the same fact as an underline instead - never colour on its own.
    td.classList.toggle('is-leader', leaders.includes(i));
    const prefix = '';
    const key = boardKeyFor(state.players[i], i);
    const priorTotal = lastTotalsById.get(key);
    const inFlight = runningTotals.get(key);
    if (animate && inFlight && inFlight.to === total) {
      // A count already heading for this number: hand it the new cell rather
      // than concluding nothing changed and painting the final value.
      countUpTotal(td, key, inFlight.value, total, prefix);
    } else if (animate && priorTotal !== undefined && priorTotal !== total) {
      countUpTotal(td, key, priorTotal, total, prefix);
    } else {
      runningTotals.delete(key);
      td.textContent = prefix + total.toLocaleString();
    }
    const isCurrentTurnCol = state.players[i]?.id === mpCurrentTurnPlayerId;
    td.classList.toggle('current-turn', isCurrentTurnCol);
    td.classList.toggle('turn-claim', turnMoved && isCurrentTurnCol);
    totalsRow.appendChild(td);
  });

  renderLeadBanner(totals);

  if (state.gameOver && totals.length > 0) {
    const best = state.scoreDirection === 'low' ? Math.min(...totals) : Math.max(...totals);
    showWinnerColumnFrame(totals.indexOf(best));
  }

  // Snapshot what is now on screen, so the next render can tell what moved.
  // Rebuilt rather than patched, which drops players who have left instead of
  // leaving their totals behind to be compared against a reused column.
  lastTotalsById = new Map(players.map((p, i) => [boardKeyFor(p, i), totals[i]]));
  lastCellsByKey = new Map();
  rounds.forEach((round, ri) => {
    players.forEach((p, pi) => lastCellsByKey.set(`${boardKeyFor(p, pi)}|${ri}`, round[pi]));
  });
  lastRenderedRoundCount = rounds.length;
  lastRenderedTurnId = mpCurrentTurnPlayerId;
  boardMemoryPrimed = true;

  showTurnColumnFrame(
    mpCurrentTurnPlayerId ? players.findIndex(pl => pl.id === mpCurrentTurnPlayerId) : -1,
  );

  // Rows have just changed height and count, so the floating button's clearance
  // and its locked state are both stale until re-derived.
  measureScoreFabClearance();
  syncScoreFabState();

  // Every state change ends in a re-render, so this is the one save point.
  saveGame();
}

// The standings line above the board: who is ahead, by how much, and which
// round the game is on. It carries the same fact as the crown and the underlined
// total, spelled out in words, so the lead never rests on colour alone.
function renderLeadBanner(totals) {
  const el = document.getElementById('lead-banner');
  if (!el) return;
  const { players, rounds } = state;

  // Nothing to lead yet, and once the game is over the winner banner says it
  // better - two banners stacked would only compete.
  if (rounds.length === 0 || players.length === 0 || state.gameOver) {
    el.classList.add('hidden');
    el.innerHTML = '';
    return;
  }

  const low = state.scoreDirection === 'low';
  const ranked = totals
    .map((total, index) => ({ total, index }))
    .sort((a, b) => (low ? a.total - b.total : b.total - a.total));
  const best = ranked[0];
  const runnerUp = ranked[1];
  const tied = runnerUp && runnerUp.total === best.total;

  el.innerHTML = '';

  const crown = document.createElement('span');
  crown.className = 'lead-banner-crown';
  crown.textContent = tied ? '\u{1F91D}' : '\u{1F451}';

  const text = document.createElement('span');
  text.className = 'lead-banner-text';
  if (tied) {
    text.classList.add('is-tied');
    text.textContent = 'Tied at ' + best.total.toLocaleString();
  } else {
    const leader = players[best.index];
    // Light mode fills are pastels; as *text* they need the deep ink twin of the
    // same hue, which is the colour the chip already uses for its border.
    text.style.setProperty('--lead-color', leader.color);
    text.style.setProperty('--lead-ink', playerBorderColor(leader.color));
    text.textContent = runnerUp
      ? leader.name + ' leads by ' + Math.abs(best.total - runnerUp.total).toLocaleString()
      : leader.name + ' · ' + best.total.toLocaleString();
  }

  const round = document.createElement('span');
  round.className = 'lead-banner-round';
  round.textContent = 'Round ' + rounds.length;

  el.append(crown, text, round);
  el.classList.remove('hidden');
}

// True when this device is allowed to edit that player: their own seat, a seat
// they added in a group join, or - for the host, and for any solo game - anyone
// at the table.
function mpCanRename(player) {
  if (!player) return false;
  return player.id === state.mpPlayerId ||
    player.groupLeaderId === state.mpPlayerId ||
    !!state.mpIsHost;
}

// Who may open the player panel at all. Solo has no seats to protect, so every
// name is editable; multiplayer defers to the same rule that governs renaming.
function canOpenPlayerOptions(player) {
  return state.multiplayer ? mpCanRename(player) : !!player;
}

// Colour is a shade looser than the host powers: a guest may recolour their own
// seat and any seat they added, which is exactly what the old header dot allowed.
function canEditPlayerColor(player) {
  if (!player) return false;
  if (!state.multiplayer) return true;
  return !!state.mpIsHost || player.id === state.mpPlayerId ||
    player.groupLeaderId === state.mpPlayerId;
}

// ── Score input sign handling ────────────────────────────
// Phone keypads have no minus key and no `inputmode` value produces one: `tel`
// offers + * #, `decimal` offers a period, `numeric` is digits only. So a score
// could never be entered as negative on a phone. The fix is a ± button beside
// the field rather than a different keyboard, which also means score inputs are
// `text` + `inputmode="numeric"` instead of `type="number"`: only a text input
// can hold a bare "-" while the digits after it are still being typed.
const SCORE_INPUT_MAX = 99999;

function negativeScoresAllowed() {
  return !!(state.generic || GAMES[state.gameKey]?.allowNegative);
}

// "" and a lone "-" are both "nothing entered yet", not zero - a half-typed
// negative must not commit as 0 if the field is read mid-edit.
function parseScoreInput(raw) {
  const text = String(raw).trim();
  if (text === '' || text === '-') return null;
  const parsed = parseInt(text, 10);
  return isNaN(parsed) ? null : parsed;
}

function toggleScoreSign(input) {
  const text = input.value.trim();
  input.value = text.startsWith('-') ? text.slice(1) : `-${text}`;
  // Setting .value fires nothing, and the Enter Score row's projected total is
  // driven by 'input' - without this, flipping the sign leaves the total stale.
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.focus();
  const end = input.value.length;
  try { input.setSelectionRange(end, end); } catch (e) { /* not all inputs support it */ }
}

function makeSignToggle(input) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'sign-toggle';
  btn.textContent = '±';
  btn.setAttribute('aria-label', 'Toggle negative score');
  // The inline cell editor commits on blur, so the tap must not pull focus off
  // the input - that would close the editor before the click ever landed.
  btn.addEventListener('pointerdown', e => e.preventDefault());
  btn.addEventListener('mousedown', e => e.preventDefault());
  btn.addEventListener('click', () => toggleScoreSign(input));
  return btn;
}

function editScore(td, ri, pi) {
  const current = state.rounds[ri][pi];
  const game = GAMES[state.gameKey];
  const allowNeg = negativeScoresAllowed();
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current === null ? 0 : current;
  input.inputMode = 'numeric';
  input.pattern = allowNeg ? '-?[0-9]*' : '[0-9]*';
  input.className = 'score-edit-input';
  td.textContent = '';
  td.className = 'score-cell';
  const wrap = document.createElement('span');
  wrap.className = 'score-edit-wrap';
  wrap.appendChild(input);
  if (allowNeg) wrap.appendChild(makeSignToggle(input));
  td.appendChild(wrap);
  input.focus();
  input.select();

  const commit = () => {
    const parsed = parseScoreInput(input.value);
    let newScore = parsed === null ? 0 : parsed;
    // `type="number"`'s min/max no longer apply, so the bounds are enforced here.
    newScore = Math.max(allowNeg ? -SCORE_INPUT_MAX : 0, Math.min(SCORE_INPUT_MAX, newScore));
    if (!state.generic) {
      newScore = game.allowNegative ? newScore : Math.max(0, newScore);
      if (state.gameKey === 'farkle') newScore = normalizeFarkleScore(newScore);
    }

    if (state.multiplayer) {
      // The click handler already restricts edits to the current round and to
      // cells this device is allowed to touch (own column, or any if host-scoring).
      if (state.mpScoringMode === 'host') {
        const values = state.players.map((pl, i) => (i === pi ? newScore : state.rounds[ri][i]));
        mpSend({ type: 'host-submit-scores', values, roundIndex: ri });
      } else {
        const target = state.players[pi];
        mpSend({ type: 'edit-score', value: newScore, roundIndex: ri, playerId: target ? target.id : undefined });
      }
      renderTable(); // optimistic; the server's round-update broadcast will reconcile
      return;
    }

    // Same entry-threshold rule as Add Turn: a player not yet on the board needs
    // minScore in a single turn - an edit below that stays off the board (null).
    // Whether they were already on board is judged from rounds *before* this
    // one, not the global onBoard flag - that flag reflects the latest round,
    // so editing an earlier still-off-board round after a later round put the
    // player on board would otherwise skip the threshold check entirely.
    const onBoardBeforeThisRound = state.minScore === 0 ||
      state.rounds.slice(0, ri).some(r => r[pi] !== null);
    state.rounds[ri][pi] = (onBoardBeforeThisRound || newScore >= state.minScore) ? newScore : null;
    state.onBoard[pi] = state.minScore === 0 || state.rounds.some(r => r[pi] !== null);
    state.gameOver = false;
    document.getElementById('winner-banner').classList.add('hidden');
    renderTable();
    checkWin();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.removeEventListener('blur', commit); renderTable(); }
  });
}

function getTotals() {
  return state.players.map((_, pi) =>
    state.rounds.reduce((sum, round) => sum + (round[pi] || 0), 0)
  );
}

// Player indices tied for the lead (custom games only; empty if all tied or no rounds)
function getLeaders(totals) {
  if (!state.generic || state.rounds.length === 0) return [];
  const best = state.scoreDirection === 'low' ? Math.min(...totals) : Math.max(...totals);
  const leaders = totals.reduce((acc, t, i) => (t === best ? acc.concat(i) : acc), []);
  return leaders.length === totals.length ? [] : leaders;
}

// The round where some player's running total first reaches winScore, and the
// seat that got there, or null if nobody has. Purely derived from
// state.rounds/winScore, so it comes out identical on every device
// (host-scoring, each-scoring, or solo) without needing any extra synced state.
// Within the crossing round the seats are read in that round's turn order, so
// the crosser is whoever got there first in play rather than whoever sits
// furthest left.
function findWinTrigger() {
  if (!state.winScore || state.winScore <= 0) return null;
  const running = state.players.map(() => 0);
  for (let r = 0; r < state.rounds.length; r++) {
    state.players.forEach((_, pi) => { running[pi] += (state.rounds[r][pi] || 0); });
    // Seats bank their scores in turn order, so the first seat in that order to
    // be over the target is the one who actually got there first. That is not
    // the leftmost column once a round starts somewhere other than column one.
    const crosser = mpTurnOrder(r).find(pi => running[pi] >= state.winScore);
    if (crosser !== undefined) return { round: r, playerIndex: crosser };
  }
  return null;
}

// Whether round `r` is finished. Multiplayer keeps an empty row open for the
// round in progress, so a later row is what proves the earlier one closed;
// solo rounds are entered whole, so the row existing is enough.
function roundIsComplete(r) {
  if (r < 0) return false;
  return state.multiplayer ? state.rounds.length > r + 1 : state.rounds.length >= r + 1;
}

// Whether the last lap has been played out, so a winner can be crowned.
//
// The extra round belongs to whoever crossed the target, not to the round they
// crossed in: if the crosser played fourth of six, the two seats behind them
// finish that round and the three ahead of them take their turn in the next one
// - and then it's over. Waiting for the whole next row would hand the crosser
// and everyone after them a second bite. Position is measured in this round's
// turn order, not column order, because the host declares who leads off.
// Only multiplayer can settle mid-row (it tracks who has submitted); solo
// enters a round at a time, so there it still takes the full extra round.
function finalLapSettled(trigger) {
  // Games without a final round end the moment the target is crossed.
  if (!GAMES[state.gameKey]?.finalRoundOnWin) {
    return state.rounds.length >= trigger.round + 1;
  }
  const order = mpTurnOrder(trigger.round);
  const crosserPos = Math.max(0, order.indexOf(trigger.playerIndex));
  // Leading the round off and crossing means everyone else already answered it
  // inside that same round, so the game ends when the round does. Multiplayer
  // only: that reasoning is about seats answering one after another, and a solo
  // round is entered whole, so there nobody has answered the crossing yet and a
  // real extra round is still owed - without this guard a solo game where the
  // leftmost seat crosses ends on the spot, contradicting its own toast.
  if (state.multiplayer && crosserPos === 0) return roundIsComplete(trigger.round);
  const extraRound = trigger.round + 1;
  if (roundIsComplete(extraRound)) return true;
  if (!state.multiplayer || state.rounds.length <= extraRound) return false;
  for (let i = 0; i < crosserPos; i++) {
    const pi = order[i];
    // A player who has genuinely dropped out can't be waited on.
    if (state.players[pi] && state.players[pi].connected === false) continue;
    if (!mpRoundSubmitted[pi]) return false;
  }
  return true;
}

// The seats that must not be offered a score in the round currently open,
// because the final lap has already passed them by. Derived from the same
// trigger and turn order `finalLapSettled` uses, so the two cannot disagree
// about who still owes a turn.
//
// Once the extra round opens, the only seats with a turn left are the ones that
// played *before* the crosser in the crossing round: everyone after the crosser
// took their last turn inside that round, and the crosser's own turn is what
// ended the game. The Worker does not know any of this - it hands the turn to
// the next unsubmitted seat, crosser included - so the client is what has to
// refuse. Multiplayer only: solo enters a whole round at a time and has no
// part-played row to reason about.
function finalLapClosedSeats() {
  const closed = new Set();
  if (!state.multiplayer) return closed;
  if (!GAMES[state.gameKey]?.finalRoundOnWin) return closed;
  const trigger = findWinTrigger();
  if (!trigger) return closed;
  // Inside the crossing round nothing is closed that `mpRoundSubmitted` has not
  // already closed: every seat there is either done or still owed its turn.
  if (state.rounds.length - 1 <= trigger.round) return closed;
  const order = mpTurnOrder(trigger.round);
  const crosserPos = Math.max(0, order.indexOf(trigger.playerIndex));
  for (let i = crosserPos; i < order.length; i++) closed.add(order[i]);
  return closed;
}

function checkWin() {
  const banner = document.getElementById('winner-banner');
  const trigger = findWinTrigger();
  const triggerRound = trigger ? trigger.round : -1;

  // No target, or target not reached yet: no winner - reset so a later win re-celebrates
  if (triggerRound === -1) {
    banner.classList.add('hidden');
    hideWinnerColumnFrame();
    state.gameOver = false;
    state.celebrated = false;
    state.finalRoundAnnounced = false;
    mpGameOverSent = false;
    return;
  }

  if (!finalLapSettled(trigger)) {
    banner.classList.add('hidden');
    hideWinnerColumnFrame();
    state.gameOver = false;
    state.celebrated = false;
    mpGameOverSent = false;
    if (!state.finalRoundAnnounced) {
      state.finalRoundAnnounced = true;
      const crosser = state.players[trigger.playerIndex];
      showToast(`FINAL ROUND STARTED!! ${crosser ? crosser.name : 'Someone'} scored over ${state.winScore.toLocaleString()} points! Everyone else gets one more turn to beat it.`);
    }
    return;
  }

  // Extra round played out: crown the actual winner, who may not be whoever
  // first crossed the target (lowest total wins in golf mode).
  const totals = getTotals();
  const best = state.scoreDirection === 'low' ? Math.min(...totals) : Math.max(...totals);
  const winIdx = totals.indexOf(best);
  const winner = state.players[winIdx];
  banner.textContent = `🎉 ${winner.name} wins with ${totals[winIdx].toLocaleString()} points!`;
  banner.classList.remove('hidden');
  state.gameOver = true;
  hideTurnToast(); // the winner banner owns the screen from here
  document.querySelectorAll('#score-table .current-turn').forEach(cell => {
    cell.classList.remove('current-turn');
  });
  // Whose turn it was stopped mattering the moment someone won; the winner
  // frame owns the column outline from here.
  document.getElementById('turn-column-frame').classList.add('hidden');
  showWinnerColumnFrame(winIdx);

  if (state.multiplayer && state.mpIsHost && !mpGameOverSent) {
    mpGameOverSent = true;
    mpSend({ type: 'declare-game-over' });
  }

  saveGame(); // callers render before checkWin runs, so persist the gameOver flag here
  openVictoryScreen(winIdx, totals);
}

function openVictoryScreen(winIdx, totals) {
  renderVictoryScreen(winIdx, totals);
  // checkWin can run repeatedly as multiplayer messages and renders settle.
  // The transition, not the calculation, owns the one automatic celebration.
  if (activeScreen === 'screen-victory') return;
  navigateTo('screen-victory');
  if (state.celebrated) return;
  state.celebrated = true;
  document.getElementById('victory-winner-card').classList.add('celebrate');
  fireConfetti();
  if (window.sfx) window.sfx.play('victory');
}

function ordinalRank(rank) {
  const mod100 = rank % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${rank}th`;
  return `${rank}${rank % 10 === 1 ? 'st' : rank % 10 === 2 ? 'nd' : rank % 10 === 3 ? 'rd' : 'th'}`;
}

function renderVictoryScreen(winIdx, totals) {
  const winner = state.players[winIdx];
  const elapsedMinutes = state.startedAt
    ? Math.max(1, Math.round((Date.now() - state.startedAt) / 60000))
    : null;
  const roundLabel = `${state.rounds.length} ${state.rounds.length === 1 ? 'Round' : 'Rounds'}`;
  document.getElementById('victory-meta').textContent =
    [state.gameName, roundLabel, elapsedMinutes && `${elapsedMinutes} ${elapsedMinutes === 1 ? 'Minute' : 'Minutes'}`]
      .filter(Boolean).join(' · ');
  document.getElementById('victory-winner-name').textContent = winner.name;
  document.getElementById('victory-winner-score').textContent = `${totals[winIdx].toLocaleString()} pts`;
  const card = document.getElementById('victory-winner-card');
  card.style.setProperty('--winner-color', winner.color);

  const ordered = state.players.map((player, index) => ({ player, index, total: totals[index] }))
    .sort((a, b) => state.scoreDirection === 'low' ? a.total - b.total : b.total - a.total);
  const list = document.getElementById('victory-standings-list');
  list.replaceChildren(...ordered.map((entry, position) => {
    const item = document.createElement('li');
    item.className = `victory-standing${entry.index === winIdx ? ' is-winner' : ''}`;
    item.innerHTML = `<span class="victory-rank">${ordinalRank(position + 1)}</span><span class="victory-player-dot" aria-hidden="true"></span><span class="victory-player-name"></span><strong>${entry.total.toLocaleString()}</strong>`;
    item.querySelector('.victory-player-dot').style.background = entry.player.color;
    item.querySelector('.victory-player-name').textContent = entry.player.name;
    return item;
  }));

  const rematch = document.getElementById('btn-victory-rematch');
  const guest = state.multiplayer && !state.mpIsHost;
  rematch.disabled = guest;
  rematch.textContent = guest ? 'Waiting for Host' : 'Rematch · Same Players';
}

// ── Motion ───────────────────────────────────────────────
// Every animation below is decoration over information the table already shows,
// so all of them are skipped outright when the OS asks for reduced motion rather
// than being shortened. Read live, not cached: the setting can change mid-session.
function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}

// The table is rebuilt wholesale on every render, so a CSS transition between
// two renders can never fire - the nodes it would transition are new. Anything
// that reacts to a change therefore has to compare against what was on screen
// last time and hand the fresh node a keyframe animation instead. These three
// maps are that memory.
let lastTotalsById = new Map();     // player id -> total as last rendered
let lastCellsByKey = new Map();     // "playerId|roundIndex" -> score as last rendered
let lastRenderedRoundCount = 0;
let lastRenderedTurnId = null;
// Nothing should animate on the first paint of a resumed or joined game: every
// value is "new" then, and the whole board would flash at once.
let boardMemoryPrimed = false;

// Only multiplayer seats carry an id - solo players are built from names and
// colours alone. Keying the render memory on id alone therefore collapses every
// solo column onto the same "undefined|0" entry, where the last player written
// wins and the others compare against a stranger's score. Column index is stable
// within a solo game, so it stands in.
function boardKeyFor(player, index) {
  return (player && player.id) ? player.id : `#${index}`;
}

// Counts a total up (or down) to its new value. The number people actually watch
// is the total, so moving it makes the round land; jumping it does not.
const TOTAL_COUNT_MS = 420;
// The sheet's projected total re-targets on every keystroke, so it counts over a
// shorter distance in less time. At 420ms a fast typist outruns the number and
// watches it trail the digits they have already finished entering.
const TURN_COUNT_MS = 240;

// Count-ups in flight, keyed the same way the render memory is. Renders happen
// for reasons that have nothing to do with the total mid-count - the round
// completing, the turn moving on, a presence update - and each one builds a
// fresh <td>. Without this record the second render inside the 420ms window
// looks up the memory, finds it already holding the new total, decides there is
// nothing to animate and paints the final number, killing the count a few frames
// in. That hits the last column hardest, because its score is the one that
// completes the round and triggers the extra render.
const runningTotals = new Map();

function countUpTotal(td, key, from, to, prefix, duration = TOTAL_COUNT_MS) {
  const live = runningTotals.get(key);
  // Same target as the count already running: keep its clock and its origin and
  // just point it at the new cell, so a re-render mid-count is invisible.
  // Different target means the score moved again, so start a fresh count from
  // the number currently on screen rather than snapping back to an older one.
  const record = (live && live.to === to) ? live : {
    from: live ? live.value : from,
    value: live ? live.value : from,
    to,
    start: performance.now(),
    running: false,
  };
  record.td = td;
  record.prefix = prefix;
  record.ms = duration;
  runningTotals.set(key, record);
  if (record.running) return;   // existing loop will pick up the new cell
  record.running = true;

  function step(now) {
    // Superseded by a later render starting a different count for this column.
    if (runningTotals.get(key) !== record) return;
    // The cell is replaced on every render, so a stale animation would be
    // writing into a detached node.
    if (!record.td.isConnected) { runningTotals.delete(key); return; }
    const t = Math.min(1, (now - record.start) / record.ms);
    // Ease-out: most of the distance early, so it reads as fast even at 420ms.
    const eased = 1 - Math.pow(1 - t, 3);
    record.value = Math.round(record.from + (record.to - record.from) * eased);
    record.td.textContent = record.prefix + record.value.toLocaleString();
    if (t < 1) requestAnimationFrame(step);
    else runningTotals.delete(key);
  }
  requestAnimationFrame(step);
}

// Scrolls the score table down to the newest round row. Used when a round is
// added and when (re)joining a room, so nobody is left looking at round 1 while
// the table has moved on.
function scrollTableToLatestRound({ smooth = true } = {}) {
  const wrap = document.querySelector('.table-scroll-wrap');
  if (!wrap) return;
  const tail = document.querySelector('#score-body tr.scroll-tail');
  const maxScroll = wrap.scrollHeight - wrap.clientHeight;
  // Stop the height of the tail row short of the true bottom, which lands the
  // newest round flush above the sticky totals row rather than tucked under it.
  const top = tail ? Math.max(0, maxScroll - tail.offsetHeight) : maxScroll;
  wrap.scrollTo({ top, behavior: smooth ? 'smooth' : 'auto' });
}

// Brings the current turn's column into view horizontally. With a full table
// the active column is often outside the viewport, so a turn several seats away
// would otherwise pass unnoticed.
function scrollTableToCurrentTurn({ smooth = true } = {}) {
  const wrap = document.querySelector('.table-scroll-wrap');
  if (!wrap || !mpCurrentTurnPlayerId) return;
  const playerIndex = state.players.findIndex(p => p.id === mpCurrentTurnPlayerId);
  if (playerIndex === -1) return;
  const cells = document.querySelectorAll('#player-header-row th');
  const cell = cells[playerIndex + 1];
  if (!cell) return;
  // The round-number column eats the left edge of the viewport, so treat it as
  // part of the frame rather than as space the player column can sit in.
  const gutter = cells[0] ? cells[0].offsetWidth : 0;
  const visibleWidth = wrap.clientWidth - gutter;
  if (visibleWidth <= 0) return;
  const alreadyVisible = cell.offsetLeft >= wrap.scrollLeft + gutter &&
    cell.offsetLeft + cell.offsetWidth <= wrap.scrollLeft + wrap.clientWidth;
  if (alreadyVisible) return;
  const centered = cell.offsetLeft - gutter - Math.max(0, (visibleWidth - cell.offsetWidth) / 2);
  wrap.scrollTo({ left: Math.max(0, centered), behavior: smooth ? 'smooth' : 'auto' });
}

// ── Tracker chrome auto-hide ─────────────────────────────
// The title bar, the room bar and the action bar collapse together after a few
// seconds of the player not scrolling by hand, so a long game settles into being
// all board. Touching the board - a finger drag, a wheel, an arrow key - brings
// all three straight back and restarts the countdown.
//
// Deliberately driven by input rather than by scroll position: the app scrolls
// the board itself whenever a round lands or the turn moves, and those scrolls
// must not flash the bars back at a player who never asked for them. A `scroll`
// listener cannot tell the two apart, so the reveal hangs off the input events
// only a person can produce.

// Quiet time before the bars collapse again.
const CHROME_IDLE_MS = 3000;
// How long after the last scroll event a manual gesture is still considered to
// be running. Covers touch momentum, which keeps scrolling long after touchend
// with no further input event to hang the countdown on.
const CHROME_MOMENTUM_MS = 150;
// Below this much scrollable overflow, collapsing buys nothing - and worse, with
// nothing to scroll there is no gesture left that could bring the bars back, so
// they would be gone for the rest of the game. Leave them pinned.
const CHROME_MIN_OVERFLOW = 80;
// The scrollport's height with nothing collapsed. Remembered rather than read
// live so the guard above always measures against the same yardstick: measuring
// the collapsed height would let collapsing change the number that decides
// whether to collapse, which flickers on a board that only just overflows.
let chromeExpandedViewport = 0;
// Combined height of the title and room bars, remembered from whenever they were
// last measured at full size. Taken as a running maximum because a measurement
// taken mid-collapse catches them part-way through their 220ms transition, and
// an under-estimate here shows up as the board sliding under the player's finger.
// Reset when the layout changes underneath it.
let chromeTopBarsHeight = 0;
let chromeHideTimer = 0;
let chromeMomentumTimer = 0;
// True from the first input event of a gesture until the scrolling it caused has
// stopped. While it is set, scroll events count as continued manual scrolling.
let chromeManualScrolling = false;

function resetChromeMetrics() {
  chromeExpandedViewport = 0;
  chromeTopBarsHeight = 0;
}

// Collapsing the top bars grows the scrollport upwards by their height, which
// would slide the board up the screen by that much even though scrollTop never
// moved. Cancelling that out against scrollTop keeps whatever the player was
// reading exactly where it was. The action bar needs no such correction: it
// collapses off the bottom edge, so the top of the scrollport does not move.
function setTrackerChromeCollapsed(collapsed) {
  const screen = document.getElementById('screen-tracker');
  const wrap = document.querySelector('.table-scroll-wrap');
  if (!screen || !wrap) return;
  // Both classes, not just the top one. They are always set together, but if
  // they ever drift apart a guard that reads only the top bar returns early and
  // leaves the footer collapsed for good - visible bars with the floating
  // button still hovering over the board, which is exactly the wrong state.
  const wasCollapsed = screen.classList.contains('chrome-top-hidden')
    && screen.classList.contains('chrome-bottom-hidden');
  if (wasCollapsed === collapsed
      && screen.classList.contains('chrome-top-hidden')
         === screen.classList.contains('chrome-bottom-hidden')) return;

  if (!collapsed) {
    // Measure while they are still at full size - after the class goes on there
    // is nothing left to measure.
    const header = screen.querySelector('.screen-header');
    const roomBar = screen.querySelector('#mp-room-bar');
    const visible = el => el && el.offsetHeight > 0 ? el.offsetHeight : 0;
    chromeTopBarsHeight = Math.max(chromeTopBarsHeight, visible(header) + visible(roomBar));
  }

  screen.classList.toggle('chrome-top-hidden', collapsed);
  screen.classList.toggle('chrome-bottom-hidden', collapsed);

  if (chromeTopBarsHeight > 0) {
    const shift = collapsed ? -chromeTopBarsHeight : chromeTopBarsHeight;
    wrap.scrollTop = Math.max(0, wrap.scrollTop + shift);
  }
}

// The countdown only ever runs while there is enough board to be worth hiding
// chrome for; on a short board the bars stay put and no timer is armed.
function scheduleTrackerChromeHide() {
  clearTimeout(chromeHideTimer);
  chromeHideTimer = 0;
  if (!trackerChromeMayCollapse()) return;
  chromeHideTimer = setTimeout(() => {
    chromeHideTimer = 0;
    if (!trackerChromeMayCollapse()) return;
    setTrackerChromeCollapsed(true);
  }, CHROME_IDLE_MS);
}

function trackerChromeMayCollapse() {
  const wrap = document.querySelector('.table-scroll-wrap');
  if (!wrap || activeScreen !== 'screen-tracker') return false;
  const overflow = wrap.scrollHeight - (chromeExpandedViewport || wrap.clientHeight);
  return overflow > CHROME_MIN_OVERFLOW;
}

// The one entry point for "a person just did something": brings the bars back
// and restarts the countdown. Also called when a bar itself is touched, so the
// chrome never slides out from under a finger reaching for Enter Score.
function revealTrackerChrome() {
  setTrackerChromeCollapsed(false);
  scheduleTrackerChromeHide();
}

// Re-checks only the short-board guard - the collapse decision itself belongs to
// the timer. Runs when the board's size changes, which is the one thing that can
// turn a collapsible board into a non-collapsible one behind the timer's back.
function updateTrackerChrome() {
  const screen = document.getElementById('screen-tracker');
  const wrap = document.querySelector('.table-scroll-wrap');
  if (!screen || !wrap) return;

  const collapsed = screen.classList.contains('chrome-top-hidden');
  if (!collapsed) chromeExpandedViewport = wrap.clientHeight;

  if (!trackerChromeMayCollapse()) {
    clearTimeout(chromeHideTimer);
    chromeHideTimer = 0;
    setTrackerChromeCollapsed(false);
    return;
  }
  // A board that has just grown past the threshold - a round landed on what was
  // a short game - has no countdown running, because there was nothing to arm
  // one for. Start it now rather than leaving the bars pinned until the player
  // happens to scroll.
  if (!collapsed && !chromeHideTimer) scheduleTrackerChromeHide();
}

// The floating Enter Score button stands in for the action bar while that bar is
// collapsed; CSS handles showing it. This only has to keep it clear of the two
// rows worth protecting - the sticky totals row and the round being played - and
// keep it wearing the same locked state as the button it stands in for.

// Measured on layout changes rather than on scroll: reading offsetHeight forces
// layout, which has no business running on every scroll event.
function measureScoreFabClearance() {
  const screen = document.getElementById('screen-tracker');
  const totalsRow = document.getElementById('totals-row');
  const rows = document.querySelectorAll('#score-body tr:not(.scroll-tail)');
  const activeRow = rows[rows.length - 1];
  if (!screen || !totalsRow || !activeRow) return;
  screen.style.setProperty('--fab-clear',
    (totalsRow.offsetHeight + activeRow.offsetHeight + 10) + 'px');
}

// The floating button is an icon with no text to grey out, so it mirrors the
// action button rather than deriving the same state twice and risking the two
// disagreeing about whether this device may score.
function syncScoreFabState() {
  const fab = document.getElementById('btn-fab-score');
  const btn = document.getElementById('btn-add-turn');
  if (!fab || !btn) return;
  fab.disabled = btn.disabled;
  fab.classList.toggle('mp-locked', btn.classList.contains('mp-locked'));
}

(function watchTrackerChrome() {
  const wrap = document.querySelector('.table-scroll-wrap');
  if (!wrap) return;

  // The events a person makes and the app cannot: a wheel, a finger on the
  // board, a key that scrolls. Programmatic scrollTo produces none of them,
  // which is exactly why the reveal hangs off these and not off `scroll`.
  const SCROLL_KEYS = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown',
    'Home', 'End', ' ', 'Spacebar']);
  function manualScroll() {
    chromeManualScrolling = true;
    clearTimeout(chromeMomentumTimer);
    chromeMomentumTimer = setTimeout(() => { chromeManualScrolling = false; }, CHROME_MOMENTUM_MS);
    revealTrackerChrome();
  }
  wrap.addEventListener('wheel', manualScroll, { passive: true });
  wrap.addEventListener('touchstart', manualScroll, { passive: true });
  wrap.addEventListener('touchmove', manualScroll, { passive: true });
  wrap.addEventListener('keydown', e => { if (SCROLL_KEYS.has(e.key)) manualScroll(); });

  // Momentum after the finger leaves keeps the gesture alive: each scroll event
  // it produces pushes the countdown out, so the bars are still there when the
  // board finally comes to rest rather than vanishing mid-glide.
  wrap.addEventListener('scroll', () => {
    if (chromeManualScrolling) manualScroll();
  }, { passive: true });

  // Reaching for a button on a bar counts as activity too, or the bar collapses
  // out from under the finger already travelling towards it.
  const screen = document.getElementById('screen-tracker');
  if (screen) {
    ['.screen-header', '#mp-room-bar', '.tracker-actions'].forEach(sel => {
      const bar = screen.querySelector(sel);
      if (!bar) return;
      bar.addEventListener('pointerdown', () => revealTrackerChrome());
      bar.addEventListener('focusin', () => revealTrackerChrome());
    });
  }

  window.addEventListener('resize', () => {
    // Rotation, a keyboard opening, a font-size change: every remembered height
    // above is stale, and a stale one is worse than none.
    resetChromeMetrics();
    measureScoreFabClearance();
    updateTrackerChrome();
  });
  // A new round row changes whether the board overflows at all, and no scroll
  // event fires for that.
  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(() => {
      measureScoreFabClearance();
      updateTrackerChrome();
    }).observe(document.getElementById('score-table'));
  }
  // Delegated rather than duplicated: the action button owns the entry flow,
  // including the toast that names whose turn it is when this device is locked
  // out, and that toast is the whole point of it staying clickable while locked.
  const fab = document.getElementById('btn-fab-score');
  if (fab) fab.addEventListener('click', () => document.getElementById('btn-add-turn').click());
})();

function hideWinnerColumnFrame() {
  document.getElementById('winner-column-frame').classList.add('hidden');
}

// The turn highlight is a rounded frame laid over the column, matching the
// winner frame's shape. Inset shadows on the cells could only ever draw square
// corners, and a hard-cornered box around a rounded table looked like a bug.
function showTurnColumnFrame(playerIndex) {
  const frame = document.getElementById('turn-column-frame');
  if (!frame) return;
  if (state.gameOver) { frame.classList.add('hidden'); return; }
  const table = document.getElementById('score-table');
  const headerCell = playerIndex >= 0
    ? document.querySelector(`#player-header-row th:nth-child(${playerIndex + 2})`)
    : null;
  if (!table || !headerCell) { frame.classList.add('hidden'); return; }
  frame.style.left = `${headerCell.offsetLeft}px`;
  frame.style.top = '0px';
  frame.style.width = `${headerCell.offsetWidth}px`;
  frame.style.height = `${table.offsetHeight}px`;
  // One custom property drives both the outline and the tint. The frame draws
  // the outline; the tint is painted by the cells themselves, which is why the
  // property is set on the table as well - a cell cannot inherit from an
  // absolutely positioned sibling.
  const turnColor = state.players[playerIndex]
    ? state.players[playerIndex].color
    : 'var(--p2)';
  frame.style.setProperty('--turn-color', turnColor);
  table.style.setProperty('--turn-color', turnColor);
  frame.classList.remove('hidden');
}

function showWinnerColumnFrame(playerIndex) {
  const frame = document.getElementById('winner-column-frame');
  const table = document.getElementById('score-table');
  const headerCell = document.querySelector(`#player-header-row th:nth-child(${playerIndex + 2})`);
  if (!frame || !table || !headerCell) return;
  frame.style.left = `${headerCell.offsetLeft}px`;
  frame.style.top = '0px';
  frame.style.width = `${headerCell.offsetWidth}px`;
  frame.style.height = `${table.offsetHeight}px`;
  frame.classList.remove('hidden');
}

window.addEventListener('resize', () => {
  showTurnColumnFrame(
    mpCurrentTurnPlayerId ? state.players.findIndex(pl => pl.id === mpCurrentTurnPlayerId) : -1,
  );
  if (!state.gameOver) return;
  const totals = getTotals();
  const best = state.scoreDirection === 'low' ? Math.min(...totals) : Math.max(...totals);
  showWinnerColumnFrame(totals.indexOf(best));
});

// ── Win Confetti (classic burst) ─────────────────────────
// Tapping the winner banner again used to cancel the burst in flight and start
// over, so celebrating twice in a row read as an interruption rather than as
// more confetti. Bursts now stack instead. Eight is the cap: it lets a group
// pile on the celebration while bounding the particle count at 1,200
// no matter how fast anyone taps. Past three the oldest burst - the one closest
// to finishing anyway - is dropped to make room.
const CONFETTI_MAX_BURSTS = 8;
const CONFETTI_LIFE = 5;
// How long a burst pushed off the end of the queue takes to fade out. Long
// enough to read as the confetti thinning, short enough that the burst replacing
// it is clearly the one that answered the tap.
const CONFETTI_FADE = 0.35;
let confettiBursts = [];
let confettiRAF = null;

function fireConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  // Resizing a canvas clears it, so only do it when the size actually changed -
  // otherwise a second burst wipes the first one's frame out from under it.
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const rand = (a, b) => a + Math.random() * (b - a);
  confettiBursts.push({
    t: 0,
    fade: 0,      // counts up once this burst has been pushed off the end
    retiring: false,
    parts: Array.from({ length: 150 }, () => ({
      x: rand(0, W),
      y: rand(-H * 0.5, 0),
      w: rand(6, 11),
      h: rand(8, 15),
      vx: rand(-0.6, 0.6),
      vy: rand(2.2, 5),
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.25, 0.25),
      sway: rand(0.5, 1.6),
      phase: rand(0, Math.PI * 2),
      color: PLAYER_COLORS[(Math.random() * PLAYER_COLORS.length) | 0],
    })),
  });
  // Over the cap, the oldest burst is retired rather than dropped on the spot:
  // yanking 150 pieces out of the frame is a visible hole, and the tap that
  // caused it should read as adding confetti, not as deleting some. It fades out
  // over CONFETTI_FADE while the new burst is already falling. Bursts already
  // retiring do not count against the cap - they are on their way out, and
  // counting them would retire a live burst early to make room for nothing.
  const live = confettiBursts.filter(burst => !burst.retiring);
  if (live.length > CONFETTI_MAX_BURSTS) live[0].retiring = true;

  // One loop drives every burst; a second call joins the existing loop rather
  // than starting a rival one that would fight it for the same canvas.
  if (confettiRAF) return;
  (function frame() {
    // Cleared in device pixels so it still covers the canvas if a later burst
    // resized it, rather than trusting the width this loop was started with.
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    // Retired before drawing rather than after, so the frame that ends the last
    // burst is a frame that paints nothing and the canvas is left clean.
    confettiBursts = confettiBursts.filter(burst =>
      burst.t < CONFETTI_LIFE && burst.fade < CONFETTI_FADE);
    for (const burst of confettiBursts) {
      burst.t += 0.016;
      if (burst.retiring) burst.fade += 0.016;
      // Squared so the fade starts gently and finishes fast, which reads as the
      // confetti thinning out rather than as the canvas being dimmed.
      const alpha = burst.retiring
        ? 0.95 * Math.pow(1 - burst.fade / CONFETTI_FADE, 2)
        : 0.95;
      for (const p of burst.parts) {
        p.x += p.vx + Math.sin(burst.t * 2 + p.phase) * p.sway;
        p.y += p.vy;
        p.rot += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }
    if (confettiBursts.length) confettiRAF = requestAnimationFrame(frame);
    else confettiRAF = null;
  })();
}

document.getElementById('winner-banner').addEventListener('click', () => {
  if (!state.gameOver) return;
  replayCelebration();
  if (state.multiplayer) mpSend({ type: 'celebrate' });
});

document.getElementById('victory-winner-card').addEventListener('click', () => {
  if (!state.gameOver) return;
  replayCelebration();
  if (state.multiplayer) mpSend({ type: 'celebrate' });
});

function replayCelebration() {
  const banner = document.getElementById('winner-banner');
  banner.classList.remove('celebrate');
  void banner.offsetWidth;        // restart the pop animation
  banner.classList.add('celebrate');
  const card = document.getElementById('victory-winner-card');
  card.classList.remove('celebrate');
  void card.offsetWidth;
  card.classList.add('celebrate');
  fireConfetti();
}

function resetForRematch(rounds = []) {
  state.rounds = rounds;
  state.closers = [];
  state.onBoard = state.players.map(() => state.minScore === 0);
  state.gameOver = false;
  state.celebrated = false;
  state.finalRoundAnnounced = false;
  state.startedAt = Date.now();
  mpGameOverSent = false;
  forgetBoardMemory();
}

document.getElementById('btn-victory-rematch').addEventListener('click', () => {
  if (state.multiplayer) {
    if (state.mpIsHost) mpSend({ type: 'reset-game' });
    return;
  }
  resetForRematch();
  buildTrackerScreen();
  history.replaceState({ screen: 'screen-tracker' }, '', '#screen-tracker');
  showScreen('screen-tracker');
  saveGame();
});

document.getElementById('btn-victory-home').addEventListener('click', () => {
  clearSavedGame();
  if (state.multiplayer) {
    if (state.mpIsHost) { mpLeavingSelf = true; mpSend({ type: 'host-leave' }); }
    else mpSend({ type: 'leave-self' });
    mpLeaveMultiplayer({ graceful: true });
  }
  history.replaceState({ screen: 'screen-home' }, '', '#screen-home');
  showScreen('screen-home');
});

document.getElementById('btn-new-game').addEventListener('click', () => {
  // A host with other people in the room restarts the game in place instead of
  // closing it: same room code, same players, board back to round 1.
  if (mpCanResetRoom()) {
    if (state.rounds.length === 0) { mpSend({ type: 'reset-game' }); return; }
    confirmLeaveAction = 'reset';
    openConfirmLeaveModal();
    return;
  }
  if (state.rounds.length > 0) {
    confirmLeaveAction = 'newgame';
    openConfirmLeaveModal();
    return;
  }
  if (state.multiplayer) {
    if (state.mpIsHost) { mpLeavingSelf = true; mpSend({ type: 'host-leave' }); }
    else mpSend({ type: 'leave-self' }); // frees the player's name/slot for a later rejoin
    mpLeaveMultiplayer({ graceful: true });
  }
  clearSavedGame();
  // Replace, not push - otherwise a later Back from setup can walk back into
  // the tracker screen for the game just abandoned.
  history.replaceState({ screen: 'screen-setup' }, '', '#screen-setup');
  showScreen('screen-setup');
});

// ── Add Turn Modal ───────────────────────────────────────
const modalTurn = document.getElementById('modal-turn');

document.getElementById('btn-add-turn').addEventListener('click', () => {
  if (state.gameOver) return;
  if (state.multiplayer && state.mpScoringMode === 'host' && !state.mpIsHost) {
    showToast('The host will mark down the score in this game.');
    return;
  }
  const mpEach = state.multiplayer && state.mpScoringMode === 'each';
  // In 'each' mode this device enters the seat whose turn it is plus any of its
  // other seats queued directly behind that one - and nothing at all if this
  // player has nominated someone else, or if the turn is somebody else's.
  let mpEachPending = [];
  if (mpEach) {
    const targets = mpEntryTargets();
    if (targets.length === 0) {
      const scorer = mpMyScorer();
      showToast(`${scorer ? scorer.name : 'Another player'} is entering your scores.`);
      return;
    }
    mpEachPending = mpTurnEntryRun();
    if (mpEachPending.length === 0) {
      const closed = finalLapClosedSeats();
      const allIn = targets.every(p => mpRoundSubmitted[state.players.indexOf(p)]);
      // A seat the final lap has closed is not waiting on anything, so the
      // turn-based messages would be a lie: its game is simply finished.
      const allClosed = targets.every(p => closed.has(state.players.indexOf(p)));
      const up = state.players.find(p => p.id === mpCurrentTurnPlayerId);
      showToast(allClosed
        ? 'The final round is over for your players - the game ends here.'
        : (allIn
            ? 'You must wait for all players to enter their score for the round.'
            : (up ? `It's ${up.name}'s turn right now.` : 'Wait for your turn to enter a score.')));
      return;
    }
  }
  // Host-scoring rooms enter the whole round in one pass, so the same final-lap
  // exclusion has to be applied to the list the host is shown - otherwise the
  // host is handed an input for the seat whose turn ended the game.
  const hostClosed = mpEach ? null : finalLapClosedSeats();
  const hostPending = mpEach
    ? []
    : state.players.filter((_, pi) => !hostClosed.has(pi));
  if (!mpEach && hostPending.length === 0) {
    showToast('Every player has taken their final turn - the game ends here.');
    return;
  }
  const game = GAMES[state.gameKey];
  // The one pending row may be a delegated player rather than this device's
  // own, so the title/hint name whose score is actually being asked for.
  const mpSoleTarget = mpEach && mpEachPending.length === 1 ? mpEachPending[0] : null;
  const mpSoleIsSelf = !!mpSoleTarget && mpSoleTarget.id === state.mpPlayerId;
  // The title states the round, the way the board's lead banner does. Whose
  // score is being asked for is the hint's job, right underneath it.
  document.getElementById('turn-modal-title').textContent = `Round ${state.rounds.length + 1}`;
  document.getElementById('turn-hint').textContent = mpEach
    ? (!mpSoleTarget
        ? 'Enter the score for each player you\'re scoring for'
        : (mpSoleIsSelf
            ? 'Enter your score for this round'
            : `Enter ${mpSoleTarget.name}'s score for this round`))
    : (state.generic
        ? 'Enter each player\'s score for this round'
        : (state.gameKey === 'farkle'
            ? 'Enter 0 for a Farkle (no score this turn)'
            : 'Enter each player\'s score for this round'));

  const allowNeg = negativeScoresAllowed();
  const container = document.getElementById('turn-score-inputs');
  container.innerHTML = '';
  const playersToShow = mpEach ? mpEachPending : hostPending;
  mpTurnTargets = playersToShow;
  const totals = getTotals();

  // One label, over the totals column it belongs to. The name and input columns
  // need no heading - a chip and a field say what they are.
  const header = document.createElement('div');
  header.className = 'turn-player-row turn-header-row';
  header.innerHTML = `
    <span class="turn-player-name"></span>
    <span class="turn-input-slot"></span>
    <span class="turn-header-total">New Total</span>
  `;
  container.appendChild(header);

  playersToShow.forEach(p => {
    const pi = state.players.indexOf(p);
    const row = document.createElement('div');
    row.className = 'turn-player-row';
    // Name chip, then the field it belongs to, then what the total becomes.
    // The chip is painted from the same three properties as the board's header
    // chips, so a player looks the same wherever they appear.
    row.innerHTML = `
      <span class="turn-player-name">${escHtml(p.name)}</span>
      <span class="turn-input-slot">
        <input type="text" class="turn-score-input" value="" placeholder="0" inputmode="numeric" pattern="${allowNeg ? '-?[0-9]*' : '[0-9]*'}">
      </span>
      <span class="turn-player-total" title="Total if this score is saved">${totals[pi].toLocaleString()}</span>
    `;
    const chip = row.querySelector('.turn-player-name');
    chip.style.setProperty('--chip', p.color);
    chip.style.setProperty('--chip-bd', playerBorderColor(p.color));
    chip.style.setProperty('--chip-fg', PLAYER_INK);
    const input = row.querySelector('.turn-score-input');
    // The focused field is outlined in the player's own fill colour - the bright
    // one from their chip, not its darker keyline - so the row being typed into
    // is identifiable without reading the name again.
    input.style.setProperty('--field-focus', p.color);

    // The right-hand column answers "what will my total be", not "what is it" -
    // it has to move as the digits land or it is answering the wrong question.
    const totalCell = row.querySelector('.turn-player-total');
    const base = totals[pi];
    // Its own key namespace: the board's totals row is counting under the plain
    // board key at the same time, and the two must not hand each other cells.
    // Cleared on build so a count left over from the last time the sheet was
    // open cannot count away from a number that is no longer on screen.
    const countKey = `turn:${boardKeyFor(p, pi)}`;
    runningTotals.delete(countKey);
    let shown = base;
    // Farkle scores land on multiples of 50, and the save path rounds them there
    // on the way in. The projection has to round the same way, or it promises a
    // total the board will not show. Guarded by the same `generic` check the save
    // path uses, so a custom game keeps whatever number was typed.
    const farkle = !state.generic && state.gameKey === 'farkle';
    input.addEventListener('input', () => {
      const typed = parseInt(input.value, 10);
      const scored = farkle ? normalizeFarkleScore(typed) : typed;
      const pending = Number.isFinite(typed) ? base + scored : base;
      totalCell.classList.toggle('is-pending', pending !== base);
      if (pending === shown) return;
      // Counts from whatever is on screen, not from the base: mid-count the
      // running record carries the live value, so consecutive digits chain into
      // one continuous climb instead of snapping back to the old total.
      countUpTotal(totalCell, countKey, shown, pending, '', TURN_COUNT_MS);
      shown = pending;
    });

    // The ± button only exists where a negative score is legal, so games that
    // cannot go below zero keep the row exactly as it was.
    if (allowNeg) row.querySelector('.turn-input-slot').appendChild(makeSignToggle(input));
    container.appendChild(row);
  });

  // Auto-select input on focus for easy entry
  container.querySelectorAll('.turn-score-input').forEach(inp => {
    inp.addEventListener('focus', () => inp.select());
  });

  // "Who went out first?" selector (custom games with tracking on)
  const closerWrap = document.getElementById('turn-closer');
  closerWrap.classList.toggle('hidden', !state.trackCloser);
  if (state.trackCloser) {
    turnCloser = null;
    const chipBox = document.getElementById('turn-closer-chips');
    chipBox.innerHTML = '';
    state.players.forEach((p, pi) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'closer-chip';
      chip.innerHTML = `<span class="chip-dot" style="background:${p.color}"></span>${escHtml(p.name)}`;
      chip.addEventListener('click', () => {
        if (turnCloser === pi) {          // tap again to unset
          turnCloser = null;
          chip.classList.remove('sel');
        } else {
          turnCloser = pi;
          chipBox.querySelectorAll('.closer-chip').forEach(c => c.classList.remove('sel'));
          chip.classList.add('sel');
        }
      });
      chipBox.appendChild(chip);
    });
  }

  modalTurn.classList.remove('hidden');
  container.querySelector('.turn-score-input')?.focus();
});

document.getElementById('turn-backdrop').addEventListener('click', closeTurnModal);
document.getElementById('btn-cancel-turn').addEventListener('click', closeTurnModal);

function closeTurnModal() {
  modalTurn.classList.add('hidden');
}

// Real Farkle scores are always multiples of 50 (a lone 5 is the smallest scoring
// die at 50 pts) - round entries to the nearest 50 so mistyped values can't produce
// a score no legal combination of dice could ever add up to.
function normalizeFarkleScore(raw) {
  if (raw <= 0) return 0;
  return Math.round(raw / 50) * 50;
}

document.getElementById('btn-save-turn').addEventListener('click', () => {
  const inputs = document.querySelectorAll('.turn-score-input');
  const game = GAMES[state.gameKey];
  const allowNeg = negativeScoresAllowed();
  const clampScore = raw => {
    // Bounds live here now that the inputs are text: `min`/`max` on a
    // `type="number"` field no longer do the clamping.
    let v = Math.max(allowNeg ? -SCORE_INPUT_MAX : 0, Math.min(SCORE_INPUT_MAX, raw));
    if (!state.generic) {
      v = game.allowNegative ? v : Math.max(0, v);
      if (state.gameKey === 'farkle') v = normalizeFarkleScore(v);
    }
    return v;
  };
  // A field holding only "-" counts as blank: the player has tapped ± but not
  // typed a number, so they have not entered a score.
  const readScore = input => {
    const parsed = parseScoreInput(input.value);
    return parsed === null ? null : clampScore(parsed);
  };

  if (state.multiplayer && state.mpScoringMode === 'each') {
    const entries = Array.from(inputs).map((inp, i) => ({
      playerId: mpTurnTargets[i] ? mpTurnTargets[i].id : state.mpPlayerId,
      value: readScore(inp),
    })).filter(entry => entry.value !== null);
    if (entries.length === 0) return;
    mpSend({ type: 'submit-scores-for', entries });
    closeTurnModal();
    return;
  }

  if (state.multiplayer && state.mpScoringMode === 'host') {
    const values = Array.from(inputs).map(readScore);
    if (values.every(value => value === null)) return;
    mpSend({ type: 'host-submit-scores', values });
    closeTurnModal();
    return;
  }

  const scores = Array.from(inputs).map((inp, pi) => {
    const raw = readScore(inp);
    if (raw === null) return '';
    if (state.onBoard[pi]) return raw;
    if (state.gameKey === 'farkle' && raw === 0) return 0;
    if (raw >= state.minScore) { state.onBoard[pi] = true; return raw; }
    return null; // below entry threshold - doesn't count yet
  });
  state.rounds.push(scores);
  state.closers.push(state.trackCloser ? turnCloser : null);
  closeTurnModal();
  renderTable();
  checkWin();
  scrollTableToLatestRound();
});

// ── Multiplayer ──────────────────────────────────────────
// Worker deployed via wrangler - see worker/README.md.
const MP_WORKER_URL = 'https://board-game-tracker-multiplayer.benzur.workers.dev';
const MP_SESSION_KEY = 'bgt-mp-session';
const MP_DEVICE_ID_KEY = 'bgt-mp-device-id';

let mpToggleOn = false;          // setup screen: multiplayer toggle state
let mpSetupScoringMode = 'each';
let mpSocket = null;
let mpRoundSubmitted = [];       // parallel to state.players - who has submitted this round
let mpRoundStarts = [];          // parallel to state.rounds - playerId who led each round off
let mpCurrentTurnPlayerId = null;
let mpPendingJoin = null;        // {roomCode, name?, scoringMode?, gameKey?, rejoinId?} while name modal is open
let mpPlayerOptionsTarget = null; // playerId the player panel targets - multiplayer only
let playerOptionsIndex = -1;      // seat index it targets, which is all a solo game has
let mpGameOverSent = false;
let mpAwaitingJoinConfirm = false; // true from connect attempt until 'joined' arrives
let mpTurnTargets = [];          // players the open Enter Score modal has a row for
let mpScorerContext = null;      // 'join' (pre-join picker) or 'room' (changing mid-game)
let mpScorerRoster = [];         // roster the scorer picker is drawn from
let mpScorerSelection = null;    // playerId currently selected in the picker, null = self
let mpGroupSize = 1;             // people this device is joining for, including you (1-8)

// One device can declare several people at the table; they join as full roster
// entries whose scores this device enters.
const MP_MAX_GROUP_SIZE = 8;

// ── Proxy scoring ('each' mode: a player can nominate another to score for them)
// The local player's own roster entry.
function mpMe() {
  return state.players.find(p => p.id === state.mpPlayerId) || null;
}
// The player entering this device's scores, if it isn't this device.
function mpMyScorer() {
  const me = mpMe();
  if (!me || !me.scorerId) return null;
  return state.players.find(p => p.id === me.scorerId) || null;
}
// True when this device is responsible for entering the given player's scores.
// Group members joined on this device count even in host-scoring rooms, where
// they carry no scorer nomination.
function mpEntersScoresFor(player) {
  if (!player) return false;
  if (player.groupLeaderId) return player.groupLeaderId === state.mpPlayerId;
  if (player.scorerId) return player.scorerId === state.mpPlayerId;
  return player.id === state.mpPlayerId;
}
// Every column this device enters, in board order.
function mpEntryTargets() {
  return state.players.filter(mpEntersScoresFor);
}
// The seats of round `ri` as column indexes, in the order they take their turns.
// A Farkle table rolls off to decide who leads, and the host declares that
// player, so a round does not have to start at the leftmost column. Column order
// is the fallback for solo play and for rounds no starter was recorded for.
function mpTurnOrder(ri) {
  const order = state.players.map((_, i) => i);
  if (!state.multiplayer) return order;
  const starterId = ri < mpRoundStarts.length ? mpRoundStarts[ri] : mpCurrentTurnPlayerId;
  const start = state.players.findIndex(p => p.id === starterId);
  if (start <= 0) return order;
  return order.slice(start).concat(order.slice(0, start));
}
// The seats this device may enter a score for right now: the seat whose turn it
// is, plus every seat immediately after it in this round's turn order that this
// device also scores for. The run stops dead at the first seat another device
// plays, so a group of three whose third member leads off enters that one score
// and waits - the other two have not had their turn yet.
function mpTurnEntryRun() {
  const order = mpTurnOrder(Math.max(0, state.rounds.length - 1));
  const currentIndex = state.players.findIndex(p => p.id === mpCurrentTurnPlayerId);
  const startPos = order.indexOf(currentIndex);
  if (startPos === -1) return [];
  const closed = finalLapClosedSeats();
  const run = [];
  for (let i = startPos; i < order.length; i++) {
    const pi = order[i];
    const player = state.players[pi];
    if (!player || !mpEntersScoresFor(player)) break;
    // The server hands the turn straight past these, so they don't end the run;
    // they just have nothing left to enter. A seat the final lap has closed is
    // the same case from this side: the server may well have handed it the turn,
    // and it still has nothing to enter.
    if (mpRoundSubmitted[pi] || player.connected === false || closed.has(pi)) continue;
    run.push(player);
  }
  return run;
}
// A player who is already scoring for someone else can't hand their own entry
// off to a third player - the server enforces this too.
function mpIsSomeonesScorer() {
  return state.players.some(p => p.scorerId === state.mpPlayerId);
}

function resetMultiplayerSetupUI() {
  mpToggleOn = false;
  mpSetupScoringMode = 'each';
  document.querySelectorAll('#multiplayer-section .dir-btn[data-mp]').forEach(b =>
    b.classList.toggle('active', b.dataset.mp === 'solo'));
  document.querySelectorAll('#multiplayer-section .dir-btn[data-mpmode]').forEach(b =>
    b.classList.toggle('active', b.dataset.mpmode === 'each'));
  document.getElementById('mp-scoring-mode-row').classList.add('hidden');
  document.getElementById('mp-scoring-mode-label').classList.add('hidden');
  document.getElementById('mp-setup-error').classList.add('hidden');
  applySetupModeVisibility();
}

function applySetupModeVisibility() {
  document.getElementById('players-label').textContent = mpToggleOn ? 'Players On This Device' : 'Players';
  document.getElementById('mp-settings-hint').classList.toggle('hidden', !mpToggleOn);
  document.getElementById('btn-start-game').textContent = mpToggleOn ? 'Create Room' : 'Start Game';
}

document.querySelectorAll('#multiplayer-section .dir-btn[data-mp]').forEach(btn => {
  btn.addEventListener('click', () => {
    mpToggleOn = btn.dataset.mp === 'multiplayer';
    document.querySelectorAll('#multiplayer-section .dir-btn[data-mp]').forEach(b => b.classList.toggle('active', b === btn));
    document.getElementById('mp-scoring-mode-row').classList.toggle('hidden', !mpToggleOn);
    document.getElementById('mp-scoring-mode-label').classList.toggle('hidden', !mpToggleOn);
    applySetupModeVisibility();
  });
});
document.querySelectorAll('#multiplayer-section .dir-btn[data-mpmode]').forEach(btn => {
  btn.addEventListener('click', () => {
    mpSetupScoringMode = btn.dataset.mpmode;
    document.querySelectorAll('#multiplayer-section .dir-btn[data-mpmode]').forEach(b => b.classList.toggle('active', b === btn));
  });
});

function mpShowSetupError(text) {
  const el = document.getElementById('mp-setup-error');
  el.textContent = text;
  el.classList.remove('hidden');
}

function mpSetupNames() {
  return Array.from(document.querySelectorAll('.player-name-input'))
    .map((el, i) => el.value.trim() || `Player ${i + 1}`);
}

function mpStartHostFlow() {
  const startBtn = document.getElementById('btn-start-game');
  const names = mpSetupNames();

  // The server rejects duplicates anyway, but catching them here keeps the
  // whole group from bouncing after a room has already been created.
  const seen = new Set();
  for (const candidate of names) {
    const normalized = candidate.toLocaleLowerCase();
    if (seen.has(normalized)) {
      mpShowSetupError(`"${candidate}" is used twice - give each player a different name.`);
      return;
    }
    seen.add(normalized);
  }

  startBtn.disabled = true;
  document.getElementById('mp-setup-error').classList.add('hidden');
  const rawWin = parseInt(document.getElementById('win-score').value);
  const winScore = isNaN(rawWin) ? (GAMES[state.gameKey]?.defaultWinScore || 0) : Math.max(0, rawWin);
  const minScore = parseInt(document.getElementById('min-score').value) || 0;
  fetch(`${MP_WORKER_URL}/room/create`, { method: 'POST' })
    .then(r => r.json())
    .then(data => {
      startBtn.disabled = false;
      if (!data || !data.roomCode) throw new Error('no room code');
      mpPendingJoin = {
        roomCode: data.roomCode,
        scoringMode: mpSetupScoringMode,
        gameKey: state.gameKey,
        winScore,
        minScore,
        ruleOverrides: loadRuleOverrides(state.gameKey),
        customRules: state.customRules,
        name: names[0],
        guestNames: names.slice(1),
      };
      // Names were collected on the setup screen, so the name modal has
      // nothing left to ask - and a host has nobody to nominate as scorer.
      mpConnect(mpPendingJoin);
    })
    .catch(() => {
      startBtn.disabled = false;
      mpShowSetupError('Could not create a room. Check your connection and try again.');
    });
}

function mpWsUrl(roomCode) {
  return MP_WORKER_URL.replace(/^http/, 'ws') + `/room/${roomCode}/ws`;
}

// Keeping the socket busy stops an intermediary (or a throttled background tab)
// from quietly dropping it, which used to read as the player having left.
const MP_PING_INTERVAL_MS = 25000;
// Silent retries before giving up and asking the player to reconnect by hand.
const MP_MAX_RECONNECT_ATTEMPTS = 4;
let mpPingTimer = null;
let mpLastMessageAt = 0;
let mpReconnectTimer = null;
let mpReconnectAttempts = 0;
// Sockets this device closed on purpose. Tracked per socket rather than as a
// flag, because `close` fires a turn later: by the time a deliberately closed
// socket reports in, a replacement may already be live, and a shared flag would
// have been reset long before.
const mpDeliberateCloses = new WeakSet();

function mpCloseSocket(socket) {
  if (!socket) return;
  mpDeliberateCloses.add(socket);
  try { socket.close(); } catch (e) { /* already closing */ }
}

// How long the app has to be off screen before the table is told. Short enough
// to be useful, long enough that flicking to another app to look something up
// does not flash everyone's dot amber.
const MP_AWAY_DELAY_MS = 10000;
let mpAwayTimer = null;
let mpReportedVisible = true;

function mpSendPresence(visible) {
  if (!state.multiplayer) return;
  if (mpReportedVisible === visible) return;
  mpReportedVisible = visible;
  mpSend({ type: 'presence', visible });
}

function mpClearAwayTimer() {
  if (mpAwayTimer) { clearTimeout(mpAwayTimer); mpAwayTimer = null; }
}

// Timers in a hidden tab are throttled, so this fires late as often as not.
// That is fine: the socket closing is the backstop, and late-amber beats a dot
// that flickers every time someone glances away.
document.addEventListener('visibilitychange', () => {
  if (!state.multiplayer) return;
  mpClearAwayTimer();
  if (document.visibilityState === 'visible') {
    mpSendPresence(true);
  } else {
    mpAwayTimer = setTimeout(() => mpSendPresence(false), MP_AWAY_DELAY_MS);
  }
});

// Leaving for good: say so while the socket is still open, since the close
// event reaches the server later than this does.
window.addEventListener('pagehide', () => {
  mpClearAwayTimer();
  mpSendPresence(false);
});

function mpStartKeepalive() {
  mpStopKeepalive();
  mpLastMessageAt = Date.now();
  // A reconnect means the server marked this device away when the old socket
  // closed. Correct it straight away if the app is actually on screen.
  mpReportedVisible = true;
  if (document.visibilityState !== 'visible') {
    mpClearAwayTimer();
    mpSendPresence(false);
  }
  mpPingTimer = setInterval(() => {
    if (!mpSocket || mpSocket.readyState !== WebSocket.OPEN) return;
    // A socket that has gone quiet in both directions is half-open: the browser
    // still calls it OPEN but nothing is getting through. Close it so the
    // reconnect path can run instead of sitting on a dead connection.
    if (Date.now() - mpLastMessageAt > MP_PING_INTERVAL_MS * 3) {
      try { mpSocket.close(); } catch (e) { /* already closing */ }
      return;
    }
    mpSend({ type: 'ping' });
  }, MP_PING_INTERVAL_MS);
}

function mpStopKeepalive() {
  if (mpPingTimer) { clearInterval(mpPingTimer); mpPingTimer = null; }
}

// Drops a pending retry without touching the budget - a retry that is starting
// must not wipe the count of retries already spent, or the backoff never grows
// and the disconnected modal is never reached.
function mpClearReconnectTimer() {
  if (mpReconnectTimer) { clearTimeout(mpReconnectTimer); mpReconnectTimer = null; }
}

// Full reset, for when the device is genuinely back in (or out of) a room.
function mpCancelReconnect() {
  mpClearReconnectTimer();
  mpReconnectAttempts = 0;
}

// Silent reconnect with backoff. Only once those are exhausted does the player
// get told - a two-second blip shouldn't put a modal on screen.
function mpScheduleReconnect() {
  if (mpReconnectTimer || !state.multiplayer) return;
  if (mpReconnectAttempts >= MP_MAX_RECONNECT_ATTEMPTS) { mpShowDisconnectedModal(); return; }
  const delay = Math.min(8000, 1000 * Math.pow(2, mpReconnectAttempts));
  mpReconnectAttempts += 1;
  mpReconnectTimer = setTimeout(() => {
    mpReconnectTimer = null;
    mpReconnectNow();
  }, delay);
}

function mpReconnectNow() {
  const session = mpLoadSession();
  if (!state.multiplayer || !session || !session.roomCode) return;
  mpConnect({ roomCode: session.roomCode, rejoinId: session.playerId, name: session.name });
}

function mpShowDisconnectedModal() {
  document.getElementById('modal-disconnected').classList.remove('hidden');
}

function mpHideDisconnectedModal() {
  document.getElementById('modal-disconnected').classList.add('hidden');
}

// One tap back into the game. A full reload is the surest way back in: the saved
// session rejoins automatically on boot, and anything the stale page was holding
// on to goes with it.
document.getElementById('btn-disconnected-reconnect').addEventListener('click', () => {
  mpHideDisconnectedModal();
  window.location.reload();
});

// A backgrounded tab is where sockets die most often, so re-check the moment the
// player comes back to it rather than waiting out the backoff.
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible' || !state.multiplayer) return;
  if (mpSocket && mpSocket.readyState === WebSocket.OPEN) return;
  mpCancelReconnect();
  mpReconnectNow();
});

function mpConnect(join) {
  // Only the pending retry goes: the attempt budget belongs to the outage, and
  // this call may itself be one of those retries.
  mpClearReconnectTimer();
  if (mpSocket) {
    mpCloseSocket(mpSocket);
    mpSocket = null;
  }
  mpAwaitingJoinConfirm = true;
  let opened = false;
  const ws = new WebSocket(mpWsUrl(join.roomCode));
  mpSocket = ws;
  ws.addEventListener('open', () => {
    opened = true;
    mpStartKeepalive();
    ws.send(JSON.stringify({
      type: 'join',
      name: join.name,
      scoringMode: join.scoringMode,
      gameKey: join.gameKey,
      rejoinId: join.rejoinId,
      winScore: join.winScore,
      minScore: join.minScore,
      ruleOverrides: join.ruleOverrides,
      customRules: join.customRules,
      scorerId: join.scorerId,
      guestNames: join.guestNames,
      deviceId: mpDeviceId(),
    }));
  });
  ws.addEventListener('message', e => {
    let msg;
    try { msg = JSON.parse(e.data); } catch (err) { return; }
    mpHandleMessage(msg);
  });
  ws.addEventListener('close', () => {
    const wasCurrent = mpSocket === ws;
    if (wasCurrent) mpSocket = null;
    // A superseded socket reporting in late must not touch the live connection:
    // the keepalive timer and the reconnect budget belong to whatever socket is
    // current now, not to this one.
    if (!wasCurrent || mpDeliberateCloses.has(ws)) return;
    mpStopKeepalive();

    // Already seated in the room: this is a dropped connection, not a rejected
    // join. Retry quietly, and only surface the modal once retries run out.
    if (state.multiplayer) {
      mpAwaitingJoinConfirm = false;
      mpScheduleReconnect();
      return;
    }

    if (mpAwaitingJoinConfirm) {
      // The server closes the socket outright for a rejected join it can't recover
      // from (e.g. rejoining a room that expired/was cleaned up) - room-full and
      // name-taken are sent as 'error' messages on a socket that stays open instead.
      // A socket that never opened at all is a network failure, not a rejection.
      mpAwaitingJoinConfirm = false;
      if (!opened) { mpShowDisconnectedModal(); return; }
      mpClearSession();
      openJoinRoomModal();
      mpShowJoinRoomError('That room is no longer available. Try a different code.');
    }
  });
}

function mpSend(payload) {
  if (mpSocket && mpSocket.readyState === WebSocket.OPEN) mpSocket.send(JSON.stringify(payload));
}

function mpHandleMessage(msg) {
  // Any inbound traffic proves the socket is alive, not just a pong - so an
  // older Worker that doesn't answer pings still reads as connected.
  mpLastMessageAt = Date.now();
  switch (msg.type) {
    case 'pong': break;
    case 'joined': mpOnJoined(msg); break;
    case 'game-reset': mpOnGameReset(msg); break;
    case 'error': mpOnError(msg); break;
    case 'presence-update':
      mpApplyPresence(msg.presence);
      break;
    case 'roster-update':
      mpApplyRoster(msg.players);
      if ('currentTurnPlayerId' in msg) mpApplyCurrentTurn(msg.currentTurnPlayerId);
      break;
    case 'round-update': mpApplyRounds(msg.rounds, msg.roundSubmitted, msg.currentTurnPlayerId, { roundStarts: msg.roundStarts }); break;
    case 'round-advance': mpApplyRounds(msg.rounds, msg.roundSubmitted, msg.currentTurnPlayerId, { roundStarts: msg.roundStarts }); break;
    case 'turn-update': mpApplyCurrentTurn(msg.currentTurnPlayerId, { roundStarts: msg.roundStarts }); break;
    case 'game-over': mpOnGameOver(); break;
    case 'celebrate': mpOnCelebrate(); break;
    case 'player-removed': mpOnPlayerRemoved(msg.playerId); break;
    case 'room-closed': mpOnRoomClosed(); break;
    case 'rules-update': mpApplyRules(msg.ruleOverrides, msg.customRules); break;
  }
}

// The host's rules panel (edited baseline text + house rules) is mirrored to
// every guest for the room's duration - in memory only, never written to the
// guest's own saved rules for this game.
function mpApplyRules(ruleOverrides, customRules) {
  state.mpHostRuleOverrides = ruleOverrides || {};
  state.customRules = Array.isArray(customRules) ? customRules : [];
  if (!modalRules.classList.contains('hidden')) openRulesModal();
}

// Host restarted the game in place: same room, same roster, blank board.
function mpOnGameReset(msg) {
  resetForRematch(msg.rounds);
  document.getElementById('winner-banner').classList.add('hidden');
  hideWinnerColumnFrame();
  hideTurnToast();
  mpApplyRounds(msg.rounds, msg.roundSubmitted, msg.currentTurnPlayerId, { announce: false, roundStarts: msg.roundStarts });
  if (activeScreen === 'screen-victory') {
    history.replaceState({ screen: 'screen-tracker' }, '', '#screen-tracker');
    showScreen('screen-tracker');
    // mpApplyRounds deliberately renders only while the tracker is active. This
    // payload arrived on the victory screen, so rebuild after revealing it or
    // the completed table remains in the DOM even though state.rounds is empty.
    buildTrackerScreen();
    mpRenderRoomBar();
    mpUpdateEnterScoreButtonState();
  }
  showToast('The host started a new game. Scores are back to zero.');
}

function mpOnJoined(msg) {
  mpAwaitingJoinConfirm = false;
  mpCancelReconnect();
  mpHideDisconnectedModal();
  state.multiplayer = true;
  state.mpRoomCode = msg.roomCode;
  state.mpScoringMode = msg.scoringMode;
  state.mpPlayerId = msg.playerId;
  state.gameKey = msg.gameKey;
  const game = GAMES[msg.gameKey] || {};
  state.gameName = game.name || 'Game';
  state.generic = false;
  state.scoreDirection = game.scoreDirection || 'high';
  state.winScore = typeof msg.winScore === 'number' ? msg.winScore : (game.defaultWinScore || 0);
  state.minScore = typeof msg.minScore === 'number' ? msg.minScore : 0;
  state.mpHostRuleOverrides = msg.ruleOverrides || {};
  state.customRules = Array.isArray(msg.customRules) ? msg.customRules : [];
  state.trackCloser = false; // trackCloser games are excluded from multiplayer eligibility
  state.closers = [];
  state.gameOver = false;
  state.celebrated = false;
  state.finalRoundAnnounced = false;
  mpGameOverSent = false;
  state.startedAt = Date.now();

  mpApplyRoster(msg.players);
  // Silent on join/rejoin: the highlighted column already says whose turn it is,
  // and a rejoin is not a turn transition.
  mpApplyRounds(msg.rounds, msg.roundSubmitted || msg.players.map(() => false), msg.currentTurnPlayerId, { announce: false, roundStarts: msg.roundStarts });

  const me = msg.players.find(p => p.id === msg.playerId);
  mpSaveSession(msg.roomCode, msg.playerId, me ? me.name : '');

  closeJoinRoomModal();
  closePlayerNameModal();
  closeScorerModal();
  buildTrackerScreen();
  navigateTo('screen-tracker');
  mpRenderRoomBar();
  mpUpdateEnterScoreButtonState();

  // Someone rejoining mid-game should land on the live round, not scroll down
  // from round 1 to find it. Deferred a frame so the table has been laid out.
  requestAnimationFrame(() => {
    scrollTableToLatestRound({ smooth: false });
    scrollTableToCurrentTurn({ smooth: false });
  });

  // The nominated scorer can have left (or taken on a scorer themselves) in the
  // gap between the roster fetch and the join - the server silently drops the
  // nomination in that case, so say so rather than leaving it looking applied.
  const requestedScorerId = mpPendingJoin && mpPendingJoin.scorerId;
  if (requestedScorerId && me && me.scorerId !== requestedScorerId) {
    showToast('That player couldn\'t score for you, so you\'re entering your own scores.');
  }
}

// Presence is cosmetic, so it repaints the one place that shows it and nothing
// else - no table re-render for a phone that locked.
function mpApplyPresence(presence) {
  if (!Array.isArray(presence)) return;
  let changed = false;
  presence.forEach(entry => {
    const player = state.players.find(p => p.id === entry.id);
    if (!player || player.present === entry.present) return;
    player.present = entry.present;
    changed = true;
  });
  if (changed) refreshPlayerOptionsMeta();
}

function mpApplyRoster(players) {
  const reconciled = reconcileRosterColumns(state.players, players, state.rounds, mpRoundSubmitted);
  state.rounds = reconciled.rounds;
  mpRoundSubmitted = reconciled.roundSubmitted;
  state.players = players.map((p, i) => ({
    name: p.name,
    color: p.color || PLAYER_COLORS[i % PLAYER_COLORS.length],
    id: p.id,
    connected: p.connected,
    // Older rooms broadcast no presence at all - treat those seats as present
    // rather than flagging the whole table away.
    present: p.present !== false,
    isHost: p.isHost,
    scorerId: p.scorerId || null,
    groupLeaderId: p.groupLeaderId || null,
  }));
  const me = players.find(p => p.id === state.mpPlayerId);
  state.mpIsHost = !!(me && me.isHost);
  if (document.getElementById('screen-tracker').classList.contains('active')) {
    renderTable();
    mpRenderRoomBar();
    mpUpdateEnterScoreButtonState();
  }
}

function reconcileRosterColumns(priorPlayers, nextPlayers, rounds, roundSubmitted) {
  const priorIndexById = new Map(priorPlayers.map((player, index) => [player.id, index]));
  if (priorIndexById.size === 0) return { rounds, roundSubmitted };
  return {
    rounds: rounds.map(round => nextPlayers.map(player => {
      const oldIndex = priorIndexById.get(player.id);
      return oldIndex === undefined ? null : (round[oldIndex] ?? null);
    })),
    roundSubmitted: nextPlayers.map(player => {
      const oldIndex = priorIndexById.get(player.id);
      return oldIndex === undefined ? false : !!roundSubmitted[oldIndex];
    }),
  };
}

function mpApplyRounds(rounds, roundSubmitted, currentTurnPlayerId = mpCurrentTurnPlayerId, { announce = true, roundStarts } = {}) {
  const roundAdded = rounds.length > state.rounds.length;
  state.rounds = rounds;
  state.onBoard = state.players.map(() => true);
  mpRoundSubmitted = roundSubmitted || [];
  // Absent on payloads from a Worker that predates turn-order tracking; keeping
  // the last known list is better than falling back to column order mid-game.
  if (Array.isArray(roundStarts)) mpRoundStarts = roundStarts;
  const nextTurn = currentTurnPlayerId || null;
  const turnChanged = nextTurn !== mpCurrentTurnPlayerId;
  mpCurrentTurnPlayerId = nextTurn;
  if (document.getElementById('screen-tracker').classList.contains('active')) {
    renderTable();
    mpUpdateEnterScoreButtonState();
    checkWin();
    // A new round pushes the live row below the fold for everyone at once.
    if (roundAdded) scrollTableToLatestRound();
    if (turnChanged) scrollTableToCurrentTurn();
  }
  // After checkWin, so a turn that arrives with the winning score stays silent.
  if (announce && turnChanged) mpAnnounceTurn(nextTurn);
}

function mpApplyCurrentTurn(playerId, { announce = true, roundStarts } = {}) {
  const nextTurn = playerId || null;
  const turnChanged = nextTurn !== mpCurrentTurnPlayerId;
  mpCurrentTurnPlayerId = nextTurn;
  // The host declaring the first player rewrites where an untouched round begins.
  if (Array.isArray(roundStarts)) mpRoundStarts = roundStarts;
  if (document.getElementById('screen-tracker').classList.contains('active')) {
    renderTable();
    // Whose turn it is decides whether this device may enter a score at all.
    mpUpdateEnterScoreButtonState();
    if (turnChanged) scrollTableToCurrentTurn();
  }
  if (announce && turnChanged) mpAnnounceTurn(nextTurn);
}

// True once the scores already on the board decide the game, whether or not the
// winner banner has been drawn yet. `state.gameOver` alone is not enough: the
// server can push a turn change before the round row that ends the game, and
// `turn-update` / `roster-update` do not run checkWin, so the flag can still be
// stale when the winning turn arrives. Recomputing from the score data closes
// that window. In final-round games (Farkle) turns during the extra round are
// still announced - players have to play them - but the handoff that lands as
// the winner is crowned stays silent.
function mpGameDecided() {
  if (state.gameOver) return true;
  const trigger = findWinTrigger();
  if (!trigger) return false;
  return finalLapSettled(trigger);
}

// Announces only the transition into a turn this device is responsible for -
// re-renders, reconnects and other players' turns stay silent. Group members
// and players who nominated this device as their scorer count as "mine".
function mpAnnounceTurn(playerId) {
  if (!state.multiplayer || !playerId || mpGameDecided()) return;
  if (!document.getElementById('screen-tracker').classList.contains('active')) return;
  const player = state.players.find(p => p.id === playerId);
  if (!player || !mpEntersScoresFor(player)) return;
  // The Worker cycles the turn onto whoever is unsubmitted, which during the
  // extra round includes seats the final lap has closed. Announcing one would
  // invite a turn the Enter Score modal then refuses.
  if (finalLapClosedSeats().has(state.players.indexOf(player))) return;
  const isSelf = player.id === state.mpPlayerId;
  showTurnToast(
    isSelf ? 'Your turn' : `${player.name}'s turn`,
    `Round ${Math.max(1, state.rounds.length)}`,
    isSelf ? player.name : 'You enter their score'
  );
}

function mpUpdateEnterScoreButtonState() {
  if (!state.multiplayer) return;
  const btn = document.getElementById('btn-add-turn');
  if (state.mpScoringMode === 'host') {
    btn.textContent = 'Enter Score';
    if (state.mpIsHost) {
      btn.disabled = state.gameOver;
      btn.classList.remove('mp-locked');
    } else {
      // Stays clickable (so tapping surfaces the toast below) but reads as disabled.
      btn.disabled = false;
      btn.classList.toggle('mp-locked', !state.gameOver);
    }
    syncScoreFabState();
    return;
  }
  btn.textContent = 'Enter Score';
  const targets = mpEntryTargets();
  // Locked when someone else enters this player's scores, when every column this
  // device is responsible for is already in for the round, or when the turn is
  // sitting on a seat this device doesn't play - nobody scores ahead of turn.
  const nothingLeft = targets.length === 0 || mpTurnEntryRun().length === 0;
  if (state.gameOver) {
    btn.disabled = true;
    btn.classList.remove('mp-locked');
  } else {
    // Stays clickable (so tapping surfaces the toast below) but reads as disabled.
    btn.disabled = false;
    btn.classList.toggle('mp-locked', nothingLeft);
  }
  syncScoreFabState();
}

function mpOnError(msg) {
  if (msg.code === 'room-full') {
    // A group that no longer fits gets the seat count back so it can retry at a
    // smaller size rather than just being told the room is full.
    const seatsLeft = typeof msg.seatsLeft === 'number' ? msg.seatsLeft : 0;
    const text = seatsLeft > 0
      ? `Only ${seatsLeft} ${seatsLeft === 1 ? 'seat is' : 'seats are'} left in this room.`
      : 'This room already has 8 players.';
    mpAwaitingJoinConfirm = false;
    // Set before re-rendering so the dropdown is capped by the fresh count.
    if (mpPendingJoin) mpPendingJoin.seatsLeft = seatsLeft;
    mpReopenPlayerNameModalWithGroup();
    mpShowPlayerNameError(text);
  } else if (msg.code === 'scorer-unavailable') {
    closeScorerModal();
    showToast('That player can\'t score for you. They may have left the room.');
    renderTable();
  } else if (msg.code === 'name-taken') {
    const text = msg.name
      ? `Someone in this room is already called "${msg.name}".`
      : 'Someone in this room already has that name.';
    if (!document.getElementById('modal-player-name').classList.contains('hidden')) {
      mpShowPlayerNameError(text);
    } else if (mpAwaitingJoinConfirm) {
      // Rejected mid-join (the scorer picker was up, or a group name clashed).
      mpAwaitingJoinConfirm = false;
      mpReopenPlayerNameModalWithGroup();
      mpShowPlayerNameError(text);
    } else {
      showToast(text);
      renderTable();
    }
  }
}

function mpOnGameOver() {
  state.gameOver = true;
  hideTurnToast(); // a card still on screen must not sit over the winner banner
  if (document.getElementById('screen-tracker').classList.contains('active')) checkWin();
}

function mpOnCelebrate() {
  if (document.getElementById('screen-tracker').classList.contains('active')) replayCelebration();
}

function mpOnPlayerRemoved(playerId) {
  if (playerId === state.mpPlayerId) {
    mpLeaveMultiplayer();
    navigateTo('screen-home');
    showToast('The host has removed you from the game.', { closable: true });
  }
}

// True right before the host's own leave/new-game flow closes the room, so
// this device's own broadcasted room-closed doesn't pop the "host left" modal
// on top of the navigation it's already doing.
let mpLeavingSelf = false;

function mpOnRoomClosed() {
  if (mpLeavingSelf) return;
  mpLeaveMultiplayer();
  clearSavedGame();
  document.getElementById('modal-host-left').classList.remove('hidden');
}

function mpLeaveMultiplayer({ graceful = false } = {}) {
  mpClearSession();
  mpCancelReconnect();
  mpStopKeepalive();
  mpHideDisconnectedModal();
  const socket = mpSocket;
  mpSocket = null;
  if (socket) {
    // Marked deliberate now, not inside the timeout: the socket is spoken for
    // from this moment, even though the close itself waits for the leave
    // message to flush.
    mpDeliberateCloses.add(socket);
    if (graceful) {
      setTimeout(() => {
        mpCloseSocket(socket);
        mpLeavingSelf = false;
      }, 250);
    } else {
      mpCloseSocket(socket);
    }
  }
  state.multiplayer = false;
  state.mpRoomCode = null;
  state.mpPlayerId = null;
  state.mpIsHost = false;
  mpCurrentTurnPlayerId = null;
  mpRoundStarts = [];
  hideTurnToast();
  if (!graceful) mpLeavingSelf = false;
  mpRenderRoomBar();
}

function mpSaveSession(roomCode, playerId, name) {
  try { localStorage.setItem(MP_SESSION_KEY, JSON.stringify({ roomCode, playerId, name })); } catch (e) { /* storage full/blocked */ }
}
function mpLoadSession() {
  try { return JSON.parse(localStorage.getItem(MP_SESSION_KEY)); } catch (e) { return null; }
}
function mpClearSession() {
  localStorage.removeItem(MP_SESSION_KEY);
}

// crypto.randomUUID only exists in a secure context, so it is missing on the
// plain-http LAN preview. Without a fallback the throw happens inside the
// socket's open handler, which swallows it and leaves the join never sent.
function mpRandomId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function mpDeviceId() {
  let id = localStorage.getItem(MP_DEVICE_ID_KEY);
  if (!id) {
    id = mpRandomId();
    localStorage.setItem(MP_DEVICE_ID_KEY, id);
  }
  return id;
}

function mpRenderRoomBar() {
  const bar = document.getElementById('mp-room-bar');
  if (!state.multiplayer) { bar.classList.add('hidden'); return; }
  bar.classList.remove('hidden');
  document.getElementById('mp-room-code-label').innerHTML = `<span class="room-code-prefix">Room Code:</span> ${state.mpRoomCode}`;

  // Proxy scoring only exists when the host set every player to score for
  // themselves - in host-scoring rooms there's nothing to delegate.
  const scorerBtn = document.getElementById('btn-mp-scorer');
  const showScorer = state.mpScoringMode === 'each';
  scorerBtn.classList.toggle('hidden', !showScorer);
  if (showScorer) {
    const scorer = mpMyScorer();
    scorerBtn.textContent = 'Scoring';
    scorerBtn.title = scorer
      ? `${scorer.name} enters your scores - tap to change`
      : 'You enter your own scores - tap to change';
  }
}

document.getElementById('btn-host-left-home').addEventListener('click', () => {
  document.getElementById('modal-host-left').classList.add('hidden');
  history.replaceState({ screen: 'screen-home' }, '', '#screen-home');
  showScreen('screen-home');
});

// ── Join Room Modal ──────────────────────────────────────
document.getElementById('btn-join-room').addEventListener('click', () => openJoinRoomModal());
document.getElementById('join-room-backdrop').addEventListener('click', closeJoinRoomModal);
document.getElementById('btn-cancel-join-room').addEventListener('click', closeJoinRoomModal);
document.getElementById('join-room-code-input').addEventListener('input', e => {
  e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '');
});
document.getElementById('btn-submit-join-room').addEventListener('click', () => {
  const code = document.getElementById('join-room-code-input').value.trim().toUpperCase();
  if (!/^[A-Z]{4}$/.test(code)) { mpShowJoinRoomError('Enter a valid 4-letter code.'); return; }
  document.getElementById('join-room-error').classList.add('hidden');
  const submitBtn = document.getElementById('btn-submit-join-room');
  submitBtn.disabled = true;
  fetch(`${MP_WORKER_URL}/room/${code}/exists`)
    .then(r => r.json())
    .then(data => {
      submitBtn.disabled = false;
      if (!data || !data.exists) { mpShowJoinRoomError('That room code doesn\'t exist. Check the code and try again.'); return; }
      // The roster rides along with the existence check so the scorer picker
      // can be offered before this player is actually in the room.
      mpPendingJoin = {
        roomCode: code,
        roomScoringMode: data.scoringMode || null,
        seatsLeft: typeof data.seatsLeft === 'number' ? data.seatsLeft : undefined,
        roster: Array.isArray(data.players) ? data.players : [],
      };
      if (mpPendingJoin.seatsLeft === 0) {
        mpShowJoinRoomError('This room already has 8 players.');
        return;
      }
      openPlayerNameModal();
    })
    .catch(() => {
      submitBtn.disabled = false;
      mpShowJoinRoomError('Could not check that room code. Check your connection and try again.');
    });
});

function openJoinRoomModal() {
  document.getElementById('join-room-error').classList.add('hidden');
  document.getElementById('modal-join-room').classList.remove('hidden');
  document.getElementById('join-room-code-input').focus();
}
function closeJoinRoomModal() {
  document.getElementById('modal-join-room').classList.add('hidden');
}
function mpShowJoinRoomError(text) {
  const el = document.getElementById('join-room-error');
  el.textContent = text;
  el.classList.remove('hidden');
}

// ── Player Name Modal ────────────────────────────────────
document.getElementById('player-name-backdrop').addEventListener('click', closePlayerNameModal);
document.getElementById('btn-cancel-player-name').addEventListener('click', () => {
  closePlayerNameModal();
  mpPendingJoin = null;
});
document.getElementById('btn-submit-player-name').addEventListener('click', mpSubmitPlayerName);
document.getElementById('player-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') mpSubmitPlayerName();
});

function openPlayerNameModal() {
  document.getElementById('player-name-error').classList.add('hidden');
  document.getElementById('modal-join-room').classList.add('hidden');
  document.getElementById('player-name-input').value = '';
  mpGroupSize = 1;
  mpRenderGroupSizeOptions();
  mpRenderGroupNameFields();
  document.getElementById('modal-player-name').classList.remove('hidden');
  document.getElementById('player-name-input').focus();
}

// The dropdown is capped by the seats the room had when its code was checked.
// That number can go stale between the check and the join, so the server
// re-checks and answers with room-full if the group no longer fits.
function mpGroupSizeCap() {
  const seatsLeft = mpPendingJoin && typeof mpPendingJoin.seatsLeft === 'number'
    ? mpPendingJoin.seatsLeft
    : MP_MAX_GROUP_SIZE;
  return Math.max(1, Math.min(MP_MAX_GROUP_SIZE, seatsLeft));
}

// Same control as the setup screen, capped by what the room can still take.
// Pips are shown in palette order: the room assigns the real seat colours on
// join, so these read as "how many of you", not as anyone's colour yet.
function mpRenderGroupSizeOptions() {
  const cap = mpGroupSizeCap();
  if (mpGroupSize > cap) mpGroupSize = cap;
  paintDieFace(document.getElementById('group-count-die'), mpGroupSize, []);
  document.getElementById('group-count-label').textContent =
    mpGroupSize + (mpGroupSize === 1 ? ' Player' : ' Players');
  document.getElementById('btn-group-count-down').disabled = mpGroupSize <= 1;
  document.getElementById('btn-group-count-up').disabled = mpGroupSize >= cap;
}

function mpStepGroupSize(delta) {
  const cap = mpGroupSizeCap();
  const next = mpGroupSize + delta;
  if (next > cap) {
    // Two different walls, and which one you hit matters: the room's own limit,
    // or the seats this particular room has left.
    if (cap >= MP_MAX_GROUP_SIZE) {
      showToast(`A room holds ${MP_MAX_GROUP_SIZE} players at most.`);
    } else if (cap <= 1) {
      showToast('This room is nearly full - there is only one seat left.');
    } else {
      showToast(`This room only has ${cap} seats left.`);
    }
    return;
  }
  if (next < 1) return;
  mpGroupSize = next;
  mpRenderGroupSizeOptions();
  mpRenderGroupNameFields();
}

document.getElementById('btn-group-count-up').addEventListener('click', () => mpStepGroupSize(1));
document.getElementById('btn-group-count-down').addEventListener('click', () => mpStepGroupSize(-1));

// Name fields for everyone past the first - the first is the existing "your
// name" input. Values are preserved across a size change so shrinking then
// growing again doesn't wipe what was typed.
function mpRenderGroupNameFields() {
  const box = document.getElementById('group-name-fields');
  const existing = Array.from(box.querySelectorAll('input')).map(input => input.value);
  box.innerHTML = '';
  for (let i = 1; i < mpGroupSize; i += 1) {
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'player-name-modal-input';
    input.maxLength = 20;
    input.autocomplete = 'off';
    input.placeholder = `Player ${i + 1} name`;
    input.value = existing[i - 1] || '';
    input.addEventListener('keydown', e => { if (e.key === 'Enter') mpSubmitPlayerName(); });
    box.appendChild(input);
  }
  box.classList.toggle('hidden', mpGroupSize < 2);
}

// Reopens the name modal with the group the join attempt was carrying, so an
// error the whole group bounced on doesn't silently reduce it to a solo join.
function mpReopenPlayerNameModalWithGroup() {
  closeScorerModal();
  openPlayerNameModal();
  const guestNames = (mpPendingJoin && mpPendingJoin.guestNames) || [];
  document.getElementById('player-name-input').value = (mpPendingJoin && mpPendingJoin.name) || '';
  mpGroupSize = Math.min(mpGroupSizeCap(), 1 + guestNames.length);
  mpRenderGroupSizeOptions();
  mpRenderGroupNameFields();
  document.getElementById('group-name-fields').querySelectorAll('input').forEach((input, i) => {
    input.value = guestNames[i] || '';
  });
}

function closePlayerNameModal() {
  document.getElementById('modal-player-name').classList.add('hidden');
}
function mpShowPlayerNameError(text) {
  const el = document.getElementById('player-name-error');
  el.textContent = text;
  el.classList.remove('hidden');
}
function mpSubmitPlayerName() {
  const name = document.getElementById('player-name-input').value.trim();
  if (!name) { mpShowPlayerNameError('Enter a name.'); return; }
  if (!mpPendingJoin) return;

  const guestNames = Array.from(
    document.getElementById('group-name-fields').querySelectorAll('input'),
  ).map(input => input.value.trim());

  if (guestNames.some(guestName => !guestName)) {
    mpShowPlayerNameError('Enter a name for every player on this device.');
    return;
  }

  // The server rejects duplicates too, but catching them here keeps the whole
  // group from bouncing on a typo that's visible right in the form.
  const seen = new Set();
  for (const candidate of [name, ...guestNames]) {
    const normalized = candidate.toLocaleLowerCase();
    if (seen.has(normalized)) {
      mpShowPlayerNameError(`"${candidate}" is used twice - give each player a different name.`);
      return;
    }
    seen.add(normalized);
  }

  document.getElementById('player-name-error').classList.add('hidden');
  mpPendingJoin.name = name;
  mpPendingJoin.guestNames = guestNames;

  // Only guests joining an existing 'each'-scoring room get the picker - the
  // host creating a room has nobody to nominate, a silent reconnect keeps
  // whatever the server already has on record, and a device speaking for a
  // group has to enter its own scores since nominations never chain.
  const eligible = (mpPendingJoin.roster || []).filter(p => !p.scorerId);
  if (guestNames.length === 0 && mpPendingJoin.roomScoringMode === 'each' && eligible.length > 0) {
    closePlayerNameModal();
    openScorerModal('join', eligible, null);
    return;
  }

  mpConnect(mpPendingJoin);
}

// ── Scorer Picker ────────────────────────────────────────
document.getElementById('scorer-backdrop').addEventListener('click', () => mpCancelScorerModal());
document.getElementById('btn-cancel-scorer').addEventListener('click', () => mpCancelScorerModal());
document.getElementById('btn-submit-scorer').addEventListener('click', mpSubmitScorer);
document.getElementById('btn-mp-scorer').addEventListener('click', () => {
  if (!state.multiplayer || state.mpScoringMode !== 'each') return;
  const me = mpMe();
  // Everyone still entering their own scores is a candidate, minus this player.
  const eligible = state.players.filter(p => p.id !== state.mpPlayerId && !p.scorerId);
  openScorerModal('room', eligible, me ? me.scorerId : null);
});

function openScorerModal(context, roster, currentScorerId) {
  mpScorerContext = context;
  mpScorerRoster = roster;
  mpScorerSelection = currentScorerId || null;

  const blocked = context === 'room' && mpIsSomeonesScorer();
  document.getElementById('scorer-hint').textContent = blocked
    ? 'You\'re entering scores for another player, so you have to enter your own.'
    : 'Enter your own, or pick a player already in the room to enter them for you.';
  document.getElementById('scorer-error').classList.add('hidden');
  document.getElementById('btn-submit-scorer').textContent = context === 'join' ? 'Join' : 'Save';
  mpRenderScorerOptions(blocked);
  document.getElementById('modal-scorer').classList.remove('hidden');
}

function mpRenderScorerOptions(blocked) {
  const box = document.getElementById('scorer-options');
  box.innerHTML = '';

  const makeOption = (label, value, disabled) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'scorer-option';
    btn.textContent = label;
    btn.disabled = !!disabled;
    btn.classList.toggle('sel', mpScorerSelection === value);
    btn.addEventListener('click', () => {
      mpScorerSelection = value;
      mpRenderScorerOptions(blocked);
    });
    box.appendChild(btn);
  };

  makeOption('✍ I\'ll enter my own scores', null, false);
  mpScorerRoster.forEach(p => makeOption(p.name, p.id, blocked));
}

function closeScorerModal() {
  document.getElementById('modal-scorer').classList.add('hidden');
}

function mpCancelScorerModal() {
  closeScorerModal();
  if (mpScorerContext === 'join') {
    // Step back to the name modal rather than dropping the whole join flow.
    openPlayerNameModal();
    document.getElementById('player-name-input').value = (mpPendingJoin && mpPendingJoin.name) || '';
  }
  mpScorerContext = null;
}

function mpSubmitScorer() {
  if (mpScorerContext === 'join') {
    if (!mpPendingJoin) { closeScorerModal(); return; }
    mpPendingJoin.scorerId = mpScorerSelection;
    mpScorerContext = null;
    mpConnect(mpPendingJoin);
    return;
  }
  mpSend({ type: 'set-scorer', scorerId: mpScorerSelection });
  mpScorerContext = null;
  closeScorerModal();
}

// ── QR Modal ──────────────────────────────────────────────
document.getElementById('btn-mp-show-qr').addEventListener('click', () => openQrModal());
document.getElementById('qr-backdrop').addEventListener('click', closeQrModal);
document.getElementById('btn-close-qr').addEventListener('click', closeQrModal);

function openQrModal() {
  const url = `${location.origin}${location.pathname}?room=${state.mpRoomCode}`;
  document.getElementById('invite-link').value = url;
  document.getElementById('qr-room-code-hint').innerHTML = `<span class="room-code-prefix">Room Code:</span> ${state.mpRoomCode}`;
  const wrap = document.getElementById('qr-canvas-wrap');
  wrap.innerHTML = '';
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  wrap.innerHTML = qr.createSvgTag(6, 4);
  document.getElementById('modal-qr').classList.remove('hidden');
}
function closeQrModal() {
  document.getElementById('modal-qr').classList.add('hidden');
}

async function copyInviteLink() {
  const input = document.getElementById('invite-link');
  try {
    await navigator.clipboard.writeText(input.value);
  } catch {
    input.select();
    document.execCommand('copy');
  }
  showToast('Invite link copied.');
}
document.getElementById('btn-copy-invite').addEventListener('click', copyInviteLink);
document.getElementById('btn-share-invite').addEventListener('click', async () => {
  const url = document.getElementById('invite-link').value;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Join my game', text: `Join room ${state.mpRoomCode}`, url });
    } catch (error) {
      if (error.name !== 'AbortError') await copyInviteLink();
    }
  } else {
    await copyInviteLink();
  }
});

// ── Player panel ─────────────────────────────────────────
// One sheet behind every tap on a player's name, solo and multiplayer alike.
// Name and colour are edited in place at the top; the host powers hang below a
// divider and are the only part that varies by role. Replaces the old split of
// an inline header input plus a separate colour dot plus a host-only sheet.

// Solo players have no ids, so the panel remembers a seat index as well and
// reads whichever one its game actually has.
function playerOptionsSeat() {
  if (state.multiplayer) return state.players.findIndex(pl => pl.id === mpPlayerOptionsTarget);
  return playerOptionsIndex < state.players.length ? playerOptionsIndex : -1;
}

function ordinalPlace(n) {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return n + 'th';
  return n + (['th', 'st', 'nd', 'rd'][n % 10] || 'th');
}

// The subtitle under the name: standing first, because it is the reason to open
// the panel mid-game, then the connection state that only a room has.
function playerOptionsMeta(pi) {
  const parts = [];
  if (state.multiplayer) {
    // Three states, because "gone" and "not looking" are different things.
    // Green: app on screen. Amber: tab hidden or closed, seat and turn still
    // theirs. Red: the grace window expired and the server dropped them. The
    // word carries it too, so the colours are not doing the work alone.
    const player = state.players[pi];
    if (player.connected === false) {
      parts.push('<span class="po-conn is-off"></span>Disconnected');
    } else if (player.present === false) {
      parts.push('<span class="po-conn is-away"></span>Away');
    } else {
      parts.push('<span class="po-conn is-on"></span>In the game');
    }
  }
  if (state.rounds.length > 0) {
    const totals = getTotals();
    const mine = totals[pi];
    const ahead = totals.filter(t => (state.scoreDirection === 'low' ? t < mine : t > mine)).length;
    parts.push(ordinalPlace(ahead + 1));
    parts.push(mine.toLocaleString());
  } else {
    parts.push(`Seat ${pi + 1} of ${state.players.length}`);
  }
  return parts.join(' · ');
}

// The panel is built once on open, so a presence change while it is up would
// otherwise sit there stale - and presence changes far more often than the
// roster does.
function refreshPlayerOptionsMeta() {
  const modal = document.getElementById('modal-player-options');
  if (!modal || modal.classList.contains('hidden')) return;
  const seat = playerOptionsSeat();
  if (seat === -1) return;
  document.getElementById('player-options-meta').innerHTML = playerOptionsMeta(seat);
}

function renderPlayerOptionsSwatches(pi) {
  const wrap = document.getElementById('player-options-swatches');
  wrap.innerHTML = '';
  PLAYER_COLORS.forEach(color => {
    const swatch = document.createElement('button');
    swatch.type = 'button';
    swatch.className = 'po-swatch' + (color === state.players[pi].color ? ' sel' : '');
    swatch.style.background = color;
    swatch.setAttribute('aria-label', color);
    swatch.addEventListener('click', () => {
      const seat = playerOptionsSeat();
      if (seat === -1) return;
      const player = state.players[seat];
      if (player.color === color) return;
      player.color = color;
      if (state.multiplayer) mpSend({ type: 'update-color', playerId: player.id, color });
      renderTable();
      // The panel is not rebuilt by renderTable, so its own accents are repainted
      // here rather than reopening the sheet.
      paintPlayerOptionsAccent(seat);
      renderPlayerOptionsSwatches(seat);
    });
    wrap.appendChild(swatch);
  });
}

function paintPlayerOptionsAccent(pi) {
  const player = state.players[pi];
  const avatar = document.getElementById('player-options-avatar');
  avatar.textContent = (player.name || '?').trim().charAt(0).toUpperCase();
  avatar.style.setProperty('--chip', player.color);
  avatar.style.setProperty('--chip-bd', playerBorderColor(player.color));
  avatar.style.setProperty('--chip-fg', PLAYER_INK);
}

function openPlayerOptions(pi) {
  const p = state.players[pi];
  if (!p || !canOpenPlayerOptions(p)) return;
  mpPlayerOptionsTarget = p.id ?? null;
  playerOptionsIndex = pi;

  document.getElementById('player-options-name').textContent = p.name;
  // innerHTML, not textContent: the connection dot is a span. Nothing here is
  // user-typed - the parts are a fixed status string, a place, and a total.
  document.getElementById('player-options-meta').innerHTML = playerOptionsMeta(pi);
  paintPlayerOptionsAccent(pi);

  const nameInput = document.getElementById('player-options-name-input');
  nameInput.value = p.name;

  const colorField = document.getElementById('player-options-color-field');
  const canColor = canEditPlayerColor(p);
  colorField.classList.toggle('hidden', !canColor);
  if (canColor) renderPlayerOptionsSwatches(pi);

  // Host powers act on the room, so they appear for the host and nobody else -
  // including the host's own seat, which simply cannot be removed.
  const isHost = state.multiplayer && state.mpIsHost;
  document.getElementById('player-options-host').classList.toggle('hidden', !isHost);
  document.getElementById('player-options-divider').classList.toggle('hidden', !isHost);
  document.getElementById('btn-remove-player').classList.toggle('hidden', p.id === state.mpPlayerId);

  document.getElementById('modal-player-options').classList.remove('hidden');
}

// Name commits on the way out rather than on every keystroke: multiplayer sends
// the change to the server for uniqueness checking, and one round trip per edit
// is enough.
function commitPlayerOptionsName() {
  const seat = playerOptionsSeat();
  if (seat === -1) return;
  const player = state.players[seat];
  const newName = document.getElementById('player-options-name-input').value.trim();
  if (!newName || newName === player.name) return;
  if (state.multiplayer) {
    mpSend({ type: 'rename-self', name: newName, playerId: player.id });
  } else {
    player.name = newName;
  }
  renderTable();
}

function closePlayerOptionsModal(commit = true) {
  if (commit) commitPlayerOptionsName();
  document.getElementById('modal-player-options').classList.add('hidden');
}

document.getElementById('player-options-backdrop').addEventListener('click', () => closePlayerOptionsModal());
document.getElementById('btn-close-player-options').addEventListener('click', () => closePlayerOptionsModal());
document.getElementById('btn-cancel-player-options').addEventListener('click', () => closePlayerOptionsModal());
document.getElementById('player-options-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); closePlayerOptionsModal(); }
});
document.getElementById('btn-declare-turn').addEventListener('click', () => {
  const target = mpPlayerOptionsTarget;
  closePlayerOptionsModal();
  mpSend({ type: 'set-current-turn', playerId: target });
});
document.getElementById('btn-remove-player').addEventListener('click', () => {
  const p = state.players.find(pl => pl.id === mpPlayerOptionsTarget);
  // Discard the name edit rather than committing it: the seat is on its way out,
  // and a rename racing a removal is a round trip nobody needs.
  closePlayerOptionsModal(false);
  document.getElementById('confirm-remove-title').textContent = `Remove ${p ? p.name : 'this player'} from the game?`;
  document.getElementById('modal-confirm-remove').classList.remove('hidden');
});
document.getElementById('confirm-remove-backdrop').addEventListener('click', closeConfirmRemoveModal);
document.getElementById('btn-confirm-remove-cancel').addEventListener('click', closeConfirmRemoveModal);
document.getElementById('btn-confirm-remove-yes').addEventListener('click', () => {
  mpSend({ type: 'remove-player', playerId: mpPlayerOptionsTarget });
  closeConfirmRemoveModal();
});
function closeConfirmRemoveModal() {
  document.getElementById('modal-confirm-remove').classList.add('hidden');
}

// ── Boot: URL room param / silent reconnect ──────────────
function mpBoot() {
  const params = new URLSearchParams(location.search);
  const urlRoom = (params.get('room') || '').toUpperCase();
  const session = mpLoadSession();

  if (session && session.roomCode && (!urlRoom || urlRoom === session.roomCode)) {
    mpPendingJoin = { roomCode: session.roomCode, rejoinId: session.playerId, name: session.name };
    mpConnect(mpPendingJoin);
    return true;
  }

  if (/^[A-Z]{4}$/.test(urlRoom)) {
    document.getElementById('join-room-code-input').value = urlRoom;
    openJoinRoomModal();
    return true;
  }

  return false;
}

// ── Rules Modal ──────────────────────────────────────────
const modalRules = document.getElementById('modal-rules');

document.getElementById('btn-rules').addEventListener('click', () => openRulesModal());
document.getElementById('btn-rules-setup').addEventListener('click', () => openRulesModal());
document.getElementById('btn-rules-turn').addEventListener('click', () => openRulesModal());
document.getElementById('btn-see-full-rules').addEventListener('click', () => openRulesModal());
document.getElementById('rules-backdrop').addEventListener('click', closeRulesModal);
document.getElementById('btn-close-rules').addEventListener('click', closeRulesModal);

// Host edits to rule text persist locally like any other saved rule, and are
// also pushed live to the room so every connected guest sees them right away.
function persistRuleOverrides(ov) {
  saveRuleOverrides(state.gameKey, ov);
  mpBroadcastRulesIfHost();
}

function mpBroadcastRulesIfHost() {
  if (!state.multiplayer || !state.mpIsHost) return;
  mpSend({
    type: 'update-rules',
    ruleOverrides: loadRuleOverrides(state.gameKey),
    customRules: state.customRules,
  });
}

function renderRulesModalCallout() {
  const el = document.getElementById('rules-mp-callout');
  if (state.multiplayer && state.mpIsHost) {
    el.textContent = "Your rules are shared live with everyone in your room.";
    el.classList.remove('hidden');
  } else if (state.multiplayer && !state.mpIsHost) {
    el.textContent = "You're viewing the host's rules for this room.";
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
  }
}

function openRulesModal() {
  const { intro, rules, overrides } = getEffectiveRules(state.gameKey);
  document.getElementById('rules-modal-title').textContent = 'Game Rules';
  renderRulesModalCallout();
  const isMpGuest = state.multiplayer && !state.mpIsHost;

  const builtIn = document.getElementById('rules-built-in');
  const hasBuiltIn = rules.length > 0 || !!intro;
  builtIn.classList.toggle('hidden', !hasBuiltIn);
  builtIn.innerHTML = '';

  if (hasBuiltIn) {
    const hasOverrides = overrides.intro != null ||
      (overrides.rules && Object.keys(overrides.rules).length > 0);
    if (!isMpGuest) {
      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn-reset-rules';
      resetBtn.type = 'button';
      resetBtn.title = 'Reset rules to default';
      resetBtn.innerHTML = '&#8635;';
      resetBtn.classList.toggle('hidden', !hasOverrides);
      resetBtn.addEventListener('click', () => {
        persistRuleOverrides({});
        openRulesModal();
      });
      builtIn.appendChild(resetBtn);
    }

    if (intro) {
      builtIn.appendChild(buildEditableRuleBlock({
        text: intro,
        isCustomized: overrides.intro != null,
        className: 'rule-intro',
        readOnly: isMpGuest,
        onCommit: newText => {
          const ov = loadRuleOverrides(state.gameKey);
          ov.intro = newText;
          persistRuleOverrides(ov);
          openRulesModal();
        },
        onRevert: () => {
          const ov = loadRuleOverrides(state.gameKey);
          delete ov.intro;
          persistRuleOverrides(ov);
          openRulesModal();
        },
      }));
    }

    rules.forEach((text, i) => {
      builtIn.appendChild(buildEditableRuleBlock({
        text,
        isCustomized: !!(overrides.rules && overrides.rules[i] != null),
        className: 'rule-item',
        readOnly: isMpGuest,
        onCommit: newText => {
          const ov = loadRuleOverrides(state.gameKey);
          ov.rules = ov.rules || {};
          ov.rules[i] = newText;
          persistRuleOverrides(ov);
          openRulesModal();
        },
        onRevert: () => {
          const ov = loadRuleOverrides(state.gameKey);
          if (ov.rules) delete ov.rules[i];
          persistRuleOverrides(ov);
          openRulesModal();
        },
      }));
    });
  }

  renderCustomRules();
  modalRules.classList.remove('hidden');
}

// Builds one editable baseline-rule row (intro paragraph or a single scoring line).
// Clicking the pencil swaps the text for a textarea; committing re-renders the
// whole modal via onCommit/onRevert since that's already how rule edits persist.
function buildEditableRuleBlock({ text, isCustomized, className, onCommit, onRevert, readOnly }) {
  const wrap = document.createElement('div');
  wrap.className = className + (isCustomized ? ' customized' : '');

  if (readOnly) {
    const textSpan = document.createElement('span');
    textSpan.className = 'rule-text';
    textSpan.textContent = text;
    wrap.appendChild(textSpan);
    return wrap;
  }

  const editBtn = document.createElement('button');
  editBtn.className = 'btn-rule-edit';
  editBtn.type = 'button';
  editBtn.title = 'Edit';
  editBtn.innerHTML = '&#9998;';
  wrap.appendChild(editBtn);

  const textSpan = document.createElement('span');
  textSpan.className = 'rule-text';
  textSpan.textContent = text;
  wrap.appendChild(textSpan);

  const actions = document.createElement('span');
  actions.className = 'rule-actions';

  if (isCustomized) {
    const revertBtn = document.createElement('button');
    revertBtn.className = 'btn-revert-rule';
    revertBtn.type = 'button';
    revertBtn.title = 'Reset to default';
    revertBtn.innerHTML = '&#8635;';
    revertBtn.addEventListener('click', () => onRevert());
    actions.appendChild(revertBtn);
  }

  editBtn.addEventListener('click', () => {
    const input = document.createElement('textarea');
    input.className = 'rule-edit-input';
    input.value = text;
    wrap.replaceChild(input, textSpan);
    actions.classList.add('hidden');
    input.focus();
    input.select();
    const commit = () => {
      const val = input.value.trim();
      if (val && val !== text) onCommit(val);
      else openRulesModal();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { input.removeEventListener('blur', commit); openRulesModal(); }
    });
  });

  wrap.appendChild(actions);
  return wrap;
}

function closeRulesModal() {
  modalRules.classList.add('hidden');
}

function renderCustomRules() {
  const list = document.getElementById('custom-rules-list');
  list.innerHTML = '';
  state.customRules.forEach((rule, i) => {
    const li = document.createElement('li');
    li.className = 'custom-rule-item';
    const isMpGuest = state.multiplayer && !state.mpIsHost;

    if (!isMpGuest) {
      const editBtn = document.createElement('button');
      editBtn.className = 'btn-rule-edit';
      editBtn.type = 'button';
      editBtn.title = 'Edit rule';
      editBtn.innerHTML = '&#9998;';
      li.appendChild(editBtn);

      editBtn.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'rule-edit-input';
        input.value = rule;
        input.maxLength = 120;
        li.innerHTML = '';
        li.appendChild(input);
        input.focus();
        input.select();
        const commit = () => {
          const val = input.value.trim();
          state.customRules[i] = val || rule;
          persistCustomRules();
          renderCustomRules();
        };
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') input.blur();
          if (e.key === 'Escape') { input.removeEventListener('blur', commit); renderCustomRules(); }
        });
      });
    }

    const span = document.createElement('span');
    span.textContent = rule;
    li.appendChild(span);

    if (!isMpGuest) {
      const delBtn = document.createElement('button');
      delBtn.className = 'btn-delete-rule';
      delBtn.setAttribute('aria-label', 'Delete rule');
      delBtn.innerHTML = '&#10005;';
      delBtn.addEventListener('click', () => {
        state.customRules.splice(i, 1);
        persistCustomRules();
        renderCustomRules();
      });
      li.appendChild(delBtn);
    }

    list.appendChild(li);
  });
  document.getElementById('add-rule-row').classList.toggle('hidden', state.multiplayer && !state.mpIsHost);
  saveGame(); // also part of the active-game snapshot, for mid-game resume
}

// Host edits persist locally and broadcast to the room; a guest's copy is
// in-memory only (set via mpApplyRules/mpOnJoined), so this never runs for one.
function persistCustomRules() {
  if (state.gameKey) saveCustomRules(state.gameKey, state.customRules);
  mpBroadcastRulesIfHost();
}

document.getElementById('btn-add-rule').addEventListener('click', addCustomRule);
document.getElementById('custom-rule-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') addCustomRule();
});

function addCustomRule() {
  const input = document.getElementById('custom-rule-input');
  const text = input.value.trim();
  if (!text) return;
  state.customRules.push(text);
  input.value = '';
  persistCustomRules();
  renderCustomRules();
}

// ── Utility ──────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

let toastTimer = null;
let toastHideTimer = null;
const TOAST_DURATION_MS = 8000; // standard toast duration
function showToast(text, { closable = false } = {}) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  clearTimeout(toastHideTimer); // a pending hide from a prior fast-repeated tap must not cut this one short
  el.innerHTML = '';
  const span = document.createElement('span');
  span.textContent = text;
  el.appendChild(span);
  el.classList.toggle('closable', closable);
  if (closable) {
    const btn = document.createElement('button');
    btn.className = 'toast-close';
    btn.setAttribute('aria-label', 'Dismiss');
    btn.textContent = '✕';
    btn.addEventListener('click', hideToast);
    el.appendChild(btn);
  }
  el.classList.remove('hidden');
  el.classList.add('visible');
  toastTimer = setTimeout(hideToast, TOAST_DURATION_MS);
}

let turnToastTimer = null;
let turnToastHideTimer = null;
// Short: it covers the score grid, so it clears itself quickly. Tap dismisses early.
const TURN_TOAST_DURATION_MS = 2400;
function showTurnToast(title, eyebrow, subtitle) {
  const el = document.getElementById('turn-toast');
  const backdrop = document.getElementById('turn-toast-backdrop');
  clearTimeout(turnToastTimer);
  clearTimeout(turnToastHideTimer);
  el.querySelector('.turn-toast-eyebrow').textContent = eyebrow;
  el.querySelector('.turn-toast-title').textContent = title;
  el.querySelector('.turn-toast-name').textContent = subtitle;
  el.classList.remove('hidden', 'visible');
  backdrop.classList.remove('hidden', 'visible');
  void el.offsetWidth; // reflow, so the shimmer restarts on a repeat announcement
  el.classList.add('visible');
  backdrop.classList.add('visible');
  turnToastTimer = setTimeout(hideTurnToast, TURN_TOAST_DURATION_MS);
}
function hideTurnToast() {
  const el = document.getElementById('turn-toast');
  const backdrop = document.getElementById('turn-toast-backdrop');
  clearTimeout(turnToastTimer);
  clearTimeout(turnToastHideTimer);
  el.classList.remove('visible');
  backdrop.classList.remove('visible');
  turnToastHideTimer = setTimeout(() => {
    el.classList.add('hidden');
    backdrop.classList.add('hidden');
  }, 300);
}
document.getElementById('turn-toast').addEventListener('click', hideTurnToast);
document.getElementById('turn-toast-backdrop').addEventListener('click', hideTurnToast);
function hideToast() {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer);
  el.classList.remove('visible');
  toastHideTimer = setTimeout(() => el.classList.add('hidden'), 200);
}

// Resume an unfinished game straight into the tracker (all handlers are wired above).
if (!mpBoot()) resumeSavedGame();

// Drop the splash as soon as the boot work above has run. No minimum hold: on a
// warm load the app is ready in a frame or two and the splash is meant to cover
// that gap, not to stretch it. Two frames so the first painted screen is the
// real one underneath, not a flash of empty ground.
(function dismissSplash() {
  const el = document.getElementById('splash');
  if (!el) return;
  const done = () => {
    if (el.classList.contains('is-done')) return;
    el.classList.add('is-done');
    setTimeout(() => el.remove(), 300);
  };
  requestAnimationFrame(() => requestAnimationFrame(done));
  // Belt and braces: if a frame never lands (backgrounded tab), load still fires.
  window.addEventListener('load', done);
})();
