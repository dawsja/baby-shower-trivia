"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hash, Eye, CheckCircle2, XCircle, Clock, Lock, LogOut } from "lucide-react";

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

const COUNTDOWN_UPDATE_INTERVAL_MS = 250;
const PHASE_TRANSITION_BUFFER_MS = 500;

export default function GameRoomPage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = useMemo(() => params.code.toUpperCase(), [params.code]);

  const [playerId, setPlayerId] = useState<string | null>(null);
  const [state, setState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confettiPulse, setConfettiPulse] = useState(0);
  const [displayTimeMs, setDisplayTimeMs] = useState(0);
  const lastPhaseRef = useRef<string>("");
  const autoJoinAttemptedRef = useRef(false);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Restore player from localStorage and load initial state
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

  // SSE connection for real-time game state updates
  useEffect(() => {
    if (!playerId) return;

    const url = `/api/game-events?code=${code}&playerId=${encodeURIComponent(playerId)}`;
    const es = new EventSource(url);

    es.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data as string) as { state?: PublicGameState; error?: string };
        if (payload.state) {
          setState(payload.state);
        } else if (payload.error) {
          setError(payload.error);
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      setError("Lost connection");
      es.close();
    };

    return () => es.close();
  }, [playerId, code]);

  // Client-side countdown for smooth timer display
  useEffect(() => {
    if (displayTimerRef.current !== null) {
      clearInterval(displayTimerRef.current);
      displayTimerRef.current = null;
    }

    if (!state || state.timeRemainingMs <= 0) {
      setDisplayTimeMs(0);
      return;
    }

    const receivedAt = Date.now();
    setDisplayTimeMs(state.timeRemainingMs);

    displayTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - receivedAt;
      const remaining = Math.max(0, state.timeRemainingMs - elapsed);
      setDisplayTimeMs(remaining);
      if (remaining <= 0 && displayTimerRef.current !== null) {
        clearInterval(displayTimerRef.current);
        displayTimerRef.current = null;
      }
    }, COUNTDOWN_UPDATE_INTERVAL_MS);

    return () => {
      if (displayTimerRef.current !== null) {
        clearInterval(displayTimerRef.current);
        displayTimerRef.current = null;
      }
    };
  }, [state?.phase, state?.timeRemainingMs]); // eslint-disable-line react-hooks/exhaustive-deps

  // One-shot timer to trigger a server-side tick when a timed phase expires.
  // This calls /api/game-state which runs tickRoom on the server, publishes
  // the phase transition via Redis pub/sub, and the SSE stream delivers the
  // updated state to all connected clients.
  useEffect(() => {
    if (phaseTimerRef.current !== null) {
      clearTimeout(phaseTimerRef.current);
      phaseTimerRef.current = null;
    }

    if (!state || !playerId || state.timeRemainingMs <= 0) return;

    phaseTimerRef.current = setTimeout(() => {
      fetch(`/api/game-state?code=${code}&playerId=${encodeURIComponent(playerId)}`, {
        method: "GET",
        cache: "no-store",
      }).catch(console.error);
    }, state.timeRemainingMs + PHASE_TRANSITION_BUFFER_MS);

    return () => {
      if (phaseTimerRef.current !== null) {
        clearTimeout(phaseTimerRef.current);
        phaseTimerRef.current = null;
      }
    };
  }, [state?.phase, state?.timeRemainingMs, playerId, code]); // eslint-disable-line react-hooks/exhaustive-deps

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

  useEffect(() => {
    if (state?.phase === "cancelled") {
      window.localStorage.removeItem(keyForPlayer(code));
      router.push("/");
    }
  }, [state?.phase, code, router]);

  async function leaveGame() {
    if (!playerId) return;

    try {
      await fetch("/api/leave-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, playerId }),
      });
    } catch (err) {
      // ignore errors — navigate home regardless
      console.error("leaveGame error:", err);
    }

    window.localStorage.removeItem(keyForPlayer(code));
    router.push("/");
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
          <p className="label-row justify-center text-[11px] tracking-[0.22em]">
            <Hash className="h-3 w-3" />
            ROOM CODE
          </p>
          <p className="text-3xl font-black tracking-[0.2em] text-slate-800">{code}</p>
        </header>

        {!playerId && (
          <>
            <JoinForm onSubmit={handleJoin} initialName={initialName} initialAvatar={initialAvatar} />
            {busy && <p className="text-center text-sm text-blue-700">Joining game...</p>}
          </>
        )}

        {playerId && state && state.phase === "waiting" && (
          <>
            <LobbyPanel code={state.code} players={state.players} />
            <button onClick={leaveGame} className="btn-secondary w-full">
              <LogOut className="h-4 w-4" />
              Leave Game
            </button>
          </>
        )}

        {playerId && state && state.phase === "question_active" && state.question && (
          <>
            <QuestionPanel
              questionNumber={state.currentQuestionIndex + 1}
              totalQuestions={state.totalQuestions}
              question={state.question}
              timeRemainingMs={displayTimeMs}
              selectedAnswer={state.yourAnswerIndex}
              onAnswer={submitAnswer}
            />

            {state.hasAnswered && (
              <div className="card-glass flex items-center justify-center gap-2 p-3 text-center text-sm font-semibold text-blue-700">
                <Lock className="h-3.5 w-3.5" />
                Answer locked in.
              </div>
            )}
          </>
        )}

        {playerId && state && state.phase === "revealing" && state.question && state.reveal && (
          <div className="card-glass p-5">
            <p className="label-row text-xs tracking-widest">
              <Eye className="h-3.5 w-3.5" />
              ANSWER REVEAL
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-800">{state.question.text}</h2>
            <p className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-400/15 px-4 py-3 font-semibold text-slate-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Correct answer: {state.reveal.correctOption}
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
              {state.yourAnswerCorrect ? (
                <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Correct! Nice one.</>
              ) : state.yourAnswerIndex === null ? (
                <><Clock className="h-3.5 w-3.5 text-amber-500" /> No answer submitted in time.</>
              ) : (
                <><XCircle className="h-3.5 w-3.5 text-red-500" /> Not this one. You&apos;ll get the next one.</>
              )}
            </p>
          </div>
        )}

        {playerId && state && (state.phase === "leaderboard" || state.phase === "finished") && (
          <LeaderboardPanel
            players={state.leaderboard}
            phase={state.phase}
            autoAdvanceSeconds={Math.max(1, Math.ceil(displayTimeMs / 1000))}
          />
        )}

        {playerId && state?.phase === "cancelled" && (
          <div className="card-glass p-5 text-center">
            <p className="label-row justify-center text-xs tracking-widest">
              <XCircle className="h-3.5 w-3.5 text-red-300" />
              GAME CANCELLED
            </p>
            <p className="mt-2 text-lg font-bold text-slate-800">The game was cancelled.</p>
            <button
              onClick={() => {
                window.localStorage.removeItem(keyForPlayer(code));
                router.push("/");
              }}
              className="btn-secondary mt-4 w-full"
            >
              <LogOut className="h-4 w-4" />
              Return Home
            </button>
          </div>
        )}

        {playerId && state && <Scoreboard players={state.leaderboard} activePlayerId={playerId} compact />}

        {error && <p className="text-center text-sm font-semibold text-red-600">{error}</p>}
      </div>
    </main>
  );
}

