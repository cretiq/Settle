import { type Expense, type ExpenseSplit, type Member, type RecordedSettlement, type Balance, type Settlement } from "./types"

export function calculateBalances(
  expenses: Expense[],
  splits: ExpenseSplit[],
  members: Member[],
  recordedSettlements: RecordedSettlement[] = []
): Balance[] {
  const activeExpenses = expenses.filter((e) => !e.deleted_at)
  const activeMembers = members.filter((m) => m.is_active)

  if (activeMembers.length === 0) return []

  const nets = new Map<string, number>()
  for (const m of activeMembers) {
    nets.set(m.id, 0)
  }

  // Build splits lookup by expense_id
  const splitsByExpense = new Map<string, ExpenseSplit[]>()
  for (const s of splits) {
    const arr = splitsByExpense.get(s.expense_id) ?? []
    arr.push(s)
    splitsByExpense.set(s.expense_id, arr)
  }

  for (const expense of activeExpenses) {
    // Credit payer full amount
    nets.set(expense.paid_by, (nets.get(expense.paid_by) ?? 0) + expense.amount)

    // Debit each participant per their split amount
    const expSplits = splitsByExpense.get(expense.id) ?? []
    for (const split of expSplits) {
      nets.set(split.member_id, (nets.get(split.member_id) ?? 0) - split.amount)
    }
  }

  // Apply recorded settlements
  const activeSettlements = recordedSettlements.filter((s) => !s.deleted_at)
  for (const s of activeSettlements) {
    nets.set(s.from_member, (nets.get(s.from_member) ?? 0) + s.amount)
    nets.set(s.to_member, (nets.get(s.to_member) ?? 0) - s.amount)
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
