# Handoff: PIP — game night score tracker

## Overview
PIP is a phone-first PWA for keeping score at a game night: pick a game, set the
player count, enter a round, watch the standings move, and get a winner screen at
the end. One phone is passed around the table, so every control is thumb-sized and
every number is comparable at a glance.

This bundle covers the full visual system (palette, type, shape, elevation, ambient
background, identity) and four screens in **two themes** — dark plum and cream paper.

## About the design files
The files in this bundle are **design references created in HTML**. They are
prototypes that show intended look and behaviour — they are **not production code
to copy**. The job is to **recreate these designs in the target codebase's existing
environment** (React, Vue, Svelte, SwiftUI, Compose, native — whatever is already
there), using its established component patterns, routing, and state libraries.
If no environment exists yet, choose the most appropriate framework for a
phone-first PWA and implement the designs there.

`theme.css` is the exception: it is real, shippable CSS custom properties, and the
values in it are authoritative. Port it to whatever token format the codebase uses
(CSS vars, Tailwind theme, design-token JSON, SwiftUI Color set) without changing
any value.

## Fidelity
**High-fidelity.** Colours, type, spacing, radii, shadows, contrast ratios, and
interaction states are final and were checked. Recreate the UI pixel-for-pixel
using the codebase's own primitives. Where a value is not stated below, read it off
`Game Night Redesign.dc.html` — that file is the source of truth.

Two things are deliberately *not* final: the copy on the game tiles (placeholder
game names, easy to swap) and the emoji used as game glyphs — see **Assets**.

---

## Design tokens
All tokens live in `theme.css` with inline comments. Summary:

### Grounds
| Token | Dark | Light | Use |
|---|---|---|---|
| `--ground` | `#21131F` | `#F7EFE1` | app background |
| `--surface` | `#2C1A29` | `#FFFAF1` | cards, sheets |
| `--surface-2` | `#3A2436` | `#F0E3D2` | neutral buttons, table footer |
| `--border` | `#4B3145` | `#E2D0BC` | neutral borders (2–3px) |
| `--text` | `#F7EFE1` | `#21131F` | body ink — 15.5:1 both modes |
| `--muted` | `#C0A7B4` | `#6E5460` | secondary — 7.9:1 / 5.9:1 |
| `--row-a` / `--row-b` | `#291728` / `#221320` | `#FFFAF1` / `#F0E4D4` | score-table stripes |

### Player accents — 8, one set for BOTH modes
Bright fill + ink text `#21131F`, plus the deep hue of the same family as a **3px
border**. This never changes between themes: one button set, one contrast promise.

| # | Name | Fill | 3px border | Fill vs ink |
|---|---|---|---|---|
| p1 | punch | `#F2604C` | `#B23A28` | 5.5:1 |
| p2 | marigold | `#F5B02E` | `#8A5709` | 9.4:1 |
| p3 | pistachio | `#A8C64F` | `#4F6B14` | 9.2:1 |
| p4 | jade | `#3FBE9A` | `#0F6F58` | 7.6:1 |
| p5 | lagoon | `#4FC3E8` | `#14607F` | 8.8:1 |
| p6 | cornflower | `#7C93EE` | `#3A4EAF` | 6.1:1 |
| p7 | orchid | `#C48BF0` | `#6B33A8` | 7.1:1 |
| p8 | bubblegum | `#F576A8` | `#A82F6A` | 6.8:1 |

Rules that must survive implementation:
- **Never** put cream/white text on an accent fill. Ink `#21131F` always.
- Accent-filled controls always carry the 3px border in their own deep hue.
  Neutral controls carry no accent border.
- The hues are spaced ~40–50° apart but their **lightness deliberately varies**
  (marigold L≈0.80, cornflower L≈0.62). That lightness spread — not hue — is what
  keeps four filled chips distinguishable in one table header for red–green colour
  blindness. Do not "harmonise" the palette by levelling lightness.
