# Group Join (built 2026-08-09, shipped in v0.19)

One device can declare up to a full table of players. The player-name step of both the create-room and join-room flows opens with a "Players:" count row; picking more than one reveals a name field per extra person. All of them join as full roster entries with their own score columns, and the device that entered them enters their scores.

The cap started at 4 and was raised to 8 (`MAX_GROUP_SIZE`, defined identically in `app.js` as `MP_MAX_GROUP_SIZE` and in `worker/src/room.ts`) in v0.20, so one device can now claim every seat in a room. **Both constants must be changed together** - the client cap only shapes the dropdown, and the Worker is what actually rejects an oversized group.

## Why it reuses proxy scoring rather than adding a new concept

Proxy scoring (v0.18) already let one player enter another's scores via `Player.scorerId`, with a batched `submit-scores-for` message and an Enter Score modal that grows a row per column the device owns. Group join sets `scorerId` on each group member to point at the leader, so the entire scoring path - modal rows, batch submit, past-round correction, the Enter Score button's enabled/disabled logic - works with no changes. The only genuinely new state is `Player.groupLeaderId`, which exists because `scorerId` is meaningless in host-scoring rooms and because removal and connection cascades need to know group membership independently of who enters scores.

## Decisions taken (Ben, 2026-08-09)

- **Both flows, not just join.** The host device can represent 2-4 people too.
- **Locked at join.** No adding or dropping group members later. Avoided new protocol messages and mid-game roster-mutation UI. The rejected alternative was an editable group managed from the room bar.
- **Reject on overflow, don't partially join.** The dropdown is capped by a `seatsLeft` value that now rides along on `/room/:code/exists`, but that number goes stale, so the server re-checks and rejects the whole join with `{code:"room-full", seatsLeft}`. The client reopens the name modal with the group intact and the fresh cap. A group never lands half-joined.
- **Bound to the leader's device.** Group members cannot be claimed from another phone later. The rejected alternative was a claim/rejoin token flow letting a member take over their own column.

## Implementation notes

Worker (`worker/src/room.ts`):
- `Player.groupLeaderId`, `JoinMessage.guestNames`, `MAX_GROUP_SIZE`.
- `handleJoin` validates the whole group as a unit: length cap, non-empty names, uniqueness within the group and against the existing roster, then seats. All players are pushed in one pass that also extends `rounds[]`, `roundSubmitted`, and `onBoard` per player.
- `removePlayers(ids)` replaced the old single-index `splice` calls. Removing several players by index one at a time is where this feature would most easily have gone wrong - four parallel arrays have to stay aligned - so removal filters all four against one `keep` mask.
- `webSocketClose` cascades `connected = false` to group members; the rejoin branch cascades it back.
- Removing the leader (host kick or `leave-self`) removes the group; removing one member removes only that member.
- The rejoin branch is gated on `existingPlayer.groupLeaderId === null`. Group member ids are broadcast in the roster, so without that guard any device that had seen the roster could send `{type:"join", rejoinId:<member id>}` and hijack that person's identity. Found by the Codex verification pass, not by the original implementation.

Client (`app.js`): `mpGroupSize`, `mpGroupSizeCap`, `mpRenderGroupSizeOptions`, `mpRenderGroupNameFields`, `mpReopenPlayerNameModalWithGroup`. `mpEntersScoresFor` checks `groupLeaderId` before `scorerId` so group members resolve correctly even in host-scoring rooms, where they carry no nomination.

A device leading a group cannot also nominate someone else as its own scorer - nominations never chain, and the existing "already someone else's scorer" check in `applyScorer` enforces it without a new rule. The client suppresses the scorer picker when the group size is greater than one.

## Interaction with the v0.19 Codex work

The device-identity reconnect reservations landed in the same release. Group members are created with `deviceId: null`, so the device-reclaim path cannot match them - the `groupLeaderId` guard on rejoin and the null `deviceId` are two independent defenses on the same hijack. `reconnectUntil` cascades from leader to members, so an expired group is pruned as a unit.

## Not done

- Group members cannot be renamed by the leader; only a player can rename themselves. A typo in a member's name currently needs a removal to fix.
- Not yet tested on real devices end to end - see `PROGRESS.md` Next Session.
