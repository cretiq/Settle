export const CATEGORIES = [
  { key: "pizza", label: "Pizza", emoji: "🍕" },
  { key: "drink", label: "Drink", emoji: "🍹" },
  { key: "beer", label: "Beer", emoji: "🍺" },
  { key: "custom", label: "Other", emoji: "📝" },
] as const

export const CURRENCY = "kr"
export const MAX_CODE_ATTEMPTS = 5
export const EXPENSES_PAGE_SIZE = 50

export function formatAmount(amount: number): string {
  return `${amount} ${CURRENCY}`
}
