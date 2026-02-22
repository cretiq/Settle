"use client"

import { useState } from "react"
import { useExpenses } from "@/hooks/use-expenses"
import { useMembers } from "@/hooks/use-members"
import { ExpenseQuickAdd } from "./expense-quick-add"
import { ExpenseForm } from "./expense-form"
import { ExpenseList } from "./expense-list"
import { BalanceView } from "./balance-view"
import { MemberList } from "./member-list"

type Props = {
  tabId: string
  tabName: string | null
  slug: string
  currentMemberId: string
  accessCode: string
}

export function ExpenseDashboard({
  tabId,
  tabName,
  slug,
  currentMemberId,
  accessCode,
}: Props) {
  const { expenses } = useExpenses(tabId)
  const { members } = useMembers(tabId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("custom")

  function handleCategorySelect(category: string) {
    setSelectedCategory(category)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{tabName || slug}</h1>
        <p className="text-sm text-muted-foreground">
          Code: <span className="font-mono font-medium">{accessCode}</span>
        </p>
      </div>

      <ExpenseQuickAdd onSelect={handleCategorySelect} />

      <ExpenseForm
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        category={selectedCategory}
        tabId={tabId}
        members={members}
        currentMemberId={currentMemberId}
      />

      <BalanceView expenses={expenses} members={members} />

      <ExpenseList
        expenses={expenses}
        members={members}
        currentMemberId={currentMemberId}
      />

      <MemberList members={members} currentMemberId={currentMemberId} />
    </div>
  )
}
