import { createClient } from 'redis';
import { seedQuestions } from "@/lib/questions";
import type { GameRoom, Player, PlayerAnswer, PublicGameState } from "@/lib/types";

const ROOM_TTL_MS = 1000 * 60 * 60 * 6;
const QUESTION_DURATION_MS = 20_000;
const REVEAL_DURATION_MS = 3_500;
const LEADERBOARD_DURATION_MS = 5_000;
const MAX_CORRECT_POINTS = 1000;
const MIN_CORRECT_POINTS = 250;
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const AVATARS = ["👶", "🍼", "🧸", "🛻", "⚽", "🦕", "🎈", "🎵", "💙"];

const redis = createClient({
  url: process.env.REDIS_URL || process.env.KV_REST_API_URL,
  password: process.env.REDIS_PASSWORD || process.env.KV_REST_API_TOKEN,
});

// Connect to Redis
if (!redis.isOpen) {
  redis.connect().catch(console.error);
}

redis.on('error', (err) => console.error('Redis Client Error', err));

export function gameEventChannel(code: string) {
  return `game-events:${code.toUpperCase()}`;
}

async function publishGameUpdate(code: string): Promise<void> {
  try {
    await redis.publish(gameEventChannel(code), 'update');
  } catch (err) {
    console.error('Failed to publish game update:', err);
  }
}

function now() {
  return Date.now();
}

function randomCode() {
  let code = "";
  for (let i = 0; i < 5; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

async function createCode(): Promise<string> {
  const cutoff = now() - ROOM_TTL_MS;
  
  // Clean up expired rooms
  const keys = await redis.keys('game:*');
  for (const key of keys) {
    const roomData = await redis.get(key);
    if (roomData) {
      const room = JSON.parse(roomData) as GameRoom;
      if (room.updatedAt < cutoff) {
        await redis.del(key);
      }
    }
  }
  
  // Generate unique code
  let code = randomCode();
  let exists = await redis.exists(`game:${code}`);
  while (exists) {
    code = randomCode();
    exists = await redis.exists(`game:${code}`);
  }
  return code;
}

function sortPlayers(players: Player[]) {
  return [...players].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.joinedAt - b.joinedAt;
  });
}

function tickRoom(room: GameRoom): boolean {
  const currentTime = now();
  const phaseBefore = room.phase;

  if (room.phase === "question_active" && room.questionStartedAt) {
    const elapsed = currentTime - room.questionStartedAt;
    const everyoneAnswered =
      room.players.length > 0 &&
      room.players.every((player) => room.currentAnswers[player.id] !== undefined);

    if (elapsed >= QUESTION_DURATION_MS || everyoneAnswered) {
      // Update scores when transitioning to reveal phase
      Object.values(room.currentAnswers).forEach((answer) => {
        const player = room.players.find((p) => p.id === answer.playerId);
        if (player && answer.isCorrect) {
          player.score += answer.pointsAwarded;
        }
      });
      
      room.phase = "revealing";
      room.revealStartedAt = currentTime;
      room.leaderboardStartedAt = null;
      room.updatedAt = currentTime;
    }
  }

  if (room.phase === "revealing" && room.revealStartedAt) {
    if (currentTime - room.revealStartedAt >= REVEAL_DURATION_MS) {
      if (room.currentQuestionIndex >= room.questions.length - 1) {
        room.phase = "finished";
      } else {
        room.phase = "leaderboard";
        room.leaderboardStartedAt = currentTime;
      }
      room.updatedAt = currentTime;
    }
  }

  if (room.phase === "leaderboard" && room.leaderboardStartedAt) {
    if (currentTime - room.leaderboardStartedAt >= LEADERBOARD_DURATION_MS) {
      if (room.currentQuestionIndex >= room.questions.length - 1) {
        room.phase = "finished";
      } else {
        room.currentQuestionIndex += 1;
        room.phase = "question_active";
        room.currentAnswers = {};
        room.questionStartedAt = currentTime;
        room.revealStartedAt = null;
        room.leaderboardStartedAt = null;
      }
      room.updatedAt = currentTime;
    }
  }

  return room.phase !== phaseBefore;
}

async function getRoomOrThrow(code: string): Promise<GameRoom> {
  const roomData = await redis.get(`game:${code.toUpperCase()}`);
  if (!roomData) {
    throw new Error("Game room not found");
  }
  
  const room = JSON.parse(roomData) as GameRoom;
  
  // Check if room is expired
  if (now() - room.updatedAt > ROOM_TTL_MS) {
    await redis.del(`game:${code}`);
    throw new Error("Game room not found");
  }
  
  const phaseChanged = tickRoom(room);
  await redis.set(`game:${code}`, JSON.stringify(room), { EX: Math.floor(ROOM_TTL_MS / 1000) });

  if (phaseChanged) {
    await publishGameUpdate(code);
  }

  return room;
}

