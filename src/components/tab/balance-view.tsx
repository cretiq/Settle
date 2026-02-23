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
      <h3 className="text-sm font-medium text-muted-foreground">{t("heading")}</h3>

      {suggestedSettlements.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("settled")}</p>
      ) : (
        <div className="space-y-2">
          {suggestedSettlements.map((s, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>
                <span className="font-medium">{s.fromName}</span>
                {" → "}
                <span className="font-medium">{s.toName}</span>
              </span>
              <div className="flex items-center gap-3">
                <span className="font-mono font-medium">
                  {formatAmount(s.amount)}
                </span>
                {currentMemberId === s.from && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm">{t("settleButton")}</Button>
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
