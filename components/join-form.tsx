"use client";

import { type FormEvent, useState } from "react";
import { User, Smile, LogIn } from "lucide-react";

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
        <p className="label-row">
          <User className="h-4 w-4" />
          Pick your name
        </p>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name"
          maxLength={24}
          className="input-field mt-2"
        />
      </div>

      <div>
        <p className="label-row">
          <Smile className="h-4 w-4" />
          Pick an avatar
        </p>
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
        <LogIn className="h-4 w-4" />
        {busy ? "Joining..." : "Join Game"}
      </button>
    </form>
  );
}
