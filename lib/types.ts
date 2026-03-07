export type GamePhase =
  | "waiting"
  | "question_active"
  | "revealing"
  | "leaderboard"
  | "finished";

export type Player = {
  id: string;
  name: string;
  avatar: string;
  score: number;
  joinedAt: number;
};

export type Question = {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
};

export type PlayerAnswer = {
  playerId: string;
  questionIndex: number;
  optionIndex: number;
  submittedAt: number;
  responseMs: number;
  isCorrect: boolean;
  pointsAwarded: number;
};

export type GameRoom = {
  code: string;
  hostKey: string;
  phase: GamePhase;
  players: Player[];
  questions: Question[];
  currentQuestionIndex: number;
  currentAnswers: Record<string, PlayerAnswer>;
  questionStartedAt: number | null;
  revealStartedAt: number | null;
  leaderboardStartedAt: number | null;
  createdAt: number;
  updatedAt: number;
};

export type PublicGameState = {
  code: string;
  phase: GamePhase;
  isHostView: boolean;
  players: Player[];
  leaderboard: Player[];
  totalQuestions: number;
  currentQuestionIndex: number;
  timeRemainingMs: number;
  question: {
    text: string;
    options: string[];
  } | null;
  hasAnswered: boolean;
  yourAnswerIndex: number | null;
  yourAnswerCorrect: boolean;
  reveal: {
    correctIndex: number;
    correctOption: string;
    correctPlayerIds: string[];
  } | null;
};
