# Your Turn Announcement

Built and shipped 2026-08-15 in v0.21. <!-- `Claude:` Whole item is Claude-authored. -->

## What it is

In a multiplayer room, when the turn moves to a score column this device is responsible for, a card appears in the centre of the screen: eyebrow ("Round 3"), a large title, and a subtitle. A shimmer runs through the title text twice, then the card clears itself after 2.4s. Tapping it dismisses early.

Self reads "Your turn" / player name. A group member or a player who nominated this device as their scorer reads "<Name>'s turn" / "You enter their score".

## Design

Four variants were staged in `stage/your-turn-toast.html` before any app code was written: (A) accent-bar bottom toast with a diagonal light sweep, (B) top banner pill with the shimmer over an accent fill, (C) centre hero card with the shimmer running through the letterforms, (D) quiet toast with a travelling conic-gradient border light. C was chosen for being readable across a table, which is the actual use case - people are looking at a phone on the table, not held up.

The stage page is still there with all four, so the call can be revisited without redoing the work. It also carries theme/mode/player switches, which is how the light-mode contrast question below was spotted.

The shimmer is `background-clip: text` on a `linear-gradient` sized to 250% and slid from `140%` to `-40%` background-position. No pseudo-element, no overlay: the gradient *is* the text colour. `-webkit-background-clip` is present for older Safari.

## Why it fires when it does

The naive version - announce whenever `mpCurrentTurnPlayerId` is yours - fires on every re-render, every reconnect and every roster update, which in a long game means the card is on screen constantly. Instead both `mpApplyCurrentTurn` and `mpApplyRounds` compare the incoming id against the stored one and only announce on a genuine change.

That comparison also dedupes the two server paths for free: `round-update` carries `currentTurnPlayerId` and a separate `turn-update` may follow with the same id, but the second one sees no change and stays silent.

Further suppressed when: joining or rejoining (`mpApplyRounds(..., { announce: false })` from `mpOnJoined` - the highlighted column already says whose turn it is, and a rejoin is not a handoff), the game is over, or the tracker screen is not the active screen. The gameOver check runs *after* `checkWin()` so a turn arriving alongside the winning score does not announce.

Ownership is `mpEntersScoresFor(player)`, the same predicate the Enter Score modal uses, so group members and proxy-scored players are covered without a second notion of "mine".

## Known gaps

- Never run in the real app before shipping. Two-device testing is item 1 in Next Session.
- Light mode: the shimmer highlight is `color-mix(in srgb, #fff 70%, var(--accent-bright))`, which against a light `--surface` is a smaller contrast jump than in dark mode. Legible, but the effect is subtler than the stage page suggests at dark defaults.
- Nothing fires for a player whose scores another device enters - they see no card on their own phone, because they are not the one who has to act.
