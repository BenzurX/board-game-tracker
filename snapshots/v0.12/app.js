// ── App Version ──────────────────────────────────────────
// Bumped alongside CHANGELOG.md per the pre-push gate - single source of truth
// for the version shown in Settings.
const APP_VERSION = '0.12';
document.getElementById('settings-version').textContent = `v${APP_VERSION}`;

// ── Theme Management ─────────────────────────────────────
const THEMES = ['ember', 'ocean', 'forest'];
const MODES  = ['dark', 'light', 'system'];

// 'system' is stored as the user's preference but never written to the DOM -
// resolve it to the OS's actual light/dark scheme so the theme CSS blocks (which
// only know dark/light) always have a real value to match against.
function resolveMode(mode) {
  if (mode !== 'system') return mode;
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}

function applyTheme(theme, mode) {
  if (!THEMES.includes(theme)) theme = 'ocean';
  if (!MODES.includes(mode))   mode  = 'system';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.mode  = resolveMode(mode);
  localStorage.setItem('theme', theme);
  localStorage.setItem('mode',  mode);
  updateSettingsUI(theme, mode);
}

// Live-follow the OS theme while 'system' mode is selected.
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('mode') === 'system') {
      applyTheme(localStorage.getItem('theme') || 'ocean', 'system');
    }
  });
}

function updateSettingsUI(theme, mode) {
  document.querySelectorAll('.theme-swatch').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme);
  });
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

// Apply persisted theme on load (also set by inline script in <head> to prevent flash)
applyTheme(
  localStorage.getItem('theme') || 'ocean',
  localStorage.getItem('mode')  || 'system'
);

// The gear button appears on every screen (home, setup, tracker) - all wired to the same modal.
['btn-settings', 'btn-settings-setup', 'btn-settings-tracker'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    // Use the stored preference, not dataset.mode - dataset.mode holds the resolved
    // dark/light value and is never literally 'system', which would make the System
    // button never show as active.
    updateSettingsUI(document.documentElement.dataset.theme, localStorage.getItem('mode') || 'system');
    document.getElementById('modal-settings').classList.remove('hidden');
  });
});
document.getElementById('settings-backdrop').addEventListener('click', closeSettingsModal);
document.getElementById('btn-close-settings').addEventListener('click', closeSettingsModal);

function closeSettingsModal() {
  document.getElementById('modal-settings').classList.add('hidden');
}

document.querySelectorAll('.theme-swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    // Keep the stored mode preference (e.g. 'system') - dataset.mode is the
    // resolved dark/light value and would overwrite 'system' with whichever one
    // it currently resolves to.
    applyTheme(btn.dataset.theme, localStorage.getItem('mode') || 'system');
  });
});
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(document.documentElement.dataset.theme, btn.dataset.mode);
  });
});

