// ── Theme Management ─────────────────────────────────────
const THEMES = ['ember', 'ocean', 'forest'];
const MODES  = ['dark', 'light'];

function applyTheme(theme, mode) {
  if (!THEMES.includes(theme)) theme = 'ocean';
  if (!MODES.includes(mode))   mode  = 'dark';
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.mode  = mode;
  localStorage.setItem('theme', theme);
  localStorage.setItem('mode',  mode);
  updateSettingsUI(theme, mode);
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
  localStorage.getItem('mode')  || 'dark'
);

document.getElementById('btn-settings').addEventListener('click', () => {
  updateSettingsUI(document.documentElement.dataset.theme, document.documentElement.dataset.mode);
  document.getElementById('modal-settings').classList.remove('hidden');
});
document.getElementById('settings-backdrop').addEventListener('click', closeSettingsModal);
document.getElementById('btn-close-settings').addEventListener('click', closeSettingsModal);

function closeSettingsModal() {
  document.getElementById('modal-settings').classList.add('hidden');
}

document.querySelectorAll('.theme-swatch').forEach(btn => {
  btn.addEventListener('click', () => {
    applyTheme(btn.dataset.theme, document.documentElement.dataset.mode);
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
    rules: [
      'Roll all 6 dice. Set aside any scoring dice, then choose to bank your points or keep rolling the remaining dice.',
      'You must set aside at least one scoring die each roll.',
      'If none of your dice score, that\'s a Farkle — you lose all unbanked points for that turn.',
      '1s = 100 pts &nbsp;|&nbsp; 5s = 50 pts',
      'Three of a kind = face value × 100 &nbsp;(three 1s = 1,000 pts)',
      'Four of a kind = three-of-a-kind × 2',
      'Five of a kind = four-of-a-kind × 2',
      'Six of a kind = five-of-a-kind × 2',
      'Three pairs = 1,500 pts',
      'Straight (1–2–3–4–5–6) = 3,000 pts',
      'You must score at least 500 in a single turn to get on the board.',
      'Once a player reaches the winning score, all other players get one final turn.',
    ],
  },
  generic: {
    name: 'Custom Game',
    icon: '📝',
    generic: true,        // freeform score sheet, no built-in scoring rules
    defaultWinScore: 0,   // 0 = no target, just track
    defaultMinScore: 0,
    rules: [],
  },
};

const PLAYER_COLORS = ['#e8533a', '#3a9ee8', '#5cb85c', '#f0a820', '#a855f7', '#14b8a6'];

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

  document.getElementById('setup-title').textContent = generic ? 'Custom Game' : game.name;

  // Game name (custom games only)
  document.getElementById('game-name-section').classList.toggle('hidden', !generic);
  if (generic) document.getElementById('game-name-input').value = '';

  // Scoring direction toggle (custom games only)
  document.getElementById('scoring-section').classList.toggle('hidden', !generic);
  setScoringDirectionUI('high');

  // Round-closer tracking toggle (custom games only), off by default
  document.getElementById('closer-section').classList.toggle('hidden', !generic);
  document.getElementById('track-closer-toggle').checked = false;

  // Win condition — relabel for custom games (target ends game; 0 = no limit)
  document.getElementById('win-score').value = game.defaultWinScore;
  document.getElementById('win-lead-label').textContent = generic ? 'Game ends at' : 'First to';
  document.getElementById('win-hint').classList.toggle('hidden', !generic);

  // Entry threshold (Farkle-style games only)
  document.getElementById('min-score-section').classList.toggle('hidden', generic);
  document.getElementById('min-score').value = game.defaultMinScore ?? 0;

  renderPlayerInputs(2);
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
}

function addPlayerRow(container, index) {
  const color = PLAYER_COLORS[index % PLAYER_COLORS.length];
  const row = document.createElement('div');
  row.className = 'player-input-row';
  row.innerHTML = `
    <span class="player-color-dot" style="background:${color}"></span>
    <input type="text" class="player-name-input" placeholder="Player ${index + 1}" maxlength="20">
    <button class="btn-remove-player" aria-label="Remove player">&#10005;</button>
  `;
  row.querySelector('.btn-remove-player').addEventListener('click', () => {
    const rows = document.querySelectorAll('.player-input-row');
    if (rows.length > 2) {
      row.remove();
      refreshPlayerDots();
    }
  });
  container.appendChild(row);
}

function refreshPlayerDots() {
  document.querySelectorAll('.player-input-row').forEach((row, i) => {
    row.querySelector('.player-color-dot').style.background = PLAYER_COLORS[i % PLAYER_COLORS.length];
  });
}

document.getElementById('btn-add-player').addEventListener('click', () => {
  const rows = document.querySelectorAll('.player-input-row');
  if (rows.length >= 6) return;
  addPlayerRow(document.getElementById('player-inputs'), rows.length);
});

document.getElementById('btn-start-game').addEventListener('click', () => {
  const nameInputs = document.querySelectorAll('.player-name-input');
  const names = Array.from(nameInputs).map((el, i) => el.value.trim() || `Player ${i + 1}`);
  if (names.length < 2) return;

  state.players = names.map((name, i) => ({ name, color: PLAYER_COLORS[i % PLAYER_COLORS.length] }));

  if (state.generic) {
    state.gameName = document.getElementById('game-name-input').value.trim() || 'Custom Game';
    state.scoreDirection = document.querySelector('.dir-btn.active')?.dataset.dir || 'high';
    const rawWin = parseInt(document.getElementById('win-score').value);
    state.winScore = isNaN(rawWin) ? 0 : Math.max(0, rawWin); // 0 = no target
    state.minScore = 0;
    state.trackCloser = document.getElementById('track-closer-toggle').checked;
  } else {
    state.gameName = GAMES[state.gameKey].name;
    state.scoreDirection = 'high';
    state.winScore = parseInt(document.getElementById('win-score').value) || 10000;
    state.minScore = parseInt(document.getElementById('min-score').value) || 0;
    state.trackCloser = false;
  }

  state.rounds = [];
  state.closers = [];
  state.onBoard = state.players.map(() => state.minScore === 0);
  state.customRules = [];
  state.gameOver = false;
  state.celebrated = false;

  buildTrackerScreen();
  showScreen('screen-tracker');
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
    const span = document.createElement('span');
    span.className = 'player-name-label';
    span.style.color = p.color;
    span.textContent = p.name;
    span.title = 'Tap to rename';
    span.addEventListener('click', () => editPlayerName(th, pi));
    th.appendChild(span);
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
        td.title = 'Below entry threshold — tap to edit';
      } else if (score === 0 && !state.generic) {
        td.className = 'score-cell farkle';
        td.textContent = '—';
        td.title = 'Farkle — tap to edit';
      } else {
        td.className = 'score-cell';
        td.textContent = score.toLocaleString();
        td.title = 'Tap to edit';
        if (state.trackCloser && state.closers[ri] === pi) {
          const flag = document.createElement('span');
          flag.className = 'closer-flag';
          flag.textContent = '⚑';
          flag.style.color = state.players[pi].color;
          flag.title = `${state.players[pi].name} went out first`;
          td.appendChild(flag);
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
  const input = document.createElement('input');
  input.type = 'number';
  input.value = current === null ? 0 : current;
  input.min = state.generic ? -99999 : 0;
  input.max = 99999;
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
    if (!state.generic) newScore = Math.max(0, newScore);
    state.rounds[ri][pi] = newScore;
    if (newScore > 0) state.onBoard[pi] = true;
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

  // No target, or target not reached: no winner — reset so a later win re-celebrates
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
  document.getElementById('turn-hint').textContent = state.generic
    ? 'Enter each player\'s score for this round'
    : 'Enter 0 for a Farkle (no score this turn)';

  const minAttr = state.generic ? -99999 : 0;
  const container = document.getElementById('turn-score-inputs');
  container.innerHTML = '';
  state.players.forEach(p => {
    const row = document.createElement('div');
    row.className = 'turn-player-row';
    row.innerHTML = `
      <span class="turn-player-dot" style="background:${p.color}"></span>
      <span class="turn-player-name">${escHtml(p.name)}</span>
      <input type="number" class="turn-score-input" value="0" min="${minAttr}" max="99999" inputmode="numeric">
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

document.getElementById('btn-save-turn').addEventListener('click', () => {
  const inputs = document.querySelectorAll('.turn-score-input');
  const scores = Array.from(inputs).map((inp, pi) => {
    const parsed = parseInt(inp.value);
    let raw = isNaN(parsed) ? 0 : parsed;
    if (!state.generic) raw = Math.max(0, raw);
    if (state.onBoard[pi]) return raw;
    if (raw >= state.minScore) { state.onBoard[pi] = true; return raw; }
    return null; // below entry threshold — doesn't count yet
  });
  state.rounds.push(scores);
  state.closers.push(state.trackCloser ? turnCloser : null);
  closeTurnModal();
  renderTable();
  checkWin();
});

// ── Rules Modal ──────────────────────────────────────────
const modalRules = document.getElementById('modal-rules');

document.getElementById('btn-rules').addEventListener('click', openRulesModal);
document.getElementById('btn-rules-setup').addEventListener('click', openRulesModal);
document.getElementById('rules-backdrop').addEventListener('click', closeRulesModal);
document.getElementById('btn-close-rules').addEventListener('click', closeRulesModal);

function openRulesModal() {
  const game = GAMES[state.gameKey];
  const rules = game.rules || [];
  const title = state.gameName || game.name;
  document.getElementById('rules-modal-title').textContent =
    `${title} — ${rules.length ? 'Rules' : 'Notes'}`;

  const builtIn = document.getElementById('rules-built-in');
  builtIn.classList.toggle('hidden', rules.length === 0);
  builtIn.innerHTML = rules
    .map(r => `<div class="rule-item"><span class="rule-bullet">&#8250;</span><span>${r}</span></div>`)
    .join('');

  renderCustomRules();
  modalRules.classList.remove('hidden');
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
    li.innerHTML = `
      <span>${escHtml(rule)}</span>
      <button class="btn-delete-rule" data-index="${i}" aria-label="Delete rule">&#10005;</button>
    `;
    li.querySelector('.btn-delete-rule').addEventListener('click', () => {
      state.customRules.splice(i, 1);
      renderCustomRules();
    });
    list.appendChild(li);
  });
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
  renderCustomRules();
}

// ── Utility ──────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
