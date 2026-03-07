import type { Player } from "@/lib/types";
import { Trophy, BarChart3, Crown, Timer } from "lucide-react";
import { cn } from "@/lib/cn";

type LeaderboardPanelProps = {
  players: Player[];
  phase: "leaderboard" | "finished";
  autoAdvanceSeconds: number;
};

function rankBadge(index: number) {
  if (index === 0) return "badge-rank badge-rank-1";
  if (index === 1) return "badge-rank badge-rank-2";
  if (index === 2) return "badge-rank badge-rank-3";
  return "badge-rank bg-blue-100 text-blue-700";
}

export function LeaderboardPanel({ players, phase, autoAdvanceSeconds }: LeaderboardPanelProps) {
  const topFive = players.slice(0, 5);

  return (
    <div className="card-glass p-5">
      <p className="label-row text-xs tracking-widest">
        {phase === "finished" ? (
          <><Trophy className="h-3.5 w-3.5 text-amber-300" /> FINAL RANKINGS</>
        ) : (
          <><BarChart3 className="h-3.5 w-3.5" /> LEADERBOARD</>
        )}
      </p>
      <h2 className="mt-1 text-2xl font-black text-slate-800">
        {phase === "finished" ? "Game Complete" : "Top 5"}
      </h2>

      <div className="mt-4 grid gap-2">
        {topFive.map((player, index) => (
          <div
            key={player.id}
            className={cn(
              "flex items-center justify-between rounded-2xl border px-3 py-3 animate-fade-in-up",
              index === 0 && phase === "finished"
                ? "border-amber-400/50 bg-amber-400/15"
                : "border-blue-200 bg-white"
            )}
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <span className="flex items-center gap-2.5 font-semibold text-slate-800">
              <span className={rankBadge(index)}>
                {index === 0 && phase === "finished" ? (
                  <Crown className="h-3.5 w-3.5" />
                ) : (
                  `#${index + 1}`
                )}
              </span>
              {player.avatar} {player.name}
            </span>
            <span className="font-bold text-slate-800">{player.score} pts</span>
          </div>
        ))}
      </div>

      {phase !== "finished" && (
        <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-sm font-semibold text-blue-700">
          <Timer className="h-3.5 w-3.5" />
          Next question starts automatically in {autoAdvanceSeconds}s...
        </p>
      )}
    </div>
  );
}
