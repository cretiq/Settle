"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"

type Props = {
  tabId: string
  onJoined: (memberId: string) => void
}

export function NameEntry({ tabId, onJoined }: Props) {
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
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError("Session error. Refresh the page.")
      setLoading(false)
      return
    }

    const { error: insertError } = await supabase
      .from("members")
      .insert({ tab_id: tabId, user_id: user.id, name: trimmed })

    if (insertError) {
      // Unique constraint = already a member — fall through to select below
      if (!insertError.message.includes("unique") && insertError.code !== "23505") {
        setLoading(false)
        setError("Could not join. Try again.")
        return
      }
    }

    // Fetch the member ID (works now that the row exists and RLS passes)
    const { data: member } = await supabase
      .from("members")
      .select("id")
      .eq("tab_id", tabId)
      .eq("user_id", user.id)
      .single()

    setLoading(false)

    if (member) {
      onJoined(member.id)
    } else {
      setError("Could not join. Try again.")
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-24">
      <div className="text-center">
        <h1 className="text-2xl font-bold">What&apos;s your name?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          This is how others will see you
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          maxLength={30}
          autoFocus
          disabled={loading}
        />
        <Button type="submit" disabled={!name.trim() || loading}>
          {loading ? "…" : "Join"}
        </Button>
      </form>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}
