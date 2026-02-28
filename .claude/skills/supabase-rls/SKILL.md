---
name: supabase-rls
description: "How Settle integrates with Supabase for auth, database, RLS policies, and RPCs. Covers anonymous auth, row-level security, security definer functions, expense splits, settlements, and the PostgREST INSERT...RETURNING bug. Use when working on Supabase, RLS, policies, auth, database, schema, RPCs, security definer, expense_splits, settlements."
---

# Supabase & RLS

How Settle integrates with Supabase for auth, database access, and row-level security.

## Client Creation

Three Supabase client factories, all using `@supabase/ssr`:

- **Browser**: `src/lib/supabase/client.ts` — `createBrowserClient()`, used in all `"use client"` components.
- **Server**: `src/lib/supabase/server.ts` — `createServerClient()` with cookie access via `next/headers`. Cookie writes swallowed in read-only RSC context.
- **Middleware**: `src/lib/supabase/middleware.ts` — `createServerClient()` with request/response cookie piping. Auto signs in anonymously if no session exists.

Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`.

## Anonymous Auth

All users are anonymous (`signInAnonymously()`). Middleware handles auto-signin; `[slug]/page.tsx` has a client-side fallback if middleware hasn't established a session yet.

## RLS Architecture

Schema: `supabase/schema.sql`

### The `is_tab_member()` pattern

```sql
create or replace function public.is_tab_member(check_tab_id uuid)
returns boolean
language sql
security definer  -- bypasses RLS to avoid infinite recursion
stable
as $$
  select exists (
    select 1 from public.members
    where tab_id = check_tab_id and user_id = auth.uid()
  );
$$;
```

All SELECT/INSERT policies on `tabs`, `members`, `expenses`, `expense_splits`, and `settlements` use this function. It must be `security definer` because it queries `members` which itself has RLS enabled.

### RLS Policies Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| tabs | `is_tab_member(id)` | `auth.uid() is not null` | — | — |
| members | `is_tab_member(tab_id)` | `user_id = auth.uid()` | — | — |
| expenses | `is_tab_member(tab_id)` | `is_tab_member(tab_id)` | payer only | — |
| expense_splits | via expense join + `is_tab_member` | via expense join + `is_tab_member` | — | payer only (via expense→member join) |
| settlements | `is_tab_member(tab_id)` | `is_tab_member(tab_id)` | from_member only | — |

### expense_splits RLS

SELECT/INSERT policies join through `expenses` to get `tab_id`, then check `is_tab_member`. DELETE policy joins expenses→members to verify caller is the payer.

### settlements RLS

SELECT/INSERT use `is_tab_member(tab_id)` directly. UPDATE (for soft-delete) checks that caller is the `from_member`.

## Security Definer RPCs

- `verify_tab_code(tab_slug, code)` — returns tab UUID if code matches, null otherwise.
- `create_tab(tab_slug, tab_code, tab_name)` — inserts tab, returns UUID.
- `create_expense_with_splits(p_tab_id, p_paid_by, p_category, p_amount, p_description, p_splits jsonb)` — atomic expense + splits insert. Validates membership and splits sum.
- `update_expense_with_splits(p_expense_id, p_paid_by, p_category, p_amount, p_description, p_splits jsonb)` — atomic expense update + splits replace. Validates caller is payer and splits sum.

## Known Bug Pattern: PostgREST + RLS on INSERT...RETURNING

**Problem**: Chaining `.insert().select()` on Supabase PostgREST fails when RLS depends on the row being inserted.

**Fix** (applied in `src/components/tab/name-entry.tsx`): Split into two separate calls — `.insert()` first, then a separate `.select()` query.

## Realtime

Tables `expenses`, `members`, `expense_splits`, and `settlements` are added to `supabase_realtime` publication.

## Amounts

Stored as whole integers (SEK). No decimals. Currency symbol: `kr` (from `src/lib/constants.ts`).
