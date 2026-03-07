"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Baby, LogIn, Hash } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createGame() {
    setBusy(true);
    setError(null);

    try {
      const response = await fetch("/api/create-game", {
        method: "POST",
      });
      const payload = (await response.json()) as { code: string; hostKey: string; error?: string };

      if (!response.ok || payload.error || !payload.hostKey) {
        throw new Error(payload.error ?? "Could not create game");
      }

      router.push(`/host/${payload.code}?hostKey=${encodeURIComponent(payload.hostKey)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create game");
    } finally {
      setBusy(false);
    }
  }

  function goToJoin() {
    if (!joinCode.trim()) {
      setError("Enter a join code.");
      return;
    }

    const code = joinCode.trim().toUpperCase();
    router.push(`/game/${code}`);
  }

  return (
    <main className="app-shell flex items-center justify-center">
      <div className="relative z-10 mx-auto w-full max-w-md space-y-4">
        <div className="text-center">
          <button
            onClick={createGame}
            disabled={busy}
            className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 backdrop-blur-sm transition-all hover:bg-blue-200 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Create Game (Host Only)"
          >
            <Baby className="h-7 w-7 text-blue-500" />
          </button>
          <p className="text-xs font-bold tracking-[0.28em] text-blue-600">BABY SHOWER QUIZ</p>
          <h1 className="mt-2 text-4xl font-black tracking-wide text-slate-800">Bailey&apos;s Baby Shower Trivia</h1>
          <p className="mt-2 text-sm text-slate-600">Join the game, answer fast, and climb the leaderboard.</p>
        </div>

        <section className="card-glass space-y-4 p-5">

          <div>
            <p className="label-row">
              <Hash className="h-4 w-4" />
              Join with Code
            </p>
            <div className="mt-2 flex gap-2">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABCDE"
                maxLength={5}
                className="input-field text-center text-lg font-black tracking-[0.2em]"
              />
              <button onClick={goToJoin} className="btn-primary min-w-24">
                <LogIn className="h-4 w-4" />
                Join
              </button>
            </div>
          </div>

          {error && <p className="text-center text-sm font-semibold text-red-600">{error}</p>}
        </section>
      </div>
    </main>
  );
}
