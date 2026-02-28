# Expense System

How expenses are created, edited, displayed, deleted, split, and balanced — including recorded settlements.

## Components

All in `src/components/tab/`:

- **`expense-dashboard.tsx`** — Top-level container. Composes QuickAdd, Form, BalanceView, SettlementList, ExpenseList, MemberList. Manages drawer open state, selected category, and editing state (`editingExpense` / `editingSplits`). Has share button (Share2 icon) next to access code that triggers `navigator.share()` or clipboard fallback.
- **`expense-quick-add.tsx`** — 4-column grid of category buttons (Pizza, Drink, Beer, Other). Tapping opens the expense form drawer with that category pre-selected. Labels resolved via `useTranslations("Categories")`.
- **`expense-form.tsx`** — Bottom drawer (vaul `Drawer`). Amount (IBM Plex Mono font via `--font-receipt` CSS var, with trailing `kr` suffix) and description sit inline on one row. Who paid (member button group), split-among (member toggle buttons), split mode (equal/custom). Custom button cycles input mode on re-tap: kr → % → kr. Supports **create** and **edit** modes via `editingExpense` prop. Uses RPCs `create_expense_with_splits` / `update_expense_with_splits` for atomic insert/update with splits.
- **`expense-list.tsx`** — Reverse-chronological list. Shows category emoji, description, payer name, amount, and partial-split indicator. Payer gets edit (pencil) and delete (x) buttons. Deletion shows Sonner toast with 5s undo. Edit calls `onEdit` callback which opens form drawer in edit mode.
- **`balance-view.tsx`** — Displays simplified settlements. Uses `calculateBalances` with splits and recorded settlements. Hidden when fewer than 2 members. Settle button (shadcn `Button size="sm"`) only visible to the debtor (`currentMemberId === s.from`). Opens an `AlertDialog` confirmation before inserting into `settlements` table.
- **`settlement-list.tsx`** — Shows recorded settlements with green styling. `from_member` can soft-delete with undo toast. Hidden when no settlements exist.
- **`member-list.tsx`** — Pill-style member list. Current user highlighted with "(you)" suffix.

## Categories

Defined in `src/lib/constants.ts`:

```ts
{ key: "pizza", emoji: "🍕" }
{ key: "drink", emoji: "🍹" }
{ key: "beer",  emoji: "🍺" }
{ key: "custom", emoji: "📝" }
```

Labels are resolved via i18n (`useTranslations("Categories")`), not stored in the constant.

## Expense Splits

Each expense has explicit split rows in `expense_splits` table. Supports equal and custom split modes.

**Equal split**: `floor(amount / count)` per member, remainder pennies to first N (sorted by ID).

**Custom split**: Each member gets a **daisyUI range slider** (`range range-primary range-lg`) with an editable number input. Two input modes cycled via the Custom button:
- **Amount mode (kr)**: Slider 0 → totalAmount. Editable input shows kr value.
- **Percent mode (%)**: Slider 0 → 100. Editable input shows %. Preset buttons (50/50, 60/40, 70/30) shown for 2-member splits.

**Slider locking**: When a member's slider is dragged, that member becomes "locked" — their value won't change when another slider moves. Remainder is redistributed only among unlocked members. If the last unlocked member is dragged, all others unlock (prevents deadlock). Locks reset on: equal split, presets, form open/close. Values are clamped so total can never be exceeded.

**Cross-sync**: Changing kr auto-updates %, and vice versa. Changing total amount recalculates kr from current percentages.

**`percentagesToAmounts()`**: Pure function converting percentages to integer kr amounts using floor + greedy remainder distribution (largest fractional part first), guaranteeing sum = totalAmount.

**"Your share" display**: Shows the current user's computed share on the split mode row (equal mode only).

Split data managed via `buildSplits()` in `expense-form.tsx`. Created/updated atomically via RPCs.

## Balance Calculation

`src/lib/balance.ts`:

### `calculateBalances(expenses, splits, members, recordedSettlements)`

1. Filters out soft-deleted expenses and inactive members.
2. Builds splits lookup by `expense_id`.
3. For each expense: credits payer full amount, debits each participant per their split amount from `expense_splits`.
4. Applies recorded settlements: credits `from_member`, debits `to_member`.
5. Returns `Balance[]` — `{ memberId, memberName, net }`. Positive net = owed money; negative = owes.

### `simplifyDebts(balances)`

Greedy algorithm: sorts debtors and creditors descending by amount, then matches greedily. Returns `Settlement[]` — `{ from, fromName, to, toName, amount }`.

## Recorded Settlements

Table `settlements` tracks actual payments between members. Schema: `{ id, tab_id, from_member, to_member, amount, created_at, deleted_at }`.

- Created via "Settle" button in `BalanceView` (only the debtor can settle; confirmed via AlertDialog).
- Displayed in `SettlementList` with green border/bg.
- `from_member` can soft-delete with undo.
- Factored into balance calculation to show remaining debts.

## Typography

Amount inputs use **IBM Plex Mono** (Google Font), loaded in `src/app/layout.tsx` as `--font-receipt` CSS variable, registered in `src/app/globals.css` as `--font-receipt`. Applied via inline `style={{ fontFamily: "var(--font-receipt)" }}`.

## Data Model

- `expenses.amount` — whole integer (SEK, no decimals).
- `expenses.deleted_at` — soft delete. Queries filter `is("deleted_at", null)`.
- `expenses.paid_by` — references `members.id` (not `auth.users`).
- `expense_splits` — `{ id, expense_id, member_id, amount }`. One row per participant per expense.
- `settlements` — `{ id, tab_id, from_member, to_member, amount, created_at, deleted_at }`.

## RPCs

- `create_expense_with_splits(p_tab_id, p_paid_by, p_category, p_amount, p_description, p_splits jsonb)` — atomically inserts expense + splits. Validates splits sum = amount and caller is tab member.
- `update_expense_with_splits(p_expense_id, p_paid_by, p_category, p_amount, p_description, p_splits jsonb)` — atomically updates expense + replaces splits. Validates caller is payer.

## Realtime

Expense list auto-updates via `useExpenses` hook (subscribes to both `expenses` and `expense_splits` channels). Settlements auto-update via `useSettlements` hook.
