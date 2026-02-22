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
      <h2 className="text-sm font-medium text-muted-foreground">{t("heading")}</h2>
      <div className="space-y-2">
        {tabs.map((tab) => (
          <Link key={tab.slug} href={`/${tab.slug}`}>
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">
                    {tab.name || tab.slug}
                  </p>
                  <p className="text-xs text-muted-foreground">/{tab.slug}</p>
                </div>
                <span className="text-muted-foreground">&rarr;</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
