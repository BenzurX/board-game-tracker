# Your Turn Announcement

Built and shipped 2026-08-15 in v0.21. <!-- `Claude:` Whole item is Claude-authored. -->

## What it is

In a multiplayer room, when the turn moves to a score column this device is responsible for, a card appears in the centre of the screen: eyebrow ("Round 3"), a large title, and a subtitle. A shimmer runs through the title text twice, then the card clears itself after 2.4s. Tapping it dismisses early.

Self reads "Your turn" / player name. A group member or a player who nominated this device as their scorer reads "<Name>'s turn" / "You enter their score".

## Design

Four variants were staged in `stage/your-turn-toast.html` before any app code was written: (A) accent-bar bottom toast with a diagonal light sweep, (B) top banner pill with the shimmer over an accent fill, (C) centre hero card with the shimmer running through the letterforms, (D) quiet toast with a travelling conic-gradient border light. C was chosen for being readable across a table, which is the actual use case - people are looking at a phone on the table, not held up.

The stage page is still there with all four, so the call can be revisited without redoing the work. It also carries theme/mode/player switches, which is how the light-mode contrast question below was spotted.

The title shimmer is `background-clip: text` on a `linear-gradient` sized to 250% and slid from `140%` to `-40%` background-position. No pseudo-element, no overlay: the gradient *is* the text colour. `-webkit-background-clip` is present for older Safari.

The border shimmers too, from the same `turn-toast-shimmer` keyframes and the same highlight colour (`--turn-shimmer-hi`), so the two read as one highlight crossing the whole card rather than two effects. The ring is a `::before` gradient rectangle masked down to the 1px border band (`mask-composite: exclude`, fill minus content-box), with the card's own border set transparent and `background-clip: padding-box` so the background does not bleed under it. All of that lives inside an `@supports` block: where mask compositing is missing the fallback would be a gradient slab painted over the card, so those browsers keep the plain accent border instead.

## Why it fires when it does

The naive version - announce whenever `mpCurrentTurnPlayerId` is yours - fires on every re-render, every reconnect and every roster update, which in a long game means the card is on screen constantly. Instead both `mpApplyCurrentTurn` and `mpApplyRounds` compare the incoming id against the stored one and only announce on a genuine change.

That comparison also dedupes the two server paths for free: `round-update` carries `currentTurnPlayerId` and a separate `turn-update` may follow with the same id, but the second one sees no change and stays silent.

The end-of-game case needed more than the `state.gameOver` flag. `turn-update` and `roster-update` do not run `checkWin`, so the flag can still be false when the server pushes the turn change that coincides with the winning row, and the card would flash a beat before the winner banner. `mpGameDecided()` recomputes the outcome from the score data instead. That matters most in Farkle: with `finalRoundOnWin` the game is not decided when the target is crossed, only after everyone gets one more round, so the naive "target reached, stop announcing" test would silence the whole final round. The rounds arithmetic lives in `roundsNeededToWin()`, shared with `checkWin`, so the two cannot drift.

Further suppressed when: joining or rejoining (`mpApplyRounds(..., { announce: false })` from `mpOnJoined` - the highlighted column already says whose turn it is, and a rejoin is not a handoff), the game is over, or the tracker screen is not the active screen. The gameOver check runs *after* `checkWin()` so a turn arriving alongside the winning score does not announce.

Ownership is `mpEntersScoresFor(player)`, the same predicate the Enter Score modal uses, so group members and proxy-scored players are covered without a second notion of "mine".

The screen dims behind the card (`#turn-toast-backdrop`, a sibling element rather than a pseudo-element, because the card is transform-positioned and a fixed child would resolve against the card instead of the viewport). Tapping the dim dismisses, matching the app's `.modal-backdrop` convention - which does mean the first tap anywhere during those 2.4s dismisses rather than hitting the control underneath.

## Known gaps

- Never run in the real app before shipping. Two-device testing is item 1 in Next Session, and a real Farkle finish is the case worth watching: the extra round should still announce turn by turn, and only the handoff that crowns the winner should be silent.
- Light mode: the shimmer highlight is `color-mix(in srgb, #fff 70%, var(--accent-bright))`, which against a light `--surface` is a smaller contrast jump than in dark mode. Legible, but the effect is subtler than the stage page suggests at dark defaults.
- Nothing fires for a player whose scores another device enters - they see no card on their own phone, because they are not the one who has to act.