- Player seats are assigned in palette order p4 (jade) → p8 → p6 → p3 → p2 → p1 for
  six players; the order alternates warm/cool so no two adjacent seats are close.
- On paper, the deep hues are also legal as accent **text** (`--pN-ink`) for totals
  and wordmark letters. Never as a fill.

### Type — two families, one Google Fonts request
`<link href="https://fonts.googleapis.com/css2?family=Lilita+One&family=Nunito:wght@400;600;700;800;900&display=swap">`

| Role | Family | Size / line-height | Tracking | Case |
|---|---|---|---|---|
| Wordmark | Lilita One | 44 / .9 | .01em | UPPER |
| Screen title | Lilita One | 22 | .06em | UPPER |
| Card title | Nunito 900 | 19 / 22 | 0 | Sentence |
| Button label | Lilita One | 17 | .08em | UPPER |
| Body | Nunito 600 | 15 / 22 | 0 | Sentence |
| Micro label | Nunito 900 | 11 | .15em | UPPER |
| Table numerals | Nunito 800 | 17 | 0 | — |

All numerals in tables, totals, inputs and standings use
`font-variant-numeric: tabular-nums` + `font-feature-settings:'tnum' 1`. Nunito was
chosen over a rounded display face specifically because it has real tabular figures.

### Shape, elevation, motion
- **Radii:** 999px actions · 20px cards & tiles · 24px sheets · 12px chips & inputs ·
  10px swatches · 26px device frame. Never below 10px, never square.
- **Shadow:** hard offset, **zero blur**, anywhere in core UI.
  `0 5px 0 rgba(0,0,0,.55)` dark / `0 5px 0 rgba(33,19,31,.22)` cream.
  Tiles 6px, sheets `0 -8px 0`, screen frame `0 10px 0`.
- **Hover:** `filter:brightness(1.06) saturate(1.03)`, 120ms. Nothing moves. Wrap in
  `@media (hover:hover)` so touch devices never see it — phones only get the press.
- **Press:** `translateY(5px)` (tiles 6px) and shadow to `0`, 90ms ease-out — the
  element lands in its own shadow. Applies to every interactive element, ~31 of them.
- **Tap targets:** ≥44px; action-bar buttons 52px.
- **Rotation allowed:** game tiles (±1.5°), FAB, invite/sticker chips, wordmark
  glyphs, winner card, empty-state art, the setup die (−11°).
- **Rotation forbidden:** anything in a run of numbers a person compares — score
  table, its header chips, totals, standings rows, keypads, inputs. Baselines level.

### Ambient background
Three radial-gradient ellipses + a 3px dot grain, on one
`position:fixed; inset:0; z-index:0; pointer-events:none` host behind an app shell at
z-index 1. Blur 44–52px; opacities `.14/.11/.09` dark, `.07/.06/.05` cream; grain
`.045` / `.03`. Total ambient contrast against the ground stays under 1.15:1 — it
should be barely perceptible.

Motion is `translate3d` + `scale` only on 46s / 62s / 120s loops: compositor-only, no
layout, no paint, no per-frame JS. Blur is rasterised once and the transform moves the
already-blurred layer. Under `prefers-reduced-motion` the blobs freeze in place as a
static tint — nothing appears or disappears. Do not reimplement this with canvas or JS.

---

## Identity

**The mark is the user's own drawing** (`logo-reference.png` in this bundle) and it is
final for this handoff:

- Wordmark **"PiP"** — capital P, lowercase i, capital P — set in a heavy geometric
  sans (`Nunito 900`, tracking `-.02em`) in cream `#F7EFE1` / `#F5EEE3`.
  Note: this is the one place Nunito, not Lilita One, is the display face.
- The dot on the **i** is a jade `#3FBE9A` circle, and it is simultaneously the
  **centre pip of a five-face die**. A ghost die plate sits behind the word, centred
  exactly on that dot, with four dim corner pips on the diagonals.
