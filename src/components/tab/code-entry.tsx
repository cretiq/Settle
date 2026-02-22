"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"

type Props = {
  onVerified: (tabId: string) => void
  slug: string
  maxAttempts?: number
}

export function CodeEntry({ onVerified, slug, maxAttempts = 5 }: Props) {
  const t = useTranslations("CodeEntry")
  const [digits, setDigits] = useState(["", "", "", ""])
  const [error, setError] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [checking, setChecking] = useState(false)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  async function verify(code: string) {
    setChecking(true)
    setError("")

    const { createClient } = await import("@/lib/supabase/client")
    const supabase = createClient()

    const { data, error: rpcError } = await supabase.rpc("verify_tab_code", {
      tab_slug: slug,
      code,
    })

    setChecking(false)

    if (rpcError || !data) {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      if (newAttempts >= maxAttempts) {
        setError(t("tooManyAttempts"))
      } else {
        setError(t("wrongCode"))
      }
      setDigits(["", "", "", ""])
      refs[0].current?.focus()
      return
    }

    onVerified(data)
  }

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return

    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)
    setError("")

    if (value && index < 3) {
      refs[index + 1].current?.focus()
    }

    // Auto-submit when all 4 digits entered
    if (value && index === 3) {
      const code = newDigits.join("")
      if (code.length === 4) verify(code)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4)
    if (pasted.length === 4) {
      setDigits(pasted.split(""))
      verify(pasted)
    }
  }

  const locked = attempts >= maxAttempts

  return (
    <div className="flex flex-col items-center gap-6 pt-24">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="flex gap-3">
        {digits.map((digit, i) => (
          <Input
            key={i}
            ref={refs[i]}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={locked || checking}
            className="h-14 w-14 text-center text-2xl font-mono"
            autoFocus={i === 0}
          />
        ))}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {checking && (
        <p className="text-sm text-muted-foreground">{t("checking")}</p>
      )}
    </div>
  )
}
