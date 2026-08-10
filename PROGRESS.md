# PROGRESS - Board Game Tracker

## Multiplayer Rooms (built 2026-07-23, shipped 2026-07-24 in v0.14)
`multiplayer` `cloudflare-worker` `shipped`
Cloudflare Worker + Durable Object backend with a full client (join-by-code, QR, live room bar, host/each-player scoring modes), deployed and live. Three of the original beta scope cuts have since been lifted - read the detail file before assuming a documented limitation still holds.
→ [progress/multiplayer-rooms.md](progress/multiplayer-rooms.md)

## Group Join (built 2026-08-09, shipped in v0.19, cap raised in v0.20)
`multiplayer` `worker` `shipped`
One device can declare up to all 8 seats during create-room or join-room; they become full players whose scores that device enters. Deliberately locked at join time and bound to the leader's device - both were explicit calls, and the alternatives are written down in the detail file.
→ [progress/group-join.md](progress/group-join.md)

## Multiplayer Scoring and Winner Feedback (built 2026-08-09, shipped in v0.19)
`multiplayer` `codex` `shipped`
Codex-authored pass adding the turn indicator, invite sheet, update-available toast, blank-vs-zero score entry, device-identity reconnect reservations, and the winner-column frame. Introduced `tests/regressions.mjs`, which is now part of the pre-push gate.
→ [progress/v019-scoring-and-feedback.md](progress/v019-scoring-and-feedback.md)

## Next Session
1. Test group join on 2+ real devices - it is deployed but has not been exercised end to end. Worth covering: a 3-person group joining mid-game, the host removing one member vs removing the group leader, and a refresh on the leader's device restoring the whole group.
2. Verify the group-join dropdown against a nearly-full room (join with 2 when only 1 seat is left) - the seat count comes from `/room/:code/exists` and can go stale, so the server rejection path is the one that actually matters.
3. Sanity-check the v0.20 cap raise: a host claiming all 8 seats on one device leaves nobody to join, and the Enter Score modal then renders 8 rows. Confirm the modal stays usable at that size on a phone and that the room still behaves sensibly with a single connected socket.
4. Decide whether group members should be renameable by the leader. Currently only a player can rename themselves, so a typo in a group member's name is unfixable without removing them.
5. Decide the win-logic philosophy (deferred 2026-07-09): should the tracker enforce game rules or just record scores? On tied winning totals the earlier-seated player silently wins (`indexOf` picks the first match) - decide tie handling (shared win banner? sudden-death round?).

## Backlog
- More games (round-by-round and category-based scoring)
- Payment/entitlement gating for multiplayer, deferred to before v1.0
- Host reassignment when the host disconnects mid-game (currently the room just loses host-only controls until they return)
