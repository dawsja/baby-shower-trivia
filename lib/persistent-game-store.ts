import { kv } from '@vercel/kv';
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
  const keys = await kv.keys('game:*');
  for (const key of keys) {
    const room = await kv.get<GameRoom>(key);
    if (room && room.updatedAt < cutoff) {
      await kv.del(key);
    }
  }
  
  // Generate unique code
  let code = randomCode();
  let exists = await kv.exists(`game:${code}`);
  while (exists) {
    code = randomCode();
    exists = await kv.exists(`game:${code}`);
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

function tickRoom(room: GameRoom) {
  const currentTime = now();

  if (room.phase === "question_active" && room.questionStartedAt) {
    const elapsed = currentTime - room.questionStartedAt;
    const everyoneAnswered =
      room.players.length > 0 &&
      room.players.every((player) => room.currentAnswers[player.id] !== undefined);

    if (elapsed >= QUESTION_DURATION_MS || everyoneAnswered) {
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
}

async function getRoomOrThrow(code: string): Promise<GameRoom> {
  const room = await kv.get<GameRoom>(`game:${code.toUpperCase()}`);
  if (!room) {
    throw new Error("Game room not found");
  }
  
  // Check if room is expired
  if (now() - room.updatedAt > ROOM_TTL_MS) {
    await kv.del(`game:${code}`);
    throw new Error("Game room not found");
  }
  
  tickRoom(room);
  await kv.set(`game:${code}`, room, { px: ROOM_TTL_MS });
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

  await kv.set(`game:${code}`, room, { px: ROOM_TTL_MS });
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

  await kv.set(`game:${code}`, room, { px: ROOM_TTL_MS });

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

  await kv.set(`game:${code}`, room, { px: ROOM_TTL_MS });
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
  player.score += pointsAwarded;
  room.updatedAt = now();
  tickRoom(room);

  await kv.set(`game:${code}`, room, { px: ROOM_TTL_MS });
  return buildPublicState(room, playerId);
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
    await kv.set(`game:${code}`, room, { px: ROOM_TTL_MS });
    return buildPublicState(room, null, hostKey);
  }

  room.currentQuestionIndex += 1;
  room.phase = "question_active";
  room.currentAnswers = {};
  room.questionStartedAt = now();
  room.revealStartedAt = null;
  room.leaderboardStartedAt = null;
  room.updatedAt = now();

  await kv.set(`game:${code}`, room, { px: ROOM_TTL_MS });
  return buildPublicState(room, null, hostKey);
}
