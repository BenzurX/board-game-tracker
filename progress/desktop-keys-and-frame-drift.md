# Desktop Keys and Frame Drift (v0.27)

Built and shipped 2026-08-30 in v0.27. Ten small items from a round of on-device testing: keyboard support the desktop never had, a one-player floor, and the turn outline drifting off its own column.

## What shipped

**Vocabulary.** Setup's play-mode toggle reads **Single Device** / **Multi-Device Room**, not "Solo / Same Device" / "Multiplayer Room". The distinction the toggle draws has never been how many people are playing - one device happily holds eight - it is how many devices are in the room. The home screen's "Join a Multiplayer Room" button was deliberately left alone for now; if it is changed, change it in the same pass as anything else user-facing that still says multiplayer, or the app ends up speaking two vocabularies at once.

**One-player games.** `minSetupPlayers()` returns 1 flat, and the start-game handler reads it instead of carrying its own copy of the `defaultPlayers === 1 ? 1 : 2` expression. Two copies of one rule in two places is how they end up disagreeing. A two-player floor is a rule about the game being played, not about the tracker.

**Keyboard.** Enter in a score field moves to the next field and, on the last field only, saves the round. The last-field guard is what stops a keyboard entering five scores from submitting four blanks on a reflex Enter. The check is the field's index rather than a desktop/mobile test, because a phone keyboard's Go button sends the same key and should do the same thing. Enter on the join modal's code field clicks Join rather than repeating the lookup, so the disabled state that stops a double submit covers that path too. The setup colour dot is `tabindex="-1"`: tabbing down a column of names should land on the next name. It stays a `<button>`, so pointer and screen-reader access are unchanged.

**Room bar on phones.** `.mp-room-code` is `display: none` below 640px. The bar fits the code and one button, so the scoring button was wrapping to a line of its own. The code gives up its space rather than the button, because the code is still on the invite sheet - where anyone reading it aloud is already headed - and a button that occupies one row at some widths and two at others is worse than one that never moves.

**Marigold floating button.** `--p1` (punch) is the app's danger hue; the floating button stands in for Enter Score, which is the primary action. Now `--p2`, matching the button it replaces.

**Headed toast.** `showToast` takes an optional `title`, rendered as a `.toast-title` in the display face above the sentence, with `.toast.titled` switching the toast from a row to a column. Used by the final-round announcement, the longest and most consequential string the toast ever carries; it also lost its shouted double exclamation mark.

## Bugs fixed

**The turn outline drifted off its column.** Both column frames (`#turn-column-frame`, `#winner-column-frame`) are absolutely positioned overlays, sized from a header cell measured at the moment they are shown. The board's columns are `max-content`. So a score going from 950 to 1,250, or a total counting up digit by digit over 420ms, changes the column's width *after* the measurement was taken, and the outline stays where it was while the column moves out from under it. The tint painted into the cells is what made it unmissable: the tint is correct and the outline is not, so the two visibly disagree.

A `ResizeObserver` on the header cells now repositions whichever frames are showing. Two things about it:

- It is **rebound on every show**, not attached once. The table is rebuilt wholesale on each render, so the cells observed a moment ago are detached nodes with no further resizes to report.
- There is **no feedback loop to guard against**: the callback only writes `left`/`top`/`width`/`height` on absolutely positioned overlays, which cannot resize anything being observed. It fires several times during a count-up, which is the point.

`turnFrameIndex` / `winnerFrameIndex` remember which column each frame belongs to so the callback can reposition without recomputing. Anything that hides a frame must clear its index, or a later width change repositions a frame that should be gone.

**Confetti and the canvas cap.** `fireConfetti` clamps `devicePixelRatio` to 2. iOS limits how large a canvas backing store may be; past that limit the resize fails silently, the canvas keeps its previous dimensions, every draw lands outside them, and the celebration is missing with no error. Two device pixels per CSS pixel is already past what a falling 8px rectangle can resolve. This is the one silent failure in that path, and the plausible fix for confetti not firing on an iPad - but it is not a confirmed diagnosis. The other candidate is OS-level Reduce Motion, which makes `fireConfetti` return on its first line by design. Check that before changing any more of this code.