// ── Game Definitions ────────────────────────────────────
const GAMES = {
  farkle: {
    name: 'Farkle',
    icon: '🎲',
    defaultWinScore: 10000,
    defaultMinScore: 500,
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
    intro: `Each turn, roll 5 dice up to three times (re-rolling any you want to keep aside), then write your result into one of 13 scoring categories - each category is used exactly once across the game. After all 13 categories are filled for every player, whoever has the highest total wins.

Use "Add Turn" to log the score each player wrote down for that round's category (enter 0 for a category they scratched). The Upper Section (Ones through Sixes) earns a 35-point bonus if those six categories add up to 63 or more - add that bonus in as its own turn once it's earned.

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
    intro: `Deal 6 cards each (2-player); each player discards down to 4, with the extra 2 going into the dealer's "crib." Players take turns playing cards face-up while counting the running total out loud (never exceeding 31), scoring points for 15s, pairs, and runs formed during play - then each hand (plus the crib) is counted again against the starter card for its own points.

Use "Add Turn" to log each player's total pegged for that hand (play + hand + crib, if applicable). First to 121 wins - Score board points as they're won.

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
    intro: `Played in fixed partnerships (partners sit across from each other), 4 players, 5 tricks per hand. Only the 9s through Aces are used. One suit is named trump each hand - the Jack of trump (the "right bower") is the highest card in play, and the same-color Jack (the "left bower") becomes the second-highest, counting as trump.

The team that named trump must take at least 3 of the 5 tricks to score; taking all 5 ("a march") scores extra. Failing to take 3 tricks ("getting euchred") hands the points to the other team instead.

Use "Add Turn" to log each team's points after a hand is scored (usually one team gets 0 and the other gets 1-4). First team to 10 points wins.`,
    rules: [
      'Only 9, 10, J, Q, K, A are in the deck (24 cards total)',
      'Jack of trump ("right bower") is the highest card; same-color Jack ("left bower") is second-highest and counts as trump',
      'The calling team taking 3-4 of 5 tricks scores 1 pt',
      'The calling team taking all 5 tricks ("a march") scores 2 pts (4 pts if going alone)',
      'The calling team taking fewer than 3 tricks ("euchred") gives the opposing team 2 pts',
      'First team to 10 points wins',
    ],
  },
  crazyeights: {
    name: 'Crazy Eights',
    icon: '8️⃣',
    defaultWinScore: 100,
    defaultMinScore: 0,
    scoreDirection: 'low', // penalty scoring - lowest total when the target is reached wins
    intro: `Deal 5-7 cards each; players take turns matching the top of the discard pile by suit or rank, or playing an 8 to change the suit on demand. Draw from the stock if you can't play. First to play their last card ends the hand and scores 0 for that hand - everyone else adds up the value of the cards left in their hand.

Play repeated hands until someone's running total reaches the target (100 is standard) - the player with the LOWEST total when that happens wins, so this game tracks in "golf" mode: fewer points is better.

Card values: 8s = 50 pts, face cards (K/Q/J) = 10 pts, Aces = 1 pt, everything else = its face value (2-10).`,
    rules: [
      '8s are wild - play one anytime to change the suit',
      'Otherwise match the top card by suit or rank, or draw if you can\'t play',
      'Going out first scores 0 for that hand',
      'Everyone else scores the value of cards left in hand: 8s = 50, K/Q/J = 10, A = 1, others = face value',
      'Lowest running total wins once someone\'s total reaches the target (100 is standard)',
    ],
  },
  lrc: {
    name: 'Left Right Center',
    icon: '🪙',
    defaultWinScore: 0, // no scoring target - it's an elimination game, tracked as chips remaining
    defaultMinScore: 0,
    intro: `Every player starts with 3 chips. On your turn, roll one special die per chip you're holding (max 3): each die shows Left, Right, Center, or a dot. L = pass a chip to the player on your left, R = pass one to your right, C = put one in the center pot, dot = keep that chip. Play passes around the table.

Once you're out of chips you're out of active rolling, but stay in - a chip passed to you brings you back in. The last player still holding any chips wins the whole center pot.

Use "Add Turn" to log each player's chip count after a round of passing, so you can see who's still in.`,
    rules: [
      'Everyone starts with 3 chips',
      'Roll one die per chip you hold (max 3 dice)',
      'L = pass left, R = pass right, C = put in the center pot, dot = keep it',
      'Out of chips = out of rolling, but a passed chip brings you back in',
      'Last player holding any chips wins the center pot',
    ],
  },
  poker: {
    name: 'Poker',
    icon: '♣️',
    defaultWinScore: 0, // no target - just a running chip-count/session tracker
    defaultMinScore: 0,
    allowNegative: true, // per-hand chip swings can be a loss
    intro: `Standard hand rankings apply across most poker variants (Texas Hold'em, 7-Card Stud, etc.) - best 5-card hand wins the pot at showdown, or the last player left after everyone else folds. This tracker isn't tied to a specific variant - use "Add Turn" to log each player's net chip change (wins as positive, losses as negative) after each hand or at cash-out, so you can see who's up or down for the session.`,
    rules: [
      'Hand ranking, highest to lowest: Royal Flush, Straight Flush, Four of a Kind, Full House, Flush, Straight, Three of a Kind, Two Pair, One Pair, High Card',
      'Best 5-card hand at showdown wins the pot',
      'A player can also win by being the last one left after everyone else folds',
      'Log each player\'s net chip change per hand (or per session) - positive for a win, negative for a loss',
    ],
  },
  ginrummy: {
    name: 'Gin Rummy',
    icon: '♥️',
    defaultWinScore: 100,
    defaultMinScore: 0,
    intro: `2 players, 10 cards each. Draw one card, then discard one, trying to form your hand into sets (3-4 of the same rank) and runs (3+ sequential cards, same suit). "Knock" once your unmatched ("deadwood") card value is 10 or less, ending the hand - you score the difference between your opponent's deadwood and yours.

Knocking with 0 deadwood is "Gin," worth a 25-point bonus on top of the deadwood difference. If your opponent's deadwood is actually lower than yours when you knock, they "undercut" you and score the difference plus a 25-point bonus instead.

Use "Add Turn" to log each player's points from the hand. First to 100 wins.`,
    rules: [
      'Sets = 3-4 cards of the same rank; Runs = 3+ sequential cards in the same suit',
      'Knock once your unmatched ("deadwood") card total is 10 or less, ending the hand',
      'Score the difference between your opponent\'s deadwood and your own',
      'Knocking with 0 deadwood ("Gin") adds a 25-pt bonus',
      'If your opponent\'s deadwood is lower than yours when you knock, they "undercut" you: they score the difference plus a 25-pt bonus instead',
      'First to 100 points wins',
    ],
  },
  liarsdice: {
    name: "Liar's Dice",
    icon: '🤥',
    defaultWinScore: 0, // no scoring target - it's an elimination game, tracked as dice remaining
    defaultMinScore: 0,
    intro: `Every player rolls 5 dice in secret, keeping the result hidden from everyone else. Going around the table, each player either raises the previous bid (a higher quantity, or same quantity of a higher face) or calls "liar." A bid is a claim about how many dice of a given face are showing across ALL players' hidden rolls combined - 1s are usually wild and count toward any face called.

If challenged, all dice are revealed: if the bid was true (that many dice of that face really exist), the challenger loses a die; if it was false, the bidder loses a die. Losing all your dice eliminates you. Last player with any dice left wins.

Use "Add Turn" to log each player's dice remaining after a round, so you can track who's still in.`,
    rules: [
      'Everyone rolls 5 dice in secret, hidden from other players',
      'Bids claim how many of a face value exist across all hidden dice combined',
      'Each bid must raise the last one: higher quantity, or same quantity of a higher face',
      '1s are wild and count toward any face called (unless your table plays "no wilds")',
      'Calling "liar" reveals all dice - if the bid was true, the challenger loses a die; if false, the bidder loses a die',
      'Losing all your dice eliminates you; last player with dice left wins',
    ],
  },
  solitaire: {
    name: 'Solitaire',
    icon: '🎴',
    defaultWinScore: 0, // no target - track a best score across attempts
    defaultMinScore: 0,
    intro: `Classic single-player Klondike: deal a tableau of 7 piles (1-7 cards, only the top card face-up), build descending alternating-color sequences on the tableau, and build the four foundation piles up by suit from Ace to King. Deal from the stock in draws of 1 or 3, per your table's house rule.

Use standard Vegas-style scoring to compare attempts: +10 for every card played to a foundation pile.

Use "Add Turn" to log each attempt's score - great for tracking your best game over time, or a running leaderboard if multiple people are playing separate solitaire games side by side.`,
    rules: [
      'Foundations build up by suit, Ace to King; tableau builds down, alternating colors',
      '+10 points for every card moved to a foundation pile',
      '-2 points for every card drawn from stock to waste (optional scoring rule)',
      'A fully cleared foundation (all 52 cards up) is a win',
      'Track each attempt as its own "turn" to build a running best-score log',
    ],
  },
  generic: {
    name: 'Custom Game',
    icon: '📝',
    generic: true,        // freeform score sheet, no built-in scoring rules
    defaultWinScore: 100, // starting target; set to 0 for no limit, just track
    defaultMinScore: 0,
    intro: '',
    rules: [],
  },
};

