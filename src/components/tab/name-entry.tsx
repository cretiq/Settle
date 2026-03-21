"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

type Props = {
  slug: string
  accessCode: string
  onJoined: (memberId: string) => void
}

export function NameEntry({ slug, accessCode, onJoined }: Props) {
  const t = useTranslations("NameEntry")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError("")

    const supabase = createClient()

    const { data, error: rpcError } = await supabase.rpc("join_tab", {
      tab_slug: slug,
      code: accessCode,
      member_name: trimmed,
    })

    setLoading(false)

    if (rpcError || !data) {
      setError(t("joinError"))
      return
    }

    onJoined(data.member_id)
  }

  return (
    <div className="flex flex-col items-center gap-8 pt-20 animate-fade-up">
      <div className="text-center">
        <span className="text-4xl block mb-3 animate-bounce-in">&#x1F44B;</span>
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs gap-2 animate-fade-up stagger-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("placeholder")}
          maxLength={30}
          autoFocus
          disabled={loading}
          className="h-12 rounded-xl text-base font-semibold"
        />
        <Button
          type="submit"
          disabled={!name.trim() || loading}
          className="h-12 rounded-xl px-6 press-scale font-bold"
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-primary-content/30 border-t-primary-content rounded-full animate-spin" />
          ) : (
            t("join")
          )}
        </Button>
      </form>

      {error && (
        <p className="text-sm text-destructive font-semibold animate-fade-up">
          {error}
        </p>
      )}
    </div>
  )
}
