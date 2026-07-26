# Board Game Tracker Multiplayer Worker

This directory contains the Cloudflare Worker and SQLite-backed Durable
Object used by the board-game tracker's multiplayer rooms feature.

Each room is represented by one Durable Object. WebSocket connections use
Cloudflare's WebSocket Hibernation API, allowing idle rooms to remain
connected without continuously consuming Worker duration.

## Install

```sh
cd worker
npm install
```

## Authenticate with Cloudflare

```sh
npx wrangler login
```

## Run locally

```sh
npm run dev
```

## Deploy

```sh
npm run deploy
```

Wrangler will print the deployed Worker URL, typically in this form:

```text
https://board-game-tracker-multiplayer.<your-subdomain>.workers.dev
```

Configure the static client with that deployed Worker URL as its multiplayer
base URL. The client should use it for both room creation requests and
WebSocket connections:

- Create a room with `POST <base-url>/room/create`.
- Connect with `wss://<worker-host>/room/<ROOM_CODE>/ws`.

The Worker allows cross-origin requests so it can be called by the
GitHub Pages-hosted PWA.

## Known limitation: no host reassignment

`isHost` is fixed at join time and never transferred. If the host disconnects
mid-game, remaining players lose access to host-only actions (remove-player,
declare-game-over, host-scoring submissions) until the host reconnects -
`rejoinId` restores the same player's `isHost: true` on reconnect, so the room
recovers once they're back online, but there's no automatic handoff to
another player in the meantime. Acceptable for the beta phase; revisit if
host-drops-mid-game turns out to be common in practice.
