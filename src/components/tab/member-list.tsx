"use client"

import { useTranslations } from "next-intl"
import type { Member } from "@/lib/types"

type Props = {
  members: Member[]
  currentMemberId: string
}

const AVATAR_COLORS = [
  "bg-primary/15 text-primary",
  "bg-secondary/15 text-secondary",
  "bg-accent/15 text-accent",
  "bg-info/15 text-info",
  "bg-warning/15 text-warning",
  "bg-error/15 text-error",
]

export function MemberList({ members, currentMemberId }: Props) {
  const t = useTranslations("MemberList")

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {t("heading", { count: members.length })}
      </h3>
      <div className="flex flex-wrap gap-2">
        {members.map((m, i) => {
          const isYou = m.id === currentMemberId
          const colorClass = isYou
            ? "bg-primary text-primary-content"
            : AVATAR_COLORS[i % AVATAR_COLORS.length]
          const initial = m.name.charAt(0).toUpperCase()

          return (
            <div
              key={m.id}
              className={`flex items-center gap-2 rounded-full pl-1 pr-3.5 py-1 text-sm font-semibold animate-scale-in ${
                isYou ? "bg-primary/10 ring-2 ring-primary/30" : "bg-base-200/80"
              }`}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${colorClass}`}>
                {initial}
              </span>
              <span>
                {m.name}
                {isYou && <span className="text-xs font-normal text-muted-foreground ml-1">{t("you")}</span>}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
