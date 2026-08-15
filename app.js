// ── App Version ──────────────────────────────────────────
// Bumped alongside CHANGELOG.md per the pre-push gate - single source of truth
// for the version shown in Settings and on the home screen.
const APP_VERSION = '0.21';
document.getElementById('settings-version').textContent = `v${APP_VERSION}`;
document.getElementById('home-version').textContent = `v${APP_VERSION}`;

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

// ── Volume (persisted for future sound effects) ──────────
const VOLUME_KEY = 'bgt-volume';
const volumeSlider = document.getElementById('volume-slider');
const volumeValue = document.getElementById('volume-value');
const savedVolume = parseInt(localStorage.getItem(VOLUME_KEY));
volumeSlider.value = isNaN(savedVolume) ? 80 : Math.min(100, Math.max(0, savedVolume));
volumeValue.textContent = `${volumeSlider.value}%`;
volumeSlider.addEventListener('input', () => {
  volumeValue.textContent = `${volumeSlider.value}%`;
  localStorage.setItem(VOLUME_KEY, volumeSlider.value);
});

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
  crazyeights: {
    name: 'Crazy Eights',
    icon: '8️⃣',
    defaultWinScore: 100,
    defaultMinScore: 0,
    scoreDirection: 'low', // penalty scoring - lowest total when the target is reached wins
    trackCloser: true, // "went out first" is the hand-scoring rule, not just a side note
    defaultPlayers: 4,
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
    defaultPlayers: 4,
    intro: `Every player starts with 3 chips. On your turn, roll one special die per chip you're holding (max 3): each die shows Left, Right, Center, or a dot. L = pass a chip to the player on your left, R = pass one to your right, C = put one in the center pot, dot = keep that chip. Play passes around the table.

Once you're out of chips you're out of active rolling, but stay in - a chip passed to you brings you back in. The last player still holding any chips wins the whole center pot.

Use "Enter Score" to log each player's chip count after a round of passing, so you can see who's still in.`,
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
    defaultPlayers: 4,
    intro: `Standard hand rankings apply across most poker variants (Texas Hold'em, 7-Card Stud, etc.) - best 5-card hand wins the pot at showdown, or the last player left after everyone else folds. This tracker isn't tied to a specific variant - use "Enter Score" to log each player's net chip change (wins as positive, losses as negative) after each hand or at cash-out, so you can see who's up or down for the session.`,
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
    trackCloser: true, // going out ends the hand and scores 0, same as Crazy Eights
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
  liarsdice: {
    name: "Liar's Dice",
    icon: '🤥',
    defaultWinScore: 0, // no scoring target - it's an elimination game, tracked as dice remaining
    defaultMinScore: 0,
    defaultPlayers: 4,
    intro: `Every player rolls 5 dice in secret, keeping the result hidden from everyone else. Going around the table, each player either raises the previous bid (a higher quantity, or same quantity of a higher face) or calls "liar." A bid is a claim about how many dice of a given face are showing across ALL players' hidden rolls combined - 1s are usually wild and count toward any face called.

If challenged, all dice are revealed: if the bid was true (that many dice of that face really exist), the challenger loses a die; if it was false, the bidder loses a die. Losing all your dice eliminates you. Last player with any dice left wins.

Use "Enter Score" to log each player's dice remaining after a round, so you can track who's still in.`,
    rules: [
      'Everyone rolls 5 dice in secret, hidden from other players',
      'Bids claim how many of a face value exist across all hidden dice combined',
      'Each bid must raise the last one: higher quantity, or same quantity of a higher face',
      '1s are wild and count toward any face called (unless your table plays "no wilds")',
      'Calling "liar" reveals all dice - if the bid was true, the challenger loses a die; if false, the bidder loses a die',
      'Losing all your dice eliminates you; last player with dice left wins',
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
  if (id === 'screen-setup') requestAnimationFrame(() => setupBasicRulesToggle());
  if (id === 'screen-tracker') requestWakeLock(); else releaseWakeLock();
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
    document.getElementById('modal-confirm').classList.remove('hidden');
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

  // Basic Rules panel (games with an intro only - Generic Game has no fixed rules)
  const { intro } = getEffectiveRules(key);
  document.getElementById('basic-rules-section').classList.toggle('hidden', !intro);
  const rulesTextEl = document.getElementById('setup-basic-rules-intro');
  rulesTextEl.textContent = intro;
  rulesTextEl.classList.add('clamped');

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

  renderPlayerInputs(game.defaultPlayers ?? 4);
}

// Clamp the basic-rules intro to 4 lines and show a toggle only if it actually overflows.
// Called after the setup screen is actually visible - measuring while display:none reads 0 for both heights.
function setupBasicRulesToggle() {
  const rulesTextEl = document.getElementById('setup-basic-rules-intro');
  const toggleBtn = document.getElementById('btn-toggle-basic-rules');
  if (document.getElementById('basic-rules-section').classList.contains('hidden')) return;
  rulesTextEl.classList.add('clamped');
  toggleBtn.textContent = 'Show more';
  const overflowing = rulesTextEl.scrollHeight > rulesTextEl.clientHeight + 1;
  toggleBtn.classList.toggle('hidden', !overflowing);
  toggleBtn.textContent = 'Show more';
  toggleBtn.onclick = () => {
    rulesTextEl.classList.toggle('clamped');
    toggleBtn.textContent = rulesTextEl.classList.contains('clamped') ? 'Show more' : 'Show less';
  };
}

function setScoringDirectionUI(dir) {
  document.querySelectorAll('#scoring-section .dir-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.dir === dir);
  });
}

document.querySelectorAll('#scoring-section .dir-btn').forEach(btn => {
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
    const minPlayers = GAMES[state.gameKey]?.defaultPlayers === 1 ? 1 : 2;
    if (rows.length > minPlayers) {
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
    state.trackCloser = !!game.trackCloser;
  }

  state.rounds = [];
  state.closers = [];
  state.onBoard = state.players.map(() => state.minScore === 0);
  state.gameOver = false;
  state.celebrated = false;
  state.finalRoundAnnounced = false;

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

document.getElementById('confirm-backdrop').addEventListener('click', closeConfirmModal);
document.getElementById('btn-confirm-stay').addEventListener('click', closeConfirmModal);
document.getElementById('btn-confirm-leave').addEventListener('click', () => {
  closeConfirmModal();
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
  renderTable();
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
      if (state.multiplayer && p.id !== state.mpPlayerId && p.groupLeaderId !== state.mpPlayerId) return;
      openColorPicker(dot, p.color, newColor => {
        state.players[pi].color = newColor;
        if (state.multiplayer) mpSend({ type: 'update-color', playerId: p.id, color: newColor });
        renderTable();
      });
    });

    const span = document.createElement('span');
    span.className = 'player-name-label';
    span.classList.toggle('mp-disconnected-name', state.multiplayer && p.connected === false);
    span.style.color = p.color;
    const proxyScorer = state.multiplayer && p.scorerId
      ? players.find(other => other.id === p.scorerId)
      : null;
    span.title = state.multiplayer
      ? (proxyScorer ? `${p.name} - scores entered by ${proxyScorer.name}` : p.name)
      : `${p.name} - tap to rename`;
    span.addEventListener('click', () => {
      if (state.multiplayer) {
        const isSelf = p.id === state.mpPlayerId;
        if (state.mpIsHost) { mpOpenPlayerOptions(pi); return; }
        if (isSelf) mpEditOwnName(th, pi);
        return;
      }
      editPlayerName(th, pi);
    });

    const shortName = document.createElement('span');
    shortName.className = 'player-name-short';
    shortName.textContent = p.name.slice(0, 3);
    const fullName = document.createElement('span');
    fullName.className = 'player-name-full';
    fullName.textContent = p.name + (proxyScorer ? ' ✍' : '');
    span.append(shortName, fullName);

    wrap.append(dot, span);
    th.appendChild(wrap);
    th.classList.toggle('current-turn', p.id === mpCurrentTurnPlayerId);
    th.classList.toggle('mp-disconnected-col', state.multiplayer && p.connected === false);
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
      td.classList.toggle('current-turn', state.players[pi]?.id === mpCurrentTurnPlayerId);
      td.addEventListener('click', () => {
        if (state.multiplayer) {
          if (state.mpScoringMode === 'host') {
            // Host authority - can correct any already-recorded round, not just the current
            // one, including a cell currently below the entry threshold (✗).
            if (!state.mpIsHost) return;
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

  // Totals footer
  const totalsRow = document.getElementById('totals-row');
  totalsRow.innerHTML = '<td class="col-round totals-label"><span class="totals-label-short">Tot.</span><span class="totals-label-full">Total</span></td>';
  const totals = getTotals();
  const leaders = getLeaders(totals);
  totals.forEach((total, i) => {
    const td = document.createElement('td');
    td.style.color = state.players[i].color;
    td.textContent = (leaders.includes(i) ? '👑 ' : '') + total.toLocaleString();
    td.classList.toggle('current-turn', state.players[i]?.id === mpCurrentTurnPlayerId);
    totalsRow.appendChild(td);
  });

  if (state.gameOver && totals.length > 0) {
    const best = state.scoreDirection === 'low' ? Math.min(...totals) : Math.max(...totals);
    showWinnerColumnFrame(totals.indexOf(best));
  }

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

// Multiplayer name edit for the local player's own column - sends the change
// to the server for validation/uniqueness instead of writing state directly;
// the roster-update broadcast (or a name-taken error) reconciles the render.
function mpEditOwnName(th, pi) {
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
    const newName = input.value.trim();
    if (newName && newName !== p.name) mpSend({ type: 'rename-self', name: newName });
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

// Earliest round index where some player's running total first reaches winScore,
// or -1 if no round has done so yet. Purely derived from state.rounds/winScore, so
// it comes out identical on every device (host-scoring, each-scoring, or solo)
// without needing any extra synced state.
function findWinTriggerRound() {
  if (!state.winScore || state.winScore <= 0) return -1;
  const running = state.players.map(() => 0);
  for (let r = 0; r < state.rounds.length; r++) {
    state.players.forEach((_, pi) => { running[pi] += (state.rounds[r][pi] || 0); });
    if (running.some(t => t >= state.winScore)) return r;
  }
  return -1;
}

// How many rounds must be on the board before a winner can be declared, given
// the round where the target was first crossed. Some games (Farkle) give
// everyone else one more full round to beat the target once someone crosses it,
// rather than ending the instant it's hit. The round where the target was
// crossed doesn't count as that extra round even for players who go after the
// crosser, since rounds are entered as one shared row (host-scoring or "each"
// mode) rather than tracked turn-by-turn.
function roundsNeededToWin(triggerRound) {
  const extraRound = !!(GAMES[state.gameKey]?.finalRoundOnWin);
  return triggerRound + (extraRound ? 2 : 1);
}

function checkWin() {
  const banner = document.getElementById('winner-banner');
  const triggerRound = findWinTriggerRound();

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

  const roundsNeeded = roundsNeededToWin(triggerRound);

  if (state.rounds.length < roundsNeeded) {
    banner.classList.add('hidden');
    hideWinnerColumnFrame();
    state.gameOver = false;
    state.celebrated = false;
    mpGameOverSent = false;
    if (!state.finalRoundAnnounced) {
      state.finalRoundAnnounced = true;
      showToast(`FINAL ROUND STARTED!! Someone scored over ${state.winScore.toLocaleString()} points! One more round for everyone else to beat it.`);
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
  showWinnerColumnFrame(winIdx);

  if (state.multiplayer && state.mpIsHost && !mpGameOverSent) {
    mpGameOverSent = true;
    mpSend({ type: 'declare-game-over' });
  }

  if (!state.celebrated) {
    state.celebrated = true;
    banner.classList.remove('celebrate');
    void banner.offsetWidth;        // restart the pop animation
    banner.classList.add('celebrate');
    fireConfetti();
  }
  saveGame(); // callers render before checkWin runs, so persist the gameOver flag here
}

function hideWinnerColumnFrame() {
  document.getElementById('winner-column-frame').classList.add('hidden');
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
  if (!state.gameOver) return;
  const totals = getTotals();
  const best = state.scoreDirection === 'low' ? Math.min(...totals) : Math.max(...totals);
  showWinnerColumnFrame(totals.indexOf(best));
});

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

document.getElementById('winner-banner').addEventListener('click', () => {
  if (!state.gameOver) return;
  if (state.multiplayer) mpSend({ type: 'celebrate' });
  else replayCelebration();
});

function replayCelebration() {
  const banner = document.getElementById('winner-banner');
  banner.classList.remove('celebrate');
  void banner.offsetWidth;        // restart the pop animation
  banner.classList.add('celebrate');
  fireConfetti();
}

document.getElementById('btn-new-game').addEventListener('click', () => {
  if (state.rounds.length > 0) {
    confirmLeaveAction = 'newgame';
    document.getElementById('modal-confirm').classList.remove('hidden');
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
  // In 'each' mode this device enters its own score plus a row for every player
  // who nominated it as their scorer - and nothing at all if this player has
  // nominated someone else.
  let mpEachPending = [];
  if (mpEach) {
    const targets = mpEntryTargets();
    if (targets.length === 0) {
      const scorer = mpMyScorer();
      showToast(`${scorer ? scorer.name : 'Another player'} is entering your scores.`);
      return;
    }
    mpEachPending = targets.filter(p => !mpRoundSubmitted[state.players.indexOf(p)]);
    if (mpEachPending.length === 0) {
      showToast('You must wait for all players to enter their score for the round.');
      return;
    }
  }
  const game = GAMES[state.gameKey];
  // The one pending row may be a delegated player rather than this device's
  // own, so the title/hint name whose score is actually being asked for.
  const mpSoleTarget = mpEach && mpEachPending.length === 1 ? mpEachPending[0] : null;
  const mpSoleIsSelf = !!mpSoleTarget && mpSoleTarget.id === state.mpPlayerId;
  document.getElementById('turn-modal-title').textContent = mpEach
    ? (!mpSoleTarget ? 'Enter Scores' : (mpSoleIsSelf ? 'Enter Your Score' : `Enter ${mpSoleTarget.name}'s Score`))
    : 'Enter Scores';
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

  const minAttr = (state.generic || game.allowNegative) ? -99999 : 0;
  const stepAttr = state.generic ? 1 : (game.scoreStep || 1);
  const container = document.getElementById('turn-score-inputs');
  container.innerHTML = '';
  const playersToShow = mpEach ? mpEachPending : state.players;
  mpTurnTargets = playersToShow;
  const totals = getTotals();

  const header = document.createElement('div');
  header.className = 'turn-player-row turn-header-row';
  header.innerHTML = `
    <span class="turn-player-dot" style="visibility:hidden"></span>
    <span class="turn-player-name"></span>
    <span class="turn-header-total">Total</span>
    <span class="turn-header-spacer"></span>
  `;
  container.appendChild(header);

  playersToShow.forEach(p => {
    const pi = state.players.indexOf(p);
    const row = document.createElement('div');
    row.className = 'turn-player-row';
    row.innerHTML = `
      <span class="turn-player-dot" style="background:${p.color}"></span>
      <span class="turn-player-name">${escHtml(p.name)}</span>
      <span class="turn-player-total" title="Current total before this round">${totals[pi].toLocaleString()}</span>
      <input type="number" class="turn-score-input" value="" placeholder="0" min="${minAttr}" max="99999" step="${stepAttr}" inputmode="numeric">
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
  const clampScore = raw => {
    let v = isNaN(raw) ? 0 : raw;
    if (!state.generic) {
      v = game.allowNegative ? v : Math.max(0, v);
      if (state.gameKey === 'farkle') v = normalizeFarkleScore(v);
    }
    return v;
  };
  const readScore = input => input.value.trim() === ''
    ? null
    : clampScore(parseInt(input.value));

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
  // The sticky totals row only covers rows when the wrap isn't scrolled all
  // the way down - scroll to the true bottom so the new row lands above it.
  const scrollWrap = document.querySelector('.table-scroll-wrap');
  scrollWrap.scrollTo({ top: scrollWrap.scrollHeight, behavior: 'smooth' });
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
let mpCurrentTurnPlayerId = null;
let mpPendingJoin = null;        // {roomCode, name?, scoringMode?, gameKey?, rejoinId?} while name modal is open
let mpPlayerOptionsTarget = null; // playerId the player-options popup currently targets
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
  document.getElementById('players-section').classList.toggle('hidden', mpToggleOn);
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

function mpStartHostFlow() {
  const startBtn = document.getElementById('btn-start-game');
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
      };
      openPlayerNameModal();
    })
    .catch(() => {
      startBtn.disabled = false;
      mpShowSetupError('Could not create a room. Check your connection and try again.');
    });
}

function mpWsUrl(roomCode) {
  return MP_WORKER_URL.replace(/^http/, 'ws') + `/room/${roomCode}/ws`;
}

function mpConnect(join) {
  if (mpSocket) { try { mpSocket.close(); } catch (e) { /* already closing */ } mpSocket = null; }
  mpAwaitingJoinConfirm = true;
  const ws = new WebSocket(mpWsUrl(join.roomCode));
  mpSocket = ws;
  ws.addEventListener('open', () => {
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
    if (mpSocket === ws) mpSocket = null;
    if (mpAwaitingJoinConfirm) {
      // The server closes the socket outright for a rejected join it can't recover
      // from (e.g. rejoining a room that expired/was cleaned up) - room-full and
      // name-taken are sent as 'error' messages on a socket that stays open instead.
      mpAwaitingJoinConfirm = false;
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
  switch (msg.type) {
    case 'joined': mpOnJoined(msg); break;
    case 'error': mpOnError(msg); break;
    case 'roster-update':
      mpApplyRoster(msg.players);
      if ('currentTurnPlayerId' in msg) mpApplyCurrentTurn(msg.currentTurnPlayerId);
      break;
    case 'round-update': mpApplyRounds(msg.rounds, msg.roundSubmitted, msg.currentTurnPlayerId); break;
    case 'round-advance': mpApplyRounds(msg.rounds, msg.roundSubmitted, msg.currentTurnPlayerId); break;
    case 'turn-update': mpApplyCurrentTurn(msg.currentTurnPlayerId); break;
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

function mpOnJoined(msg) {
  mpAwaitingJoinConfirm = false;
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

  mpApplyRoster(msg.players);
  // Silent on join/rejoin: the highlighted column already says whose turn it is,
  // and a rejoin is not a turn transition.
  mpApplyRounds(msg.rounds, msg.roundSubmitted || msg.players.map(() => false), msg.currentTurnPlayerId, { announce: false });

  const me = msg.players.find(p => p.id === msg.playerId);
  mpSaveSession(msg.roomCode, msg.playerId, me ? me.name : '');

  closeJoinRoomModal();
  closePlayerNameModal();
  closeScorerModal();
  buildTrackerScreen();
  navigateTo('screen-tracker');
  mpRenderRoomBar();
  mpUpdateEnterScoreButtonState();

  // The nominated scorer can have left (or taken on a scorer themselves) in the
  // gap between the roster fetch and the join - the server silently drops the
  // nomination in that case, so say so rather than leaving it looking applied.
  const requestedScorerId = mpPendingJoin && mpPendingJoin.scorerId;
  if (requestedScorerId && me && me.scorerId !== requestedScorerId) {
    showToast('That player couldn\'t score for you, so you\'re entering your own scores.');
  }
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

function mpApplyRounds(rounds, roundSubmitted, currentTurnPlayerId = mpCurrentTurnPlayerId, { announce = true } = {}) {
  state.rounds = rounds;
  state.onBoard = state.players.map(() => true);
  mpRoundSubmitted = roundSubmitted || [];
  const nextTurn = currentTurnPlayerId || null;
  const turnChanged = nextTurn !== mpCurrentTurnPlayerId;
  mpCurrentTurnPlayerId = nextTurn;
  if (document.getElementById('screen-tracker').classList.contains('active')) {
    renderTable();
    mpUpdateEnterScoreButtonState();
    checkWin();
  }
  // After checkWin, so a turn that arrives with the winning score stays silent.
  if (announce && turnChanged) mpAnnounceTurn(nextTurn);
}

function mpApplyCurrentTurn(playerId, { announce = true } = {}) {
  const nextTurn = playerId || null;
  const turnChanged = nextTurn !== mpCurrentTurnPlayerId;
  mpCurrentTurnPlayerId = nextTurn;
  if (document.getElementById('screen-tracker').classList.contains('active')) renderTable();
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
  const triggerRound = findWinTriggerRound();
  if (triggerRound === -1) return false;
  return state.rounds.length >= roundsNeededToWin(triggerRound);
}

// Announces only the transition into a turn this device is responsible for -
// re-renders, reconnects and other players' turns stay silent. Group members
// and players who nominated this device as their scorer count as "mine".
function mpAnnounceTurn(playerId) {
  if (!state.multiplayer || !playerId || mpGameDecided()) return;
  if (!document.getElementById('screen-tracker').classList.contains('active')) return;
  const player = state.players.find(p => p.id === playerId);
  if (!player || !mpEntersScoresFor(player)) return;
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
    return;
  }
  btn.textContent = 'Enter Score';
  const targets = mpEntryTargets();
  // Locked when someone else enters this player's scores, or when every column
  // this device is responsible for is already in for the round.
  const nothingLeft = targets.length === 0 ||
    targets.every(p => !!mpRoundSubmitted[state.players.indexOf(p)]);
  if (state.gameOver) {
    btn.disabled = true;
    btn.classList.remove('mp-locked');
  } else {
    // Stays clickable (so tapping surfaces the toast below) but reads as disabled.
    btn.disabled = false;
    btn.classList.toggle('mp-locked', nothingLeft);
  }
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
  const socket = mpSocket;
  mpSocket = null;
  if (socket) {
    if (graceful) {
      setTimeout(() => {
        try { socket.close(); } catch (e) { /* already closing */ }
        mpLeavingSelf = false;
      }, 250);
    } else {
      try { socket.close(); } catch (e) { /* already closing */ }
    }
  }
  state.multiplayer = false;
  state.mpRoomCode = null;
  state.mpPlayerId = null;
  state.mpIsHost = false;
  mpCurrentTurnPlayerId = null;
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

function mpDeviceId() {
  let id = localStorage.getItem(MP_DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
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
    scorerBtn.textContent = `✍ ${scorer ? scorer.name : 'You'}`;
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

function mpRenderGroupSizeOptions() {
  const select = document.getElementById('group-size-select');
  const cap = mpGroupSizeCap();
  select.innerHTML = '';
  for (let n = 1; n <= cap; n += 1) {
    const option = document.createElement('option');
    option.value = String(n);
    option.textContent = String(n);
    select.appendChild(option);
  }
  if (mpGroupSize > cap) mpGroupSize = cap;
  select.value = String(mpGroupSize);
  select.disabled = cap === 1;
}

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

document.getElementById('group-size-select').addEventListener('change', e => {
  mpGroupSize = Math.max(1, Math.min(mpGroupSizeCap(), parseInt(e.target.value, 10) || 1));
  mpRenderGroupNameFields();
});
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

// ── Player Options / Remove Player (host only) ───────────
function mpOpenPlayerOptions(pi) {
  const p = state.players[pi];
  if (!p) return;
  mpPlayerOptionsTarget = p.id;
  document.getElementById('player-options-title').textContent = p.name;
  document.getElementById('btn-remove-player').classList.toggle('hidden', p.id === state.mpPlayerId);
  document.getElementById('modal-player-options').classList.remove('hidden');
}
document.getElementById('player-options-backdrop').addEventListener('click', closePlayerOptionsModal);
document.getElementById('btn-cancel-player-options').addEventListener('click', closePlayerOptionsModal);
document.getElementById('btn-declare-turn').addEventListener('click', () => {
  mpSend({ type: 'set-current-turn', playerId: mpPlayerOptionsTarget });
  closePlayerOptionsModal();
});
function closePlayerOptionsModal() {
  document.getElementById('modal-player-options').classList.add('hidden');
}
document.getElementById('btn-remove-player').addEventListener('click', () => {
  closePlayerOptionsModal();
  const p = state.players.find(pl => pl.id === mpPlayerOptionsTarget);
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
