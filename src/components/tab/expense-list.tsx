"use client"

import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { formatAmount, CATEGORIES } from "@/lib/constants"
import type { Expense, ExpenseSplit, Member } from "@/lib/types"

type Props = {
  expenses: Expense[]
  splits: ExpenseSplit[]
  members: Member[]
  currentMemberId: string
  onEdit: (expense: Expense) => void
}

export function ExpenseList({ expenses, splits, members, currentMemberId, onEdit }: Props) {
  const t = useTranslations("ExpenseList")
  const tCat = useTranslations("Categories")
  const memberMap = new Map(members.map((m) => [m.id, m.name]))

  async function handleDelete(expense: Expense) {
    const supabase = createClient()

    // Soft delete
    await supabase
      .from("expenses")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", expense.id)

    toast(t("deleted"), {
      action: {
        label: t("undo"),
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
        {t("empty")}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{t("heading")}</h3>
      <div className="space-y-1">
        {expenses.map((exp) => {
          const cat = CATEGORIES.find((c) => c.key === exp.category)
          const isPayer = exp.paid_by === currentMemberId
          const expSplits = splits.filter((s) => s.expense_id === exp.id)
          const splitCount = expSplits.length
          const isSubset = splitCount > 0 && splitCount < members.length

          return (
            <div
              key={exp.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                <span>{cat?.emoji ?? "\ud83d\udcdd"}</span>
                <div>
                  <p className="text-sm font-medium">
                    {exp.description || (cat ? tCat(cat.key) : exp.category)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {memberMap.get(exp.paid_by) ?? t("unknown")}
                    {isSubset && ` \u00b7 ${t("splitInfo", { count: splitCount, total: members.length })}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-medium">
                  {formatAmount(exp.amount)}
                </span>
                {isPayer && (
                  <>
                    <button
                      onClick={() => onEdit(exp)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                      title="Edit"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => handleDelete(exp)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
