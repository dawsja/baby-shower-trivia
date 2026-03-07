import type { Player } from "@/lib/types";

type LobbyPanelProps = {
  code: string;
  players: Player[];
};

export function LobbyPanel({ code, players }: LobbyPanelProps) {
  return (
    <div className="card-glass p-5">
      <p className="text-xs font-semibold tracking-widest text-sky-100">JOIN CODE</p>
      <p className="mt-1 text-4xl font-black tracking-[0.2em] text-white">{code}</p>
      <p className="mt-2 text-sm text-sky-100">Share this code so everyone can join on their phones.</p>

      <div className="mt-5 rounded-2xl border border-white/25 bg-white/10 p-3">
        <p className="text-sm font-semibold text-white">Players in lobby ({players.length})</p>
        <div className="mt-2 grid gap-2">
          {players.map((player) => (
            <div key={player.id} className="flex items-center justify-between rounded-xl bg-white/15 px-3 py-2">
              <span className="text-sm text-white">
                {player.avatar} {player.name}
              </span>
              <span className="text-xs text-sky-100">ready</span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-5 text-center text-sm font-semibold text-sky-100">Waiting for host screen to start...</p>
    </div>
  );
}
