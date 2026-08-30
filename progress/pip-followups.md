# Pip Follow-ups (v0.26)

Built 2026-08-30, shipped 2026-08-30 in v0.26. The screens and details the v0.25 redesign did not reach, plus three bugs found while testing it.

## What shipped

**Splash screen.** `#splash` in `index.html`, styles in the splash block of `style.css`, dismissal at the end of `app.js`. The die spins around the centre pip, which steps through all eight player colours on an 8s cycle; light mode uses the `-bd` twins so the hues stay legible on cream. Two things are deliberate and easy to undo by accident:

- It is **not** held for a minimum duration. Dismissal is two `requestAnimationFrame` passes with a `window.load` backstop, then `el.remove()` after the 300ms fade. A minimum display time was explicitly rejected: the splash covers the load, it is not a brand moment to be enforced.
- The viewBox is `5 -12 122 122`, square and larger than the artwork. The plate is tilted and rotating, so the circle it sweeps has a radius of about 59 including the 7px stroke. A viewBox fitted to the resting artwork clips the top of the die at the peak of the spin, which is what the first version did. The die-only variant is `7 -10 118 118`. Do not tighten either.

**404 page.** `404.html` at the repo root, `.err404-*` styles in `style.css`. Numerals read four, the die's centre pip, four - the pip replaces the zero, so only two numerals are drawn. The 4s are pulled `-1.1em` towards the plate on both sides; that number was arrived at by iteration (-0.3em, then -1em, then -1.1em) and is what makes the three read as one group. Three things have to stay in sync for it to actually appear: the file itself, `"not_found_handling": "404-page"` in `wrangler.jsonc`, and `'./404.html'` in the service worker's `ASSETS`.

**Away presence.** A cosmetic third state between connected and disconnected, shown as an amber dot in the player panel.

- Client: `MP_AWAY_DELAY_MS = 10000`, a `visibilitychange` listener that reports `presence` after that delay (and instantly on return), and `pagehide` reporting away immediately.
- Worker: a `present` field on `Player`, a `presence` message in the union and the validator, `handlePresence`/`broadcastPresence`, `webSocketClose` setting `present = false`, and the load path rebuilding presence from live socket attachments.
- **Nothing branches on `present`, and a regression assertion enforces it** (`assert.doesNotMatch(worker, /if \([^)]*\.present[^)]*\)/)`). `connected` gates turn skipping, round advance, the struck-out name, rejoin reservations and the abandoned-room timer. Anything reading presence in those paths turns the deliberate 5-minute grace window into a 10-second one, which is precisely the thing the grace window exists to prevent.
- Reporting is explicit rather than inferred from a heartbeat gap, because background tabs throttle timers: an inferred signal cannot tell a locked phone from a slow network.

**Enter Score sheet.** Rebuilt from the redesign mock. Round heading in the display face, board-matching name chips, player-coloured focus outline, and a New Total column.

- The sheet is **one grid**; each row is `display: contents`. This is what makes every chip as wide as the longest name: column 1 is `max-content` across all rows at once. A grid per row sizes each name column to its own name, which is what left them ragged.
- The header row's blank name cell was still matching the chip rules and painting an empty rounded bar. Chip rules are scoped to `.turn-player-row:not(.turn-header-row) .turn-player-name`.
- The projected total shares `countUpTotal` with the board rather than getting a second animator. It passes `TURN_COUNT_MS` (240ms, against the board's 420) and counts from what is on screen, so consecutive keystrokes chain; it uses a `turn:` key prefix because the board's totals row may be counting under the plain board key at the same moment and the two must not hand each other cells.
- Farkle rounds the projection through `normalizeFarkleScore`, behind the same `!state.generic` guard the save path uses. If one side of that pair changes, change both, or the sheet names a total the board will not show.

**Victory fanfare: Kalimba Sparkle.** Replaces v0.25's Arcade Jackpot, picked from seven candidates in `stage/victory-fanfare-round-2.html` (the eight from round 1 are still in `stage/victory-fanfare.html`). `sfx.js` gained a `pluck` helper. The run is pentatonic on purpose: `play()` applies a random pitch variant of up to two semitones, and a scale containing semitones lets that variant land the phrase on a dissonance. Keep it pentatonic if the notes are ever retuned.

## Bugs fixed

**Group seats were silently dropped from score submissions.** The Worker's `canScoreFor` allowed the seat being your own and the seat having nominated you as scorer, but never checked `groupLeaderId`. Submissions are trimmed rather than rejected (a deliberate choice, so one stale nomination cannot cost the sender their own score), so a guest holding two seats entered both, only the leader's landed, `roundSubmitted` stayed false for the other, and `findNextUnsubmittedPlayerId` handed the turn straight back to the seat whose score had just been discarded. The rename path (line ~1380) and the group-member check (~1558) already honoured `groupLeaderId`; `canScoreFor` was the odd one out. It also gates `edit-score`, so that path was equally affected.

**The current-turn tint.** Three attempts, and the reasoning matters if it is ever revisited:

1. Tint as a fill on the overlay frame: painted on top of the score numbers and the name chips.
2. Tint as a `background` on the cells: correct layer, but `background` is a shorthand carrying every layer, so a `border-radius` clipped the plum ground along with the tint - and without a radius the tint was a hard-cornered block inside a rounded border.
3. What shipped: `isolation: isolate` on the cell and a `z-index: -1` pseudo-element. Inside a stacking context a negative-z child paints after the element's own background and border but before its content, which is exactly where the tint belongs. The pseudo-element carries its own radius, so the rounded tint sits inside square corners that still show the ground.

The pseudo-element's `inset` is negative on one edge (`calc(-1 * var(--accent-border))`), because absolutely positioned children lay out against the **padding box** and `inset: 0` therefore stops short of the 3px rules above the totals row and below the names. Those rules were the visible untinted strips.

**The floating button could be stranded.** `setTrackerChromeCollapsed`'s early-return read only `chrome-top-hidden`. The two chrome classes are always set together, but if they ever drift the guard returns early and the footer stays collapsed permanently while the top bars come back - leaving the floating button over the board, painted in the neutral locked colours, reading as a broken disabled control. The guard now reads both classes.

**The sign toggle left the projection stale.** It writes `input.value` directly, which fires no event, so the new-total listener never ran. It dispatches a bubbling `input` event now. Any other code that sets a score field's value programmatically needs the same.

## Superseded assertion

"The turn highlight fill must be the rounded frame, not a square background on the cells" guarded the v0.25 fix. That block is now impossible for a different reason, so the assertion was **rewritten onto the new source with a comment recording what it used to guard**, not deleted, and paired with checks that the frame stays transparent and the cells carry `isolation: isolate`.
