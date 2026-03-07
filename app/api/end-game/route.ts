import { NextResponse } from "next/server";

import { endGame } from "@/lib/redis-game-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      hostKey?: string;
    };

    if (!body.code || !body.hostKey) {
      return NextResponse.json({ error: "Code and hostKey are required" }, { status: 400 });
    }

    await endGame(body.code, body.hostKey);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not end game";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
