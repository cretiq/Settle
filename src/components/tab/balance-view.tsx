"use client"

import { calculateBalances, simplifyDebts } from "@/lib/balance"
import { formatAmount } from "@/lib/constants"
import type { Expense, Member } from "@/lib/types"

type Props = {
  expenses: Expense[]
  members: Member[]
}

export function BalanceView({ expenses, members }: Props) {
  const balances = calculateBalances(expenses, members)
  const settlements = simplifyDebts(balances)

  if (members.length < 2) return null

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground">Balances</h3>

      {settlements.length === 0 ? (
        <p className="text-sm text-muted-foreground">All settled up!</p>
      ) : (
        <div className="space-y-1">
          {settlements.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{s.fromName}</span>
                {" → "}
                <span className="font-medium">{s.toName}</span>
              </span>
              <span className="font-mono font-medium">
                {formatAmount(s.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
