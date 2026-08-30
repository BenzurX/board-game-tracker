# Pip Redesign

Built 2026-08-27 to 2026-08-29, shipped 2026-08-29 in v0.25, a milestone release. A major visual UI/UX rework: the app rebuilt from a Claude Design handoff (`design_handoff_pip/`), plus a new sound layer.

## What shipped

Eight commits, in the order they were made:

1. `ad2c49e` - design tokens, fonts, ambient background, the shared button model
2. `b09498b` - home grid as accent sticker tiles, setup screen onto the system
3. `355e2af` - the die as the player-count control, setup names carried into rooms
4. `343270f` - score table, totals, action bar, floating button
5. `fa649ab` - button sounds, the join-room die, room-limit toasts, rounded turn frame
6. `8cf31ed` - victory fanfare, turn frame fill, scorer chip rename, back button
7. `4342831` - review fixes: Worker palette, ink-on-accent contrast, tap targets
8. `b3054de` - danger button folded into the shared model, reload matched to Enter Score

## The token strategy, and why the old names are still there

Each mode block declares the Pip names (`--ground`, `--surface`, `--surface-2`, `--border`, `--text`, `--muted`, `--row-a`, `--row-b`, the shadows) and then maps the old semantic names onto them: `--bg`, `--card`, `--card-hover`, `--accent`, `--accent-bright`, `--accent-dim`, `--on-accent`, `--text-muted`, `--radius`, `--radius-sm`.

That aliasing is deliberate and worth keeping. About 2000 lines of stylesheet were written against the old names, and mapping them let the rebuild land screen by screen instead of as one unreviewable rewrite. Do not delete the aliases to "clean up" unless every consumer is migrated in the same commit - a missed one falls back to an unset custom property, which paints as transparent or as the initial value rather than failing loudly.

## Rules the system rests on

- **Ink on accent, always.** Every `--pN` has a `--pN-fg`, and every one of them is the same dark ink. White or cream on these fills is a contrast failure, not a style choice - white on punch is 3.2:1. Three places had it and were fixed; if a fourth appears, it is a bug.
- **The deep hue is a border, not a second fill.** `--pN-bd` exists to be a 3px border on a filled control. It is not a darker background variant.
- **The lightness spread is load-bearing.** The eight accents range from marigold at L~0.80 to cornflower at L~0.62. That spread, not hue, is what separates four filled chips in one table header for a red-green colour blind player. Do not level it.
- **Rotation is banned where numbers are compared.** Tiles, chips, the die, the floating button and the room bar may tilt. The score table, the totals row and any standings list may not - a run of comparable numbers has to sit level to be scanned.
- **One physical button model.** Hard offset shadow with zero blur; a press moves the element down by exactly the shadow offset while the shadow collapses to nothing. Hover is a `filter` only, never a transform, and lives inside `@media (hover: hover)` so a phone gets the press and nothing else.

That last rule has now been broken twice by the same mechanism: a variant block defined *later* in the file than the shared model, silently winning every declaration it repeats. `.btn-danger` was the second case, and its `font-weight: 700` on Lilita One (a single-weight face) is what made the label look smeared. `tests/regressions.mjs` now asserts `.btn-danger` has exactly one standalone block and that it restates none of the shared model's properties. If a third variant is added, give it the same guard.

## The die

`DIE_FACES` maps 1-8 to which of the nine grid cells light up. Seven and eight are not faces a real die has; the die is the player counter, not a die simulation, and that was an explicit call.

`renderPlayerInputs(count)` snapshots `{name, color}` off the existing rows before rebuilding them, so dropping the count from 5 to 3 and going back to 5 does not lose the names that were typed. The setup opener clears `#player-inputs` outright before the first render, so names never leak from one game into the next.

The same control runs three flows: solo setup, hosting a room (die and names shown before the room is created, names sent as `name` plus `guestNames`), and joining a room (a compact variant starting at 1, clamped to the room's remaining capacity). The join flow's three toast walls are distinct on purpose - "the room holds 8 at most" is a different problem from "there is one seat left", and a single generic message made the second look like a bug.

## Sound

`sfx.js` is procedural: no audio files ship, so offline still works and each effect is edited in source rather than re-exported. Modelled on Foothold's sfx module, trimmed to what a score tracker needs.

- The AudioContext is created lazily on the first gesture. Before that, `play()` is a silent no-op rather than an error - browsers block audio until a user gesture and there is nothing to warn about.
- `MASTER_CEILING` is 0.3 and the user volume scales it, so 100% means the designed ceiling, not raw 1.0. Layered blips never clip.
- `variant()` returns a random pitch multiplier from five steps (-2 to +2 semitones). Five, not two, because a button pressed twenty times in a row with two variants still reads as repetition.
- `noise()` calls `src.stop()`. Without it, every play leaks a BufferSource that the graph keeps referenced after its buffer runs out.

The victory fanfare is Arcade Jackpot, picked from eight candidates in `stage/victory-fanfare.html`. The other seven are still playable there if the call needs revisiting.

**The fanfare fires inside the `!state.celebrated` gate, beside `fireConfetti()`.** It must not move to where `state.gameOver` is set: `checkWin()` re-runs on every render once a game is decided, so it would replay the fanfare on every repaint. There is a regression assertion pinning it in place.

## The Worker palette bug

Found by the codex-agent review pass, not by testing. `worker/src/room.ts` still held the pre-Pip eight colours, a set completely disjoint from the client's, and that array does two jobs: it assigns a colour to each new seat, and it is the allow-list `handleUpdateColor` validates against.

So in every live room, auto-assigned seats came back in colours the client has no `--pN-fg` or `--pN-bd` pairing for, *and* every manual colour change a player made was silently dropped by the server with no error path back to the client. The second half is why it went unnoticed: nothing failed visibly, the colour just did not change.

The fix is the same eight values in the same order, with a comment on both arrays. `tests/regressions.mjs` now extracts both `PLAYER_COLORS` declarations and `deepStrictEqual`s the hex lists; the assertion was verified by flipping one digit and watching it fail. This fix needs a Worker deploy, not just a static deploy.

## What was not built

The handoff contains screens the app does not have, and they were deliberately not invented:

- A score-entry bottom sheet. The app edits scores inline and in a modal; both were restyled instead.
- A full winner-celebration screen. The app shows a banner plus confetti; that was restyled instead.

Also still open: seat colours picked on setup do not survive into a multiplayer room. The join payload has no colour field and the server assigns by seat index, so wiring it needs a change on both the client and the Worker. Offered, not accepted.