const PLAYER_COLORS = ['#3a9ee8', '#5cb85c', '#f0a820', '#a855f7', '#14b8a6', '#e8533a', '#ec4899', '#6366f1'];

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
  gameOver: false,
  celebrated: false, // true once the win confetti has fired for the current win
  trackCloser: false, // track who "goes out first" each round (custom games)
  closers: [],       // [playerIndex|null, ...]  parallel to rounds
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
  const overrides = loadRuleOverrides(gameKey);
  const intro = overrides.intro != null ? overrides.intro : (game.intro || '');
  const rules = (game.rules || []).map((r, i) =>
    (overrides.rules && overrides.rules[i] != null) ? overrides.rules[i] : r);
  return { intro, rules, overrides };
}

function resumeSavedGame() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { return; }
  if (!saved || !Array.isArray(saved.players) || saved.players.length < 2 || saved.gameOver ||
      !Array.isArray(saved.rounds) || saved.rounds.length === 0) {
    clearSavedGame();
    return;
  }
  Object.assign(state, saved);
  // Build the setup screen too, so backing out of the resumed game doesn't land on an empty form.
  buildSetupScreen(state.gameKey);
  buildTrackerScreen();
  showScreen('screen-tracker');
}

// ── Screen Navigation ────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

// ── Home Screen ──────────────────────────────────────────
document.querySelectorAll('.game-card:not(.coming-soon)').forEach(card => {
  card.addEventListener('click', () => {
    const key = card.dataset.game;
    state.gameKey = key;
    buildSetupScreen(key);
    showScreen('screen-setup');
  });
});

