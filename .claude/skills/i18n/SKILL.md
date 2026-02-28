---
name: i18n
description: "Multi-language support (EN/SV) via next-intl without i18n routing. Cookie-based locale, Accept-Language detection, translation files, language switcher. Use when working on translations, locale, language, Swedish, English, next-intl, i18n, internationalization, localization, messages, language switcher, translation keys."
---

# Internationalization (i18n)

Cookie-based multi-language support (English + Swedish) using `next-intl` without URL-based routing. URLs stay clean (`/slug` not `/en/slug`).

## Architecture

### Locale Resolution (`src/i18n/request.ts`)

1. Reads `locale` cookie via `cookies()`.
2. If no cookie: checks `Accept-Language` header — Swedish browsers (`sv`) get Swedish, all others get English.
3. Validates to `"en" | "sv"`, defaults to `"en"`.
4. Dynamically imports matching JSON file from `messages/`.

### Next.js Integration

- `next.config.ts` wrapped with `createNextIntlPlugin()` — auto-discovers `src/i18n/request.ts`.
- `src/app/layout.tsx` is `async` — calls `getLocale()` + `getMessages()` from `next-intl/server`, sets `<html lang={locale}>`, wraps children in `<NextIntlClientProvider messages={messages}>`.
- No middleware changes — existing Supabase middleware untouched.

### Language Switcher (`src/components/language-switcher.tsx`)

Icon button using `useLocale()`. Shows flag emoji (🇸🇪 for current Swedish, 🇬🇧 for current English). Sets `locale` cookie (max-age 1 year) + `window.location.reload()`. Placed on home page and dashboard header. Uses `Button variant="ghost" size="icon"`.

## Translation Files

Located in `messages/`:

- `messages/en.json` — English (default)
- `messages/sv.json` — Swedish

### Namespaces

| Namespace | Used in | Key strings |
|---|---|---|
| `Home` | `page.tsx` | subtitle |
| `StartTab` | `start-tab-button.tsx` | startTab, creating |
| `YourTabs` | `your-tabs.tsx` | heading |
| `CodeEntry` | `code-entry.tsx` | title, description, wrongCode, tooManyAttempts, checking |
| `NameEntry` | `name-entry.tsx` | title, description, placeholder, join, sessionError, joinError |
| `Dashboard` | `expense-dashboard.tsx` | codeLabel, shareFailed |
| `ExpenseForm` | `expense-form.tsx` | descriptionPlaceholder, whoPaid, adding, addExpense, editExpense, saving, saveChanges, cancel, splitAmong, membersCount, splitMode, equal, customSplit, splitTotal, splitMismatch, percentTotal, percentMismatch, equalPercent, yourShare |
| `ExpenseList` | `expense-list.tsx` | heading, empty, deleted, undo, unknown, splitInfo |
| `BalanceView` | `balance-view.tsx` | heading, settled, settleButton, settlementRecorded, confirmTitle, confirmDescription, confirm, cancel |
| `SettlementList` | `settlement-list.tsx` | heading, removed, undo, unknown |
| `MemberList` | `member-list.tsx` | heading (with `{count}`), you |
| `Categories` | quick-add, form, list | pizza, drink, beer, custom |
| `Common` | `[slug]/page.tsx` | loading |

### Interpolation

Uses `next-intl` ICU syntax: `{variable}` in JSON, passed as second arg to `t()`.

```ts
t("heading", { count: members.length })    // "Members (3)"
t("amountLabel", { currency: CURRENCY })    // "Amount (kr)"
t("splitTotal", { current: 50, total: 100, currency: "kr" })
```

## Adding a New String

1. Add the key to both `messages/en.json` and `messages/sv.json` under the appropriate namespace.
2. In the component: `const t = useTranslations("Namespace")` then `t("key")`.
3. For interpolation: `t("key", { var: value })` and use `{var}` in the JSON.

## Adding a New Language

1. Create `messages/{locale}.json` with same structure.
2. Update `src/i18n/request.ts` validation to include new locale.
3. Update `LanguageSwitcher` to cycle through or show all options.

## Design Decisions

- **No URL changes** — cookie-based locale, no `[locale]` route segment.
- **Currency stays "kr"** — same in both languages, not localized.
- **Category "Pizza" stays "Pizza"** in Swedish; Drink→Dryck, Beer→Öl, Other→Övrigt.
- **Brand name "Settle"** stays English in both languages.
- **Categories constant has no `label`** — labels resolved via `useTranslations("Categories")`.
