import { test, expect } from "@playwright/test"

test.describe("Tab creation and joining flow", () => {
  test("creator flow — Start a Tab → name entry → dashboard", async ({
    page,
  }) => {
    await page.goto("/")
    await page.getByRole("button", { name: "Start a Tab" }).click()

    // Should navigate to /{slug}?code={code}
    await expect(page).toHaveURL(/\/[\w-]+\?code=\d{4}/)

    // Should show name entry (not code entry)
    await expect(
      page.getByRole("heading", { name: "What's your name?" })
    ).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "Enter code" })
    ).not.toBeVisible()

    // Fill name and join
    await page.getByPlaceholder("Your name").fill("Alice")
    await page.getByRole("button", { name: "Join" }).click()

    // Should reach dashboard
    await expect(page.getByText("Code:")).toBeVisible()
  })

  test("join flow — visit slug without code → code entry → name → dashboard", async ({
    request,
    page,
  }) => {
    // Create tab via API
    const res = await request.post("/api/tabs", { data: {} })
    const { slug, code } = await res.json()

    // Visit without ?code= param
    await page.goto(`/${slug}`)

    // Should show code entry
    await expect(
      page.getByRole("heading", { name: "Enter code" })
    ).toBeVisible()

    // Enter the 4-digit code into individual inputs
    const digits = code.toString().padStart(4, "0").split("")
    const inputs = page.locator('input[maxlength="1"]')
    for (let i = 0; i < 4; i++) {
      await inputs.nth(i).fill(digits[i])
    }

    // Should transition to name entry
    await expect(
      page.getByRole("heading", { name: "What's your name?" })
    ).toBeVisible()

    // Fill name and join
    await page.getByPlaceholder("Your name").fill("Bob")
    await page.getByRole("button", { name: "Join" }).click()

    // Should reach dashboard
    await expect(page.getByText("Code:")).toBeVisible()
  })

  test("wrong code shows error", async ({ request, page }) => {
    // Create tab via API
    const res = await request.post("/api/tabs", { data: {} })
    const { slug, code } = await res.json()

    // Compute a wrong code (shift each digit by 1)
    const wrongCode = code
      .toString()
      .padStart(4, "0")
      .split("")
      .map((d: string) => String((parseInt(d) + 1) % 10))
      .join("")

    await page.goto(`/${slug}`)
    await expect(
      page.getByRole("heading", { name: "Enter code" })
    ).toBeVisible()

    const inputs = page.locator('input[maxlength="1"]')
    for (let i = 0; i < 4; i++) {
      await inputs.nth(i).fill(wrongCode[i])
    }

    await expect(page.getByText("Wrong code")).toBeVisible()
  })
})
