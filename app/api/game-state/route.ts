import { NextResponse } from "next/server";

import { getGameState } from "@/lib/redis-game-store";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const playerId = searchParams.get("playerId");
    const hostKey = searchParams.get("hostKey");

    if (!code) {
      return NextResponse.json({ error: "Room code is required" }, { status: 400 });
    }

    const state = await getGameState(code, playerId, hostKey);
    return NextResponse.json({ state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load game state";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
