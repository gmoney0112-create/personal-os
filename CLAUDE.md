# Personal OS — Claude Code Context

## What This Is
A personal productivity dashboard themed as an "Imperial Command Center" (dark gold UI). React 19 frontend + Express backend + Supabase + Claude AI command bar.

## Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS, Vite, React Router v6, Recharts
- **Backend**: Express 4 + TypeScript (`server.ts`), Zod validation, express-rate-limit
- **Database/Auth**: Supabase (PostgreSQL + Google OAuth)
- **AI**: Anthropic SDK (`claude-haiku-4-5-20251001`) for the `/api/ai/command` endpoint
- **Testing**: Vitest + Testing Library
- **Deploy**: Vercel (serverless via `api/index.ts` → re-exports `server.ts`)

## Architecture
```
src/           React frontend (Vite)
  App.tsx      Root — auth state, view toggle (tasks / analytics)
  components/  AICommandBar, TaskCard, TaskInput, TaskList, AnalyticsDashboard, LoginScreen, ErrorBoundary
  hooks/       useTasks.ts — Supabase CRUD directly from client
  lib/         supabase.ts — anon client
  types.ts     Task, TaskStatus, TaskPriority

server.ts      Express API (local dev + Vercel serverless)
  /api/health
  /api/tasks/:userId   GET  (auth required)
  /api/tasks           POST (auth required)
  /api/tasks/:taskId   PATCH / DELETE (auth required, ownership verified)
  /api/ai/command      POST (AI rate limited — 20 req/15min)

api/index.ts   Vercel entry — re-exports app from server.ts
```

## Important Patterns

### Dual Data Path
The frontend has **two ways to write data**:
- `useTasks.ts` → calls Supabase directly via anon client (relies on RLS)
- `AICommandBar.tsx` → calls `/api/ai/command` → server uses `supabaseAdmin` (bypasses RLS)

Keep RLS policies tight on the `tasks` table — they are the only protection for the direct-client path.

### Auth Flow
1. Supabase Google OAuth (frontend)
2. Session token sent as `Authorization: Bearer <token>` header to Express
3. `requireAuth` middleware validates token via `supabaseAuth.auth.getUser()`
4. Ownership is verified per-request for mutating endpoints

### Environment Variables
```
VITE_SUPABASE_URL          Supabase project URL (used by both Vite and server)
VITE_SUPABASE_ANON_KEY     Anon key (public)
SUPABASE_SERVICE_ROLE_KEY  Service role key (server only — never expose to client)
ANTHROPIC_API_KEY          Claude API key (server only)
ALLOWED_ORIGINS            Comma-separated CORS origins (default: localhost:5173)
PORT                       Express port (default: 3001)
```

## Commands
```bash
npm run dev          # Vite dev server (port 5173)
npm run server       # Express backend (port 3001)
npm run build        # Vite production build
npm run typecheck    # TypeScript check (no emit)
npm run test         # Vitest (run once)
npm run test:watch   # Vitest (watch mode)
npm run test:coverage
```

## Task Schema
```sql
tasks (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users not null,
  title        text not null,
  status       text check (status in ('todo','in-progress','done')) default 'todo',
  priority     text check (priority in ('low','medium','high')) default 'medium',
  created_at   timestamptz default now(),
  completed_at timestamptz
)
```
RLS must enforce `user_id = auth.uid()` for all operations.

## Code Conventions
- TypeScript strict mode; no `any` — use `unknown` + type guards
- Zod schemas for all API request bodies (see `server.ts`)
- Tailwind utility classes only — no custom CSS files
- Imperial theme: `#0D0D0D` background, `yellow-500`/`yellow-700` accents, dark gold borders
- Component props typed as inline `interface Props`
- Tests live in `src/__tests__/`, use `vi.fn()` for mocks

## Known Technical Debt
- `useTasks` performs a full refetch after `addTask` (instead of optimistic update)
- No loading/error state for AI command bar network failures beyond the catch block
- `completed_at` is set client-side in `useTasks.updateTask` but server-side in `server.ts` — the logic is duplicated and could drift
- No E2E tests (only unit + component tests)
- Analytics view has no empty-state handling
