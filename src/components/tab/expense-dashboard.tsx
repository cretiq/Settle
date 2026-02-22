"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useExpenses } from "@/hooks/use-expenses"
import { useMembers } from "@/hooks/use-members"
import { useSettlements } from "@/hooks/use-settlements"
import { ExpenseQuickAdd } from "./expense-quick-add"
import { ExpenseForm } from "./expense-form"
import { ExpenseList } from "./expense-list"
import { BalanceView } from "./balance-view"
import { SettlementList } from "./settlement-list"
import { MemberList } from "./member-list"
import { LanguageSwitcher } from "@/components/language-switcher"
import type { Expense, ExpenseSplit } from "@/lib/types"

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
  const t = useTranslations("Dashboard")
  const { expenses, splits } = useExpenses(tabId)
  const { members } = useMembers(tabId)
  const { settlements } = useSettlements(tabId)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState("custom")
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editingSplits, setEditingSplits] = useState<ExpenseSplit[] | null>(null)

  function handleCategorySelect(category: string) {
    setEditingExpense(null)
    setEditingSplits(null)
    setSelectedCategory(category)
    setDrawerOpen(true)
  }

  function handleEdit(expense: Expense) {
    const expSplits = splits.filter((s) => s.expense_id === expense.id)
    setEditingExpense(expense)
    setEditingSplits(expSplits)
    setSelectedCategory(expense.category)
    setDrawerOpen(true)
  }

  function handleDrawerClose(open: boolean) {
    setDrawerOpen(open)
    if (!open) {
      setEditingExpense(null)
      setEditingSplits(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{tabName || slug}</h1>
          <p className="text-sm text-muted-foreground">
            {t("codeLabel")} <span className="font-mono font-medium">{accessCode}</span>
          </p>
        </div>
        <LanguageSwitcher />
      </div>

      <ExpenseQuickAdd onSelect={handleCategorySelect} />

      <ExpenseForm
        open={drawerOpen}
        onOpenChange={handleDrawerClose}
        category={selectedCategory}
        tabId={tabId}
        members={members}
        currentMemberId={currentMemberId}
        editingExpense={editingExpense}
        editingSplits={editingSplits}
      />

      <BalanceView
        expenses={expenses}
        splits={splits}
        members={members}
        settlements={settlements}
        tabId={tabId}
        currentMemberId={currentMemberId}
      />

      <SettlementList
        settlements={settlements}
        members={members}
        currentMemberId={currentMemberId}
      />

      <ExpenseList
        expenses={expenses}
        splits={splits}
        members={members}
        currentMemberId={currentMemberId}
        onEdit={handleEdit}
      />

      <MemberList members={members} currentMemberId={currentMemberId} />
    </div>
  )
}
