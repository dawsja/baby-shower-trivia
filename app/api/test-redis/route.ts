import { createClient } from 'redis';
import { NextResponse } from 'next/server';

// Create Redis client using the same configuration as redis-game-store
const redis = createClient({
  url: process.env.REDIS_URL || process.env.KV_REST_API_URL,
  password: process.env.REDIS_PASSWORD || process.env.KV_REST_API_TOKEN,
});

redis.on('error', (err) => console.error('Redis Client Error', err));

export const POST = async () => {
  try {
    // Connect to Redis if not already connected
    if (!redis.isOpen) {
      await redis.connect();
    }
    
    // Test basic Redis operations
    await redis.set("test-key", "Redis is working! " + new Date().toISOString());
    const result = await redis.get("test-key");
    
    // Test game room storage (similar to your game store)
    const testRoom = {
      code: "TEST1",
      hostKey: "test-host-key",
      phase: "waiting",
      players: [],
      currentQuestionIndex: 0,
      currentAnswers: {},
      questionStartedAt: null,
      revealStartedAt: null,
      leaderboardStartedAt: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    await redis.set("game:TEST1", JSON.stringify(testRoom), { EX: 3600 });
    const roomResult = await redis.get("game:TEST1");
    
    return NextResponse.json({ 
      success: true,
      basicTest: result,
      gameRoomTest: roomResult ? "Game room storage works!" : "Game room storage failed",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Redis test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const GET = async () => {
  try {
    // Connect to Redis if not already connected
    if (!redis.isOpen) {
      await redis.connect();
    }
    
    // Check Redis connection
    const pong = await redis.ping();
    
    // Get all game keys
    const gameKeys = await redis.keys('game:*');
    
    return NextResponse.json({ 
      connected: pong === 'PONG',
      gameRoomCount: gameKeys.length,
      gameKeys: gameKeys,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Redis status error:', error);
    return NextResponse.json({ 
      connected: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};
