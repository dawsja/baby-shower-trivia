# AGENTS.md

## Purpose

- This repository is a Next.js 16 + React 19 + TypeScript trivia game.
- The app uses the App Router under `app/`, reusable UI in `components/`, and game logic in `lib/`.
- Agents should prefer small, targeted edits that preserve the current structure and visual language.

## Agent Workflow

- Start by reading `package.json`, `tsconfig.json`, `eslint.config.mjs`, and the files you plan to change.
- Check for local rules before editing. At the time this file was written, no `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` files were present.
- If any of those files appear later, follow them in addition to this file.
- Do not rewrite unrelated files just to normalize style.
- Preserve user changes in a dirty worktree; only touch files required for the task.

## Repository Layout

- `app/` contains routes, pages, API handlers, layout, and global CSS.
- `app/api/*/route.ts` contains thin HTTP handlers that delegate to game-store logic.
- `components/` contains client and server React UI components.
- `lib/types.ts` contains shared domain types.
- `lib/questions.ts` contains seed trivia content.
- `lib/redis-game-store.ts` contains the active Redis-backed game store.
- `lib/game-store.ts` appears to be an older in-memory implementation; treat it as legacy unless a task explicitly targets it.

## Environment Notes

- Redis-backed flows depend on `REDIS_URL` and `REDIS_PASSWORD`, or the Vercel KV alternatives.
- See `.env.local.example` for the supported variable names.
- Do not hardcode secrets or commit real environment values.
- Some API routes and SSE behavior cannot be fully exercised without Redis configured.

## Core Commands

- Install dependencies: `npm install`
- Start local dev server: `npm run dev`
- Production build: `npm run build`
- Start production server: `npm run start`
- Run ESLint across the repo: `npm run lint`

## Extra Validation Commands

- Type-check only: `npx tsc --noEmit`
- Lint a single file: `npx eslint app/page.tsx`
- Lint a directory: `npx eslint app components lib`
- Show available npm scripts: `npm run`

## Test Status

- There is currently no test runner configured in `package.json`.
- No Jest, Vitest, or Playwright config was found.
- No `*.test.*` or `*.spec.*` files were found.
- Do not claim that automated tests exist unless you add them.

## Single-Test Guidance

- There is currently no supported single-test command because no test framework is configured.
- If the user asks for a single test, explain that no test suite exists yet.
- If you add a test framework in the future, document its exact filter command here.
- Until then, use targeted validation such as `npx eslint <file>` and `npx tsc --noEmit`.

## Build and Runtime Notes

- `next.config.ts` enables the React compiler via `reactCompiler: true`.
- The app uses App Router conventions; route handlers live in `app/api/**/route.ts`.
- Tailwind v4 is loaded through `@import "tailwindcss"` in `app/globals.css`.
- The live game update stream is implemented with SSE in `app/api/game-events/route.ts`.

## TypeScript Rules

- `tsconfig.json` has `strict: true`; keep new code fully type-safe.
- Prefer explicit domain types from `lib/types.ts` over ad hoc object shapes.
- Use `type` aliases consistently; the codebase uses `type` more often than `interface`.
- Use `import type` for type-only imports when practical.
- Cast parsed JSON only after narrowing the surrounding shape.
- Prefer `string | null` and similar unions over vague nullable handling.
- Avoid `any`; use `unknown` when the value must be narrowed.
- Preserve readonly props patterns such as `Readonly<{ children: React.ReactNode }>` when editing layout-style components.

## Imports

- Use alias imports from `@/` for local modules rooted at the repository root.
- Keep framework and package imports first, then local imports.
- Prefer `import { type FormEvent, useState } from "react"` style when mixing values and types from one module.
- Match the surrounding quote style in touched files; the repo has mostly double quotes, with a few older single-quote files.
- Do not perform repo-wide quote normalization as a drive-by change.

## Naming Conventions

- Use PascalCase for React components and exported types.
- Use camelCase for functions, variables, helpers, and props.
- Use UPPER_SNAKE_CASE for module-level constants such as durations and limits.
- Use descriptive names tied to game concepts: `room`, `player`, `question`, `leaderboard`, `hostKey`.
- Prefer verbs for actions: `createGame`, `joinGame`, `submitAnswer`, `goToNextQuestion`.

## React and Next.js Style

- Add `"use client"` only when hooks, browser APIs, or client-side interactivity are needed.
- Keep page components focused on orchestration and UI state.
- Move reusable logic or domain behavior into `lib/` when it is not purely presentational.
- Keep API route handlers thin; validation and business rules should live in store/helpers when possible.
- Use async functions directly for server handlers and client actions when that is the existing pattern.
- Prefer early returns for invalid state or missing input.

## State and Data Flow

- Keep shared game rules centralized in the store layer rather than duplicating them across routes or components.
- Reuse helpers like `buildPublicState`, `getRoomOrThrow`, and sorting utilities instead of reimplementing logic.
- Preserve the distinction between host view and player view.
- When touching persistence logic, keep TTL, phase progression, and publish/update behavior in sync.

## Error Handling

- Throw `Error` objects with clear user-facing messages from store functions.
- In route handlers, catch unknown errors and convert them into JSON responses.
- Use `error instanceof Error ? error.message : "..."` when serializing failures; this pattern is already established.
- Return `400` for invalid input or illegal game actions, and `404` only when the room/state is not found.
- Log infrastructure failures with `console.error` when they are operationally useful, especially around Redis and SSE.
- Prefer graceful failure over swallowing errors silently, except for cleanup paths where best-effort cleanup is intentional.

## Formatting Conventions

- Follow the existing ESLint + Next.js defaults; no Prettier config is present.
- Use semicolons.
- Prefer short helper functions for repeated logic.
- Keep nested conditionals shallow with early exits.
- Use blank lines to separate logical blocks, especially around validation, network calls, and returns.
- Keep JSX readable; break props across lines when they become dense.

## CSS and UI Conventions

- Prefer existing utility classes and shared CSS tokens in `app/globals.css`.
- Reuse shared classes like `app-shell`, `card-glass`, `btn-primary`, `btn-secondary`, `label-row`, and `input-field`.
- Preserve the current playful baby-shower visual language: bright blues, rounded cards, bold headings, and light motion.
- Ensure mobile behavior remains solid; the UI is clearly designed for phones first.

## API Handler Patterns

- Parse request bodies with a narrow local type and validate required fields immediately.
- Use `NextResponse.json(...)` for JSON APIs unless streaming requires `Response`.
- For query params, read from `new URL(request.url).searchParams`.
- Keep handler names aligned with HTTP methods: `GET`, `POST`.
- In SSE handlers, keep heartbeats, connection cleanup, and subscriber teardown intact.

## When Editing Legacy Files

- `lib/game-store.ts` and some Redis utility files use an older style with single quotes and more inline comments.
- Prefer consistency within the file you touch over broad cleanup.
- If you modernize a legacy file, keep the functional behavior unchanged unless the task requires more.

## Practical Expectations For Agents

- Before finishing, run the narrowest useful validation for the files you changed.
- For TypeScript or API changes, prefer `npx tsc --noEmit` if the change could affect types broadly.
- For isolated file changes, `npx eslint <file>` is usually the fastest validation.
- In final notes, mention any commands you ran and any limitations you could not verify locally.
