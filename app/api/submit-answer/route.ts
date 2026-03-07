import { NextResponse } from "next/server";

import { submitAnswer } from "@/lib/redis-game-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      playerId?: string;
      optionIndex?: number;
    };

    if (!body.code || !body.playerId || typeof body.optionIndex !== "number") {
      return NextResponse.json(
        { error: "Code, playerId, and optionIndex are required" },
        { status: 400 },
      );
    }

    const state = await submitAnswer(body.code, body.playerId, body.optionIndex);
    return NextResponse.json({ state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not submit answer";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
