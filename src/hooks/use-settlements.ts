"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RecordedSettlement } from "@/lib/types"

export function useSettlements(tabId: string | null) {
  const [settlements, setSettlements] = useState<RecordedSettlement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tabId) return

    const supabase = createClient()

    async function fetch() {
      const { data } = await supabase
        .from("settlements")
        .select("*")
        .eq("tab_id", tabId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (data) setSettlements(data)
      setLoading(false)
    }

    fetch()

    const channel = supabase
      .channel(`settlements:${tabId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "settlements",
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

  return { settlements, loading }
}
