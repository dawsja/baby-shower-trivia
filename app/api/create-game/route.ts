import { NextResponse } from "next/server";

import { createGame } from "@/lib/game-store";

export async function POST() {
  const game = createGame();
  return NextResponse.json(game);
}
