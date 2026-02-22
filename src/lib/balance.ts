import { type Expense, type Member, type Balance, type Settlement } from "./types"

export function calculateBalances(
  expenses: Expense[],
  members: Member[]
): Balance[] {
  const activeExpenses = expenses.filter((e) => !e.deleted_at)
  const activeMembers = members.filter((m) => m.is_active)
  const memberCount = activeMembers.length

  if (memberCount === 0) return []

  const nets = new Map<string, number>()
  for (const m of activeMembers) {
    nets.set(m.id, 0)
  }

  for (const expense of activeExpenses) {
    const share = Math.floor(expense.amount / memberCount)
    const remainder = expense.amount - share * memberCount

    // Payer gets credited
    nets.set(expense.paid_by, (nets.get(expense.paid_by) ?? 0) + expense.amount)

    // Everyone (including payer) gets debited their share
    const sortedMembers = [...activeMembers].sort((a, b) => a.id.localeCompare(b.id))
    for (let i = 0; i < sortedMembers.length; i++) {
      const debit = share + (i < remainder ? 1 : 0)
      nets.set(sortedMembers[i].id, (nets.get(sortedMembers[i].id) ?? 0) - debit)
    }
  }

  return activeMembers.map((m) => ({
    memberId: m.id,
    memberName: m.name,
    net: nets.get(m.id) ?? 0,
  }))
}

export function simplifyDebts(balances: Balance[]): Settlement[] {
  const debtors: { id: string; name: string; amount: number }[] = []
  const creditors: { id: string; name: string; amount: number }[] = []

  for (const b of balances) {
    if (b.net < 0) debtors.push({ id: b.memberId, name: b.memberName, amount: -b.net })
    if (b.net > 0) creditors.push({ id: b.memberId, name: b.memberName, amount: b.net })
  }

  // Sort descending by amount for greedy matching
  debtors.sort((a, b) => b.amount - a.amount)
  creditors.sort((a, b) => b.amount - a.amount)

  const settlements: Settlement[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amount, creditors[j].amount)
    if (amount > 0) {
      settlements.push({
        from: debtors[i].id,
        fromName: debtors[i].name,
        to: creditors[j].id,
        toName: creditors[j].name,
        amount,
      })
    }
    debtors[i].amount -= amount
    creditors[j].amount -= amount
    if (debtors[i].amount === 0) i++
    if (creditors[j].amount === 0) j++
  }

  return settlements
}
