import { NextResponse } from "next/server";

import { leaveGame } from "@/lib/redis-game-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      playerId?: string;
    };

    if (!body.code || !body.playerId) {
      return NextResponse.json({ error: "Code and playerId are required" }, { status: 400 });
    }

    await leaveGame(body.code, body.playerId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not leave game";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
