"use client"

import { StartTabButton } from "@/components/home/start-tab-button"
import { YourTabs } from "@/components/home/your-tabs"

export default function HomePage() {
  return (
    <div className="flex flex-col gap-8 pt-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight">Settle</h1>
        <p className="mt-2 text-muted-foreground">
          Split expenses. No signup needed.
        </p>
      </div>

      <StartTabButton />

      <YourTabs />
    </div>
  )
}
