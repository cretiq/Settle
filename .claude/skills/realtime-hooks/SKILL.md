# Realtime Hooks

Custom React hooks for live data and local persistence.

## Supabase Realtime Hooks

All follow the same pattern: initial fetch + subscribe to `postgres_changes` + re-fetch on any change. Located in `src/hooks/`.

### `useExpenses(tabId: string | null)`

File: `src/hooks/use-expenses.ts`

- Returns `{ expenses: Expense[], splits: ExpenseSplit[], loading: boolean }`.
- Queries `expenses` table filtered by `tab_id`, `deleted_at IS NULL`, ordered by `created_at DESC`.
- Also fetches `expense_splits` for all returned expense IDs via `.in("expense_id", ids)`.
- Subscribes to **two channels**: `expenses:{tabId}` and `expense_splits:{tabId}`. Both trigger a full re-fetch of expenses + splits.
- Cleans up both channels on unmount or `tabId` change.

### `useMembers(tabId: string | null)`

File: `src/hooks/use-members.ts`

- Returns `{ members: Member[], loading: boolean }`.
- Queries `members` table filtered by `tab_id`, `is_active = true`, ordered by `joined_at ASC`.
- Subscribes to channel `members:{tabId}` for `*` events on `public.members` filtered by `tab_id`.
- Cleans up channel on unmount or `tabId` change.

### `useSettlements(tabId: string | null)`

File: `src/hooks/use-settlements.ts`

- Returns `{ settlements: RecordedSettlement[], loading: boolean }`.
- Queries `settlements` table filtered by `tab_id`, `deleted_at IS NULL`, ordered by `created_at DESC`.
- Subscribes to channel `settlements:{tabId}` for `*` events on `public.settlements` filtered by `tab_id`.
- Cleans up channel on unmount or `tabId` change.

### Pattern for New Realtime Hooks

```ts
const channel = supabase
  .channel(`tablename:${id}`)
  .on("postgres_changes", {
    event: "*",
    schema: "public",
    table: "tablename",
    filter: `column=eq.${id}`,
  }, () => { refetch() })
  .subscribe()

// Cleanup
return () => { supabase.removeChannel(channel) }
```

Key: the callback does a full re-fetch rather than trying to merge the payload. Simple and correct.

When a hook needs data from multiple tables (like `useExpenses` fetching expenses + splits), subscribe to both tables and have both callbacks trigger the same refetch function.

## `useLocalTabs()`

File: `src/hooks/use-local-tabs.ts`

localStorage-backed hook using React 19's `useSyncExternalStore`.

- **Storage key**: `settle-tabs`
- **Shape**: `LocalTab[]` — `{ slug, name, accessCode, joinedAt }`
- **Returns**: `{ tabs, saveTab, removeTab }`
- **Snapshot caching**: Compares raw JSON string to avoid re-parsing on every render.
- **Cross-tab sync**: Subscribes to `window.storage` event. Also dispatches synthetic `storage` event on writes to update same-tab listeners.
- **Server snapshot**: Returns empty array (SSR-safe).

### Usage

- `saveTab(tab)` — upserts by slug (removes existing entry, prepends new one).
- `removeTab(slug)` — filters out by slug.
- Called from `[slug]/page.tsx` when user joins or re-enters a tab.
- Read by `YourTabs` component on homepage.
