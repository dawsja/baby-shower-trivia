# Baby Shower Trivia

Realtime baby shower trivia game built with Next.js 16, React 19, TypeScript, Tailwind CSS v4, and Redis.

## What It Does

- Creates a host screen with a 5-character room code
- Lets guests join from their phones with a name and avatar
- Runs timed multiple-choice trivia rounds with automatic reveal and leaderboard phases
- Syncs host and player screens in realtime over Server-Sent Events backed by Redis pub/sub
- Includes a playful baby-shower UI with music, confetti, and mobile-first layouts

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript (`strict` mode)
- Tailwind CSS v4
- Redis (`redis` client)
- Lucide React icons

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and provide one of the supported Redis configurations.

```bash
cp .env.local.example .env.local
```

Supported variables:

```env
REDIS_URL=your_redis_connection_url
REDIS_PASSWORD=your_redis_password

# Or Vercel KV-style variables
KV_REST_API_URL=your_kv_rest_api_url
KV_REST_API_TOKEN=your_kv_rest_api_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_rest_api_read_only_token
```

### 3. Start the dev server

```bash
npm run dev
```

Open `http://localhost:3000`.

## How To Play

1. Open the home page and create a game as the host.
2. Share the room code shown on the host screen.
3. Guests join at the home page or directly at `/game/[code]`.
4. The host starts the game once players are in the lobby.
5. Players answer each timed question on their phones.
6. The app reveals the answer, updates scores, and advances through the leaderboard until the game ends.

## Available Scripts

- `npm run dev` - start the local development server
- `npm run build` - create a production build
- `npm run start` - run the production server
- `npm run lint` - run ESLint
- `npx tsc --noEmit` - run TypeScript type-checking

## Project Structure

```text
app/                  Next.js routes, pages, API handlers, and global CSS
components/           Reusable UI for host and player screens
lib/questions.ts      Seed trivia questions
lib/types.ts          Shared domain types
lib/redis-game-store.ts
                      Redis-backed game state, scoring, timers, and pub/sub
```

## Realtime Flow

- API routes under `app/api/*` update and read game state
- `lib/redis-game-store.ts` owns room lifecycle, scoring, timers, and phase transitions
- `app/api/game-events/route.ts` streams updates to connected clients with SSE
- Host and player pages both keep a local countdown and trigger a server tick when timed phases expire

## Notes

- Redis is required for the full game flow
- Rooms expire automatically after inactivity
- Trivia content currently lives in `lib/questions.ts`
- There is no dedicated test runner configured yet in this repository
