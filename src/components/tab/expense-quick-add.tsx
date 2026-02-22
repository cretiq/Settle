"use client"

import { Button } from "@/components/ui/button"
import { CATEGORIES } from "@/lib/constants"

type Props = {
  onSelect: (category: string) => void
}

export function ExpenseQuickAdd({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {CATEGORIES.map((cat) => (
        <Button
          key={cat.key}
          variant="outline"
          className="flex h-16 flex-col gap-1"
          onClick={() => onSelect(cat.key)}
        >
          <span className="text-xl">{cat.emoji}</span>
          <span className="text-xs">{cat.label}</span>
        </Button>
      ))}
    </div>
  )
}
