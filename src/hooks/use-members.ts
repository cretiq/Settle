"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Member } from "@/lib/types"

export function useMembers(tabId: string | null) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tabId) return

    const supabase = createClient()

    async function fetch() {
      const { data } = await supabase
        .from("members")
        .select("*")
        .eq("tab_id", tabId)
        .eq("is_active", true)
        .order("joined_at", { ascending: true })

      if (data) setMembers(data)
      setLoading(false)
    }

    fetch()

    const channel = supabase
      .channel(`members:${tabId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "members",
          filter: `tab_id=eq.${tabId}`,
        },
        () => {
          fetch()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [tabId])

  return { members, loading }
}
