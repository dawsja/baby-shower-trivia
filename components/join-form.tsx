"use client";

import { type FormEvent, useState } from "react";

const avatarOptions = ["👶", "🍼", "🧸", "🛻", "⚽", "🦕", "🎈", "🎵", "💙"];

type JoinFormProps = {
  onSubmit: (payload: { name: string; avatar: string }) => Promise<void>;
  initialName?: string;
  initialAvatar?: string;
};

export function JoinForm({ onSubmit, initialName = "", initialAvatar = "👶" }: JoinFormProps) {
  const [name, setName] = useState(initialName);
  const [avatar, setAvatar] = useState(initialAvatar);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    setBusy(true);
    try {
      await onSubmit({ name: name.trim(), avatar });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card-glass space-y-5 p-5" onSubmit={handleSubmit}>
      <div>
        <p className="text-sm font-semibold tracking-wide text-sky-100">Pick your name</p>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          maxLength={24}
          className="mt-2 w-full rounded-2xl border border-sky-200/40 bg-white/90 px-4 py-3 text-base text-sky-900 outline-none transition focus:border-sky-300"
        />
      </div>

      <div>
        <p className="text-sm font-semibold tracking-wide text-sky-100">Pick an avatar</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {avatarOptions.map((item) => {
            const selected = item === avatar;
            return (
              <button
                key={item}
                type="button"
                onClick={() => setAvatar(item)}
                className={`rounded-2xl border px-2 py-3 text-2xl transition ${
                  selected
                    ? "border-white bg-white/35 shadow-md"
                    : "border-white/25 bg-white/10 hover:bg-white/20"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      <button type="submit" disabled={busy || !name.trim()} className="btn-primary w-full">
        {busy ? "Joining..." : "Join Game"}
      </button>
    </form>
  );
}