function buildPublicState(room: GameRoom, playerId: string | null, hostKey?: string | null): PublicGameState {
  const leaderboard = sortPlayers(room.players);
  const currentQuestion = room.questions[room.currentQuestionIndex] ?? null;
  const yourAnswer = playerId ? room.currentAnswers[playerId] : undefined;
  const isHostView = !!hostKey && hostKey === room.hostKey;

  const timeRemainingMs =
    room.phase === "question_active" && room.questionStartedAt
      ? Math.max(0, QUESTION_DURATION_MS - (now() - room.questionStartedAt))
      : room.phase === "leaderboard" && room.leaderboardStartedAt
        ? Math.max(0, LEADERBOARD_DURATION_MS - (now() - room.leaderboardStartedAt))
        : 0;

  const reveal =
    (room.phase === "revealing" || room.phase === "leaderboard" || room.phase === "finished") &&
    currentQuestion
      ? {
          correctIndex: currentQuestion.correctIndex,
          correctOption: currentQuestion.options[currentQuestion.correctIndex],
          correctPlayerIds: Object.values(room.currentAnswers)
            .filter((answer) => answer.isCorrect)
            .map((answer) => answer.playerId),
        }
      : null;

  return {
    code: room.code,
    phase: room.phase,
    isHostView,
    players: room.players,
    leaderboard,
    totalQuestions: room.questions.length,
    currentQuestionIndex: room.currentQuestionIndex,
    timeRemainingMs,
    question:
      currentQuestion && room.phase !== "waiting"
        ? {
            text: currentQuestion.text,
            options: currentQuestion.options,
          }
        : null,
    hasAnswered: !!yourAnswer,
    yourAnswerIndex: yourAnswer?.optionIndex ?? null,
    yourAnswerCorrect: yourAnswer?.isCorrect ?? false,
    reveal,
  };
}

