export { Room } from "./room";

interface Env {
  ROOM: DurableObjectNamespace;
}

const ROOM_CODE_PATTERN = /^[A-Z]{4}$/;
const MAX_CODE_ATTEMPTS = 32;

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    headers.set(name, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function json(body: unknown, status = 200): Response {
  return withCors(
    Response.json(body, {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }),
  );
}

function generateRoomCode(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) =>
    String.fromCharCode(65 + (byte % 26))
  ).join("");
}

async function createRoom(env: Env): Promise<Response> {
  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const roomCode = generateRoomCode();
    const id = env.ROOM.idFromName(roomCode);
    const room = env.ROOM.get(id);

    const statusResponse = await room.fetch(
      new Request("https://room.internal/__status", {
        headers: {
          "X-Room-Code": roomCode,
        },
      }),
    );

    if (!statusResponse.ok) {
      continue;
    }

    const status = await statusResponse.json<{
      initialized: boolean;
    }>();

    if (!status.initialized) {
      return json({ roomCode });
    }
  }

  return json(
    {
      error: "Unable to allocate an unused room code. Please try again.",
    },
    503,
  );
}

async function checkRoomExists(env: Env, roomCode: string): Promise<Response> {
  const id = env.ROOM.idFromName(roomCode);
  const room = env.ROOM.get(id);

  const statusResponse = await room.fetch(
    new Request("https://room.internal/__status", {
      headers: {
        "X-Room-Code": roomCode,
      },
    }),
  );

  if (!statusResponse.ok) {
    return json({ exists: false });
  }

  // The roster comes back with the existence check so the join flow can offer
  // "who enters your scores?" before the player is in the room.
  const status = await statusResponse.json<{
    initialized: boolean;
    scoringMode: string | null;
    seatsLeft: number;
    players: Array<{
      id: string;
      name: string;
      isHost: boolean;
      scorerId: string | null;
    }>;
  }>();

  if (!status.initialized) {
    return json({ exists: false });
  }

  return json({
    exists: true,
    scoringMode: status.scoringMode,
    seatsLeft: status.seatsLeft,
    players: status.players,
  });
}

async function forwardWebSocket(
  request: Request,
  env: Env,
  roomCode: string,
): Promise<Response> {
  if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
    return json({ error: "Expected a WebSocket upgrade request." }, 426);
  }

  const id = env.ROOM.idFromName(roomCode);
  const room = env.ROOM.get(id);
  const headers = new Headers(request.headers);
  headers.set("X-Room-Code", roomCode);

  return room.fetch(
    new Request(request, {
      headers,
    }),
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/room/create") {
      return createRoom(env);
    }

    if (request.method === "GET") {
      const wsMatch = url.pathname.match(/^\/room\/([^/]+)\/ws$/);

      if (wsMatch) {
        const roomCode = wsMatch[1];

        if (!ROOM_CODE_PATTERN.test(roomCode)) {
          return json(
            {
              error: "Room codes must contain exactly four uppercase letters.",
            },
            400,
          );
        }

        return forwardWebSocket(request, env, roomCode);
      }

      const existsMatch = url.pathname.match(/^\/room\/([^/]+)\/exists$/);

      if (existsMatch) {
        const roomCode = existsMatch[1];

        if (!ROOM_CODE_PATTERN.test(roomCode)) {
          return json({ exists: false });
        }

        return checkRoomExists(env, roomCode);
      }
    }

    return json({ error: "Not found." }, 404);
  },
} satisfies ExportedHandler<Env>;
