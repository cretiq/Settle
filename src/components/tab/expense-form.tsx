"use client"

import { useState, useEffect, useMemo } from "react"
import { useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { createClient } from "@/lib/supabase/client"
import { CATEGORIES, CURRENCY } from "@/lib/constants"
import type { Expense, ExpenseSplit, Member } from "@/lib/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: string
  tabId: string
  members: Member[]
  currentMemberId: string
  editingExpense?: Expense | null
  editingSplits?: ExpenseSplit[] | null
}

export function ExpenseForm({
  open,
  onOpenChange,
  category,
  tabId,
  members,
  currentMemberId,
  editingExpense,
  editingSplits,
}: Props) {
  const t = useTranslations("ExpenseForm")
  const tCat = useTranslations("Categories")
  const [amount, setAmount] = useState("")
  const [paidBy, setPaidBy] = useState(currentMemberId)
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [splitAmong, setSplitAmong] = useState<Set<string>>(new Set(members.map((m) => m.id)))
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal")
  const [customAmounts, setCustomAmounts] = useState<Map<string, string>>(new Map())

  const isEditing = !!editingExpense

  // Reset form when drawer opens/closes or editing changes
  useEffect(() => {
    if (open && editingExpense && editingSplits) {
      setAmount(String(editingExpense.amount))
      setPaidBy(editingExpense.paid_by)
      setDescription(editingExpense.description ?? "")
      const splitMemberIds = new Set(editingSplits.map((s) => s.member_id))
      setSplitAmong(splitMemberIds)

      // Detect if it's a custom split: check if amounts differ
      const amounts = editingSplits.map((s) => s.amount)
      const isCustom = amounts.length > 0 && new Set(amounts).size > 1
      // Also check if amounts don't match equal split
      const equalShare = editingExpense.amount > 0 && amounts.length > 0
        ? Math.floor(editingExpense.amount / amounts.length)
        : 0
      const remainder = editingExpense.amount - equalShare * amounts.length
      const isNotEqual = editingSplits.some((s) => {
        const sorted = [...editingSplits].sort((a, b) => a.member_id.localeCompare(b.member_id))
        const idx = sorted.findIndex((ss) => ss.member_id === s.member_id)
        const expected = equalShare + (idx < remainder ? 1 : 0)
        return s.amount !== expected
      })

      if (isCustom || isNotEqual) {
        setSplitMode("custom")
        const cm = new Map<string, string>()
        for (const s of editingSplits) {
          cm.set(s.member_id, String(s.amount))
        }
        setCustomAmounts(cm)
      } else {
        setSplitMode("equal")
        setCustomAmounts(new Map())
      }
    } else if (open && !editingExpense) {
      setAmount("")
      setPaidBy(currentMemberId)
      setDescription("")
      setSplitAmong(new Set(members.map((m) => m.id)))
      setSplitMode("equal")
      setCustomAmounts(new Map())
    }
  }, [open, editingExpense, editingSplits, currentMemberId, members])

  const categoryInfo = CATEGORIES.find((c) => c.key === category)

  const selectedMembers = useMemo(
    () => members.filter((m) => splitAmong.has(m.id)),
    [members, splitAmong]
  )

  // Custom split validation
  const customTotal = useMemo(() => {
    let sum = 0
    for (const id of splitAmong) {
      sum += parseInt(customAmounts.get(id) ?? "0", 10) || 0
    }
    return sum
  }, [customAmounts, splitAmong])

  const parsedAmount = parseInt(amount, 10) || 0
  const customValid = splitMode === "equal" || customTotal === parsedAmount

  function buildSplits(): { member_id: string; amount: number }[] {
    const selected = [...splitAmong]
    if (splitMode === "custom") {
      return selected.map((id) => ({
        member_id: id,
        amount: parseInt(customAmounts.get(id) ?? "0", 10) || 0,
      })).filter((s) => s.amount > 0)
    }

    // Equal split
    const count = selected.length
    const share = Math.floor(parsedAmount / count)
    const remainder = parsedAmount - share * count
    const sorted = [...selected].sort()
    return sorted.map((id, i) => ({
      member_id: id,
      amount: share + (i < remainder ? 1 : 0),
    }))
  }

  function toggleMember(id: string) {
    setSplitAmong((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        if (next.size > 1) next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  function handleCustomAmount(memberId: string, value: string) {
    setCustomAmounts((prev) => {
      const next = new Map(prev)
      next.set(memberId, value)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsedAmount || parsedAmount <= 0 || !customValid) return

    setLoading(true)
    const supabase = createClient()
    const splitsData = buildSplits()

    if (isEditing && editingExpense) {
      await supabase.rpc("update_expense_with_splits", {
        p_expense_id: editingExpense.id,
        p_paid_by: paidBy,
        p_category: category,
        p_amount: parsedAmount,
        p_description: description.trim() || null,
        p_splits: splitsData,
      })
    } else {
      await supabase.rpc("create_expense_with_splits", {
        p_tab_id: tabId,
        p_paid_by: paidBy,
        p_category: category,
        p_amount: parsedAmount,
        p_description: description.trim() || null,
        p_splits: splitsData,
      })
    }

    setLoading(false)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {isEditing
              ? t("editExpense")
              : categoryInfo
                ? `${categoryInfo.emoji} ${tCat(category)}`
                : t("addExpense")}
          </DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              {t("amountLabel", { currency: CURRENCY })}
            </label>
            <Input
              type="number"
              inputMode="numeric"
              min="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="text-2xl font-mono"
            />
          </div>

          {(category === "custom" || isEditing) && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("descriptionLabel")}
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                maxLength={100}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">{t("whoPaid")}</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={paidBy === m.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPaidBy(m.id)}
                >
                  {m.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("splitAmong")}</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={splitAmong.has(m.id) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleMember(m.id)}
                >
                  {m.name}
                </Button>
              ))}
            </div>
            {splitAmong.size < members.length && (
              <p className="mt-1 text-xs text-muted-foreground">
                {t("membersCount", { count: splitAmong.size, total: members.length })}
              </p>
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">{t("splitMode")}</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={splitMode === "equal" ? "default" : "outline"}
                size="sm"
                onClick={() => setSplitMode("equal")}
              >
                {t("equal")}
              </Button>
              <Button
                type="button"
                variant={splitMode === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setSplitMode("custom")}
              >
                {t("customSplit")}
              </Button>
            </div>
          </div>

          {splitMode === "custom" && (
            <div className="space-y-2">
              {selectedMembers.map((m) => (
                <div key={m.id} className="flex items-center gap-2">
                  <span className="w-24 truncate text-sm">{m.name}</span>
                  <Input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={customAmounts.get(m.id) ?? ""}
                    onChange={(e) => handleCustomAmount(m.id, e.target.value)}
                    placeholder="0"
                    className="font-mono"
                  />
                </div>
              ))}
              <p className={`text-xs ${customValid ? "text-muted-foreground" : "text-destructive"}`}>
                {t("splitTotal", { current: customTotal, total: parsedAmount, currency: CURRENCY })}
                {!customValid && ` \u2014 ${t("splitMismatch")}`}
              </p>
            </div>
          )}

          <DrawerFooter className="px-0">
            <Button type="submit" disabled={!parsedAmount || loading || !customValid || splitAmong.size === 0}>
              {loading
                ? isEditing ? t("saving") : t("adding")
                : isEditing ? t("saveChanges") : t("addExpense")}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">{t("cancel")}</Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
