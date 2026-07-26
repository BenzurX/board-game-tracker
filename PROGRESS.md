# PROGRESS - Board Game Tracker

## Multiplayer Rooms (built 2026-07-23, not yet shipped)
`multiplayer` `cloudflare-worker` `not-shipped`
Cloudflare Worker + Durable Object backend with a full client (join-by-code, QR, live room bar, host/each-player scoring modes). Built and code-reviewed (2 independent passes, 6 bugs found and fixed) but untested end-to-end - Worker not yet deployed.
→ [progress/multiplayer-rooms.md](progress/multiplayer-rooms.md)

## Next Session
1. Deploy the Worker: `cd worker && npm install && npx wrangler login && npm run deploy`
2. Paste the deployed Worker URL back so `MP_WORKER_URL` in `app.js` (currently a placeholder) can be filled in
3. Test with 2+ real devices/tabs before shipping (untested end-to-end so far - built and code-reviewed, not run)
4. Run the pre-push gate (CHANGELOG.md, README.md, `sw.js` cache bump) and take a `snapshots/vX.XX/` copy, per this project's CLAUDE.md - not done yet, deliberately held until ready to ship since the Worker URL placeholder would make a push ship broken multiplayer
5. Decide the win-logic philosophy (deferred 2026-07-09): should the tracker enforce game rules or just record scores?
   - Farkle's built-in rules say every other player gets one final turn after someone reaches the target, but `checkWin()` declares the winner immediately.
   - On tied winning totals, the earlier-seated player silently wins (`indexOf` picks the first match). Decide tie handling (shared win banner? sudden-death round?).

## Backlog
- More games (round-by-round and category-based scoring)
