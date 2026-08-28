# Score Entry Fixes

Built and shipped 2026-08-27 in v0.24. Two unrelated reports from Ben, both about entering and scoring a custom game.

## Golf direction was never read

A custom game set to "Lowest wins (golf)" crowned the highest total instead. The winner logic was not at fault: `checkWin()` already picks `Math.min` when `state.scoreDirection === 'low'`, and `findWinTrigger()` only decides *when* the game ends, deliberately separate from who won - crossing the target in golf usually means you lost.

The bug was one line in the start-game handler:

```js
state.scoreDirection = document.querySelector('.dir-btn.active')?.dataset.dir || 'high';
```

`.dir-btn` is a shared button style, not a scoring-specific class. The multiplayer section uses it for its Solo / Multiplayer and Each / Host pairs, and those sit earlier in `index.html` (lines 136-142) than the scoring toggle (lines 158-159). So the unscoped query always matched "Solo / Same Device", which carries `data-mp` and no `data-dir`, giving `undefined` and falling through to `'high'`. The direction was therefore *never* read from the UI - a golf game only ever behaved as golf if nothing depended on the flag.

Fixed by scoping the query to `#scoring-section .dir-btn.active[data-dir]`. The `[data-dir]` part is belt-and-braces: the section selector alone is enough today, but the attribute filter means the same class being reused inside that section later cannot break it again.

Worth knowing if this area is touched again: `state` is saved wholesale to `localStorage`, so `scoreDirection` persists across a resume without extra work, and the four places that compute the best total (`getLeaders`, the render's winner frame, `checkWin`, the resize handler) all branch on the same flag - they were consistent, they were just being fed the wrong value.

## No minus key on mobile keypads

`inputmode="numeric"` gives a digits-only keypad, so a negative score could not be typed on a phone at all. No `inputmode` value fixes this: `tel` offers `+ * #`, `decimal` offers a period, and neither offers a minus. The keyboard is not configurable in the direction needed, so the sign had to become its own control.

Ben chose a ± button beside each field (over a full-keyboard fallback, which would have traded a numeric pad for QWERTY on every score entry), in both entry paths - the Enter Score modal and the tap-a-cell inline editor.

Three things about the implementation are load-bearing:

**Score fields are `type="text"` + `inputmode="numeric"`, not `type="number"`.** A number input cannot hold the intermediate value `"-"`, which is exactly what the field contains between tapping ± on an empty field and typing the first digit. The keypad is unchanged because `inputmode` is what drives it. Consequences that had to be handled by hand: `min`/`max` no longer clamp anything, so both commit paths clamp to ±`SCORE_INPUT_MAX` themselves, and `parseScoreInput` treats both `""` and `"-"` as "nothing entered" (returning `null`) so a half-typed negative read mid-edit does not commit as 0.

**The toggle must not take focus.** The inline cell editor commits on `blur`. A normal button tap moves focus, which would commit and re-render the cell - destroying the button before its `click` ever fired. Hence `preventDefault()` on both `pointerdown` and `mousedown` in `makeSignToggle()`. Removing either one breaks the inline editor specifically; the modal would still appear to work, which makes this an easy thing to "clean up" and not notice.

**The button only exists where negatives are legal** (`negativeScoresAllowed()`: custom games, or a built-in game with `allowNegative`). Games that cannot go below zero keep the row exactly as it was.

One accepted regression: `step` was a number-input attribute, so Farkle's desktop spinner arrows no longer step by 50. Entered values are unaffected - `normalizeFarkleScore()` still rounds to the nearest 50 on commit - and the spinner is not reachable on the mobile keypad this change exists to serve.

## Coverage

Nine assertions in `tests/regressions.mjs`: the scoped direction lookup, winner-by-best-total rather than by whoever crossed the target, and for the sign toggle its markup, the absence of `type="number"`, the focus-preventing listeners, the `"-"`-is-blank rule, and the manual clamping.
