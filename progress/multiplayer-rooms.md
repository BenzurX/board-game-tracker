# Multiplayer Rooms (built 2026-07-23, not yet shipped)

Backend: Cloudflare Worker + Durable Object (SQLite storage, WebSocket Hibernation API), one DO per 4-letter room code, free-tier only, no D1/KV. Lives in `worker/` (separate deploy target from the static GitHub Pages site - `wrangler`, not part of the site build).

Client: setup-screen toggle (multiplayer off by default, scoring mode defaults to "each player enters own"), join-by-code + QR deep link (`?room=CODE`), player name / remove-player-confirm / QR modals, live room bar with roster chips, "Enter Score" button (each-mode) that disables after submit until the round advances, host-scores-all mode via `+ Add Turn`. `qrcode.js` vendored locally (works offline, in `sw.js` cache list).

Beta scope cuts (deliberate, documented in code comments):
- No payment/entitlement gating yet - deferred to before v1.0 per Ben's call
- Multiplayer unavailable for: Custom Game, and any `trackCloser: true` game (currently just Crazy Eights)
- Multiplayer games always use the game's default win score / entry threshold / scoring direction - no custom override in this phase
- Farkle-style "on the board" entry-threshold mechanic doesn't apply in multiplayer - all submitted scores count immediately
- Editing a score in multiplayer only works for the current (last) round, not history
- No host reassignment if the host disconnects mid-game (remaining players lose remove-player/declare-game-over until the host reconnects) - documented in `worker/README.md`, revisit if it turns out to matter in practice

Verification: two independent review passes ran (policy requires the verifier never be the implementer) - a Claude subagent reviewed the Codex-written backend, Codex reviewed the Claude-written client. 6 real bugs found and fixed (except the host-disconnect one above, which was judged an acceptable documented tradeoff, not fixed): unsubmitted score cells were editable and could silently corrupt host-mode rounds; the server kept advancing rounds after a win instead of stopping at `gameOver`; a stale socket's close event could wrongly flip a freshly-reconnected player back to disconnected (added a `connSeq` generation counter server-side to guard it); "New Game" left a stale `multiplayer:true` snapshot in `localStorage` that `resumeSavedGame()` would try to restore as an unrecoverable ghost game (fixed both the leak and added a defense-in-depth refusal in `resumeSavedGame()`); the `joined` message didn't include `roundSubmitted`, so a reload mid-round could wrongly re-enable an already-used Enter Score button; rejoining an expired/deleted room failed with zero user feedback (now clears the session and reopens the join modal with an error).
