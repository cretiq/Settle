"use client"

import { useTranslations } from "next-intl"
import { StartTabButton } from "@/components/home/start-tab-button"
import { YourTabs } from "@/components/home/your-tabs"
import { LanguageSwitcher } from "@/components/language-switcher"
import { ThemeSwitcher } from "@/components/theme-switcher"

export default function HomePage() {
  const t = useTranslations("Home")

  return (
    <div className="flex flex-col gap-8 pt-14">
      <div className="text-center animate-fade-up">
        <h1 className="text-4xl font-extrabold tracking-tight gradient-text">
          Settle
        </h1>
        <p className="mt-2 text-base text-muted-foreground animate-fade-up stagger-2">
          {t("subtitle")}
        </p>
      </div>

      <div className="animate-fade-up stagger-3">
        <StartTabButton />
      </div>

      <div className="animate-fade-up stagger-4">
        <YourTabs />
      </div>

      <div className="flex justify-center gap-1 animate-fade-up stagger-5">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
    </div>
  )
}
