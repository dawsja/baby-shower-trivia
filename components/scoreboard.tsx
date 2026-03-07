import type { Player } from "@/lib/types";
import { Medal } from "lucide-react";
import { cn } from "@/lib/cn";

type ScoreboardProps = {
  players: Player[];
  activePlayerId: string | null;
  compact?: boolean;
};

function rankBadge(index: number) {
  if (index === 0) return "badge-rank badge-rank-1";
  if (index === 1) return "badge-rank badge-rank-2";
  if (index === 2) return "badge-rank badge-rank-3";
  return "badge-rank bg-sky-100 text-sky-700";
}

export function Scoreboard({ players, activePlayerId, compact = false }: ScoreboardProps) {
  const topFive = players.slice(0, 5);
  const yourPlace = activePlayerId ? players.findIndex((player) => player.id === activePlayerId) + 1 : 0;

  return (
    <div className={cn("card-glass", compact ? "p-3" : "p-4")}>
      <p className="label-row text-xs tracking-widest">
        <Medal className="h-3.5 w-3.5" />
        SCOREBOARD
      </p>
      {yourPlace > 0 && (
        <p className="mt-1 text-xs font-semibold text-sky-700">Your place: #{yourPlace}</p>
      )}
      <div className="mt-3 space-y-2">
        {topFive.map((player, index) => {
          const isActive = player.id === activePlayerId;
          return (
            <div
              key={player.id}
              className={cn(
                "flex items-center justify-between rounded-2xl border px-3 py-2",
                isActive ? "border-sky-400 bg-sky-100" : "border-sky-100 bg-sky-50/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className={rankBadge(index)}>{`#${index + 1}`}</span>
                <span>{player.avatar}</span>
                <span className="text-sm font-semibold text-slate-800">{player.name}</span>
              </div>
              <span className="text-sm font-bold text-slate-800">{player.score} pts</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