document.getElementById('btn-back-home').addEventListener('click', () => showScreen('screen-home'));

// ── Setup Screen ─────────────────────────────────────────
function buildSetupScreen(key) {
  const game = GAMES[key];
  const generic = !!game.generic;
  state.generic = generic;
  state.customRules = loadCustomRules(key); // house rules persist per game type, not per session

  document.getElementById('setup-title').textContent = generic ? 'Custom Game' : game.name;

  // Basic Rules panel (games with an intro only - Custom Game has no fixed rules)
  const { intro } = getEffectiveRules(key);
  document.getElementById('basic-rules-section').classList.toggle('hidden', !intro);
  document.getElementById('setup-basic-rules-intro').textContent = intro;

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

  renderPlayerInputs(4);
}

function setScoringDirectionUI(dir) {
  document.querySelectorAll('.dir-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dir === dir);
  });
}

document.querySelectorAll('.dir-btn').forEach(btn => {
  btn.addEventListener('click', () => setScoringDirectionUI(btn.dataset.dir));
});

function renderPlayerInputs(count) {
  const container = document.getElementById('player-inputs');
  container.innerHTML = '';
  for (let i = 0; i < count; i++) addPlayerRow(container, i);
  updateAddPlayerButtonState();
}

function updateAddPlayerButtonState() {
  const rows = document.querySelectorAll('.player-input-row');
  const btn = document.getElementById('btn-add-player');
  const atMax = rows.length >= 8;
  btn.classList.toggle('is-disabled', atMax);
  btn.setAttribute('aria-disabled', atMax ? 'true' : 'false');
}

function addPlayerRow(container, index) {
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
  const row = document.createElement('div');
  row.className = 'player-input-row';
  row.innerHTML = `
    <button type="button" class="player-color-dot" style="background:${color}" data-color="${color}" aria-label="Change player color" title="Tap to change color"></button>
    <input type="text" class="player-name-input" placeholder="Player ${index + 1}" maxlength="20">
    <button class="btn-remove-player" aria-label="Remove player">&#10005;</button>
  `;

  const dot = row.querySelector('.player-color-dot');
  dot.addEventListener('click', e => {
    e.stopPropagation();
    openColorPicker(dot, dot.dataset.color, newColor => {
      dot.style.background = newColor;
      dot.dataset.color = newColor;
    });
  });

  row.querySelector('.btn-remove-player').addEventListener('click', () => {
    const rows = document.querySelectorAll('.player-input-row');
    if (rows.length > 2) {
      row.remove();
      updateAddPlayerButtonState();
    }
  });
  container.appendChild(row);
}

document.getElementById('btn-add-player').addEventListener('click', () => {
  const rows = document.querySelectorAll('.player-input-row');
  if (rows.length >= 8) {
    const tooltip = document.getElementById('add-player-tooltip');
    tooltip.classList.add('show');
    clearTimeout(tooltip._hideTimer);
    tooltip._hideTimer = setTimeout(() => tooltip.classList.remove('show'), 2000);
    return;
  }
  addPlayerRow(document.getElementById('player-inputs'), rows.length);
  updateAddPlayerButtonState();
});

document.getElementById('btn-start-game').addEventListener('click', () => {
  const nameInputs = document.querySelectorAll('.player-name-input');
  const colorDots = document.querySelectorAll('.player-color-dot');
  const names = Array.from(nameInputs).map((el, i) => el.value.trim() || `Player ${i + 1}`);
  if (names.length < 2) return;

  state.players = names.map((name, i) => ({
    name,
    color: colorDots[i]?.dataset.color || PLAYER_COLORS[i % PLAYER_COLORS.length],
  }));

  if (state.generic) {
    state.gameName = document.getElementById('game-name-input').value.trim() || 'Custom Game';
    state.scoreDirection = document.querySelector('.dir-btn.active')?.dataset.dir || 'high';
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
    state.trackCloser = false;
  }

  state.rounds = [];
  state.closers = [];
  state.onBoard = state.players.map(() => state.minScore === 0);
  state.gameOver = false;
  state.celebrated = false;

  buildTrackerScreen();
  showScreen('screen-tracker');
  saveGame(); // the render inside buildTrackerScreen ran before the tracker screen was active
});

