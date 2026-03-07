"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

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
          <p className="text-xs font-bold tracking-[0.28em] text-sky-100">BABY SHOWER QUIZ</p>
          <h1 className="mt-2 text-4xl font-black tracking-wide text-white">Bailey&apos;s Baby Shower Trivia</h1>
          <p className="mt-2 text-sm text-sky-100">Join the game, answer fast, and climb the leaderboard.</p>
        </div>

        <section className="card-glass space-y-4 p-5">
          <button onClick={createGame} disabled={busy} className="btn-primary w-full">
            {busy ? "Creating..." : "Create Game (Host Screen)"}
          </button>

          <p className="text-center text-xs font-semibold text-sky-100">
            Host screen runs on TV/tablet and does not submit answers.
          </p>

          <div className="h-px bg-white/25" />

          <div>
            <p className="text-sm font-semibold text-sky-100">Your Name</p>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={24}
              placeholder="Type your name"
              className="mt-2 w-full rounded-2xl border border-white/35 bg-white/90 px-4 py-3 text-sky-900 outline-none focus:border-sky-300"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-sky-100">Avatar</p>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {["👶", "🍼", "🧸", "🛻", "⚽", "🦕", "🎈", "🎵", "💙", "🩵"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setAvatar(item)}
                  className={`rounded-xl border px-2 py-2 text-2xl transition ${
                    avatar === item ? "border-white bg-white/35" : "border-white/25 bg-white/10"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-sky-100">Join with Code</p>
            <div className="mt-2 flex gap-2">
              <input
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                placeholder="ABCDE"
                maxLength={5}
                className="w-full rounded-2xl border border-white/35 bg-white/90 px-4 py-3 text-center text-lg font-black tracking-[0.2em] text-sky-900 outline-none focus:border-sky-300"
              />
              <button onClick={goToJoin} className="btn-primary min-w-24">
                Join
              </button>
            </div>
          </div>

          {error && <p className="text-center text-sm font-semibold text-red-100">{error}</p>}
        </section>
      </div>
    </main>
  );
}
