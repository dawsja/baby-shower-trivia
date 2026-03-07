import type { Player } from "@/lib/types";

type LeaderboardPanelProps = {
  players: Player[];
  phase: "leaderboard" | "finished";
  autoAdvanceSeconds: number;
};

export function LeaderboardPanel({ players, phase, autoAdvanceSeconds }: LeaderboardPanelProps) {
  const topFive = players.slice(0, 5);

  return (
    <div className="card-glass p-5">
      <p className="text-xs font-semibold tracking-widest text-sky-100">
        {phase === "finished" ? "FINAL RANKINGS" : "LEADERBOARD"}
      </p>
      <h2 className="mt-1 text-2xl font-black text-white">{phase === "finished" ? "Game Complete" : "Top 5"}</h2>

      <div className="mt-4 grid gap-2">
        {topFive.map((player, index) => (
          <div
            key={player.id}
            className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/20 px-3 py-3"
          >
            <span className="font-semibold text-white">#{index + 1} {player.avatar} {player.name}</span>
            <span className="font-bold text-white">{player.score} pts</span>
          </div>
        ))}
      </div>

      {phase !== "finished" && (
        <p className="mt-5 text-center text-sm font-semibold text-sky-100">
          Next question starts automatically in {autoAdvanceSeconds}s...
        </p>
      )}
    </div>
  );
}
