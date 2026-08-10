# Multiplayer Scoring and Winner Feedback (built 2026-08-09, shipped in v0.19)

<!-- `Claude:` Written from a read of commit 43a0f84, not by the agent that implemented it. Codex authored the code and the CHANGELOG 0.19 entries; this file records the shape of the work and the parts that affect future changes. -->

Codex-authored pass, landed in the same commit as Group Join. The CHANGELOG 0.19 entry documents the user-visible behaviour; this file covers what a future session needs to know before touching it.

## Turn indicator

The room now tracks `currentTurnPlayerId` server-side, starting on the host. `findNextUnsubmittedPlayerId` advances it after a submission, skipping disconnected players and anyone who has already scored this round. That skip matters for proxy scoring and group join: a column entered on someone else's behalf would otherwise trap the indicator on a player who is never going to act.

Persisted rooms created before this existed have no turn state, so the load path defaults `currentTurnPlayerId` to whichever player is host.

## Blank versus zero score entry

Score inputs now start empty rather than at `0`. Blank fields are skipped on submit; an explicitly typed `0` still records a real zero (a Farkle). This exists because a device scoring for several people often only has some of the numbers. Three places enforce it and all three must agree: the client filters `entry.value !== null` before sending, the Worker leaves `roundSubmitted[index]` false for a blank in host-scoring mode, and Farkle renders a recorded zero as a stylized `F`.

## Device-identity reconnect reservations

Players carry a `deviceId` and a `reconnectUntil`. A disconnected non-host holds its name and score column for `REJOIN_RESERVATION_MS` (10 minutes); a join carrying a matching `deviceId` and name reclaims the existing player instead of creating a duplicate. Expired players are pruned when the next player joins. The host is exempt - `reconnectUntil` stays null for them.

## Forward compatibility

Unknown message types now get a non-fatal `Unsupported message type` error instead of closing the socket. The static site and the Worker are separate deploy targets and routinely skew by a few minutes, so a newer client talking to an older Worker must degrade rather than desynchronize the host. Keep this property: never re-add a socket close for an unrecognized type.

## tests/regressions.mjs

New in this release, now step 0 of the pre-push gate. Dependency-free: `node tests/regressions.mjs`.

It is mostly **source-text assertions** - it reads `app.js`, `index.html`, and `worker/src/room.ts` as strings and asserts that the fix for each bug in this release is still present. One genuine unit test runs `reconcileRosterColumns` through `node:vm`.

The consequence to remember: renaming a function or reformatting a matched line fails the suite even when behaviour is unchanged. That is intended - it forces a deliberate look - but it means a red suite is not automatically a real regression. Update the assertion to match the new source; never delete one to get green. If a change genuinely supersedes an assertion, say so in the CHANGELOG entry.
