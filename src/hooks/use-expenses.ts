"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Expense } from "@/lib/types"

export function useExpenses(tabId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tabId) return

    const supabase = createClient()

    async function fetch() {
      const { data } = await supabase
        .from("expenses")
        .select("*")
        .eq("tab_id", tabId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (data) setExpenses(data)
      setLoading(false)
    }

    fetch()

    const channel = supabase
      .channel(`expenses:${tabId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expenses",
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

  return { expenses, loading }
}
