"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Baby, Tv, LogIn, User, Hash, Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("👶");
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
    if (!name.trim()) {
      setError("Enter your name first.");
      return;
    }
    if (!joinCode.trim()) {
      setError("Enter a join code.");
      return;
    }

    const code = joinCode.trim().toUpperCase();
    router.push(`/game/${code}?name=${encodeURIComponent(name.trim())}&avatar=${encodeURIComponent(avatar)}`);
  }

  return (
    <main className="app-shell flex items-center justify-center">
      <div className="relative z-10 mx-auto w-full max-w-md space-y-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100 backdrop-blur-sm">
            <Baby className="h-7 w-7 text-blue-500" />
          </div>
          <p className="text-xs font-bold tracking-[0.28em] text-blue-600">BABY SHOWER QUIZ</p>
          <h1 className="mt-2 text-4xl font-black tracking-wide text-slate-800">Bailey&apos;s Baby Shower Trivia</h1>
          <p className="mt-2 text-sm text-slate-600">Join the game, answer fast, and climb the leaderboard.</p>
        </div>

        <section className="card-glass space-y-4 p-5">
          <button onClick={createGame} disabled={busy} className="btn-primary w-full">
            <Tv className="h-4 w-4" />
            {busy ? "Creating..." : "Create Game (Host Screen)"}
          </button>

          <p className="text-center text-xs font-semibold text-blue-600">
            Host screen runs on TV/tablet and does not submit answers.
          </p>

          <div className="h-px bg-blue-200" />

          <div>
            <p className="label-row">
              <User className="h-4 w-4" />
              Your Name
            </p>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              placeholder="Type your name"
              className="input-field mt-2"
            />
          </div>

          <div>
            <p className="label-row">
              <Sparkles className="h-4 w-4" />
              Avatar
            </p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {["👶", "🍼", "🧸", "🛻", "⚽", "🦕", "🎈", "🎵", "💙", "🩵"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAvatar(item)}
                  className={`rounded-xl border px-2 py-2 text-2xl transition ${
                    avatar === item ? "border-blue-400 bg-blue-100 shadow-md" : "border-blue-200 bg-blue-50 hover:bg-blue-100"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

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
