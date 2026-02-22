"use client"

import { useTranslations } from "next-intl"
import type { Member } from "@/lib/types"

type Props = {
  members: Member[]
  currentMemberId: string
}

export function MemberList({ members, currentMemberId }: Props) {
  const t = useTranslations("MemberList")

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        {t("heading", { count: members.length })}
      </h3>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => (
          <span
            key={m.id}
            className={`rounded-full px-3 py-1 text-sm ${
              m.id === currentMemberId
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground"
            }`}
          >
            {m.name}
            {m.id === currentMemberId && ` ${t("you")}`}
          </span>
        ))}
      </div>
    </div>
  )
}
