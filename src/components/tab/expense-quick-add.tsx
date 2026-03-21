"use client"

import { useTranslations } from "next-intl"
import { CATEGORIES } from "@/lib/constants"

type Props = {
  onSelect: (category: string) => void
}

const CAT_CLASSES: Record<string, string> = {
  pizza: "cat-pizza",
  drink: "cat-drink",
  beer: "cat-beer",
  custom: "cat-custom",
}

export function ExpenseQuickAdd({ onSelect }: Props) {
  const t = useTranslations("Categories")

  return (
    <div className="grid grid-cols-4 gap-2.5">
      {CATEGORIES.map((cat, i) => (
        <button
          key={cat.key}
          onClick={() => onSelect(cat.key)}
          className={`flex h-20 flex-col items-center justify-center gap-1.5 rounded-2xl border border-transparent press-scale hover-lift animate-bounce-in transition-colors ${CAT_CLASSES[cat.key] || ""}`}
          style={{ animationDelay: `${i * 0.07}s` }}
        >
          <span className="text-3xl hover-wiggle">{cat.emoji}</span>
          <span className="text-xs font-semibold text-foreground/70">{t(cat.key)}</span>
        </button>
      ))}
    </div>
  )
}
