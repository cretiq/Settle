# E2E Testing

Playwright-based end-to-end tests for Settle.

## Setup

- **Config**: `playwright.config.ts` — tests in `./e2e`, runs against `localhost:3000`, auto-starts dev server (reuses existing if not CI).
- **Dev dep**: `@playwright/test` (^1.58.2).
- **Run**: `npm run test:e2e` (or `npx playwright test`).
- No `fullyParallel` workers configured beyond default; `retries: 0`.

## Test File

`e2e/tab-flow.spec.ts` — Tests the tab creation and joining flow.

### Test Patterns

**Creator flow test**:
1. Visit `/`, click "Start a Tab".
2. Assert URL matches `/{slug}?code={digits}`.
3. Assert name entry heading visible, code entry heading NOT visible.
4. Fill name, click Join.
5. Assert dashboard reached (looks for "Code:" text).

**Join flow test**:
1. Create tab via API: `request.post("/api/tabs")` — returns `{ slug, code }`.
2. Visit `/{slug}` (no `?code=` param).
3. Assert code entry visible.
4. Fill 4 individual digit inputs (`input[maxlength="1"]`).
5. Assert name entry appears, fill name, join.
6. Assert dashboard.

**Wrong code test**:
1. Create tab via API.
2. Compute wrong code (shift each digit by 1, mod 10).
3. Enter wrong code, assert "Wrong code" error text.

### Key Selectors

- "Start a Tab" button: `getByRole("button", { name: "Start a Tab" })`
- Code inputs: `page.locator('input[maxlength="1"]')` (4 of them)
- Name input: `getByPlaceholder("Your name")`
- Join button: `getByRole("button", { name: "Join" })`
- Dashboard indicator: `getByText("Code:")`
- Error text: `getByText("Wrong code")`

### API-Driven Setup

Tests use Playwright's `request` fixture to create tabs via `POST /api/tabs` instead of going through the UI. This avoids flaky multi-step setup and gives direct access to the access code.

## Adding New Tests

1. Place test files in `e2e/` directory.
2. Use `test.describe` for grouping related flows.
3. Prefer API-driven setup over UI-driven setup when possible.
4. The dev server must be running (config handles this automatically).
5. Tests run against the real Supabase instance configured in env vars.
