import { NextResponse } from "next/server";

import { createGame } from "@/lib/redis-game-store";

export async function POST() {
  const game = await createGame();
  return NextResponse.json(game);
}
