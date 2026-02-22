# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start Next.js dev server
- `npm run build` — production build (also typechecks)
- `npm run lint` — eslint
- No test runner configured yet

## Architecture

**Settle** is a mobile-first expense splitting app. Users create shared "tabs", invite others via access code, add expenses, and see who owes whom.

### Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript 5**
- **Supabase** — Postgres DB, anonymous auth, realtime subscriptions
- **Tailwind CSS 4** (postcss plugin) + **shadcn/ui** (new-york style, Radix primitives)
- Path alias: `@/*` → `./src/*`

### Key Patterns

**Tab access flow** (`src/app/[slug]/page.tsx`): Client-side state machine with steps: `loading → code | name | dashboard`. Creator gets `?code=XXXX` in URL; others enter code manually. Auth is fully anonymous (Supabase anon signin).

**Realtime hooks** (`src/hooks/`): `useMembers` and `useExpenses` subscribe to Supabase `postgres_changes` and auto-refetch on any mutation. `useLocalTabs` syncs joined tabs to localStorage via `useSyncExternalStore`.

**Database security**: RLS policies use `is_tab_member()` — a `security definer` SQL function that bypasses RLS to avoid infinite recursion. Security-critical ops (create tab, verify code) use `security definer` RPCs in `supabase/schema.sql`.

**Balance calculation** (`src/lib/balance.ts`): Computes net balances from expenses (equal split only), then uses greedy algorithm to minimize settlement transactions.

### Supabase Setup

- Environment vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
- Client: `src/lib/supabase/client.ts` (browser), `server.ts` (RSC), `middleware.ts` (session refresh)
- Schema: `supabase/schema.sql` — run in Supabase SQL editor to set up tables, RLS, and RPCs
- Amounts stored as whole SEK integers; currency symbol is `kr`
