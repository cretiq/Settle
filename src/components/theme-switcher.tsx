"use client"

import { useTheme } from "next-themes"
import { Sun, Moon, Monitor } from "lucide-react"
import { Button } from "@/components/ui/button"

const cycle = ["system", "light", "dark"] as const

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  function handleSwitch() {
    const idx = cycle.indexOf(theme as (typeof cycle)[number])
    const next = cycle[(idx + 1) % cycle.length]
    setTheme(next)
  }

  const icon =
    theme === "light" ? <Sun className="size-4" /> :
    theme === "dark" ? <Moon className="size-4" /> :
    <Monitor className="size-4" />

  return (
    <Button variant="ghost" size="icon" onClick={handleSwitch}>
      {icon}
    </Button>
  )
}
