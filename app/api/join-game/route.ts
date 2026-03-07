import { NextResponse } from "next/server";

import { joinGame } from "@/lib/redis-game-store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      code?: string;
      name?: string;
      avatar?: string;
    };

    if (!body.code || !body.name) {
      return NextResponse.json({ error: "Code and name are required" }, { status: 400 });
    }

    const result = await joinGame(body.code, body.name, body.avatar);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not join game";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
