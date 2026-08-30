import {
  DurableObject,
  type DurableObjectState,
} from "cloudflare:workers";

interface Env {}

type ScoringMode = "host" | "each";

interface Player {
  id: string;
  name: string;
  connected: boolean;
  isHost: boolean;
  connSeq: number; // bumped on every (re)join - lets a stale socket's close event be ignored
  // 'each' scoring only: the id of another player who enters this player's
  // scores for them. null means they enter their own.
  scorerId: string | null;
  // Set when this player was added as part of someone else's group join (one
  // device declaring several people at the table). Points at the player who
  // owns the socket. null for anyone who joined on their own device.
  groupLeaderId: string | null;
  color: string;
  deviceId: string | null;
  reconnectUntil: number | null;
  // Set when this player's socket closed. Until it passes they still count as
  // present: a refresh, a tab throttle or a brief network drop must not strike
  // their name out or skip their turn. Null whenever the socket is live.
  graceUntil: number | null;
  // Cosmetic only. Whether this player's device currently has the app on
  // screen, reported by the client on visibilitychange. NOTHING may branch on
  // this: turn order, round advance, the struck-out name and the abandoned-room
  // timer all read `connected`, which the grace window governs. A locked phone
  // is away but still very much in the game.
  present: boolean;
}

interface RoomData {
  roomCode: string;
  scoringMode: ScoringMode;
  gameKey: string;
  winScore: number;
  minScore: number;
  players: Player[];
  rounds: Array<Array<number | null>>;
  roundSubmitted: boolean[];
  // Parallel to rounds - the player who took the first turn of each round. Turn
  // order rotates from whoever the host declared went first, so a round does not
  // necessarily start at the leftmost column, and the final-round rule has to
  // know where each round actually began.
  roundStarts: string[];
  onBoard: boolean[]; // parallel to players - true once a player has met minScore in one round
  gameOver: boolean;
  disconnectedAt: number | null;
  ruleOverrides: Record<string, unknown>; // host's edited baseline rule text, opaque to the server
  customRules: string[]; // host's house-rules list, shown read-only to guests
  currentTurnPlayerId: string | null;
}

interface SocketAttachment {
  playerId: string;
  isHost: boolean;
  connSeq: number;
}

interface PendingAttachment {
  pendingRoomCode: string;
}

interface JoinMessage {
  type: "join";
  name: string;
  scoringMode?: ScoringMode;
  gameKey?: string;
  rejoinId?: string;
  winScore?: number;
  minScore?: number;
  ruleOverrides?: Record<string, unknown>;
  customRules?: string[];
  // Chosen during the join flow from the roster returned by /room/:code/exists.
  // Ignored unless the room is in 'each' scoring mode.
  scorerId?: string | null;
  // Extra people sharing this device, named in the join form. They become full
  // roster entries scored by the joining player - see handleJoin.
  guestNames?: string[];
  deviceId?: string;
}

interface HostLeaveMessage {
  type: "host-leave";
}

interface LeaveSelfMessage {
  type: "leave-self";
}

interface RenameSelfMessage {
  type: "rename-self";
  name: string;
  // Absent means "rename me". Present when renaming someone this sender is
  // allowed to rename: a player they added in a group join, or - for the host -
  // anyone at the table.
  playerId?: string;
}

// Keeps an idle socket from being dropped by an intermediary. No state change.
interface PingMessage {
  type: "ping";
}

// Cosmetic: whether this device currently has the app on screen. Never touches
// `connected` or the grace window.
interface PresenceMessage {
  type: "presence";
  visible: boolean;
}

// Host-only: same room, same roster, blank scoreboard.
interface ResetGameMessage {
  type: "reset-game";
}

interface SubmitScoreMessage {
  type: "submit-score";
  value: number;
}

// A player entering this round for themselves and/or for every player who has
// nominated them as their scorer, in one submission.
interface SubmitScoresForMessage {
  type: "submit-scores-for";
  entries: Array<{ playerId: string; value: number }>;
}

interface SetScorerMessage {
  type: "set-scorer";
  scorerId: string | null;
}

interface EditScoreMessage {
  type: "edit-score";
  value: number;
  // Present when correcting a specific already-recorded round (current or
  // past) instead of just the still-open current round.
  roundIndex?: number;
  // Present when correcting the cell of a player this player scores for.
  // Defaults to the sender's own column.
  playerId?: string;
}

interface RemovePlayerMessage {
  type: "remove-player";
  playerId: string;
}

interface UpdateColorMessage {
  type: "update-color";
  playerId: string;
  color: string;
}

interface SetCurrentTurnMessage {
  type: "set-current-turn";
  playerId: string;
}

interface DeclareGameOverMessage {
  type: "declare-game-over";
}

interface CelebrateMessage {
  type: "celebrate";
}

interface HostSubmitScoresMessage {
  type: "host-submit-scores";
  values: Array<number | null>;
  // Present when the host is correcting an already-recorded round (current or
  // past) instead of submitting the still-open round. Skips auto-advance.
  roundIndex?: number;
}

interface UpdateRulesMessage {
  type: "update-rules";
  ruleOverrides: Record<string, unknown>;
  customRules: string[];
}

type ClientMessage =
  | JoinMessage
  | SubmitScoreMessage
  | SubmitScoresForMessage
  | SetScorerMessage
  | EditScoreMessage
  | RemovePlayerMessage
  | UpdateColorMessage
  | SetCurrentTurnMessage
  | DeclareGameOverMessage
  | CelebrateMessage
  | HostSubmitScoresMessage
  | HostLeaveMessage
  | LeaveSelfMessage
  | RenameSelfMessage
  | PingMessage
  | PresenceMessage
  | ResetGameMessage
  | UpdateRulesMessage;

interface StoredRoomRow {
  data: string;
}

const MAX_PLAYERS = 8;
// One device may represent every seat in a room: its holder plus 7 others.
const MAX_GROUP_SIZE = 8;
const ABANDONED_ROOM_TIMEOUT_MS = 30 * 60 * 1000;
const REJOIN_RESERVATION_MS = 10 * 60 * 1000;
// How long a player keeps their seat, their turn and an unstruck name after
// their socket drops. Long enough to cover a page refresh taken on your own
// turn, a phone locking, or a backgrounded desktop tab whose socket the browser
// quietly closed - none of those mean the person left the table.
const PRESENCE_GRACE_MS = 5 * 60 * 1000;
const PLAYER_REMOVED_CLOSE_CODE = 4001;
// MUST stay identical to PLAYER_COLORS in app.js, same values in the same
// order. The server assigns seat colours from this list and validates every
// update-color against it, so a divergence means auto-assigned seats get
// colours the client has no deep border or ink pairing for, AND every manual
// colour change the client sends is silently rejected. tests/regressions.mjs
// asserts the two arrays match.
const PLAYER_COLORS = [
  "#3FBE9A", "#F576A8", "#7C93EE", "#A8C64F",
  "#F5B02E", "#F2604C", "#4FC3E8", "#C48BF0",
];

