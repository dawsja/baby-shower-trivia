import type { Player } from "@/lib/types";
import { Users, CheckCircle, Copy } from "lucide-react";

type LobbyPanelProps = {
  code: string;
  players: Player[];
};

export function LobbyPanel({ code, players }: LobbyPanelProps) {
  return (
    <div className="card-glass p-5">
      <p className="label-row text-xs tracking-widest">
        <Copy className="h-3.5 w-3.5" />
        JOIN CODE
      </p>
      <p className="mt-1 text-4xl font-black tracking-[0.2em] text-slate-800">{code}</p>
      <p className="mt-2 text-sm text-slate-600">Share this code so everyone can join on their phones.</p>

      <div className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Users className="h-4 w-4 text-blue-500" />
          Players in lobby ({players.length})
        </p>
        <div className="mt-2 grid gap-2">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
              <span className="text-sm text-slate-800">
                {player.avatar} {player.name}
              </span>
              <span className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle className="h-3 w-3" />
                ready
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 text-center text-sm font-semibold text-blue-700">Waiting for host screen to start...</p>
    </div>
  );
}