export async function createGame() {
  const code = await createCode();
  const timestamp = now();
  const hostKey = crypto.randomUUID();

  const room: GameRoom = {
    code,
    hostKey,
    phase: "waiting",
    players: [],
    questions: seedQuestions,
    currentQuestionIndex: 0,
    currentAnswers: {},
    questionStartedAt: null,
    revealStartedAt: null,
    leaderboardStartedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await redis.set(`game:${code}`, JSON.stringify(room), { EX: Math.floor(ROOM_TTL_MS / 1000) });
  return { code, hostKey };
}

export async function joinGame(code: string, name: string, avatar?: string) {
  const room = await getRoomOrThrow(code);

  if (room.phase !== "waiting") {
    throw new Error("Game has already started");
  }

  const cleanName = name.trim();
  if (!cleanName) {
    throw new Error("Player name is required");
  }

  const playerId = crypto.randomUUID();
  const player: Player = {
    id: playerId,
    name: cleanName.slice(0, 24),
    avatar: avatar && avatar.trim() ? avatar.trim() : AVATARS[Math.floor(Math.random() * AVATARS.length)],
    score: 0,
    joinedAt: now(),
  };

  room.players.push(player);
  room.updatedAt = now();

  await redis.set(`game:${code}`, JSON.stringify(room), { EX: Math.floor(ROOM_TTL_MS / 1000) });
  await publishGameUpdate(code);

  return {
    player,
    state: buildPublicState(room, playerId),
  };
}

export async function getGameState(code: string, playerId: string | null, hostKey?: string | null) {
  const room = await getRoomOrThrow(code);
  return buildPublicState(room, playerId, hostKey);
}

export async function startGame(code: string, hostKey: string) {
  const room = await getRoomOrThrow(code);

  if (room.hostKey !== hostKey) {
    throw new Error("Only the host screen can start the game");
  }

  if (room.players.length < 1) {
    throw new Error("At least one player is required");
  }

  if (room.phase !== "waiting") {
    throw new Error("Game has already started");
  }

  room.phase = "question_active";
  room.currentQuestionIndex = 0;
  room.currentAnswers = {};
  room.questionStartedAt = now();
  room.revealStartedAt = null;
  room.leaderboardStartedAt = null;
  room.updatedAt = now();

  await redis.set(`game:${code}`, JSON.stringify(room), { EX: Math.floor(ROOM_TTL_MS / 1000) });
  await publishGameUpdate(code);
  return buildPublicState(room, null, hostKey);
}

function getPlayer(room: GameRoom, playerId: string) {
  const player = room.players.find((entry) => entry.id === playerId);
  if (!player) {
    throw new Error("Player not found in this room");
  }
  return player;
}

export async function submitAnswer(code: string, playerId: string, optionIndex: number) {
  const room = await getRoomOrThrow(code);
  const player = getPlayer(room, playerId);

  if (room.phase !== "question_active" || room.questionStartedAt === null) {
    throw new Error("Question is not active right now");
  }

  const question = room.questions[room.currentQuestionIndex];
  if (!question) {
    throw new Error("Question not found");
  }

  if (optionIndex < 0 || optionIndex >= question.options.length) {
    throw new Error("Invalid answer option");
  }

  if (room.currentAnswers[playerId]) {
    return buildPublicState(room, playerId);
  }

  const submittedAt = now();
  const responseMs = submittedAt - room.questionStartedAt;
  const isCorrect = question.correctIndex === optionIndex;
  const speedFactor = Math.max(0, Math.min(1, (QUESTION_DURATION_MS - responseMs) / QUESTION_DURATION_MS));
  const pointsRange = MAX_CORRECT_POINTS - MIN_CORRECT_POINTS;
  const pointsAwarded = isCorrect ? MIN_CORRECT_POINTS + Math.round(pointsRange * speedFactor) : 0;

  const answer: PlayerAnswer = {
    playerId,
    questionIndex: room.currentQuestionIndex,
    optionIndex,
    submittedAt,
    responseMs,
    isCorrect,
    pointsAwarded,
  };

  room.currentAnswers[playerId] = answer;
  // Don't update score here - scores are updated during reveal phase
  room.updatedAt = now();
  tickRoom(room);

  await redis.set(`game:${code}`, JSON.stringify(room), { EX: Math.floor(ROOM_TTL_MS / 1000) });
  await publishGameUpdate(code);
  return buildPublicState(room, playerId);
}

export async function leaveGame(code: string, playerId: string) {
  const room = await getRoomOrThrow(code);

  room.players = room.players.filter((p) => p.id !== playerId);
  room.updatedAt = now();

  const activePhases: GameRoom["phase"][] = ["question_active", "revealing", "leaderboard"];
  if (activePhases.includes(room.phase) && room.players.length === 0) {
    room.phase = "cancelled";
  }

  await redis.set(`game:${code.toUpperCase()}`, JSON.stringify(room), { EX: Math.floor(ROOM_TTL_MS / 1000) });
  await publishGameUpdate(code);
}

export async function resetGame(code: string, hostKey: string) {
  const room = await getRoomOrThrow(code);

  if (room.hostKey !== hostKey) {
    throw new Error("Only the host can reset the game");
  }

  if (room.phase !== "finished" && room.phase !== "cancelled") {
    throw new Error("Game can only be reset after it has finished or been cancelled");
  }

  room.phase = "waiting";
  room.players = room.players.map((p) => ({ ...p, score: 0 }));
  room.currentQuestionIndex = 0;
  room.currentAnswers = {};
  room.questionStartedAt = null;
  room.revealStartedAt = null;
  room.leaderboardStartedAt = null;
  room.updatedAt = now();

  await redis.set(`game:${code.toUpperCase()}`, JSON.stringify(room), { EX: Math.floor(ROOM_TTL_MS / 1000) });
  await publishGameUpdate(code);
  return buildPublicState(room, null, hostKey);
}

export async function endGame(code: string, hostKey: string) {
  const room = await getRoomOrThrow(code);

  if (room.hostKey !== hostKey) {
    throw new Error("Only the host can end the game");
  }

  room.phase = "cancelled";
  room.updatedAt = now();

  await redis.set(`game:${code.toUpperCase()}`, JSON.stringify(room), { EX: 60 });
}

export async function goToNextQuestion(code: string, hostKey: string) {
  const room = await getRoomOrThrow(code);

  if (room.hostKey !== hostKey) {
    throw new Error("Only the host can advance the game");
  }

  if (room.phase !== "leaderboard") {
    throw new Error("Game is not ready for next question");
  }

  if (room.currentQuestionIndex >= room.questions.length - 1) {
    room.phase = "finished";
    room.updatedAt = now();
    await redis.set(`game:${code}`, JSON.stringify(room), { EX: Math.floor(ROOM_TTL_MS / 1000) });
    await publishGameUpdate(code);
    return buildPublicState(room, null, hostKey);
  }

  room.currentQuestionIndex += 1;
  room.phase = "question_active";
  room.currentAnswers = {};
  room.questionStartedAt = now();
  room.revealStartedAt = null;
  room.leaderboardStartedAt = null;
  room.updatedAt = now();

  await redis.set(`game:${code}`, JSON.stringify(room), { EX: Math.floor(ROOM_TTL_MS / 1000) });
  await publishGameUpdate(code);
  return buildPublicState(room, null, hostKey);
}