export class Room extends DurableObject<Env> {
  private room: RoomData | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    this.ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS room_state (
          singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
          data TEXT NOT NULL
        )
      `);

      const rows = [
        ...this.ctx.storage.sql.exec<StoredRoomRow>(
          "SELECT data FROM room_state WHERE singleton = 1",
        ),
      ];

      if (rows.length > 0) {
        this.room = JSON.parse(rows[0].data) as RoomData;

        // Rooms persisted before proxy scoring / group joins existed have no
        // scorerId or groupLeaderId - the null checks below treat undefined as
        // "not set", so normalize once.
        this.room.currentTurnPlayerId =
          this.room.currentTurnPlayerId ??
          this.room.players.find((player) => player.isHost)?.id ??
          null;
        // Rooms persisted before turn order was recorded played every round from
        // the leftmost column, which is what an empty entry means to the client.
        this.room.roundStarts = this.room.roundStarts ?? [];
        while (this.room.roundStarts.length < this.room.rounds.length) {
          this.room.roundStarts.push(this.room.players[0]?.id ?? "");
        }
        // Presence describes right now, so a persisted value is always stale by
        // the time it is read back. Rebuild it from the sockets that survived
        // hibernation; anyone without one reports away until their client says
        // otherwise, which it does on connect.
        const liveIds = new Set(
          this.ctx.getWebSockets()
            .map((ws) => this.getAttachment(ws)?.playerId)
            .filter((id): id is string => typeof id === "string"),
        );
        for (const player of this.room.players) {
          player.present =
            liveIds.has(player.id) ||
            (player.groupLeaderId !== null && liveIds.has(player.groupLeaderId));
        }
        for (const [index, player] of this.room.players.entries()) {
          player.scorerId = player.scorerId ?? null;
          player.groupLeaderId = player.groupLeaderId ?? null;
          player.color = player.color ?? PLAYER_COLORS[index % PLAYER_COLORS.length];
          player.deviceId = player.deviceId ?? null;
          player.reconnectUntil = player.reconnectUntil ?? null;
          player.graceUntil = player.graceUntil ?? null;
        }
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__status") {
      return Response.json({
        initialized: this.room !== null,
        scoringMode: this.room?.scoringMode ?? null,
        // Lets the join form cap its "how many of you?" dropdown before the
        // socket join. Re-checked on join, since it can go stale.
        seatsLeft: this.room
          ? Math.max(0, MAX_PLAYERS - this.room.players.length)
          : MAX_PLAYERS,
        // Enough of the roster for a joining player to pick who scores for
        // them before the socket join - names only, no connection state.
        players:
          this.room?.players.map((player) => ({
            id: player.id,
            name: player.name,
            isHost: player.isHost,
            scorerId: player.scorerId,
          })) ?? [],
      });
    }

    if (request.headers.get("Upgrade")?.toLowerCase() !== "websocket") {
      return Response.json(
        { error: "Expected a WebSocket upgrade request." },
        { status: 426 },
      );
    }

    const roomCode = request.headers.get("X-Room-Code");

    if (!roomCode || !/^[A-Z]{4}$/.test(roomCode)) {
      return Response.json(
        { error: "Invalid room code." },
        { status: 400 },
      );
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      pendingRoomCode: roomCode,
    } satisfies PendingAttachment);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message !== "string") {
      this.closeForInvalidMessage(ws, "Messages must be JSON text.");
      return;
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(message);
    } catch {
      this.closeForInvalidMessage(ws, "Message was not valid JSON.");
      return;
    }

    if (!this.isClientMessage(parsed)) {
      if (parsed && typeof parsed === "object" && "type" in parsed && typeof parsed.type === "string") {
        this.send(ws, {
          type: "error",
          code: "unsupported-message",
          message: `Unsupported message type: ${parsed.type}`,
        });
        return;
      }
      this.closeForInvalidMessage(ws, "Unsupported or malformed message.");
      return;
    }

    if (parsed.type === "join") {
      await this.handleJoin(ws, parsed);
      return;
    }

    const attachment = this.getAttachment(ws);

    if (!attachment || !this.room) {
      this.closeForInvalidMessage(ws, "Join the room before sending messages.");
      return;
    }

    switch (parsed.type) {
      case "submit-score":
        await this.handleSubmitScore(attachment, parsed.value);
        break;

      case "submit-scores-for":
        await this.handleSubmitScores(attachment, parsed.entries);
        break;

      case "set-scorer":
        await this.handleSetScorer(ws, attachment, parsed.scorerId);
        break;

      case "edit-score":
        await this.handleEditScore(
          attachment,
          parsed.value,
          parsed.roundIndex,
          parsed.playerId,
        );
        break;

      case "remove-player":
        await this.handleRemovePlayer(ws, attachment, parsed.playerId);
        break;

      case "update-color":
        await this.handleUpdateColor(attachment, parsed.playerId, parsed.color);
        break;

      case "set-current-turn":
        await this.handleSetCurrentTurn(attachment, parsed.playerId);
        break;

      case "declare-game-over":
        await this.handleDeclareGameOver(attachment);
        break;

      case "celebrate":
        // The tapping client celebrates immediately for zero-latency feedback.
        // Only relay the burst to the other devices or the sender would receive
        // its own message and create two confetti bursts for one tap.
        this.broadcast({ type: "celebrate" }, ws);
        break;

      case "host-submit-scores":
        await this.handleHostSubmitScores(
          attachment,
          parsed.values,
          parsed.roundIndex,
        );
        break;

      case "host-leave":
        await this.handleHostLeave(attachment);
        break;

      case "leave-self":
        await this.handleLeaveSelf(attachment);
        break;

      case "rename-self":
        await this.handleRenamePlayer(
          ws,
          attachment,
          parsed.name,
          parsed.playerId,
        );
        break;

      case "reset-game":
        await this.handleResetGame(attachment);
        break;

      case "presence":
        await this.handlePresence(attachment, parsed.visible);
        break;

      case "ping":
        // Keepalive only - answering keeps the round trip observable to the
        // client, which uses it to notice a connection that has gone quiet.
        this.send(ws, { type: "pong" });
        break;

      case "update-rules":
        await this.handleUpdateRules(
          attachment,
          parsed.ruleOverrides,
          parsed.customRules,
        );
        break;
    }
  }

  async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    const attachment = this.getAttachment(ws);

    if (!attachment || !this.room) {
      return;
    }

    const player = this.room.players.find(
      (candidate) => candidate.id === attachment.playerId,
    );

    // A stale socket from a previous connection can close after the player has
    // already reconnected on a new socket - ignore it so it doesn't stomp the
    // live connection's `connected: true` back to false.
    if (!player || !player.connected || player.connSeq !== attachment.connSeq) {
      return;
    }

    // The socket is gone, but the player is not: they stay `connected` (so their
    // name isn't struck out, their turn isn't skipped and the round doesn't
    // advance past them) until the grace window expires in `alarm`.
    player.graceUntil = Date.now() + PRESENCE_GRACE_MS;

    // Everyone this device declared waits out the same window with it.
    for (const member of this.groupMembers(player.id)) {
      member.graceUntil = player.graceUntil;
    }

    // A closed socket is the one presence signal that needs no client message,
    // and it is immediate: the tab is gone. The grace window is untouched -
    // they are away, not disconnected, for the next five minutes.
    const seats = [player, ...this.groupMembers(player.id)];
    for (const seat of seats) {
      seat.present = false;
    }

    await this.persist();
    await this.refreshAlarm();
    this.broadcastPresence(seats);
  }

  async webSocketError(
    ws: WebSocket,
    _error: unknown,
  ): Promise<void> {
    await this.webSocketClose(ws, 1011, "WebSocket error", false);
  }

  async alarm(): Promise<void> {
    if (!this.room) {
      return;
    }

    const expired = this.expireGracePeriods();

    if (expired) {
      await this.persist();

      this.broadcast({
        type: "roster-update",
        players: this.room.players,
        currentTurnPlayerId: this.room.currentTurnPlayerId,
      });

      // Only now that they genuinely count as gone can the round move past them.
      await this.advanceRoundIfComplete();
    }

    const allDisconnected =
      this.room.players.length === 0 ||
      this.room.players.every((player) => !player.connected);

    if (
      allDisconnected &&
      this.room.disconnectedAt !== null &&
      Date.now() >= this.room.disconnectedAt + ABANDONED_ROOM_TIMEOUT_MS
    ) {
      this.room = null;
      this.ctx.storage.sql.exec(
        "DELETE FROM room_state WHERE singleton = 1",
      );
      await this.ctx.storage.deleteAlarm();
      return;
    }

    await this.persist();
    await this.refreshAlarm();
  }

  // Turns every lapsed grace window into a real disconnect. Returns whether
  // anything changed, so the caller can skip a needless broadcast.
  private expireGracePeriods(): boolean {
    if (!this.room) {
      return false;
    }

    const now = Date.now();
    let changed = false;

    for (const player of this.room.players) {
      if (player.graceUntil === null || player.graceUntil > now) {
        continue;
      }

      player.graceUntil = null;
      player.connected = false;
      player.reconnectUntil = player.isHost
        ? null
        : now + REJOIN_RESERVATION_MS;
      changed = true;
    }

    return changed;
  }

  private async handleJoin(
    ws: WebSocket,
    message: JoinMessage,
  ): Promise<void> {
    if (this.getAttachment(ws)) {
      return;
    }

    const pendingAttachment = this.getPendingAttachment(ws);

    if (!pendingAttachment) {
      this.closeForInvalidMessage(ws, "Missing room connection context.");
      return;
    }

    const name = message.name.trim().slice(0, 20);

    if (!name) {
      this.closeForInvalidMessage(ws, "A player name is required.");
      return;
    }

    if (this.room && this.pruneExpiredReconnectReservations()) {
      await this.persist();
    }

    if (this.room && (message.rejoinId || message.deviceId)) {
      const existingPlayer = this.room.players.find((player) =>
        Boolean(message.rejoinId && player.id === message.rejoinId) ||
        Boolean(
          message.deviceId &&
          player.deviceId === message.deviceId &&
          player.name.toLocaleLowerCase() === name.toLocaleLowerCase(),
        )
      );

      // Only the device that owns the socket can rejoin. A group member's id is
      // visible in the broadcast roster, so accepting it here would let any
      // other device claim that person's identity.
      if (existingPlayer && existingPlayer.groupLeaderId === null) {
        existingPlayer.connected = true;
        existingPlayer.connSeq += 1;
        existingPlayer.reconnectUntil = null;
        existingPlayer.graceUntil = null;
        existingPlayer.present = true;

        // Group members have no socket of their own - their presence in the
        // room follows the device that entered them.
        for (const member of this.groupMembers(existingPlayer.id)) {
          member.connected = true;
          member.connSeq = existingPlayer.connSeq;
          member.reconnectUntil = null;
          member.graceUntil = null;
          member.present = true;
        }

        ws.serializeAttachment({
          playerId: existingPlayer.id,
          isHost: existingPlayer.isHost,
          connSeq: existingPlayer.connSeq,
        } satisfies SocketAttachment);

        await this.markRoomConnected();
        await this.persist();
        this.sendJoined(ws, existingPlayer.id);

        this.broadcast({
          type: "roster-update",
          players: this.room.players,
        });

        return;
      }
    }

    // Extra people sharing this device. They join as full roster entries in the
    // same transaction as the person holding it, so the room never ends up with
    // half a group in it.
    const guestNames = Array.isArray(message.guestNames)
      ? message.guestNames
          .map((guestName) => String(guestName).trim().slice(0, 20))
          .filter((guestName) => guestName.length > 0)
      : [];

    if (guestNames.length > MAX_GROUP_SIZE - 1) {
      this.closeForInvalidMessage(
        ws,
        `At most ${MAX_GROUP_SIZE} players can share one device.`,
      );
      return;
    }

    const joiningNames = [name, ...guestNames];
    const seenNames = new Set<string>();

    for (const candidate of joiningNames) {
      const normalized = candidate.toLocaleLowerCase();

      if (seenNames.has(normalized)) {
        this.send(ws, {
          type: "error",
          code: "name-taken",
          name: candidate,
        });
        return;
      }

      seenNames.add(normalized);
    }

    if (this.room) {
      const seatsLeft = Math.max(0, MAX_PLAYERS - this.room.players.length);

      if (joiningNames.length > seatsLeft) {
        this.send(ws, {
          type: "error",
          code: "room-full",
          seatsLeft,
        });
        return;
      }

      const taken = joiningNames.find((candidate) =>
        this.room!.players.some(
          (player) =>
            player.name.toLocaleLowerCase() === candidate.toLocaleLowerCase(),
        ),
      );

      if (taken !== undefined) {
        this.send(ws, {
          type: "error",
          code: "name-taken",
          name: taken,
        });
        return;
      }
    }

    if (!this.room) {
      const roomCode = this.getRoomCodeFromSocketContext(ws);

      if (
        (message.scoringMode !== "host" &&
          message.scoringMode !== "each") ||
        typeof message.gameKey !== "string" ||
        !message.gameKey ||
        message.gameKey.length > 40
      ) {
        this.closeForInvalidMessage(
          ws,
          "The first player must provide scoringMode and gameKey.",
        );
        return;
      }

      const winScore =
        typeof message.winScore === "number" && Number.isFinite(message.winScore)
          ? Math.max(0, Math.floor(message.winScore))
          : 0;
      const minScore =
        typeof message.minScore === "number" && Number.isFinite(message.minScore)
          ? Math.max(0, Math.floor(message.minScore))
          : 0;
      const ruleOverrides =
        typeof message.ruleOverrides === "object" && message.ruleOverrides !== null
          ? message.ruleOverrides
          : {};
      const customRules = Array.isArray(message.customRules)
        ? message.customRules
            .filter((rule) => typeof rule === "string")
            .slice(0, 50)
            .map((rule) => rule.slice(0, 120))
        : [];

      this.room = {
        roomCode,
        scoringMode: message.scoringMode,
        gameKey: message.gameKey,
        winScore,
        minScore,
        players: [],
        rounds: [],
        roundSubmitted: [],
        roundStarts: [],
        onBoard: [],
        gameOver: false,
        disconnectedAt: null,
        ruleOverrides,
        customRules,
        currentTurnPlayerId: null,
      };
    }

    const player: Player = {
      id: crypto.randomUUID(),
      name,
      connected: true,
      isHost: this.room.players.length === 0,
      connSeq: 1,
      scorerId: null,
      groupLeaderId: null,
      color: PLAYER_COLORS[this.room.players.length % PLAYER_COLORS.length],
      deviceId: typeof message.deviceId === "string" ? message.deviceId : null,
      reconnectUntil: null,
      graceUntil: null,
      present: true,
    };

    if (player.isHost) {
      this.room.currentTurnPlayerId = player.id;
    }

    const joining: Player[] = [player];

    for (const guestName of guestNames) {
      joining.push({
        id: crypto.randomUUID(),
        name: guestName,
        connected: true,
        isHost: false,
        connSeq: player.connSeq,
        // In 'each' rooms the device that entered them is the one submitting
        // their scores; in 'host' rooms only the host enters anything, so
        // there is nothing to nominate.
        scorerId: this.room.scoringMode === "each" ? player.id : null,
        groupLeaderId: player.id,
        color: PLAYER_COLORS[(this.room.players.length + joining.length) % PLAYER_COLORS.length],
        deviceId: null,
        reconnectUntil: null,
        graceUntil: null,
        // Seats entered on someone else's device share that device's screen.
        present: true,
      });
    }

    for (const joiner of joining) {
      this.room.players.push(joiner);

      for (const round of this.room.rounds) {
        round.push(null);
      }

      this.room.roundSubmitted.push(false);
      this.room.onBoard.push(this.room.minScore === 0);
    }

    // A scorer nominated during the join flow can have left (or taken on a
    // scorer of their own) in the gap since the roster was fetched - a rejected
    // nomination just leaves the new player scoring for themselves. A device
    // speaking for a group can't nominate at all: it already scores for its
    // own members, and nominations never chain.
    if (guestNames.length === 0 && typeof message.scorerId === "string") {
      this.applyScorer(player.id, message.scorerId);
    }

    ws.serializeAttachment({
      playerId: player.id,
      isHost: player.isHost,
      connSeq: player.connSeq,
    } satisfies SocketAttachment);

    await this.markRoomConnected();
    await this.persist();
    this.sendJoined(ws, player.id);

    this.broadcast({
      type: "roster-update",
      players: this.room.players,
      currentTurnPlayerId: this.room.currentTurnPlayerId,
    });
  }

  private async handleSubmitScore(
    attachment: SocketAttachment,
    value: number,
  ): Promise<void> {
    await this.handleSubmitScores(attachment, [
      { playerId: attachment.playerId, value },
    ]);
  }

  // Handles both a player's own submission and the batch a proxy scorer sends
  // for themselves plus everyone who nominated them.
  private async handleSubmitScores(
    attachment: SocketAttachment,
    entries: Array<{ playerId: string; value: number }>,
  ): Promise<void> {
    const room = this.room;

    if (!room || room.gameOver || entries.length === 0) {
      return;
    }

    const resolved: Array<{ index: number; value: number }> = [];

    for (const entry of entries) {
      if (!Number.isFinite(entry.value)) {
        return;
      }

      const index = room.players.findIndex(
        (player) => player.id === entry.playerId,
      );

      // Skip rather than reject the whole batch: a column already in for this
      // round, or one whose player revoked the nomination between the modal
      // opening and this submission, shouldn't cost the sender their own score.
      if (
        index === -1 ||
        !this.canScoreFor(attachment.playerId, index) ||
        room.roundSubmitted[index] ||
        resolved.some((item) => item.index === index)
      ) {
        continue;
      }

      resolved.push({ index, value: entry.value });
    }

    if (resolved.length === 0) {
      return;
    }

    if (room.rounds.length === 0) {
      this.openRound();
    }

    const currentRound = room.rounds[room.rounds.length - 1];

    for (const { index, value } of resolved) {
      currentRound[index] = this.applyEntryThreshold(index, value);
      room.roundSubmitted[index] = true;
    }

    this.advanceCurrentTurnIfScored(resolved.map((entry) => entry.index));

    await this.persist();

    this.broadcast({
      type: "round-update",
      rounds: room.rounds,
      roundSubmitted: room.roundSubmitted,
      roundStarts: room.roundStarts,
      currentTurnPlayerId: room.currentTurnPlayerId,
    });

    await this.advanceRoundIfComplete();
  }

  // A player may write their own column, the column of any seat their device
  // brought into the room (a group), or the column of anyone who has nominated
  // them as scorer. Nominations only exist in 'each' scoring mode; groups exist
  // in both, which is why the group arm sits above the mode check. Leaving the
  // group case out silently dropped every entry a multi-seat device sent for
  // its extra seats, and the turn then bounced straight back to the seat whose
  // score had just been discarded.
  private canScoreFor(actorId: string, targetIndex: number): boolean {
    const target = this.room?.players[targetIndex];

    if (!target) {
      return false;
    }

    if (target.id === actorId) {
      return true;
    }

    if (target.groupLeaderId === actorId) {
      return true;
    }

    return (
      this.room?.scoringMode === "each" && target.scorerId === actorId
    );
  }

  // Validates and applies a nomination. Returns false (leaving the room
  // untouched) when the nomination isn't allowed.
  private applyScorer(playerId: string, scorerId: string | null): boolean {
    const room = this.room;

    if (!room || room.scoringMode !== "each") {
      return false;
    }

    const player = room.players.find(
      (candidate) => candidate.id === playerId,
    );

    if (!player) {
      return false;
    }

    if (scorerId === null) {
      player.scorerId = null;
      return true;
    }

    if (scorerId === playerId) {
      return false;
    }

    const scorer = room.players.find(
      (candidate) => candidate.id === scorerId,
    );

    // No chains in either direction: the nominated scorer must enter their own
    // scores, and a player who is already someone else's scorer can't hand
    // their own entry off to a third player.
    if (!scorer || scorer.scorerId !== null) {
      return false;
    }

    if (room.players.some((candidate) => candidate.scorerId === playerId)) {
      return false;
    }

    player.scorerId = scorerId;
    return true;
  }

  private async handleSetScorer(
    ws: WebSocket,
    attachment: SocketAttachment,
    scorerId: string | null,
  ): Promise<void> {
    if (!this.room) {
      return;
    }

    if (!this.applyScorer(attachment.playerId, scorerId)) {
      this.send(ws, {
        type: "error",
        code: "scorer-unavailable",
      });
      return;
    }

    await this.persist();

    this.broadcast({
      type: "roster-update",
      players: this.room.players,
    });
  }

  // Everyone entered on the same device as this player. Empty unless this
  // player led a group join - they follow their leader for connection state
  // and for removal.
  private groupMembers(playerId: string): Player[] {
    return (
      this.room?.players.filter(
        (player) => player.groupLeaderId === playerId,
      ) ?? []
    );
  }

  // Cosmetic presence. The client reports it on visibilitychange, so it says
  // "this device has the app on screen", which is a different question from
  // "is this player still in the game" - that one is `connected`, and only the
  // grace window may answer it.
  private async handlePresence(
    attachment: SocketAttachment,
    visible: unknown,
  ): Promise<void> {
    if (!this.room || typeof visible !== "boolean") {
      return;
    }

    const player = this.room.players.find(
      (candidate) => candidate.id === attachment.playerId,
    );

    if (!player) {
      return;
    }

    // Every seat this device entered shares its screen, so they move together.
    const seats = [player, ...this.groupMembers(player.id)];

    if (seats.every((seat) => seat.present === visible)) {
      return; // nothing changed - do not wake the whole room to say so
    }

    for (const seat of seats) {
      seat.present = visible;
    }

    await this.persist();
    this.broadcastPresence(seats);
  }

  // A slim message rather than a roster-update: presence changes every time a
  // phone locks, and a full roster on each one is a lot of traffic for a dot.
  private broadcastPresence(seats: Player[]): void {
    this.broadcast({
      type: "presence-update",
      presence: seats.map((seat) => ({ id: seat.id, present: seat.present })),
    });
  }

  private pruneExpiredReconnectReservations(): boolean {
    if (!this.room) return false;
    const now = Date.now();
    const expiredIds = this.room.players
      .filter((player) =>
        !player.isHost &&
        !player.connected &&
        player.reconnectUntil !== null &&
        player.reconnectUntil <= now
      )
      .map((player) => player.id);
    if (expiredIds.length === 0) return false;
    this.removePlayers(expiredIds);
    return true;
  }

  // Removes players and their parallel round/flag columns in one pass, so a
  // group leaving together can't hit index-shift bugs.
  private removePlayers(ids: string[]): void {
    const room = this.room;

    if (!room) {
      return;
    }

    const doomed = new Set(ids);
    const currentTurnIndex = room.players.findIndex(
      (player) => player.id === room.currentTurnPlayerId,
    );
    const keep = room.players.map((player) => !doomed.has(player.id));
    const orderBeforeRemoval = room.players.map((player) => player.id);

    // A removed player can still be recorded as the seat that led a past round
    // off. Handing that round's start to the next seat in the order it was
    // actually played keeps the surviving seats in the same relative rotation,
    // which is what the Farkle final-lap rule counts from.
    room.roundStarts = room.roundStarts.map((starterId) => {
      if (!starterId || !doomed.has(starterId)) {
        return starterId;
      }

      const start = orderBeforeRemoval.indexOf(starterId);

      for (let offset = 1; offset < orderBeforeRemoval.length; offset++) {
        const candidate =
          orderBeforeRemoval[(start + offset) % orderBeforeRemoval.length];
        if (!doomed.has(candidate)) {
          return candidate;
        }
      }

      return "";
    });

    room.players = room.players.filter((_, index) => keep[index]);
    room.rounds = room.rounds.map((round) =>
      round.filter((_, index) => keep[index]),
    );
    room.roundSubmitted = room.roundSubmitted.filter(
      (_, index) => keep[index],
    );
    room.onBoard = room.onBoard.filter((_, index) => keep[index]);

    if (room.currentTurnPlayerId && doomed.has(room.currentTurnPlayerId)) {
      room.currentTurnPlayerId = room.players.length > 0
        ? room.players[Math.min(currentTurnIndex, room.players.length - 1)].id
        : null;
    }

    for (const id of ids) {
      this.clearScorerReferences(id);
    }

    // Defensive: a member outliving its leader would otherwise point at an id
    // that no longer exists.
    for (const player of room.players) {
      if (player.groupLeaderId !== null && doomed.has(player.groupLeaderId)) {
        player.groupLeaderId = null;
      }
    }
  }

  // Called when a player leaves or is removed: anyone who nominated them falls
  // back to entering their own scores rather than pointing at a missing id.
  private clearScorerReferences(playerId: string): void {
    if (!this.room) {
      return;
    }

    for (const player of this.room.players) {
      if (player.scorerId === playerId) {
        player.scorerId = null;
      }
    }
  }

  // Mirrors the single-player entry-threshold rule: a player not yet on the
  // board needs `minScore` in a single round to get on; below that, the round
  // records null instead of the raw value.
  private applyEntryThreshold(
    playerIndex: number,
    value: number,
  ): number | null {
    if (!this.room) {
      return value;
    }

    if (this.room.onBoard[playerIndex]) {
      return value;
    }

    if (this.room.gameKey === "farkle" && value === 0) {
      return 0;
    }

    if (value >= this.room.minScore) {
      this.room.onBoard[playerIndex] = true;
      return value;
    }

    return null;
  }

  private async handleEditScore(
    attachment: SocketAttachment,
    value: number,
    roundIndex?: number,
    playerId?: string,
  ): Promise<void> {
    if (
      !this.room ||
      this.room.gameOver ||
      !Number.isFinite(value) ||
      this.room.rounds.length === 0
    ) {
      return;
    }

    const targetPlayerId = playerId ?? attachment.playerId;
    const playerIndex = this.room.players.findIndex(
      (player) => player.id === targetPlayerId,
    );

    if (
      playerIndex === -1 ||
      !this.canScoreFor(attachment.playerId, playerIndex)
    ) {
      return;
    }

    const targetIndex =
      roundIndex !== undefined ? roundIndex : this.room.rounds.length - 1;

    if (targetIndex < 0 || targetIndex >= this.room.rounds.length) {
      return;
    }

    // Editing the still-open current round requires having already submitted
    // it (this is a correction, not a back-door around submit-score). Past
    // rounds have no live "submitted" flag - a player's own cell there is
    // always theirs to correct, including one left null while disconnected.
    const isCurrentRound = targetIndex === this.room.rounds.length - 1;

    if (isCurrentRound && !this.room.roundSubmitted[playerIndex]) {
      return;
    }

    const targetRound = this.room.rounds[targetIndex];

    // Judge "already on board" from rounds before this one, not the global
    // onBoard flag - that flag reflects the latest round, so editing an
    // earlier still-off-board round after a later round put the player on
    // board would otherwise skip the threshold check entirely.
    const onBoardBeforeThisRound =
      this.room.minScore === 0 ||
      this.room.rounds
        .slice(0, targetIndex)
        .some((round) =>
          round[playerIndex] !== null &&
          !(this.room!.gameKey === "farkle" && round[playerIndex] === 0)
        );

    targetRound[playerIndex] =
      onBoardBeforeThisRound || value >= this.room.minScore ||
      (this.room.gameKey === "farkle" && value === 0)
        ? value
        : null;
    this.room.onBoard[playerIndex] =
      this.room.minScore === 0 ||
      this.room.rounds.some((round) =>
        round[playerIndex] !== null &&
        !(this.room!.gameKey === "farkle" && round[playerIndex] === 0)
      );

    await this.persist();

    this.broadcast({
      type: "round-update",
      rounds: this.room.rounds,
      roundSubmitted: this.room.roundSubmitted,
      roundStarts: this.room.roundStarts,
    });
  }

  private async handleRemovePlayer(
    ws: WebSocket,
    attachment: SocketAttachment,
    playerId: string,
  ): Promise<void> {
    if (
      !this.room ||
      !attachment.isHost ||
      !this.isCurrentHost(attachment.playerId)
    ) {
      return;
    }

    const playerIndex = this.room.players.findIndex(
      (player) => player.id === playerId,
    );

    if (playerIndex === -1) {
      return;
    }

    // Removing the person holding a device removes everyone they entered -
    // nobody would be left able to score those columns. Removing one of their
    // group members takes only that member.
    const removedIds = [
      playerId,
      ...this.groupMembers(playerId).map((member) => member.id),
    ];

    this.removePlayers(removedIds);
    await this.refreshAlarm();
    await this.persist();

    for (const removedId of removedIds) {
      this.broadcast({
        type: "player-removed",
        playerId: removedId,
      });
    }

    this.broadcast({
      type: "roster-update",
      players: this.room.players,
      currentTurnPlayerId: this.room.currentTurnPlayerId,
    });

    for (const socket of this.ctx.getWebSockets()) {
      const socketAttachment = this.getAttachment(socket);

      if (
        socketAttachment &&
        removedIds.includes(socketAttachment.playerId)
      ) {
        socket.close(
          PLAYER_REMOVED_CLOSE_CODE,
          "Removed from room by host",
        );
      }
    }

    if (!removedIds.includes(attachment.playerId)) {
      await this.advanceRoundIfComplete();
    } else {
      ws.close(
        PLAYER_REMOVED_CLOSE_CODE,
        "Removed from room by host",
      );
    }
  }

  private async handleUpdateColor(
    attachment: SocketAttachment,
    playerId: string,
    color: string,
  ): Promise<void> {
    if (!this.room || !PLAYER_COLORS.includes(color)) return;

    const player = this.room.players.find((candidate) => candidate.id === playerId);
    if (!player || (player.id !== attachment.playerId && player.groupLeaderId !== attachment.playerId)) return;

    player.color = color;
    await this.persist();
    this.broadcast({
      type: "roster-update",
      players: this.room.players,
      currentTurnPlayerId: this.room.currentTurnPlayerId,
    });
  }

  private async handleSetCurrentTurn(
    attachment: SocketAttachment,
    playerId: string,
  ): Promise<void> {
    if (!this.room || !attachment.isHost || !this.isCurrentHost(attachment.playerId)) return;
    if (!this.room.players.some((player) => player.id === playerId)) return;

    this.room.currentTurnPlayerId = playerId;
    // Farkle tables roll dice to decide who leads off, so the host declares the
    // first player before anyone scores. Declaring into an untouched round moves
    // where that round begins, which is what the final-round rule counts from.
    const openRoundIndex = this.room.rounds.length - 1;
    if (
      openRoundIndex >= 0 &&
      this.room.roundSubmitted.every((submitted) => !submitted)
    ) {
      this.room.roundStarts[openRoundIndex] = playerId;
    }
    await this.persist();
    this.broadcast({
      type: "turn-update",
      currentTurnPlayerId: playerId,
      roundStarts: this.room.roundStarts,
    });
  }

  private advanceCurrentTurnIfScored(scoredIndexes: number[]): void {
    if (!this.room?.currentTurnPlayerId || this.room.players.length === 0) return;
    const currentIndex = this.room.players.findIndex(
      (player) => player.id === this.room!.currentTurnPlayerId,
    );
    if (currentIndex === -1 || !scoredIndexes.includes(currentIndex)) return;
    this.room.currentTurnPlayerId = this.findNextUnsubmittedPlayerId(currentIndex);
  }

  private findNextUnsubmittedPlayerId(currentIndex: number): string {
    const room = this.room!;
    for (let offset = 1; offset <= room.players.length; offset += 1) {
      const candidateIndex = (currentIndex + offset) % room.players.length;
      const player = room.players[candidateIndex];
      if (!player.connected || room.roundSubmitted[candidateIndex]) continue;
      return player.id;
    }

    // Everyone connected has scored. Keep normal clockwise order ready for the
    // fresh round that advanceRoundIfComplete creates immediately afterwards.
    for (let offset = 1; offset <= room.players.length; offset += 1) {
      const player = room.players[(currentIndex + offset) % room.players.length];
      if (player.connected) return player.id;
    }
    return room.players[currentIndex].id;
  }

  private async handleDeclareGameOver(
    attachment: SocketAttachment,
  ): Promise<void> {
    if (
      !this.room ||
      !attachment.isHost ||
      !this.isCurrentHost(attachment.playerId)
    ) {
      return;
    }

    this.room.gameOver = true;
    await this.persist();

    this.broadcast({
      type: "game-over",
    });
  }

  private async handleHostLeave(
    attachment: SocketAttachment,
  ): Promise<void> {
    if (
      !this.room ||
      !attachment.isHost ||
      !this.isCurrentHost(attachment.playerId)
    ) {
      return;
    }

    this.broadcast({
      type: "room-closed",
    });

    this.room = null;
    this.ctx.storage.sql.exec(
      "DELETE FROM room_state WHERE singleton = 1",
    );
    await this.ctx.storage.deleteAlarm();
  }

  // A non-host player voluntarily leaving (Back / New Game, confirmed) - removes
  // them from the room outright so their name/slot is free for a later rejoin,
  // rather than lingering as a disconnected player that still holds the name.
  private async handleLeaveSelf(
    attachment: SocketAttachment,
  ): Promise<void> {
    if (!this.room) {
      return;
    }

    const playerIndex = this.room.players.findIndex(
      (player) => player.id === attachment.playerId,
    );

    if (playerIndex === -1) {
      return;
    }

    const wasHost = this.room.players[playerIndex].isHost;

    // A device speaking for several people takes all of them with it.
    this.removePlayers([
      attachment.playerId,
      ...this.groupMembers(attachment.playerId).map((member) => member.id),
    ]);

    // Hosts leave via host-leave (which closes the room outright) - this is a
    // defensive fallback only, so the room isn't left permanently host-less.
    if (wasHost && this.room.players.length > 0) {
      this.room.players[0].isHost = true;
    }

    await this.refreshAlarm();
    await this.persist();

    this.broadcast({
      type: "roster-update",
      players: this.room.players,
      currentTurnPlayerId: this.room.currentTurnPlayerId,
    });

    await this.advanceRoundIfComplete();
  }

  // Renames the sender, one of the players they entered on their own device, or
  // - for the host - anyone at the table. A guest can only ever reach their own
  // seat and the seats they added.
  private async handleRenamePlayer(
    ws: WebSocket,
    attachment: SocketAttachment,
    rawName: string,
    targetPlayerId?: string,
  ): Promise<void> {
    if (!this.room) {
      return;
    }

    const name = rawName.trim().slice(0, 20);

    if (!name) {
      return;
    }

    const targetId = targetPlayerId ?? attachment.playerId;
    const player = this.room.players.find(
      (candidate) => candidate.id === targetId,
    );

    if (!player) {
      return;
    }

    const isSelf = player.id === attachment.playerId;
    const isOwnGroupMember = player.groupLeaderId === attachment.playerId;
    const isHostRenaming =
      attachment.isHost && this.isCurrentHost(attachment.playerId);

    if (!isSelf && !isOwnGroupMember && !isHostRenaming) {
      return;
    }

    const normalizedName = name.toLocaleLowerCase();

    if (
      this.room.players.some(
        (candidate) =>
          candidate.id !== player.id &&
          candidate.name.toLocaleLowerCase() === normalizedName,
      )
    ) {
      this.send(ws, {
        type: "error",
        code: "name-taken",
      });
      return;
    }

    player.name = name;
    await this.persist();

    this.broadcast({
      type: "roster-update",
      players: this.room.players,
    });
  }

  // Host-only "New Game" inside a live room: same players, same room code,
  // blank scoreboard back at round 1 with the host holding the first turn.
  private async handleResetGame(
    attachment: SocketAttachment,
  ): Promise<void> {
    if (
      !this.room ||
      !attachment.isHost ||
      !this.isCurrentHost(attachment.playerId)
    ) {
      return;
    }

    this.room.rounds = [];
    this.room.roundSubmitted = this.room.players.map(() => false);
    this.room.roundStarts = [];
    this.room.onBoard = this.room.players.map(() => this.room!.minScore === 0);
    this.room.gameOver = false;
    this.room.currentTurnPlayerId =
      this.room.players.find((player) => player.isHost)?.id ??
      this.room.players[0]?.id ??
      null;

    await this.persist();

    this.broadcast({
      type: "game-reset",
      rounds: this.room.rounds,
      roundSubmitted: this.room.roundSubmitted,
      roundStarts: this.room.roundStarts,
      currentTurnPlayerId: this.room.currentTurnPlayerId,
    });
  }

  // Host-only: the host's rules panel (house rules + edited baseline rule
  // text) is shown live to every guest for the duration of the room, without
  // touching any guest's own saved rules - see handleJoin/sendJoined for the
  // initial sync.
  private async handleUpdateRules(
    attachment: SocketAttachment,
    ruleOverrides: Record<string, unknown>,
    customRules: string[],
  ): Promise<void> {
    if (
      !this.room ||
      !attachment.isHost ||
      !this.isCurrentHost(attachment.playerId)
    ) {
      return;
    }

    this.room.ruleOverrides =
      typeof ruleOverrides === "object" && ruleOverrides !== null
        ? ruleOverrides
        : {};
    this.room.customRules = Array.isArray(customRules)
      ? customRules
          .filter((rule) => typeof rule === "string")
          .slice(0, 50)
          .map((rule) => rule.slice(0, 120))
      : [];

    await this.persist();

    this.broadcast({
      type: "rules-update",
      ruleOverrides: this.room.ruleOverrides,
      customRules: this.room.customRules,
    });
  }

  private async handleHostSubmitScores(
    attachment: SocketAttachment,
    values: Array<number | null>,
    roundIndex?: number,
  ): Promise<void> {
    if (
      !this.room ||
      this.room.gameOver ||
      !attachment.isHost ||
      !this.isCurrentHost(attachment.playerId) ||
      values.length !== this.room.players.length
    ) {
      return;
    }

    // Editing an already-recorded round (current or past): write in place,
    // broadcast, and skip the new-round / auto-advance logic below.
    if (roundIndex !== undefined) {
      if (roundIndex < 0 || roundIndex >= this.room.rounds.length) {
        return;
      }

      const targetRound = this.room.rounds[roundIndex];

      values.forEach((value, index) => {
        targetRound[index] = Number.isFinite(value) ? (value as number) : null;
      });

      await this.persist();

      this.broadcast({
        type: "round-update",
        rounds: this.room.rounds,
        roundSubmitted: this.room.roundSubmitted,
        roundStarts: this.room.roundStarts,
      });

      return;
    }

    if (this.room.rounds.length === 0) {
      this.openRound();
    }

    const currentRound = this.room.rounds[this.room.rounds.length - 1];

    values.forEach((value, index) => {
      if (Number.isFinite(value)) {
        currentRound[index] = this.applyEntryThreshold(index, value as number);
      }
    });
    this.room.roundSubmitted = this.room.players.map(
      (_, index) => this.room!.roundSubmitted[index] || Number.isFinite(values[index]),
    );
    this.advanceCurrentTurnIfScored(
      this.room.players.map((_, index) => index).filter((index) => Number.isFinite(values[index])),
    );

    await this.persist();

    this.broadcast({
      type: "round-update",
      rounds: this.room.rounds,
      roundSubmitted: this.room.roundSubmitted,
      roundStarts: this.room.roundStarts,
      currentTurnPlayerId: this.room.currentTurnPlayerId,
    });

    await this.advanceRoundIfComplete();
  }

  // Opens a blank round row and records whose turn starts it. The starter is
  // whoever holds the turn at that moment: the host's declared first player for
  // round one, and for every round after it the seat the previous round's last
  // submission handed the turn to.
  private openRound(): void {
    if (!this.room) {
      return;
    }

    this.room.rounds.push(this.room.players.map(() => null));
    this.room.roundSubmitted = this.room.players.map(() => false);
    this.room.roundStarts.push(
      this.room.currentTurnPlayerId ?? this.room.players[0]?.id ?? "",
    );
  }

  private async advanceRoundIfComplete(): Promise<void> {
    if (
      !this.room ||
      this.room.gameOver ||
      this.room.rounds.length === 0 ||
      this.room.players.length === 0
    ) {
      return;
    }

    const connectedPlayerIndexes = this.room.players
      .map((player, index) => player.connected ? index : -1)
      .filter((index) => index !== -1);

    if (
      connectedPlayerIndexes.length === 0 ||
      !connectedPlayerIndexes.every(
        (index) => this.room!.roundSubmitted[index],
      )
    ) {
      return;
    }

    this.openRound();

    await this.persist();

    this.broadcast({
      type: "round-advance",
      rounds: this.room.rounds,
      roundSubmitted: this.room.roundSubmitted,
      roundStarts: this.room.roundStarts,
      currentTurnPlayerId: this.room.currentTurnPlayerId,
    });
  }

  private async markRoomConnected(): Promise<void> {
    if (!this.room) {
      return;
    }

    this.room.disconnectedAt = null;
    await this.refreshAlarm();
  }

  // One alarm serves two deadlines: the next grace window to expire, and the
  // deletion of a room nobody is left in. Whichever comes first wins; `alarm`
  // re-arms for the other one afterwards.
  private async refreshAlarm(): Promise<void> {
    if (!this.room) {
      return;
    }

    const allDisconnected =
      this.room.players.length === 0 ||
      this.room.players.every((player) => !player.connected);

    if (allDisconnected) {
      if (this.room.disconnectedAt === null) {
        this.room.disconnectedAt = Date.now();
      }
    } else {
      this.room.disconnectedAt = null;
    }

    const deadlines: number[] = [];

    for (const player of this.room.players) {
      if (player.graceUntil !== null) {
        deadlines.push(player.graceUntil);
      }
    }

    if (this.room.disconnectedAt !== null) {
      deadlines.push(this.room.disconnectedAt + ABANDONED_ROOM_TIMEOUT_MS);
    }

    await this.persist();

    if (deadlines.length === 0) {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    await this.ctx.storage.setAlarm(Math.min(...deadlines));
  }


  private async persist(): Promise<void> {
    if (!this.room) {
      return;
    }

    this.ctx.storage.sql.exec(
      `
        INSERT INTO room_state (singleton, data)
        VALUES (1, ?)
        ON CONFLICT(singleton) DO UPDATE SET data = excluded.data
      `,
      JSON.stringify(this.room),
    );
  }

  private sendJoined(
    ws: WebSocket,
    playerId: string,
  ): void {
    if (!this.room) {
      return;
    }

    this.send(ws, {
      type: "joined",
      playerId,
      roomCode: this.room.roomCode,
      scoringMode: this.room.scoringMode,
      gameKey: this.room.gameKey,
      winScore: this.room.winScore,
      minScore: this.room.minScore,
      players: this.room.players,
      rounds: this.room.rounds,
      roundSubmitted: this.room.roundSubmitted,
      roundStarts: this.room.roundStarts,
      ruleOverrides: this.room.ruleOverrides,
      customRules: this.room.customRules,
      currentTurnPlayerId: this.room.currentTurnPlayerId,
    });
  }

  private broadcast(payload: unknown, excluded?: WebSocket): void {
    const serialized = JSON.stringify(payload);

    for (const ws of this.ctx.getWebSockets()) {
      if (ws === excluded) continue;
      try {
        ws.send(serialized);
      } catch {
        // A closing socket will be reconciled by webSocketClose.
      }
    }
  }

  private send(
    ws: WebSocket,
    payload: unknown,
  ): void {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      // The client disconnected before the response could be sent.
    }
  }

  private getAttachment(
    ws: WebSocket,
  ): SocketAttachment | null {
    const attachment = ws.deserializeAttachment();

    if (
      !attachment ||
      typeof attachment !== "object" ||
      !("playerId" in attachment) ||
      !("isHost" in attachment) ||
      !("connSeq" in attachment) ||
      typeof attachment.playerId !== "string" ||
      typeof attachment.isHost !== "boolean" ||
      typeof attachment.connSeq !== "number"
    ) {
      return null;
    }

    return {
      playerId: attachment.playerId,
      isHost: attachment.isHost,
      connSeq: attachment.connSeq,
    };
  }

  private getPendingAttachment(
    ws: WebSocket,
  ): PendingAttachment | null {
    const attachment = ws.deserializeAttachment();

    if (
      !attachment ||
      typeof attachment !== "object" ||
      !("pendingRoomCode" in attachment) ||
      typeof attachment.pendingRoomCode !== "string"
    ) {
      return null;
    }

    return {
      pendingRoomCode: attachment.pendingRoomCode,
    };
  }

  private isCurrentHost(playerId: string): boolean {
    return Boolean(
      this.room?.players.some(
        (player) =>
          player.id === playerId &&
          player.isHost,
      ),
    );
  }

  private closeForInvalidMessage(
    ws: WebSocket,
    reason: string,
  ): void {
    ws.close(1008, reason.slice(0, 123));
  }

  private getRoomCodeFromSocketContext(
    ws: WebSocket,
  ): string {
    const attachment = this.getPendingAttachment(ws);

    if (!attachment) {
      throw new Error("Room code was unavailable during initialization.");
    }

    return attachment.pendingRoomCode;
  }

  private isClientMessage(
    value: unknown,
  ): value is ClientMessage {
    if (
      !value ||
      typeof value !== "object" ||
      !("type" in value) ||
      typeof value.type !== "string"
    ) {
      return false;
    }

    switch (value.type) {
      case "join":
        return (
          "name" in value &&
          typeof value.name === "string" &&
          (!("scoringMode" in value) ||
            value.scoringMode === undefined ||
            value.scoringMode === "host" ||
            value.scoringMode === "each") &&
          (!("gameKey" in value) ||
            value.gameKey === undefined ||
            typeof value.gameKey === "string") &&
          (!("rejoinId" in value) ||
            value.rejoinId === undefined ||
            typeof value.rejoinId === "string") &&
          (!("winScore" in value) ||
            value.winScore === undefined ||
            (typeof value.winScore === "number" && Number.isFinite(value.winScore))) &&
          (!("minScore" in value) ||
            value.minScore === undefined ||
            (typeof value.minScore === "number" && Number.isFinite(value.minScore))) &&
          (!("ruleOverrides" in value) ||
            value.ruleOverrides === undefined ||
            (typeof value.ruleOverrides === "object" && value.ruleOverrides !== null)) &&
          (!("customRules" in value) ||
            value.customRules === undefined ||
            (Array.isArray(value.customRules) &&
              value.customRules.every((rule) => typeof rule === "string"))) &&
          (!("scorerId" in value) ||
            value.scorerId === undefined ||
            value.scorerId === null ||
            typeof value.scorerId === "string") &&
          (!("guestNames" in value) ||
            value.guestNames === undefined ||
            (Array.isArray(value.guestNames) &&
              value.guestNames.every(
                (guestName) => typeof guestName === "string",
              ))) &&
          (!("deviceId" in value) ||
            value.deviceId === undefined ||
            (typeof value.deviceId === "string" && value.deviceId.length <= 100))
        );

      case "host-leave":
      case "leave-self":
      case "ping":
      case "reset-game":
        return true;

      case "presence":
        return "visible" in value && typeof value.visible === "boolean";

      case "rename-self":
        return (
          "name" in value &&
          typeof value.name === "string" &&
          (!("playerId" in value) ||
            value.playerId === undefined ||
            typeof value.playerId === "string")
        );

      case "submit-score":
        return (
          "value" in value &&
          typeof value.value === "number" &&
          Number.isFinite(value.value)
        );

      case "submit-scores-for":
        return (
          "entries" in value &&
          Array.isArray(value.entries) &&
          value.entries.length > 0 &&
          value.entries.every(
            (entry) =>
              entry &&
              typeof entry === "object" &&
              typeof entry.playerId === "string" &&
              typeof entry.value === "number" &&
              Number.isFinite(entry.value),
          )
        );

      case "set-scorer":
        return (
          "scorerId" in value &&
          (value.scorerId === null || typeof value.scorerId === "string")
        );

      case "edit-score":
        return (
          "value" in value &&
          typeof value.value === "number" &&
          Number.isFinite(value.value) &&
          (!("roundIndex" in value) ||
            value.roundIndex === undefined ||
            (typeof value.roundIndex === "number" &&
              Number.isInteger(value.roundIndex) &&
              value.roundIndex >= 0)) &&
          (!("playerId" in value) ||
            value.playerId === undefined ||
            typeof value.playerId === "string")
        );

      case "remove-player":
        return (
          "playerId" in value &&
          typeof value.playerId === "string"
        );

      case "update-color":
        return (
          "playerId" in value && typeof value.playerId === "string" &&
          "color" in value && typeof value.color === "string"
        );

      case "set-current-turn":
        return (
          "playerId" in value && typeof value.playerId === "string"
        );

      case "declare-game-over":
      case "celebrate":
        return true;

      case "host-submit-scores":
        return (
          "values" in value &&
          Array.isArray(value.values) &&
          value.values.every(
            (v) => v === null || (typeof v === "number" && Number.isFinite(v)),
          ) &&
          (!("roundIndex" in value) ||
            value.roundIndex === undefined ||
            (typeof value.roundIndex === "number" &&
              Number.isInteger(value.roundIndex) &&
              value.roundIndex >= 0))
        );

      case "update-rules":
        return (
          "ruleOverrides" in value &&
          typeof value.ruleOverrides === "object" &&
          value.ruleOverrides !== null &&
          "customRules" in value &&
          Array.isArray(value.customRules) &&
          value.customRules.every((rule) => typeof rule === "string")
        );

      default:
        return false;
    }
  }
}
