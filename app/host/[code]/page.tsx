"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Monitor, Play, Users, HelpCircle, Clock, CheckCircle2, Eye } from "lucide-react";

import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { Scoreboard } from "@/components/scoreboard";
import type { PublicGameState } from "@/lib/types";

export default function HostRoomPage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const code = useMemo(() => params.code.toUpperCase(), [params.code]);
  const hostKey = searchParams.get("hostKey") ?? "";

  const [state, setState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refreshGameState = useCallback(async () => {
    if (!hostKey) {
      return;
    }

    const response = await fetch(
      `/api/game-state?code=${code}&hostKey=${encodeURIComponent(hostKey)}`,
      {
        method: "GET",
        cache: "no-store",
      },
    );
    const payload = (await response.json()) as { state?: PublicGameState; error?: string };

    if (!response.ok || !payload.state) {
      throw new Error(payload.error ?? "Could not load game state");
    }

    setState(payload.state);
  }, [code, hostKey]);

  useEffect(() => {
    refreshGameState().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not connect to room");
    });
  }, [refreshGameState]);

  useEffect(() => {
    if (!hostKey) {
      return;
    }

    const interval = window.setInterval(() => {
      refreshGameState().catch((err) => {
        setError(err instanceof Error ? err.message : "Lost connection");
      });
    }, 1200);

    return () => window.clearInterval(interval);
  }, [hostKey, refreshGameState]);

  async function startGame() {
    if (!hostKey) {
      setError("Missing host key in this URL");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/start-game", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, hostKey }),
      });

      const data = (await response.json()) as { state?: PublicGameState; error?: string };
      if (!response.ok || !data.state) {
        throw new Error(data.error ?? "Could not start game");
      }

      setState(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start game");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="app-shell flex justify-center">
      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-4">
        <header className="card-glass px-5 py-4 text-center">
          <p className="label-row justify-center text-xs tracking-[0.22em]">
            <Monitor className="h-3.5 w-3.5" />
            HOST SCREEN
          </p>
          <p className="mt-1 text-4xl font-black tracking-[0.2em] text-white">{code}</p>
          <p className="mt-1 text-sm text-sky-100">Show this on TV. Guests answer on their phones.</p>
        </header>

        {state?.phase === "waiting" && (
          <div className="card-glass p-5 text-center">
            <p className="label-row justify-center text-xs tracking-widest">
              <Users className="h-3.5 w-3.5" />
              LOBBY
            </p>
            <p className="mt-1 text-2xl font-black text-white">Players joined: {state.players.length}</p>
            <button onClick={startGame} disabled={busy} className="btn-primary mt-5 w-full">
              <Play className="h-4 w-4" />
              {busy ? "Starting..." : "Start Game"}
            </button>
          </div>
        )}

        {state?.phase === "question_active" && state.question && (
          <div className="card-glass p-5">
            <div className="flex items-center justify-between text-sm font-semibold text-sky-100">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4" />
                Question {state.currentQuestionIndex + 1}/{state.totalQuestions}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {Math.max(1, Math.ceil(state.timeRemainingMs / 1000))}s
              </span>
            </div>
            <h2 className="mt-3 text-3xl font-black text-white">{state.question.text}</h2>
            <div className="mt-4 grid gap-2">
              {state.question.options.map((option, index) => (
                <div
                  key={option}
                  className="rounded-2xl border border-white/30 bg-white/10 px-4 py-3 text-lg font-semibold text-white"
                >
                  {String.fromCharCode(65 + index)}. {option}
                </div>
              ))}
            </div>
          </div>
        )}

        {state?.phase === "revealing" && state.question && state.reveal && (
          <div className="card-glass p-5">
            <p className="label-row text-xs tracking-widest">
              <Eye className="h-3.5 w-3.5" />
              ANSWER REVEAL
            </p>
            <h2 className="mt-2 text-2xl font-black text-white">{state.question.text}</h2>
            <p className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-400/15 px-4 py-3 text-xl font-black text-white">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              Correct: {state.reveal.correctOption}
            </p>
            <p className="mt-2 text-sm font-semibold text-sky-100">
              Correct players: {state.reveal.correctPlayerIds.length}/{state.players.length}
            </p>
          </div>
        )}

        {state && (state.phase === "leaderboard" || state.phase === "finished") && (
          <LeaderboardPanel
            players={state.leaderboard}
            phase={state.phase}
            autoAdvanceSeconds={Math.max(1, Math.ceil(state.timeRemainingMs / 1000))}
          />
        )}

        {state && <Scoreboard players={state.leaderboard} activePlayerId={null} />}

        {!hostKey && <p className="text-center text-sm font-semibold text-red-100">Missing host key in URL.</p>}
        {error && <p className="text-center text-sm font-semibold text-red-100">{error}</p>}
      </div>
    </main>
  );
}
