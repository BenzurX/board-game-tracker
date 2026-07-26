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
  onBoard: boolean[]; // parallel to players - true once a player has met minScore in one round
  gameOver: boolean;
  disconnectedAt: number | null;
  ruleOverrides: Record<string, unknown>; // host's edited baseline rule text, opaque to the server
  customRules: string[]; // host's house-rules list, shown read-only to guests
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
}

interface SubmitScoreMessage {
  type: "submit-score";
  value: number;
}

interface EditScoreMessage {
  type: "edit-score";
  value: number;
  // Present when correcting a specific already-recorded round (current or
  // past) instead of just the still-open current round.
  roundIndex?: number;
}

interface RemovePlayerMessage {
  type: "remove-player";
  playerId: string;
}

interface DeclareGameOverMessage {
  type: "declare-game-over";
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
  | EditScoreMessage
  | RemovePlayerMessage
  | DeclareGameOverMessage
  | HostSubmitScoresMessage
  | HostLeaveMessage
  | LeaveSelfMessage
  | RenameSelfMessage
  | UpdateRulesMessage;

interface StoredRoomRow {
  data: string;
}

const MAX_PLAYERS = 8;
const ABANDONED_ROOM_TIMEOUT_MS = 30 * 60 * 1000;
const PLAYER_REMOVED_CLOSE_CODE = 4001;

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
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/__status") {
      return Response.json({
        initialized: this.room !== null,
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

      case "edit-score":
        await this.handleEditScore(attachment, parsed.value, parsed.roundIndex);
        break;

      case "remove-player":
        await this.handleRemovePlayer(ws, attachment, parsed.playerId);
        break;

      case "declare-game-over":
        await this.handleDeclareGameOver(attachment);
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
        await this.handleRenameSelf(ws, attachment, parsed.name);
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

    player.connected = false;
    await this.updateAbandonedRoomAlarm();
    await this.persist();

    this.broadcast({
      type: "roster-update",
      players: this.room.players,
    });

    await this.advanceRoundIfComplete();
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

    const allDisconnected =
      this.room.players.length === 0 ||
      this.room.players.every((player) => !player.connected);

    if (!allDisconnected) {
      this.room.disconnectedAt = null;
      await this.ctx.storage.deleteAlarm();
      await this.persist();
      return;
    }

    const disconnectedAt = this.room.disconnectedAt ?? Date.now();
    const deleteAt = disconnectedAt + ABANDONED_ROOM_TIMEOUT_MS;

    if (Date.now() < deleteAt) {
      this.room.disconnectedAt = disconnectedAt;
      await this.ctx.storage.setAlarm(deleteAt);
      await this.persist();
      return;
    }

    this.room = null;
    this.ctx.storage.sql.exec(
      "DELETE FROM room_state WHERE singleton = 1",
    );
    await this.ctx.storage.deleteAlarm();
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

    if (this.room && message.rejoinId) {
      const existingPlayer = this.room.players.find(
        (player) => player.id === message.rejoinId,
      );

      if (existingPlayer) {
        existingPlayer.connected = true;
        existingPlayer.connSeq += 1;

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

    if (this.room) {
      if (this.room.players.length >= MAX_PLAYERS) {
        this.send(ws, {
          type: "error",
          code: "room-full",
        });
        return;
      }

      const normalizedName = name.toLocaleLowerCase();

      if (
        this.room.players.some(
          (player) => player.name.toLocaleLowerCase() === normalizedName,
        )
      ) {
        this.send(ws, {
          type: "error",
          code: "name-taken",
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
        onBoard: [],
        gameOver: false,
        disconnectedAt: null,
        ruleOverrides,
        customRules,
      };
    }

    const player: Player = {
      id: crypto.randomUUID(),
      name,
      connected: true,
      isHost: this.room.players.length === 0,
      connSeq: 1,
    };

    this.room.players.push(player);

    for (const round of this.room.rounds) {
      round.push(null);
    }

    this.room.roundSubmitted.push(false);
    this.room.onBoard.push(this.room.minScore === 0);

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
    });
  }

  private async handleSubmitScore(
    attachment: SocketAttachment,
    value: number,
  ): Promise<void> {
    if (!this.room || this.room.gameOver || !Number.isFinite(value)) {
      return;
    }

    const playerIndex = this.room.players.findIndex(
      (player) => player.id === attachment.playerId,
    );

    if (
      playerIndex === -1 ||
      this.room.roundSubmitted[playerIndex]
    ) {
      return;
    }

    if (this.room.rounds.length === 0) {
      this.room.rounds.push(
        this.room.players.map(() => null),
      );
      this.room.roundSubmitted =
        this.room.players.map(() => false);
    }

    const currentRound =
      this.room.rounds[this.room.rounds.length - 1];

    currentRound[playerIndex] = this.applyEntryThreshold(playerIndex, value);
    this.room.roundSubmitted[playerIndex] = true;

    await this.persist();

    this.broadcast({
      type: "round-update",
      rounds: this.room.rounds,
      roundSubmitted: this.room.roundSubmitted,
    });

    await this.advanceRoundIfComplete();
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
  ): Promise<void> {
    if (
      !this.room ||
      this.room.gameOver ||
      !Number.isFinite(value) ||
      this.room.rounds.length === 0
    ) {
      return;
    }

    const playerIndex = this.room.players.findIndex(
      (player) => player.id === attachment.playerId,
    );

    if (playerIndex === -1) {
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

    targetRound[playerIndex] = this.applyEntryThreshold(playerIndex, value);
    await this.persist();

    this.broadcast({
      type: "round-update",
      rounds: this.room.rounds,
      roundSubmitted: this.room.roundSubmitted,
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

    this.room.players.splice(playerIndex, 1);

    for (const round of this.room.rounds) {
      round.splice(playerIndex, 1);
    }

    this.room.roundSubmitted.splice(playerIndex, 1);
    this.room.onBoard.splice(playerIndex, 1);
    await this.updateAbandonedRoomAlarm();
    await this.persist();

    this.broadcast({
      type: "player-removed",
      playerId,
    });

    this.broadcast({
      type: "roster-update",
      players: this.room.players,
    });

    for (const socket of this.ctx.getWebSockets()) {
      const socketAttachment = this.getAttachment(socket);

      if (socketAttachment?.playerId === playerId) {
        socket.close(
          PLAYER_REMOVED_CLOSE_CODE,
          "Removed from room by host",
        );
      }
    }

    if (attachment.playerId !== playerId) {
      await this.advanceRoundIfComplete();
    } else {
      ws.close(
        PLAYER_REMOVED_CLOSE_CODE,
        "Removed from room by host",
      );
    }
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

    this.room.players.splice(playerIndex, 1);

    for (const round of this.room.rounds) {
      round.splice(playerIndex, 1);
    }

    this.room.roundSubmitted.splice(playerIndex, 1);
    this.room.onBoard.splice(playerIndex, 1);

    // Hosts leave via host-leave (which closes the room outright) - this is a
    // defensive fallback only, so the room isn't left permanently host-less.
    if (wasHost && this.room.players.length > 0) {
      this.room.players[0].isHost = true;
    }

    await this.updateAbandonedRoomAlarm();
    await this.persist();

    this.broadcast({
      type: "roster-update",
      players: this.room.players,
    });

    await this.advanceRoundIfComplete();
  }

  private async handleRenameSelf(
    ws: WebSocket,
    attachment: SocketAttachment,
    rawName: string,
  ): Promise<void> {
    if (!this.room) {
      return;
    }

    const name = rawName.trim().slice(0, 20);

    if (!name) {
      return;
    }

    const player = this.room.players.find(
      (candidate) => candidate.id === attachment.playerId,
    );

    if (!player) {
      return;
    }

    const normalizedName = name.toLocaleLowerCase();

    if (
      this.room.players.some(
        (candidate) =>
          candidate.id !== attachment.playerId &&
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
      });

      return;
    }

    if (this.room.rounds.length === 0) {
      this.room.rounds.push(this.room.players.map(() => null));
      this.room.roundSubmitted = this.room.players.map(() => false);
    }

    const currentRound = this.room.rounds[this.room.rounds.length - 1];

    values.forEach((value, index) => {
      currentRound[index] = Number.isFinite(value)
        ? this.applyEntryThreshold(index, value as number)
        : null;
    });
    this.room.roundSubmitted = this.room.players.map(() => true);

    await this.persist();

    this.broadcast({
      type: "round-update",
      rounds: this.room.rounds,
      roundSubmitted: this.room.roundSubmitted,
    });

    await this.advanceRoundIfComplete();
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

    this.room.rounds.push(
      this.room.players.map(() => null),
    );
    this.room.roundSubmitted =
      this.room.players.map(() => false);

    await this.persist();

    this.broadcast({
      type: "round-advance",
      rounds: this.room.rounds,
      roundSubmitted: this.room.roundSubmitted,
    });
  }

  private async markRoomConnected(): Promise<void> {
    if (!this.room) {
      return;
    }

    this.room.disconnectedAt = null;
    await this.ctx.storage.deleteAlarm();
  }

  private async updateAbandonedRoomAlarm(): Promise<void> {
    if (!this.room) {
      return;
    }

    const allDisconnected =
      this.room.players.length === 0 ||
      this.room.players.every((player) => !player.connected);

    if (!allDisconnected) {
      this.room.disconnectedAt = null;
      await this.ctx.storage.deleteAlarm();
      return;
    }

    if (this.room.disconnectedAt === null) {
      this.room.disconnectedAt = Date.now();
    }

    await this.ctx.storage.setAlarm(
      this.room.disconnectedAt + ABANDONED_ROOM_TIMEOUT_MS,
    );
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
      ruleOverrides: this.room.ruleOverrides,
      customRules: this.room.customRules,
    });
  }

  private broadcast(payload: unknown): void {
    const serialized = JSON.stringify(payload);

    for (const ws of this.ctx.getWebSockets()) {
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
              value.customRules.every((rule) => typeof rule === "string")))
        );

      case "host-leave":
      case "leave-self":
        return true;

      case "rename-self":
        return "name" in value && typeof value.name === "string";

      case "submit-score":
        return (
          "value" in value &&
          typeof value.value === "number" &&
          Number.isFinite(value.value)
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
              value.roundIndex >= 0))
        );

      case "remove-player":
        return (
          "playerId" in value &&
          typeof value.playerId === "string"
        );

      case "declare-game-over":
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
