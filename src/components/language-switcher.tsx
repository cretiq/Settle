"use client"

import { useLocale } from "next-intl"
import { Button } from "@/components/ui/button"

export function LanguageSwitcher() {
  const locale = useLocale()

  function handleSwitch() {
    const next = locale === "sv" ? "en" : "sv"
    document.cookie = `locale=${next};path=/;max-age=31536000`
    window.location.reload()
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleSwitch} className="text-lg">
      {locale === "sv" ? "🇸🇪" : "🇬🇧"}
    </Button>
  )
}
