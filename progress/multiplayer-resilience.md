# Multiplayer Resilience and Final Round (built 2026-08-15, shipped in v0.22)

<!-- `Claude:` Written 2026-08-15 alongside the changes it describes. -->

A batch of multiplayer fixes aimed at one theme: the room should survive normal phone behaviour (refresh, lock screen, backgrounded tab) without punishing the player, and the Farkle final round should actually be played.

## Presence grace window

`worker/src/room.ts` no longer flips `connected` to `false` the instant a socket closes. It stamps `graceUntil = now + PRESENCE_GRACE_MS` (5 minutes) and leaves `connected: true`, so the roster keeps the name un-struck, the turn does not skip past them, and the round does not gain a ✗ for a player who is simply mid-refresh. `expireGracePeriods` retires windows that really lapse, and turn advancement only skips a player whose grace has run out.

The alarm handling had to be unified for this. A Durable Object has exactly one alarm, and there are now two competing deadlines: the earliest outstanding grace expiry, and the 30-minute abandoned-room deletion. `updateAbandonedRoomAlarm` was removed and replaced by `refreshAlarm()`, which schedules whichever comes first and is called from every path that can change either deadline. If a future change adds a third timed behaviour, it belongs inside `refreshAlarm()` too - do not call `setAlarm` directly from a handler.

## Keepalive, reconnect, disconnected modal

Client side: a `ping` every 25s answered by a new `pong` message type, any inbound frame treated as proof of life, a 75s silence threshold that force-closes what is presumed a half-open socket, and reconnect backoff of 1s / 2s / 4s / 8s over four attempts. A `visibilitychange` handler reconnects immediately when a backgrounded tab returns, because mobile browsers freeze the keepalive timer along with the tab, so waiting for the next tick can mean waiting indefinitely.

Only when the four retries are exhausted does `#modal-disconnected` appear: a non-dismissible alertdialog with a single Reconnect button that reloads the page. It is deliberately not a toast - a toast that expires while the player is looking away leaves them staring at a stale board with no idea they are detached. Recovery is just the reload, since the saved session rejoins the room on boot.

The grace window and the client retry budget are related numbers: the client gives up well inside the 5-minute server grace, so the reload lands on a seat that is still marked connected. If either constant is changed, keep that ordering.

## Auto-scroll

A new round scrolls every device down to the live row; a turn change scrolls the board horizontally to centre the current player's column; joining or rejoining lands on the latest round and the current turn instead of round 1. This matters most at 6-8 players, where the active column is normally off-screen and the "your turn" card was announcing a turn the player could not see.

## Farkle final round

The old logic ended the game as soon as the row after the trigger round existed, so nobody actually played the promised extra turn. The lap is now anchored to the crossing seat: if player 4 of 6 crosses, players 5 and 6 finish that round and players 1, 2 and 3 take their turn in the next one, then it ends.

- `findWinTrigger()` returns both the round where the target was crossed and the seat that crossed it.
- `finalLapSettled()` decides when the lap is complete. Multiplayer can settle mid-row using `mpRoundSubmitted`, which also lets it skip players who genuinely dropped rather than hanging the game on an absent seat; solo scoring still enters whole rounds, so it settles on row boundaries.
- The FINAL ROUND toast names the player who crossed.

This supersedes `roundsNeededToWin()` (v0.21), which assumed the final lap was always a whole number of rounds. Two regression assertions that pinned that helper's shape were rewritten against `finalLapSettled` / `findWinTrigger`.

## New Game in a live room

A host with at least one other player in the room now restarts in place via a host-only `reset-game` message and a `game-reset` broadcast: same room code, same roster, board back to round 1 with scores cleared and the host on the first turn. Guests get a toast so the reset is never silent. Closing the room outright stayed on the Back button, which is the deliberate split - "New Game" is a within-session action, "Back" is leaving. A solo host, or a guest, keeps the old leave behaviour, since there is no room worth preserving.

## Renaming

`rename-self` now carries an explicit `playerId` rather than implying the sender, and `handleRenamePlayer` authorizes three cases server-side: the sender's own seat, a seat whose `groupLeaderId` is the sender, and the current host renaming anyone. This closes the group-join gap recorded in `progress/group-join.md`, where a typo in a member's name needed a removal to fix. Guests tap a name they own to edit it inline, the same gesture the host already had.

## Turn order is not column order

Farkle tables roll dice to decide who leads off, so the host declares the first player and a round's turn order rotates from that seat. Nothing recorded that before, and two features silently assumed rounds always ran left to right from column one.

- The Worker keeps `roundStarts: string[]` parallel to `rounds`, written only by the new `openRound()` helper - the single place a round row may be opened, which is what the count assertion in the regression suite pins. Every payload carrying `rounds` carries it too, and so does `turn-update`, because declaring a turn into a round nobody has scored in yet moves that round's start with it.
- Rooms persisted before this are backfilled to column one during the constructor's migration pass, which is the order they were actually played in.
- `removePlayers` remaps any `roundStarts` entry naming a removed player onto the next surviving seat in that round's rotation. It stores ids rather than indices, so removal cannot shift it out of alignment the way `rounds` can, but a dangling id is worse than it looks: the client's `mpTurnOrder` cannot tell "no starter recorded" from "starter since removed" and treats both as column order, which would silently rewrite the history that `findWinTrigger` and `finalLapSettled` read for past rounds. Advancing to the next survivor keeps every remaining seat in the same relative order.
- The client's `mpTurnOrder(ri)` turns a round index into the seat order it was played in; `finalLapSettled()` takes the crosser's position from it. The consequence worth remembering: a player who leads the round off and crosses the target ends the game when that round completes, with no extra row, because everyone else already answered inside it.
- `mpTurnEntryRun()` uses the same order to decide what the Enter Score popup offers - the current turn's seat plus the contiguous run of seats behind it that this device also plays. It deliberately does not wrap past the end of the round.

- `findWinTrigger()` reads the crossing round in turn order too. It used to take the lowest column at or over the target, which named the wrong crosser whenever two seats crossed in the same rotated round, and that then handed the real crosser a spurious extra turn.

## Not verified

None of this has been exercised on real devices yet - see `PROGRESS.md` Next Session. The grace window in particular has no automated coverage of its timing, only source-text assertions that the constant and the alarm path exist.
