"use client"

import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { calculateBalances, simplifyDebts } from "@/lib/balance"
import { formatAmount } from "@/lib/constants"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { Expense, ExpenseSplit, Member, RecordedSettlement } from "@/lib/types"

type Props = {
  expenses: Expense[]
  splits: ExpenseSplit[]
  members: Member[]
  settlements: RecordedSettlement[]
  tabId: string
  currentMemberId: string
}

export function BalanceView({ expenses, splits, members, settlements, tabId, currentMemberId }: Props) {
  const t = useTranslations("BalanceView")
  const balances = calculateBalances(expenses, splits, members, settlements)
  const suggestedSettlements = simplifyDebts(balances)

  if (members.length < 2) return null

  async function handleSettle(fromId: string, toId: string, amount: number) {
    const supabase = createClient()
    await supabase.from("settlements").insert({
      tab_id: tabId,
      from_member: fromId,
      to_member: toId,
      amount,
    })
    toast(t("settlementRecorded"))
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("heading")}</h3>

      {suggestedSettlements.length === 0 ? (
        <div className="soft-card !bg-success/10 px-4 py-5 text-center">
          <span className="text-2xl block mb-1">&#x2728;</span>
          <p className="text-sm font-semibold text-success">{t("settled")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {suggestedSettlements.map((s, i) => (
            <div
              key={i}
              className="soft-card flex items-center justify-between px-4 py-3 animate-scale-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-bold">{s.fromName}</span>
                <span className="text-muted-foreground">&rarr;</span>
                <span className="rounded-full bg-secondary/15 text-secondary px-3 py-1 text-xs font-bold">{s.toName}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono font-bold text-sm" style={{ fontFamily: "var(--font-receipt)" }}>{formatAmount(s.amount)}</span>
                {currentMemberId === s.from && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" className="rounded-xl press-scale font-bold">
                        {t("settleButton")}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t("confirmDescription", {
                            from: s.fromName,
                            to: s.toName,
                            amount: formatAmount(s.amount),
                          })}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleSettle(s.from, s.to, s.amount)}>
                          {t("confirm")}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
