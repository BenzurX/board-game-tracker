# Tracker Chrome Auto-Hide

<!-- `Claude:` Written when the behaviour moved from scroll-position to an idle timer in v0.23. -->

## What it is

The three tracker bars - Title Bar (A, `.screen-header`), Room Code Bar (B, `#mp-room-bar`) and Footer Bar (C, `.tracker-actions`) - collapse together after three seconds without a manual scroll, freeing their vertical space for the score board. Any real input on the board brings all three back at once and restarts the countdown. The floating ⊕ button (`#btn-fab-score`) is C's stand-in while C is collapsed, shown purely by CSS off the `chrome-bottom-hidden` class.

## Why it is input-driven, not scroll-driven

The original version (v0.17-v0.22) derived the collapse from scroll position: A and B hid once `scrollTop` left the top, C hid once the board was away from the bottom. That broke down once the app started scrolling the board itself - a round landing or the turn moving calls `scrollTableToLatestRound()` / `scrollTableToCurrentTurn()`, and a `scroll` listener cannot tell those from a person, so someone else's turn would flash all three bars back at a player who never touched the screen.

The reveal therefore hangs off events only a person can produce: `wheel`, `touchstart`, `touchmove`, and the scrolling keys. Programmatic `scrollTo` produces none of them. The `scroll` event is still listened to, but only counts as activity while a gesture is already known to be live (`chromeManualScrolling`), which is what keeps touch momentum from being read as the app scrolling itself.

## The two numbers that matter

- `CHROME_IDLE_MS` (3000) - quiet time before the collapse.
- `CHROME_MOMENTUM_MS` (150) - how long after the last scroll event a gesture is still considered running. Without it, iOS momentum scrolling outlives `touchend` with no further input event, and the bars vanish mid-glide.

## scrollTop correction

The bars are in flow and collapse by animating `max-height` to 0, so collapsing A and B grows the scrollport upwards by their combined height and slides the board up the screen even though `scrollTop` never moved. `setTrackerChromeCollapsed()` cancels that out by shifting `scrollTop` by the same amount. C needs no correction: it collapses off the bottom edge, and the top of the scrollport does not move.

The height is measured while the bars are still at full size and kept as a running maximum (`chromeTopBarsHeight`), because a measurement taken mid-collapse catches them part-way through their 220ms transition. An under-read here is a visible jump, which is the whole thing the correction exists to prevent. `resetChromeMetrics()` drops it whenever the layout changes underneath it - a resize, or a new game where the room bar's presence differs.

## The short-board guard

`trackerChromeMayCollapse()` refuses to collapse unless the board overflows by more than `CHROME_MIN_OVERFLOW` (80px). This is not a polish rule, it is a trap door: with nothing to scroll there is no gesture left that could bring the bars back, so hiding them on a short board would lose the header for the rest of the game. `updateTrackerChrome()` re-checks the guard whenever the board's size changes (the `ResizeObserver` on `#score-table`), reveals if the board has shrunk below the threshold, and arms the countdown if a landing round has just pushed it above.

## What was removed

The old position-derived logic needed guards against an oscillation where the answer moved the question: revealing C shrank `clientHeight`, which made "am I at the bottom" read false, which hid C again. That was solved by measuring `gapToEnd` from `scrollTop` to the end of the content and sizing the band against the viewport-with-C-hidden. None of it survives, because nothing about the collapse is read from a measurement the collapse changes any more. `CHROME_EDGE_SLACK`, `chromeBottomBarHeight`, `gapToEnd` and `hiddenViewport` are all gone. Their regression assertions were replaced, not deleted.

## Untested

Shipped in v0.23 without running on a phone. The things worth trying to break are listed in `PROGRESS.md`'s Next Session item on this.
