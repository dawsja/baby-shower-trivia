import { createClient } from "redis";
import { NextRequest } from "next/server";
import { getGameState, gameEventChannel } from "@/lib/redis-game-store";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code")?.toUpperCase();
  const playerId = searchParams.get("playerId") ?? null;
  const hostKey = searchParams.get("hostKey") ?? null;

  if (!code) {
    return new Response(JSON.stringify({ error: "Missing code" }), { status: 400 });
  }

  const encoder = new TextEncoder();
  let subscriber: ReturnType<typeof createClient> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let cleanedUp = false;

      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // controller may already be closed
        }
      };

      // Tell the client to reconnect after 1 second if the connection drops
      try {
        controller.enqueue(encoder.encode("retry: 1000\n\n"));
      } catch {
        // controller may already be closed
      }

      // Send initial state immediately
      try {
        const state = await getGameState(code, playerId, hostKey);
        send({ state });
      } catch (err) {
        send({ error: err instanceof Error ? err.message : "Game not found" });
        controller.close();
        return;
      }

      // Send periodic heartbeat pings to keep the connection alive through
      // proxies and load balancers that close idle connections after ~60 s.
      const heartbeatInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(":ping\n\n"));
        } catch {
          // controller may already be closed
        }
      }, 25_000);

      // Create a dedicated subscriber connection (pub/sub requires its own client)
      subscriber = createClient({
        url: process.env.REDIS_URL || process.env.KV_REST_API_URL,
        password: process.env.REDIS_PASSWORD || process.env.KV_REST_API_TOKEN,
      });

      subscriber.on("error", (err) => console.error("SSE Redis subscriber error:", err));

      try {
        await subscriber.connect();
      } catch (err) {
        console.error("SSE subscriber connect failed:", err);
        send({ error: "Could not connect to game events" });
        controller.close();
        return;
      }

      await subscriber.subscribe(gameEventChannel(code), async () => {
        try {
          const state = await getGameState(code, playerId, hostKey);
          send({ state });
        } catch (err) {
          send({ error: err instanceof Error ? err.message : "Game not found" });
          try {
            controller.close();
          } catch {
            // already closed
          }
        }
      });

      const cleanup = async () => {
        if (cleanedUp) return;
        cleanedUp = true;

        clearInterval(heartbeatInterval);

        if (subscriber) {
          try {
            await subscriber.unsubscribe();
            await subscriber.disconnect();
          } catch {
            // ignore cleanup errors
          }
          subscriber = null;
        }
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", () => {
        cleanup().catch(console.error);
      });
    },
    cancel() {
      if (subscriber) {
        subscriber.unsubscribe().catch(console.error);
        subscriber.disconnect().catch(console.error);
        subscriber = null;
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