- Geometry, expressed against the word's font-size `1em`:
  - i stem: `width .205em`, `height .44em`, radius `.03em`, side margins `.13em`
  - jade pip: `diameter .32em`, centre `.61em` above the baseline (`top:-.19em` from
    the stem's top edge), sitting flush on the stem with no gap
  - die plate: `1.45em` square, radius `.38em`, rotated `-8deg`, centred on the pip;
    fill `#2A1826`, border `.04em solid #3D2739` on the plum ground
  - ghost pips: `12%` of the plate, centres at 24% / 76% on both axes, `#3D2739`
  - paint order: plate → jade pip → i stem → the two P's on top
- **Icon lockup (16–64px):** drop the ghost pips and shrink the plate to a solid
  cream tile `.62em` square (radius `.19em`) holding the jade pip. Drop the `-8deg`
  rotation at 16px. That one-pip die is still a die and is the only version legible
  as a favicon.
- **On cream paper:** the plate becomes a keyline — `.032em solid rgba(33,19,31,.28)`
  with corner pips at `rgba(33,19,31,.2)` — and the pip flips to deep jade
  `#0F6F58` to hold contrast. Same drawing, no separate light-mode artwork.
- **In-app only:** the pip is a slot and may take the current player's accent
  (jade / lagoon / orchid / marigold …). Jade is the locked trademark colour.
- **PWA:** `theme_color` and `background_color` both `#21131F`, in *both* modes, so the
  status bar never flashes white on launch. Splash = the mark centred on plum.

Four earlier lockup explorations are also in the design file (ids `4b`–`4e`); they are
reference only.

---

## Screens

All four screens are drawn at **380 × 800** — a phone viewport. Layout is a single
column: fixed header, scrolling middle, fixed action bar. Each screen sits on
`--ground` with the ambient host behind it.

### 1. Home · game grid
**Purpose:** pick a game, or join someone else's room.

- Header block, centre-aligned, padding `22px 20px 14px`, gap 5px:
  app icon 52×52, radius 16, `--surface`, `--shadow`, rotated `-3deg`, containing the
  32px die mark → micro label `WHOSE TURN IS IT ANYWAY` (Nunito 900, 10px, .24em,
  `--muted`) → wordmark `TRACKER` (Lilita 42, per-glyph rotation ±4°, cream with the
  A in jade and the E in marigold — two accent letters, never more).
  *When the new mark ships, this block becomes the PiP lockup above.*
- `👥 JOIN A ROOM` — full-width neutral button, min-height 52, radius 999,
  `--surface-2`, Lilita 16 / .08em, `--shadow`.
- Section headers: micro label + a `3px` rounded rule in `--surface-2` filling the
  remaining width. Sections: `DICE GAMES`, `CARD GAMES`.
- **Game tiles:** 2-column grid, gap 12, min-height 118, radius 20, padding
  `16px 14px 14px`. Real `<button>` elements. Accent fill + ink text + 3px deep
  border + `--shadow-tile`; each tile rotated between `-1.5deg` and `1.5deg`.
  Content bottom-aligned: 24px emoji glyph → name (Nunito 900, 17/1.1) → subtitle
  (Nunito 700, 12, opacity .9).
  Current content: Farkle · First to 10,000 (jade, −1.5°) · Yahtzee · 13 rounds
  (bubblegum, 1.2°) · Left Right Center · Last chip wins (marigold, 1.5°) · Liar's
  Dice · Last standing (pistachio, −1.2°) · Cribbage · First to 121 (cornflower,
  1.4°) · Euchre · First to 10 (punch, −1.4°).

### 2. Setup — player count
**Purpose:** choose how many are playing before the game starts.

- Header row: back circle 44×44 (marigold fill, 3px `#8A5709`, ink `‹`), centred
  screen title `SET UP FARKLE` (Lilita 22 / .06em), then neutral 44px circles for
  `?` and `⚙` (`--surface-2`, 3px `--border`) — the header circles are styled as
  secondary buttons, matching the rest of the UI.
- **The die *is* the control.** A 132×132 cream tile, radius 30, rotated `-11deg`,
  `--shadow-tile`, padding 18, 3×3 grid. It draws the **standard die face for the
  current count 2–6**, each pip in that seat's accent with an
  `inset 0 0 0 3px rgba(33,19,31,.25)` ring. Flanked by 52px `−` / `+` circles.
  Below: `{n} PLAYERS` (Lilita 24 / .04em) and a row of 2–6 number chips; the
  selected chip is marigold with the deep border, the rest neutral.
- Primary CTA: full-width jade button, 3px `#0F6F58`, min-height 52.
- Live behaviour: changing the count re-draws the die face, the pip colours, and the
  seat list in one state change. Clamp 2–6.

### 3. Score tracker · mid-game
**Purpose:** see the whole game at a glance; open score entry.

- Header as above, with a `3px solid --surface-2` bottom rule.
- Room strip: `ROOM 4KJ2` chip (`--surface`, 2px `--border`), `🔗 INVITE` chip (jade,
  3px, rotated `-1.5deg`), `SCORER` chip (punch, 3px, rotated `1.5deg`).
- Leader banner: `--surface`, 2px `--border`, radius 14, padding `11px 14px` —
  `👑` + `BEN LEADS BY 400` (Nunito 900, 14) + `ROUND 6` micro label right-aligned.
- **Score table** — the one place with no rotation anywhere. Radius 16, clipped, 2px
  `--surface-2` border. Grid `40px repeat(4, 1fr)`, gap 6.
  Header cells: rank micro label above a 12px-radius player chip (accent fill, ink,
  3px deep border, Nunito 900 13) with the crown emoji hung at `top:-9px; right:-4px`
  on the leader. Body rows: round number in `--muted`, then four tabular values
  (Nunito 800, 17), striped `--row-a`/`--row-b`. Footer row: `--surface-2`, 3px
  `--border` top, `TOT` label, then totals in Nunito 900 19 **coloured with each
  player's accent**, the leader's underlined (`3px`, offset `4px`).
- FAB: 60×60 punch circle, 3px `#B23A28`, `+` at 30px, rotated `-3deg`, bottom-right.
- Action bar: `3px` top rule, `rgba(33,19,31,.6)` scrim, `ENTER SCORE` (marigold,
  flex 2) + `NEW GAME` (neutral, flex 1), both 52px.

### 4. Score entry sheet
**Purpose:** type this round's scores for every player at once.

- The tracker behind it dims: header at `opacity .4`, body rows ghosted to
  `opacity .28`, then a `rgba(22,12,20,.55)` scrim over everything.
- Bottom sheet: `--surface`, 3px `--border` top, radius `24px 24px 0 0`, padding
  `14px 18px 20px`, `--shadow-sheet`. Grab handle 56×5, radius 3, `--border`.
- Title row: `ROUND 7` (Lilita 26) + hint `tap a player, type the score`
  (Nunito 700, 13, `--muted`).
- Entry rows: grid `96px 1fr 100px`, gap 10. Player chip (accent fill, ink, 3px deep
  border, radius 12) · input min-height 48, radius 12, `--ground` fill, 2px border —
  **the focused row's border is that player's accent**, others `--border` — value
  right-aligned Nunito 900 22 tabular · running total `→ 3,650` in `--muted` 12.
  An unentered value shows an em dash in `--muted`.
- Quick keys: 4-column grid, `+50 / +100 / +500 / ⌫`, min-height 44, radius 12,
  `--surface-2`, `0 4px 0` shadow.
- Footer: `CANCEL` (neutral, flex 1) + `SAVE ROUND` (jade, 3px `#0F6F58`, flex 2).

### 5. Winner celebration
**Purpose:** end the game on a high note; show final standings.

- Micro label `FARKLE · 6 ROUNDS · 21 MINUTES` (.24em, centred).
- Winner card: jade fill, ink text, 3px `#0F6F58`, radius 24, padding
  `24px 18px 20px`, `0 8px 0` shadow, rotated `-2deg`:
  `👑` 42px → `1ST PLACE · WINNER` (Nunito 900, 11, .2em) → `BEN` (Lilita 52) →
  `10,150 pts` (Nunito 900, 22, tabular).
- `FINAL STANDINGS` micro label, then one row per player, gap 8: alternating row
  background, place label, accent chip with the name, points right-aligned tabular.
- Ambient blobs run hotter here — opacities `.2` and `.16` — the only screen where
  the background is allowed to be noticeable.

Both themes exist for all four screens; the light set is identical in layout and
differs only by token values.

---

## Interactions & behaviour
- **Navigation:** Home → tile tap → Setup → primary CTA → Tracker. Tracker's
  `ENTER SCORE` / FAB → Score entry sheet (modal, slides up from the bottom;
  `CANCEL` or scrim tap dismisses). Last round or a target reached → Winner.
  Back circle returns one step.
- **Press:** every interactive element, no exceptions —
  `transform: translateY(5px)` (tiles 6px) and shadow to `0`, 90ms ease-out.
- **Hover:** `filter: brightness(1.06) saturate(1.03)`, 120ms, inside
  `@media (hover:hover)`. No transform on hover, ever.
- **Player count:** `−`/`+` and the number chips all set the same value, clamped
  2–6; the die face, pip colours, and seat list derive from it.
- **Score entry:** one focused player at a time; the focused input takes that
  player's accent as its border. Quick keys add to the focused value; `⌫` deletes a
  digit. `SAVE ROUND` writes one round for all players and closes the sheet;
  empty values save as 0. Validation: integers only, allow negatives if a game needs
  them, no upper bound.
- **Sheet motion:** slide up 240ms `cubic-bezier(.2,.7,.3,1)`, scrim fades 160ms.
  Under reduced motion, no slide — appear in place.
- **Loading / error:** not designed. Use the codebase's existing patterns; keep them
  on `--surface` with `--muted` text and no blur.
- **Responsive:** phone-first, single column, designed at 380px. Above ~520px, centre
  the 380px column and let the ambient host fill the viewport. No tablet layout yet.

## State
- `theme: 'dark' | 'light'` — sets `data-mode`; defaults to system, user-overridable,
  persisted.
- `playerCount: 2..6` and `players: [{ id, name, accentIndex }]` — accents assigned in
  the p4 → p8 → p6 → p3 → p2 → p1 order.
- `game: { key, name, target }`, `room: { code, isScorer }`.
- `rounds: number[][]` — one array per round, one value per player. Totals and
  standings are derived, never stored.
- `entry: { open, roundIndex, focusedPlayer, draftValues }`.
- No data fetching is designed. If rooms become real, the room code and player list
  are the sync boundary; scores can stay local-first.

## Assets
- `logo-reference.png` — the user's own PIP mark, the canonical artwork. Reproduce it
  as vector/SVG from the geometry above; do not trace the PNG.
- The die mark and all pips are pure geometry (rounded squares + circles). No image
  assets required.
- Game glyphs are currently **emoji** (🎲 🪙 🤥 📌 ♠️ 👑 👥 🔗 ⚙). Emoji render
  differently per platform — replace with a real icon set from the codebase before
  shipping, keeping the same 24px optical size and bottom-aligned position.
- Fonts: Lilita One and Nunito, both Google Fonts, one request. Self-host if the
  codebase already self-hosts fonts.

## Files
| File | What it is |
|---|---|
| `theme.css` | Authoritative tokens + reference component recipes. Port the values as-is. |
| `Game Night Redesign.dc.html` | The full design canvas: logo explorations, the 8-accent palette with contrast figures, type/shape/ambient/identity spec cards, the live player-count die, and all four screens in both themes. **Source of truth for anything not written down here.** |
| `support.js` | Runtime needed to open the HTML canvas in a browser. Not part of the design. |
| `logo-reference.png` | The user's PIP mark. |

Open `Game Night Redesign.dc.html` in a browser (both files must sit side by side) and
read it alongside this document. The player-count die and every button are live —
click them.
