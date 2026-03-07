import { NextResponse } from "next/server";

import { goToNextQuestion } from "@/lib/redis-game-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      hostKey?: string;
    };

    if (!body.code || !body.hostKey) {
      return NextResponse.json({ error: "Code and hostKey are required" }, { status: 400 });
    }

    const state = await goToNextQuestion(body.code, body.hostKey);
    return NextResponse.json({ state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not move to next question";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
