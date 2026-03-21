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

const CAT_CLASSES: Record<string, string> = {
  pizza: "cat-pizza",
  drink: "cat-drink",
  beer: "cat-beer",
  custom: "cat-custom",
}

export function ExpenseList({ expenses, splits, members, currentMemberId, onEdit }: Props) {
  const t = useTranslations("ExpenseList")
  const tCat = useTranslations("Categories")
  const memberMap = new Map(members.map((m) => [m.id, m.name]))

  async function handleDelete(expense: Expense) {
    const supabase = createClient()

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
      <div className="py-10 text-center animate-fade-up">
        <span className="text-3xl block mb-2 animate-float">&#x1F4B8;</span>
        <p className="text-sm text-muted-foreground">
          {t("empty")}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("heading")}</h3>
      <div className="space-y-1.5">
        {expenses.map((exp, i) => {
          const cat = CATEGORIES.find((c) => c.key === exp.category)
          const isPayer = exp.paid_by === currentMemberId
          const expSplits = splits.filter((s) => s.expense_id === exp.id)
          const splitCount = expSplits.length
          const isSubset = splitCount > 0 && splitCount < members.length

          return (
            <div
              key={exp.id}
              className="soft-card flex items-center justify-between px-3.5 py-2.5 press-scale animate-slide-right"
              style={{ animationDelay: `${Math.min(i, 10) * 0.04}s` }}
            >
              <div className="flex items-center gap-2.5">
                <span className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl ${CAT_CLASSES[exp.category] || "cat-custom"}`}>
                  {cat?.emoji ?? "\ud83d\udcdd"}
                </span>
                <div>
                  <p className="text-sm font-bold">
                    {exp.description || (cat ? tCat(cat.key) : exp.category)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {memberMap.get(exp.paid_by) ?? t("unknown")}
                    {isSubset && ` \u00b7 ${t("splitInfo", { count: splitCount, total: members.length })}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold" style={{ fontFamily: "var(--font-receipt)" }}>
                  {formatAmount(exp.amount)}
                </span>
                {isPayer && (
                  <>
                    <button
                      onClick={() => onEdit(exp)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-base-300/60 transition-colors"
                      title="Edit"
                    >
                      &#x270e;
                    </button>
                    <button
                      onClick={() => handleDelete(exp)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-error/10 transition-colors"
                      title="Delete"
                    >
                      &#x2715;
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
