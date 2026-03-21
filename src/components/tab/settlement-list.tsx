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
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("heading")}</h3>
      <div className="space-y-1.5">
        {settlements.map((s, i) => {
          const isFrom = s.from_member === currentMemberId

          return (
            <div
              key={s.id}
              className="soft-card !bg-success/10 flex items-center justify-between px-4 py-2.5 text-sm animate-scale-in"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <span className="flex items-center gap-2">
                <span className="text-success text-base">&#x2713;</span>
                <span className="font-bold">{memberMap.get(s.from_member) ?? t("unknown")}</span>
                {" \u2192 "}
                <span className="font-bold">{memberMap.get(s.to_member) ?? t("unknown")}</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold" style={{ fontFamily: "var(--font-receipt)" }}>
                  {formatAmount(s.amount)}
                </span>
                {isFrom && (
                  <button
                    onClick={() => handleDelete(s)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-xs text-muted-foreground hover:text-destructive hover:bg-error/10 transition-colors"
                    title="Remove"
                  >
                    &#x2715;
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
