"use client"

import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { formatAmount } from "@/lib/constants"
import type { Member, RecordedSettlement } from "@/lib/types"

type Props = {
  settlements: RecordedSettlement[]
  members: Member[]
  currentMemberId: string
}

export function SettlementList({ settlements, members, currentMemberId }: Props) {
  const t = useTranslations("SettlementList")
  const memberMap = new Map(members.map((m) => [m.id, m.name]))

  async function handleDelete(settlement: RecordedSettlement) {
    const supabase = createClient()

    await supabase
      .from("settlements")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", settlement.id)

    toast(t("removed"), {
      action: {
        label: t("undo"),
        onClick: async () => {
          await supabase
            .from("settlements")
            .update({ deleted_at: null })
            .eq("id", settlement.id)
        },
      },
      duration: 5000,
    })
  }

  if (settlements.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">{t("heading")}</h3>
      <div className="space-y-1">
        {settlements.map((s) => {
          const isFrom = s.from_member === currentMemberId

          return (
            <div
              key={s.id}
              className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm dark:border-green-900 dark:bg-green-950"
            >
              <span>
                <span className="font-medium">{memberMap.get(s.from_member) ?? t("unknown")}</span>
                {" \u2192 "}
                <span className="font-medium">{memberMap.get(s.to_member) ?? t("unknown")}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-medium">{formatAmount(s.amount)}</span>
                {isFrom && (
                  <button
                    onClick={() => handleDelete(s)}
                    className="text-xs text-muted-foreground hover:text-destructive"
                    title="Remove"
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
