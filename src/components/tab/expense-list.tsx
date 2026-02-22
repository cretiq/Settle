"use client"

import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { formatAmount, CATEGORIES } from "@/lib/constants"
import type { Expense, Member } from "@/lib/types"

type Props = {
  expenses: Expense[]
  members: Member[]
  currentMemberId: string
}

export function ExpenseList({ expenses, members, currentMemberId }: Props) {
  const memberMap = new Map(members.map((m) => [m.id, m.name]))

  async function handleDelete(expense: Expense) {
    const supabase = createClient()

    // Soft delete
    await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", expense.id)

    toast("Expense deleted", {
      action: {
        label: "Undo",
        onClick: async () => {
          await supabase
            .from("expenses")
            .update({ deleted_at: null })
            .eq("id", expense.id)
        },
      },
      duration: 5000,
    })
  }

  if (expenses.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No expenses yet. Add one above!
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">Expenses</h3>
      <div className="space-y-1">
        {expenses.map((exp) => {
          const cat = CATEGORIES.find((c) => c.key === exp.category)
          const isPayer = exp.paid_by === currentMemberId

          return (
            <div
              key={exp.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span>{cat?.emoji ?? "📝"}</span>
                <div>
                  <p className="text-sm font-medium">
                    {exp.description || cat?.label || exp.category}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {memberMap.get(exp.paid_by) ?? "Unknown"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  {formatAmount(exp.amount)}
                </span>
                {isPayer && (
                  <button
                    onClick={() => handleDelete(exp)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    title="Delete"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
