"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { Expense, ExpenseSplit } from "@/lib/types"

export function useExpenses(tabId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [splits, setSplits] = useState<ExpenseSplit[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tabId) return

    const supabase = createClient()

    async function fetchAll() {
      const { data: expData } = await supabase
        .from("expenses")
        .select("*")
        .eq("tab_id", tabId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })

      if (expData) {
        setExpenses(expData)

        // Fetch splits for all expenses in this tab
        const expenseIds = expData.map((e: Expense) => e.id)
        if (expenseIds.length > 0) {
          const { data: splitData } = await supabase
            .from("expense_splits")
            .select("*")
            .in("expense_id", expenseIds)

          if (splitData) setSplits(splitData)
        } else {
          setSplits([])
        }
      }
      setLoading(false)
    }

    fetchAll()

    const expChannel = supabase
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
          fetchAll()
        }
      )
      .subscribe()

    const splitChannel = supabase
      .channel(`expense_splits:${tabId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "expense_splits",
        },
        () => {
          fetchAll()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(expChannel)
      supabase.removeChannel(splitChannel)
    }
  }, [tabId])

  return { expenses, splits, loading }
}
