export const CATEGORIES = [
  { key: "pizza", emoji: "🍕" },
  { key: "drink", emoji: "🍹" },
  { key: "beer", emoji: "🍺" },
  { key: "custom", emoji: "📝" },
] as const

export const CURRENCY = "kr"
export const MAX_CODE_ATTEMPTS = 5
export const CODE_LENGTH = 6
export const EXPENSES_PAGE_SIZE = 50

export function formatAmount(amount: number): string {
  return `${amount} ${CURRENCY}`
}
