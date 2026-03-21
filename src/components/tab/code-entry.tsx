"use client"

import { useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { CODE_LENGTH } from "@/lib/constants"

type Props = {
  onVerified: (tabId: string, code: string) => void
  slug: string
  maxAttempts?: number
}

export function CodeEntry({ onVerified, slug, maxAttempts = 5 }: Props) {
  const t = useTranslations("CodeEntry")
  const [digits, setDigits] = useState(Array(CODE_LENGTH).fill(""))
  const [error, setError] = useState("")
  const [attempts, setAttempts] = useState(0)
  const [checking, setChecking] = useState(false)
  const refs = Array.from({ length: CODE_LENGTH }, () => useRef<HTMLInputElement>(null))

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
      setDigits(Array(CODE_LENGTH).fill(""))
      refs[0].current?.focus()
      return
    }

    onVerified(data, code)
  }

  function handleChange(index: number, value: string) {
    if (!/^\d*$/.test(value)) return

    const newDigits = [...digits]
    newDigits[index] = value.slice(-1)
    setDigits(newDigits)
    setError("")

    if (value && index < CODE_LENGTH - 1) {
      refs[index + 1].current?.focus()
    }

    if (value && index === CODE_LENGTH - 1) {
      const code = newDigits.join("")
      if (code.length === CODE_LENGTH) verify(code)
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      refs[index - 1].current?.focus()
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, CODE_LENGTH)
    if (pasted.length === CODE_LENGTH) {
      setDigits(pasted.split(""))
      verify(pasted)
    }
  }

  const locked = attempts >= maxAttempts

  return (
    <div className="flex flex-col items-center gap-8 pt-20 animate-fade-up">
      <div className="text-center">
        <span className="text-4xl block mb-3 animate-bounce-in">&#x1F510;</span>
        <h1 className="text-2xl font-extrabold">{t("title")}</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {t("description")}
        </p>
      </div>

      <div className="flex gap-2">
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
            className={`h-14 w-12 text-center text-2xl font-bold font-mono rounded-2xl border-2 transition-all focus:border-primary focus:ring-4 focus:ring-primary/20 animate-scale-in ${
              digit ? "border-primary/50 bg-primary/5" : ""
            }`}
            style={{ animationDelay: `${i * 0.08}s` }}
            autoFocus={i === 0}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive font-semibold animate-fade-up">
          {error}
        </p>
      )}
      {checking && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          {t("checking")}
        </div>
      )}
    </div>
  )
}
