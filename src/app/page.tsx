"use client"

import { useTranslations } from "next-intl"
import { StartTabButton } from "@/components/home/start-tab-button"
import { YourTabs } from "@/components/home/your-tabs"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function HomePage() {
  const t = useTranslations("Home")

  return (
    <div className="flex flex-col gap-8 pt-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Settle</h1>
        <p className="mt-2 text-muted-foreground">
          {t("subtitle")}
        </p>
      </div>

      <StartTabButton />

      <YourTabs />

      <div className="flex justify-center gap-1">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
    </div>
  )
}
