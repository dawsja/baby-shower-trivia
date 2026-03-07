"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Play, Users, HelpCircle, Clock, CheckCircle2, Eye, RotateCcw, LogOut, XCircle } from "lucide-react";

import { LeaderboardPanel } from "@/components/leaderboard-panel";
import { Scoreboard } from "@/components/scoreboard";
import { HostMusic } from "@/components/host-music";
import { WaitingMusic } from "@/components/waiting-music";
import { HowToJoinModal } from "@/components/how-to-join-modal";
import type { PublicGameState } from "@/lib/types";

const COUNTDOWN_UPDATE_INTERVAL_MS = 250;
const PHASE_TRANSITION_BUFFER_MS = 500;

export default function HostRoomPage() {
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = useMemo(() => params.code.toUpperCase(), [params.code]);
  const hostKey = searchParams.get("hostKey") ?? "";

  const [state, setState] = useState<PublicGameState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHowToJoin, setShowHowToJoin] = useState(false);
  const [displayTimeMs, setDisplayTimeMs] = useState(0);
  const phaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const displayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // SSE connection for real-time game state updates
  useEffect(() => {
    if (!hostKey) return;

    const url = `/api/game-events?code=${code}&hostKey=${encodeURIComponent(hostKey)}`;
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
  }, [hostKey, code]);

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

    if (!hostKey || !state || state.timeRemainingMs <= 0) return;

    phaseTimerRef.current = setTimeout(() => {
      fetch(`/api/game-state?code=${code}&hostKey=${encodeURIComponent(hostKey)}`, {
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
  }, [state?.phase, state?.timeRemainingMs, hostKey, code]); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function playAgain() {
    if (!hostKey) return;

    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/reset-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, hostKey }),
      });

      const data = (await response.json()) as { state?: PublicGameState; error?: string };
      if (!response.ok || !data.state) {
        throw new Error(data.error ?? "Could not reset game");
      }

      setState(data.state);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset game");
    } finally {
      setBusy(false);
    }
  }

  async function exitGame() {
    if (!hostKey) return;

    setBusy(true);
    setError(null);

    try {
      await fetch("/api/end-game", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, hostKey }),
      });
    } catch (err) {
      // ignore errors — navigate home regardless
      console.error("exitGame error:", err);
    } finally {
      setBusy(false);
    }

    router.push("/");
  }

  return (
    <main className="app-shell flex justify-center">
      {/* Play countdown music only while players are answering */}
      <HostMusic 
        isPlaying={state?.phase === "question_active"} 
        volume={0.15} 
      />
      {/* Play upbeat waiting jingle while the How to Join modal is open */}
      <WaitingMusic
        isPlaying={showHowToJoin}
        volume={0.15}
      />
      
      <div className="relative z-10 mx-auto w-full max-w-3xl space-y-4">
        <header className="card-glass px-5 py-4 text-center">
          <p className="label-row justify-center text-xs tracking-[0.22em]">
            <Monitor className="h-3.5 w-3.5" />
            HOST SCREEN
          </p>
          <p className="mt-1 text-4xl font-black tracking-[0.2em] text-slate-800">{code}</p>
          <p className="mt-1 text-sm text-slate-600">Show this on TV. Guests answer on their phones.</p>
        </header>

        {state?.phase === "waiting" && (
          <div className="card-glass p-5 text-center">
            <p className="label-row justify-center text-xs tracking-widest">
              <Users className="h-3.5 w-3.5" />
              LOBBY
            </p>
            <p className="mt-1 text-2xl font-black text-slate-800">Players joined: {state.players.length}</p>
            <button onClick={startGame} disabled={busy} className="btn-primary mt-5 w-full">
              <Play className="h-4 w-4" />
              {busy ? "Starting..." : "Start Game"}
            </button>
            <button
              onClick={() => setShowHowToJoin(true)}
              className="btn-secondary mt-3 w-full"
            >
              <HelpCircle className="h-4 w-4" />
              How to Join
            </button>
          </div>
        )}

        {state?.phase === "question_active" && state.question && (
          <div className="card-glass p-5">
            <div className="flex items-center justify-between text-sm font-semibold text-blue-700">
              <span className="flex items-center gap-1.5">
                <HelpCircle className="h-4 w-4" />
                Question {state.currentQuestionIndex + 1}/{state.totalQuestions}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {Math.max(1, Math.ceil(displayTimeMs / 1000))}s
              </span>
            </div>
            <h2 className="mt-3 text-3xl font-black text-slate-800">{state.question.text}</h2>
            <div className="mt-4 grid gap-2">
              {state.question.options.map((option, index) => (
                <div
                  key={option}
                  className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-lg font-semibold text-slate-800"
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
            <h2 className="mt-2 text-2xl font-black text-slate-800">{state.question.text}</h2>
            <p className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-400/40 bg-emerald-400/15 px-4 py-3 text-xl font-black text-slate-800">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              Correct: {state.reveal.correctOption}
            </p>
            <p className="mt-2 text-sm font-semibold text-slate-600">
              Correct players: {state.reveal.correctPlayerIds.length}/{state.players.length}
            </p>
          </div>
        )}

        {state && (state.phase === "leaderboard" || state.phase === "finished") && (
          <LeaderboardPanel
            players={state.leaderboard}
            phase={state.phase}
            autoAdvanceSeconds={Math.max(1, Math.ceil(displayTimeMs / 1000))}
          />
        )}

        {state?.phase === "finished" && (
          <div className="card-glass flex flex-col gap-3 p-5">
            <button onClick={playAgain} disabled={busy} className="btn-primary w-full">
              <RotateCcw className="h-4 w-4" />
              {busy ? "Resetting..." : "Play Again"}
            </button>
            <button onClick={exitGame} disabled={busy} className="btn-secondary w-full">
              <LogOut className="h-4 w-4" />
              Exit
            </button>
          </div>
        )}

        {state?.phase === "cancelled" && (
          <div className="card-glass p-5 text-center">
            <p className="label-row justify-center text-xs tracking-widest">
              <XCircle className="h-3.5 w-3.5 text-red-300" />
              GAME CANCELLED
            </p>
            <p className="mt-1 text-xl font-bold text-slate-800">All players left the game.</p>
            <div className="mt-4 flex flex-col gap-3">
              <button onClick={playAgain} disabled={busy} className="btn-primary w-full">
                <RotateCcw className="h-4 w-4" />
                {busy ? "Resetting..." : "Play Again"}
              </button>
              <button onClick={exitGame} disabled={busy} className="btn-secondary w-full">
                <LogOut className="h-4 w-4" />
                Exit
              </button>
            </div>
          </div>
        )}

        {state && <Scoreboard players={state.leaderboard} activePlayerId={null} />}

        {!hostKey && <p className="text-center text-sm font-semibold text-red-600">Missing host key in URL.</p>}
        {error && <p className="text-center text-sm font-semibold text-red-600">{error}</p>}
      </div>

      {showHowToJoin && (
        <HowToJoinModal code={code} onClose={() => setShowHowToJoin(false)} />
      )}
    </main>
  );
}