// ── Tracker Screen ───────────────────────────────────────
document.getElementById('btn-back-setup').addEventListener('click', () => {
  if (state.rounds.length > 0) {
    document.getElementById('modal-confirm').classList.remove('hidden');
  } else {
    showScreen('screen-setup');
  }
});

document.getElementById('confirm-backdrop').addEventListener('click', closeConfirmModal);
document.getElementById('btn-confirm-stay').addEventListener('click', closeConfirmModal);
document.getElementById('btn-confirm-leave').addEventListener('click', () => {
  closeConfirmModal();
  clearSavedGame(); // leaving is deliberate - don't offer this game for resume
  showScreen('screen-setup');
});

function closeConfirmModal() {
  document.getElementById('modal-confirm').classList.add('hidden');
}

function buildTrackerScreen() {
  document.getElementById('tracker-title').textContent = state.gameName;
  document.getElementById('winner-banner').classList.add('hidden');
  renderTable();
}

function renderTable() {
  const { players, rounds } = state;

  // Header
  const headerRow = document.getElementById('player-header-row');
  headerRow.innerHTML = '<th class="col-round">#</th>';
  players.forEach((p, pi) => {
    const th = document.createElement('th');
    const wrap = document.createElement('span');
    wrap.className = 'player-header-inner';

    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'player-color-dot player-color-dot--header';
    dot.style.background = p.color;
    dot.title = 'Tap to change color';
    dot.setAttribute('aria-label', `Change ${p.name}'s color`);
    dot.addEventListener('click', e => {
      e.stopPropagation();
      openColorPicker(dot, p.color, newColor => {
        state.players[pi].color = newColor;
        renderTable();
      });
    });

    const span = document.createElement('span');
    span.className = 'player-name-label';
    span.style.color = p.color;
    span.textContent = p.name;
    span.title = 'Tap to rename';
    span.addEventListener('click', () => editPlayerName(th, pi));

    wrap.append(dot, span);
    th.appendChild(wrap);
    headerRow.appendChild(th);
  });

  // Body
  const tbody = document.getElementById('score-body');
  tbody.innerHTML = '';
  rounds.forEach((round, ri) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td class="col-round">${ri + 1}</td>`;
    round.forEach((score, pi) => {
      const td = document.createElement('td');
      if (score === null) {
        td.className = 'score-cell not-on-board';
        td.textContent = '✗';
        td.title = 'Below entry threshold - tap to edit';
      } else if (score === 0 && state.gameKey === 'farkle') {
        td.className = 'score-cell farkle';
        td.textContent = '-';
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
      td.addEventListener('click', () => editScore(td, ri, pi));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  // Totals footer
  const totalsRow = document.getElementById('totals-row');
  totalsRow.innerHTML = '<td class="col-round totals-label">Total</td>';
  const totals = getTotals();
  const leaders = getLeaders(totals);
  totals.forEach((total, i) => {
    const td = document.createElement('td');
    td.style.color = state.players[i].color;
    td.textContent = (leaders.includes(i) ? '👑 ' : '') + total.toLocaleString();
    totalsRow.appendChild(td);
  });

  // Every state change ends in a re-render, so this is the one save point.
  saveGame();
}

function editPlayerName(th, pi) {
  const p = state.players[pi];
  const input = document.createElement('input');
  input.type = 'text';
  input.value = p.name;
  input.maxLength = 20;
  input.className = 'name-edit-input';
  input.style.color = p.color;
  th.innerHTML = '';
  th.appendChild(input);
  input.focus();
  input.select();

  const commit = () => {
    state.players[pi].name = input.value.trim() || p.name;
    renderTable();
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') input.blur();
    if (e.key === 'Escape') { input.removeEventListener('blur', commit); renderTable(); }
  });
}

function editScore(td, ri, pi) {
  const current = state.rounds[ri][pi];
  const game = GAMES[state.gameKey];
  const input = document.createElement('input');
  input.type = 'number';
  input.value = current === null ? 0 : current;
  input.min = (state.generic || game.allowNegative) ? -99999 : 0;
  input.max = 99999;
  input.step = state.generic ? 1 : (game.scoreStep || 1);
  input.inputMode = 'numeric';
  input.className = 'score-edit-input';
  td.textContent = '';
  td.className = 'score-cell';
  td.appendChild(input);
  input.focus();
  input.select();

  const commit = () => {
    const parsed = parseInt(input.value);
    let newScore = isNaN(parsed) ? 0 : parsed;
    if (!state.generic) {
      newScore = game.allowNegative ? newScore : Math.max(0, newScore);
      if (state.gameKey === 'farkle') newScore = normalizeFarkleScore(newScore);
    }
    // Same entry-threshold rule as Add Turn: a player not yet on the board needs
    // minScore in a single turn - an edit below that stays off the board (null).
    if (state.onBoard[pi]) {
      state.rounds[ri][pi] = newScore;
    } else if (newScore >= state.minScore) {
      state.onBoard[pi] = true;
      state.rounds[ri][pi] = newScore;
    } else {
      state.rounds[ri][pi] = null;
    }
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

function checkWin() {
  const banner = document.getElementById('winner-banner');
  const noTarget = !state.winScore || state.winScore <= 0;
  const totals = getTotals();

  // No target, or target not reached: no winner - reset so a later win re-celebrates
  if (noTarget || !totals.some(t => t >= state.winScore)) {
    banner.classList.add('hidden');
    state.gameOver = false;
    state.celebrated = false;
    return;
  }

  // Target reached: pick winner by scoring direction (lowest total wins in golf mode)
  const best = state.scoreDirection === 'low' ? Math.min(...totals) : Math.max(...totals);
  const winIdx = totals.indexOf(best);
  const winner = state.players[winIdx];
  banner.textContent = `🎉 ${winner.name} wins with ${totals[winIdx].toLocaleString()} points!`;
  banner.classList.remove('hidden');
  state.gameOver = true;

  if (!state.celebrated) {
    state.celebrated = true;
    banner.classList.remove('celebrate');
    void banner.offsetWidth;        // restart the pop animation
    banner.classList.add('celebrate');
    fireConfetti();
  }
  saveGame(); // callers render before checkWin runs, so persist the gameOver flag here
}

// ── Win Confetti (classic burst) ─────────────────────────
let confettiRAF = null;
function fireConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const dpr = window.devicePixelRatio || 1;
  const W = window.innerWidth, H = window.innerHeight;
  canvas.width  = W * dpr;
  canvas.height = H * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const rand = (a, b) => a + Math.random() * (b - a);
  const parts = Array.from({ length: 150 }, () => ({
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
  }));

  let t = 0;
  if (confettiRAF) cancelAnimationFrame(confettiRAF);
  (function frame() {
    ctx.clearRect(0, 0, W, H);
    t += 0.016;
    for (const p of parts) {
      p.x += p.vx + Math.sin(t * 2 + p.phase) * p.sway;
      p.y += p.vy;
      p.rot += p.vr;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = 0.95;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    if (t < 5) confettiRAF = requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, W, H); confettiRAF = null; }
  })();
}

document.getElementById('btn-new-game').addEventListener('click', () => showScreen('screen-setup'));

// ── Add Turn Modal ───────────────────────────────────────
const modalTurn = document.getElementById('modal-turn');

document.getElementById('btn-add-turn').addEventListener('click', () => {
  if (state.gameOver) return;
  const game = GAMES[state.gameKey];
  document.getElementById('turn-hint').textContent = state.generic
    ? 'Enter each player\'s score for this round'
    : (state.gameKey === 'farkle'
        ? 'Enter 0 for a Farkle (no score this turn)'
        : 'Enter each player\'s score for this round');

  const minAttr = (state.generic || game.allowNegative) ? -99999 : 0;
  const stepAttr = state.generic ? 1 : (game.scoreStep || 1);
  const container = document.getElementById('turn-score-inputs');
  container.innerHTML = '';
  state.players.forEach(p => {
    const row = document.createElement('div');
    row.className = 'turn-player-row';
    row.innerHTML = `
      <span class="turn-player-dot" style="background:${p.color}"></span>
      <span class="turn-player-name">${escHtml(p.name)}</span>
      <input type="number" class="turn-score-input" value="0" min="${minAttr}" max="99999" step="${stepAttr}" inputmode="numeric">
    `;
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
  const scores = Array.from(inputs).map((inp, pi) => {
    const parsed = parseInt(inp.value);
    let raw = isNaN(parsed) ? 0 : parsed;
    if (!state.generic) {
      raw = game.allowNegative ? raw : Math.max(0, raw);
      if (state.gameKey === 'farkle') raw = normalizeFarkleScore(raw);
    }
    if (state.onBoard[pi]) return raw;
    if (raw >= state.minScore) { state.onBoard[pi] = true; return raw; }
    return null; // below entry threshold - doesn't count yet
  });
  state.rounds.push(scores);
  state.closers.push(state.trackCloser ? turnCloser : null);
  closeTurnModal();
  renderTable();
  checkWin();
});

// ── Rules Modal ──────────────────────────────────────────
const modalRules = document.getElementById('modal-rules');

document.getElementById('btn-rules').addEventListener('click', () => openRulesModal());
document.getElementById('btn-rules-setup').addEventListener('click', () => openRulesModal());
document.getElementById('btn-see-full-rules').addEventListener('click', () => openRulesModal());
document.getElementById('rules-backdrop').addEventListener('click', closeRulesModal);
document.getElementById('btn-close-rules').addEventListener('click', closeRulesModal);

function openRulesModal() {
  const { intro, rules, overrides } = getEffectiveRules(state.gameKey);
  document.getElementById('rules-modal-title').textContent = 'Game Rules';

  const builtIn = document.getElementById('rules-built-in');
  const hasBuiltIn = rules.length > 0 || !!intro;
  builtIn.classList.toggle('hidden', !hasBuiltIn);
  builtIn.innerHTML = '';

  if (hasBuiltIn) {
    const hasOverrides = overrides.intro != null ||
      (overrides.rules && Object.keys(overrides.rules).length > 0);
    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-reset-rules';
    resetBtn.type = 'button';
    resetBtn.innerHTML = '&#8635; Reset rules to default';
    resetBtn.classList.toggle('hidden', !hasOverrides);
    resetBtn.addEventListener('click', () => {
      saveRuleOverrides(state.gameKey, {});
      openRulesModal();
    });
    builtIn.appendChild(resetBtn);

    if (intro) {
      builtIn.appendChild(buildEditableRuleBlock({
        text: intro,
        isCustomized: overrides.intro != null,
        className: 'rule-intro',
        onCommit: newText => {
          const ov = loadRuleOverrides(state.gameKey);
          ov.intro = newText;
          saveRuleOverrides(state.gameKey, ov);
          openRulesModal();
        },
        onRevert: () => {
          const ov = loadRuleOverrides(state.gameKey);
          delete ov.intro;
          saveRuleOverrides(state.gameKey, ov);
          openRulesModal();
        },
      }));
    }

    rules.forEach((text, i) => {
      builtIn.appendChild(buildEditableRuleBlock({
        text,
        isCustomized: !!(overrides.rules && overrides.rules[i] != null),
        className: 'rule-item',
        onCommit: newText => {
          const ov = loadRuleOverrides(state.gameKey);
          ov.rules = ov.rules || {};
          ov.rules[i] = newText;
          saveRuleOverrides(state.gameKey, ov);
          openRulesModal();
        },
        onRevert: () => {
          const ov = loadRuleOverrides(state.gameKey);
          if (ov.rules) delete ov.rules[i];
          saveRuleOverrides(state.gameKey, ov);
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
function buildEditableRuleBlock({ text, isCustomized, className, onCommit, onRevert }) {
  const wrap = document.createElement('div');
  wrap.className = className + (isCustomized ? ' customized' : '');

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

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-rule-edit';
    editBtn.type = 'button';
    editBtn.title = 'Edit rule';
    editBtn.innerHTML = '&#9998;';
    li.appendChild(editBtn);

    const span = document.createElement('span');
    span.textContent = rule;
    li.appendChild(span);

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

    list.appendChild(li);
  });
  saveGame(); // also part of the active-game snapshot, for mid-game resume
}

function persistCustomRules() {
  if (state.gameKey) saveCustomRules(state.gameKey, state.customRules);
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

// Resume an unfinished game straight into the tracker (all handlers are wired above).
resumeSavedGame();
