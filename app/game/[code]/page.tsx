"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ConfettiBurst } from "@/components/confetti-burst";
import { JoinForm } from "@/components/join-form";
import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { LobbyPanel } from "@/components/lobby-panel";
import { QuestionPanel } from "@/components/question-panel";
import { Scoreboard } from "@/components/scoreboard";
import type { PublicGameState } from "@/lib/types";

type JoinResponse = {
  player: {
    id: string;
    name: string;
    avatar: string;
  };
  state: PublicGameState;
  error?: string;
};

function keyForPlayer(code: string) {
  return `baby-shower:${code}:player-id`;
}

export default function GameRoomPage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const code = useMemo(() => params.code.toUpperCase(), [params.code]);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confettiPulse, setConfettiPulse] = useState(0);
  const lastPhaseRef = useRef<string>("");
  const autoJoinAttemptedRef = useRef(false);

  const initialName = searchParams.get("name") ?? "";
  const initialAvatar = searchParams.get("avatar") ?? "👶";

  const refreshGameState = useCallback(
    async (id: string) => {
      const response = await fetch(`/api/game-state?code=${code}&playerId=${id}`, {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as { state?: PublicGameState; error?: string };

      if (!response.ok || !payload.state) {
        throw new Error(payload.error ?? "Could not load game state");
      }

      setState(payload.state);
    },
    [code],
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(keyForPlayer(code));
    if (stored) {
      setPlayerId(stored);
      refreshGameState(stored).catch((err) => {
        setError(err instanceof Error ? err.message : "Could not connect to room");
        window.localStorage.removeItem(keyForPlayer(code));
        setPlayerId(null);
      });
    }
  }, [code, refreshGameState]);

  useEffect(() => {
    if (!playerId) {
      return;
    }

    const interval = window.setInterval(() => {
      refreshGameState(playerId).catch((err) => {
        setError(err instanceof Error ? err.message : "Lost connection");
      });
    }, 1200);

    return () => window.clearInterval(interval);
  }, [playerId, refreshGameState]);

  useEffect(() => {
    if (!state) {
      return;
    }

    const phaseChanged = lastPhaseRef.current !== state.phase;
    const justRevealedCorrect = phaseChanged && state.phase === "revealing" && state.yourAnswerCorrect;

    if (justRevealedCorrect) {
      setConfettiPulse((value) => value + 1);
    }

    lastPhaseRef.current = state.phase;
  }, [state]);

  const handleJoin = useCallback(
    async (payload: { name: string; avatar: string }) => {
      setBusy(true);
      setError(null);

      try {
        const response = await fetch("/api/join-game", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            code,
            name: payload.name,
            avatar: payload.avatar,
          }),
        });
        const data = (await response.json()) as JoinResponse;

        if (!response.ok || !data.player || !data.state) {
          throw new Error(data.error ?? "Could not join game");
        }

        setPlayerId(data.player.id);
        setState(data.state);
        window.localStorage.setItem(keyForPlayer(code), data.player.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not join game");
      } finally {
        setBusy(false);
      }
    },
    [code],
  );

  useEffect(() => {
    if (autoJoinAttemptedRef.current || playerId || !initialName) {
      return;
    }

    autoJoinAttemptedRef.current = true;

    handleJoin({ name: initialName, avatar: initialAvatar }).catch(() => {
      return;
    });
  }, [handleJoin, initialAvatar, initialName, playerId]);

  async function postAction(path: string, payload: Record<string, unknown>) {
    if (!playerId) {
      return;
    }

    setError(null);

    const response = await fetch(path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code,
        playerId,
        ...payload,
      }),
    });

    const data = (await response.json()) as { state?: PublicGameState; error?: string };

    if (!response.ok || !data.state) {
      throw new Error(data.error ?? "Action failed");
    }

    setState(data.state);
  }

  async function submitAnswer(optionIndex: number) {
    if (!state || state.hasAnswered || state.phase !== "question_active") {
      return;
    }

    try {
      await postAction("/api/submit-answer", { optionIndex });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit answer");
    }
  }

  return (
    <main className="app-shell flex justify-center">
      <ConfettiBurst trigger={confettiPulse} />

      <div className="relative z-10 mx-auto w-full max-w-md space-y-4">
        <header className="card-glass px-4 py-3 text-center">
          <p className="text-[11px] font-bold tracking-[0.22em] text-sky-100">ROOM CODE</p>
          <p className="text-3xl font-black tracking-[0.2em] text-white">{code}</p>
        </header>

        {!playerId && (
          <>
            <JoinForm onSubmit={handleJoin} initialName={initialName} initialAvatar={initialAvatar} />
            {busy && <p className="text-center text-sm text-sky-100">Joining game...</p>}
          </>
        )}

        {playerId && state && state.phase === "waiting" && (
          <LobbyPanel code={state.code} players={state.players} />
        )}

        {playerId && state && state.phase === "question_active" && state.question && (
          <>
            <QuestionPanel
              questionNumber={state.currentQuestionIndex + 1}
              totalQuestions={state.totalQuestions}
              question={state.question}
              timeRemainingMs={state.timeRemainingMs}
              selectedAnswer={state.yourAnswerIndex}
              onAnswer={submitAnswer}
            />

            {state.hasAnswered && (
              <div className="card-glass p-3 text-center text-sm font-semibold text-sky-100">Answer locked in.</div>
            )}
          </>
        )}

        {playerId && state && state.phase === "revealing" && state.question && state.reveal && (
          <div className="card-glass p-5">
            <p className="text-xs font-semibold tracking-widest text-sky-100">ANSWER REVEAL</p>
            <h2 className="mt-2 text-xl font-bold text-white">{state.question.text}</h2>
            <p className="mt-4 rounded-2xl border border-white/45 bg-white/20 px-4 py-3 font-semibold text-white">
              Correct answer: {state.reveal.correctOption}
            </p>
            <p className="mt-3 text-sm text-sky-100">
              {state.yourAnswerCorrect
                ? "Correct! Nice one."
                : state.yourAnswerIndex === null
                  ? "No answer submitted in time."
                  : "Not this one. You'll get the next one."}
            </p>
          </div>
        )}

        {playerId && state && (state.phase === "leaderboard" || state.phase === "finished") && (
          <LeaderboardPanel
            players={state.leaderboard}
            phase={state.phase}
            autoAdvanceSeconds={Math.max(1, Math.ceil(state.timeRemainingMs / 1000))}
          />
        )}

        {playerId && state && <Scoreboard players={state.leaderboard} activePlayerId={playerId} compact />}

        {error && <p className="text-center text-sm font-semibold text-red-100">{error}</p>}
      </div>
    </main>
  );
}
