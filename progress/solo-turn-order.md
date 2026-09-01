# Solo Turn Order + Skyjo (built and shipped 2026-09-01 in v0.28)

## The bug that started this

In single-device Farkle, once one player crossed 10,000, the final-round mechanic correctly triggered, but a partial submit (only the next seat's score, others left blank) could end the game before every remaining player actually took a turn. Root cause: solo and multiplayer used two different models for "is this round complete" - multiplayer tracked `roundSubmitted` per seat and advanced `currentTurnPlayerId` turn by turn; solo pushed one whole row per Enter Score submit, so a row with some seats blank could still read as "done" once the earlier narrow patch (every seat non-blank) was satisfied by coincidence.

## The fix

Rather than patch the symptom, solo now reuses multiplayer's per-seat turn engine, reimplemented client-side (solo has no server):
- `state.roundSubmitted`, `state.roundStarts`, `state.currentTurnPlayerId`, `state.pendingCloser` moved from bare multiplayer-only module vars onto `state` itself - solo has no server to re-broadcast turn state after a reload, so it has to survive `localStorage` round-trips the way the rest of `state` does.
- New client-only functions mirror the Worker's per-seat submit/advance logic: `localSubmitScore`, `advanceLocalTurn`, `openLocalRound`, `advanceLocalRoundIfComplete`, `declareLocalTurn`. Reference only - `worker/src/room.ts` itself was never touched.
- `soloTurnBased()` gates all of this behind a per-game `soloTurnOrder: true` flag in `GAMES`, set on Farkle, Cribbage, Qwirkle, Yahtzee and the new Skyjo. Euchre, Gin Rummy, Three Thirteen and Generic Game are untouched - they keep the original all-seats-in-one-modal solo flow.
- The win-detection functions (`roundIsComplete`, `finalLapSettled`, `finalLapClosedSeats`, `mpTurnOrder`) dropped their `state.multiplayer` branching entirely - they're correct for solo now that solo populates the same turn-state fields multiplayer does.
- Single-device play gets its own **Make It Their Turn** control (tap a player's name), mirroring multiplayer's host-only version, since solo has no host/guest distinction to gate it on.
- The closer pick (who went out first) is selectable all round the same as before, but only commits to `state.closers` when the round actually closes (`advanceLocalRoundIfComplete`), not per seat-save - a user decision, not a technical requirement.

## Skyjo

New `GAMES.skyjo` entry: lowest running total wins, ends at 100 (configurable), negative scores legal (cards run -2 to 12). Given `finalRoundOnWin: true` so it reuses Farkle's exact "let the round finish before comparing totals" logic - **this matters**: Cribbage's `defaultWinScore` crossing correctly ends the game the instant it's crossed (pegging past 121 genuinely ends play on the spot), but that same instant-decide path is wrong for Skyjo, where the real rule is "everyone else gets one more turn." Confirmed Qwirkle and Yahtzee are unaffected by this distinction - their `defaultWinScore: 0` means `findWinTrigger()` never fires for them at all, so the two-rule split (instant-decide vs. wait-for-round) exists but only Farkle and Skyjo actually exercise the "wait" branch today.

## Bugs found during the mandatory codex-agent verification pass (all fixed)

1. Reassigning the turn back to a seat that had already gone this round would re-advance the turn/round a second time - `localSubmitScore` now treats a resubmit as a correction (updates the value, skips re-advancing).
2. The inline cell-tap editor allowed filling a blank cell out of turn order, letting a player bypass the turn engine entirely - now restricted to whichever seat's turn it actually is (same rule the modal already enforced).
3. A round that was open but not yet complete showed the next round's number in the modal title - fixed with `openRoundIndex`, which checks whether the last round is still accepting entries.
4. See the Skyjo `finalRoundOnWin` note above - found via review, not obvious from the diff alone.
5. `pendingCloser` wasn't on `state`, so a reload mid-round after picking a closer but before the round closed would lose that pick - moved onto `state`.

## A second bug found after the redesign shipped (fixed same session)

The inline cell-tap editor (`editScore`, separate code path from the Enter Score modal's `localSubmitScore`) was missing Farkle's explicit-0 special case. A farkled cell entered by tapping the table directly stored `null` instead of a literal `0` (the modal path already special-cased this correctly). Once null, the new turn-order guard read that cell as an unclaimed seat and locked it to whoever currently held the turn - so a player's own farkled round became permanently uneditable the moment turn order moved past them. Fixed by giving `editScore`'s commit the same Farkle-zero special case `localSubmitScore` already had, for both the stored value and the `onBoard` recompute (a farkle 0 must never count as "reached the entry threshold").

## Verification status

Regression suite (`tests/regressions.mjs`) covers the invariants via source-text assertions: `soloTurnOrder` flags, the six new turn-engine functions, the `state`-owned turn fields, the resubmission guard, the out-of-turn blank-cell restriction, the round-title fix, `pendingCloser` on `state`, and the Farkle-zero storage fix. **Not yet tested on a real device** - see PROGRESS.md `## Next Session` for the manual playthrough checklist.
