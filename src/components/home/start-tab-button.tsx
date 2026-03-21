"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"

export function StartTabButton() {
  const router = useRouter()
  const t = useTranslations("StartTab")
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)
    try {
      const res = await fetch("/api/tabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (data.slug) {
        router.push(`/${data.slug}?code=${data.code}`)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      size="lg"
      className="w-full text-lg font-bold h-14 rounded-2xl press-scale animate-pulse-glow"
    >
      {loading ? t("creating") : t("startTab")}
    </Button>
  )
}
