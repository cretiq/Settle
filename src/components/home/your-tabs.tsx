"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { useLocalTabs } from "@/hooks/use-local-tabs"
import { Card, CardContent } from "@/components/ui/card"

export function YourTabs() {
  const { tabs } = useLocalTabs()
  const t = useTranslations("YourTabs")

  if (tabs.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
        {t("heading")}
      </h2>
      <div className="space-y-2">
        {tabs.map((tab, i) => (
          <Link key={tab.slug} href={`/${tab.slug}`}>
            <Card
              className={`soft-card press-scale animate-fade-up`}
              style={{ animationDelay: `${i * 0.06}s` }}
            >
              <CardContent className="flex items-center justify-between py-4 px-5">
                <div>
                  <p className="font-bold text-base">
                    {tab.name || tab.slug}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">/{tab.slug}</p>
                </div>
                <span className="text-lg text-primary transition-transform group-hover:translate-x-1">&rarr;</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
