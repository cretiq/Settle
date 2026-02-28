# Tab Access Flow

The state machine that controls how users create, join, and re-enter tabs.

## State Machine

Defined in `src/app/[slug]/page.tsx`:

```
loading → code | name | dashboard
```

| State | Meaning | Component |
|---|---|---|
| `loading` | Checking auth + membership | (translated spinner text via `useTranslations("Common")`) |
| `code` | User must enter 4-digit access code | `CodeEntry` |
| `name` | Code verified, user must enter display name | `NameEntry` |
| `dashboard` | Fully joined, shows expenses | `ExpenseDashboard` |

## Creator Flow

1. User clicks "Start a Tab" on homepage (`src/components/home/start-tab-button.tsx`).
2. `POST /api/tabs` creates tab via `create_tab` RPC, returns `{ slug, code, tabId }`.
3. Navigates to `/{slug}?code={code}`.
4. `[slug]/page.tsx` detects `?code=` param, verifies via `verify_tab_code` RPC.
5. If not yet a member -> `name` step. If already a member -> `dashboard`.

## Join Flow

1. User visits `/{slug}` without `?code=` param.
2. `checkAccess()` first checks if already a member (queries `members` with join to `tabs`).
3. If not a member -> `code` step.
4. `CodeEntry` (`src/components/tab/code-entry.tsx`) shows 4 individual digit inputs.
5. Auto-submits on 4th digit. Supports paste. Max 5 attempts before lockout.
6. On success, calls `verify_tab_code` RPC -> transitions to `name` step.
7. `NameEntry` (`src/components/tab/name-entry.tsx`) inserts member row, fetches member ID (split calls — see supabase-rls skill).

## Slug & Code Generation

`src/lib/slugs.ts`:
- `generateSlug(locale?)` — `{adjective}-{noun}` from ~100-word lists. Supports English (default) and Swedish word lists (`ADJECTIVES_SV`, `NOUNS_SV` — URL-safe, ö→o, ä→a, å→a). API retries up to 5 times on collision, appending random 2-digit suffix after 3 attempts.
- `generateCode()` — 4-digit string, 1000-9999.

## API Route

`src/app/api/tabs/route.ts` — POST only. Uses server Supabase client. Reads `locale` cookie from request headers to pass to `generateSlug(locale)`. Calls `create_tab` RPC. Returns `{ slug, code, tabId }`.

## Local Tab Storage

Joined tabs are saved to localStorage via `useLocalTabs` hook (key: `settle-tabs`). Homepage shows them in `YourTabs` component. Tab data: `{ slug, name, accessCode, joinedAt }`.

## Re-entry

When visiting a slug the user already joined, `checkAccess()` finds the existing member row and jumps straight to `dashboard` — no code/name entry needed.
