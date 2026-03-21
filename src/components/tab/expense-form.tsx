"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
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

function percentagesToAmounts(
  totalAmount: number,
  memberIds: string[],
  percentages: Map<string, string>,
): Map<string, number> {
  const result = new Map<string, number>()
  let allocated = 0
  const entries: { id: string; raw: number }[] = []

  for (const id of memberIds) {
    const pct = parseFloat(percentages.get(id) ?? "0") || 0
    const raw = (pct / 100) * totalAmount
    const floored = Math.floor(raw)
    entries.push({ id, raw })
    result.set(id, floored)
    allocated += floored
  }

  let remaining = totalAmount - allocated
  const byFraction = [...entries].sort((a, b) => (b.raw % 1) - (a.raw % 1))
  for (const entry of byFraction) {
    if (remaining <= 0) break
    result.set(entry.id, (result.get(entry.id) ?? 0) + 1)
    remaining--
  }

  return result
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
  const [phoneFrame, setPhoneFrame] = useState<HTMLElement | null>(null)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)")
    const update = () => setPhoneFrame(mq.matches ? document.getElementById("phone-frame") : null)
    update()
    mq.addEventListener("change", update)
    return () => mq.removeEventListener("change", update)
  }, [])
  const [amount, setAmount] = useState("")
  const [paidBy, setPaidBy] = useState(currentMemberId)
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [splitAmong, setSplitAmong] = useState<Set<string>>(new Set(members.map((m) => m.id)))
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal")
  const [customAmounts, setCustomAmounts] = useState<Map<string, string>>(new Map())
  const [customInputMode, setCustomInputMode] = useState<"amount" | "percent">("amount")
  const [lockedMembers, setLockedMembers] = useState<Set<string>>(new Set())
  const [customPercentages, setCustomPercentages] = useState<Map<string, string>>(new Map())

  const isEditing = !!editingExpense

  useEffect(() => {
    if (open && editingExpense && editingSplits) {
      setAmount(String(editingExpense.amount))
      setPaidBy(editingExpense.paid_by)
      setDescription(editingExpense.description ?? "")
      const splitMemberIds = new Set(editingSplits.map((s) => s.member_id))
      setSplitAmong(splitMemberIds)

      const amounts = editingSplits.map((s) => s.amount)
      const isCustom = amounts.length > 0 && new Set(amounts).size > 1
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
      setCustomInputMode("amount")
      setCustomPercentages(new Map())
      setLockedMembers(new Set())
    } else if (open && !editingExpense) {
      setAmount("")
      setPaidBy(currentMemberId)
      setDescription("")
      setSplitAmong(new Set(members.map((m) => m.id)))
      setSplitMode("equal")
      setCustomAmounts(new Map())
      setCustomInputMode("amount")
      setCustomPercentages(new Map())
      setLockedMembers(new Set())
    }
  }, [open, editingExpense, editingSplits, currentMemberId, members])

  const categoryInfo = CATEGORIES.find((c) => c.key === category)

  const selectedMembers = useMemo(
    () => members.filter((m) => splitAmong.has(m.id)),
    [members, splitAmong]
  )

  const parsedAmount = parseInt(amount, 10) || 0

  useEffect(() => {
    if (splitMode !== "custom" || parsedAmount <= 0 || customPercentages.size === 0) return
    const ids = [...splitAmong]
    const am = new Map<string, string>()
    ids.forEach((id) => {
      const pct = parseFloat(customPercentages.get(id) ?? "0") || 0
      am.set(id, String(Math.round((pct / 100) * parsedAmount)))
    })
    setCustomAmounts(am)
  }, [parsedAmount]) // eslint-disable-line react-hooks/exhaustive-deps

  const customTotal = useMemo(() => {
    let sum = 0
    for (const id of splitAmong) {
      sum += parseInt(customAmounts.get(id) ?? "0", 10) || 0
    }
    return sum
  }, [customAmounts, splitAmong])

  const percentTotal = useMemo(() => {
    let sum = 0
    for (const id of splitAmong) {
      sum += parseFloat(customPercentages.get(id) ?? "0") || 0
    }
    return sum
  }, [customPercentages, splitAmong])

  const percentAmounts = useMemo(
    () => percentagesToAmounts(parsedAmount, [...splitAmong], customPercentages),
    [parsedAmount, splitAmong, customPercentages]
  )

  const customValid = splitMode === "equal"
    || (customInputMode === "amount" ? customTotal === parsedAmount : Math.abs(percentTotal - 100) < 0.01)

  const prefillEqual = useCallback(() => {
    const ids = [...splitAmong]
    const count = ids.length
    if (count === 0) return

    const share = parsedAmount > 0 ? Math.floor(parsedAmount / count) : 0
    const rem = parsedAmount > 0 ? parsedAmount - share * count : 0
    const sorted = [...ids].sort()
    const am = new Map<string, string>()
    sorted.forEach((id, i) => am.set(id, String(share + (i < rem ? 1 : 0))))
    setCustomAmounts(am)

    const pctBase = Math.floor((1000 / count)) / 10
    const pm = new Map<string, string>()
    let pctRemaining = 100
    sorted.forEach((id, i) => {
      if (i === count - 1) {
        pm.set(id, String(Math.round(pctRemaining * 10) / 10))
      } else {
        pm.set(id, String(pctBase))
        pctRemaining -= pctBase
      }
    })
    setCustomPercentages(pm)
    setLockedMembers(new Set())
  }, [splitAmong, parsedAmount])

  function buildSplits(): { member_id: string; amount: number }[] {
    const selected = [...splitAmong]
    if (splitMode === "custom") {
      if (customInputMode === "percent") {
        return selected.map((id) => ({
          member_id: id,
          amount: percentAmounts.get(id) ?? 0,
        })).filter((s) => s.amount > 0)
      }
      return selected.map((id) => ({
        member_id: id,
        amount: parseInt(customAmounts.get(id) ?? "0", 10) || 0,
      })).filter((s) => s.amount > 0)
    }

    const count = selected.length
    const share = Math.floor(parsedAmount / count)
    const remainder = parsedAmount - share * count
    const sorted = [...selected].sort()
    return sorted.map((id, i) => ({
      member_id: id,
      amount: share + (i < remainder ? 1 : 0),
    }))
  }

  const yourShare = useMemo(() => {
    if (parsedAmount <= 0 || splitAmong.size === 0) return 0
    const splits = buildSplits()
    return splits.find((s) => s.member_id === currentMemberId)?.amount ?? 0
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedAmount, splitAmong, splitMode, customInputMode, customAmounts, customPercentages, currentMemberId, percentAmounts])

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
    let kr = parseInt(value, 10) || 0
    const others = [...splitAmong].filter((id) => id !== memberId)

    const unlocked = others.filter((id) => !lockedMembers.has(id))
    const effectiveLocked = unlocked.length === 0 ? [] : [...lockedMembers].filter((id) => id !== memberId && splitAmong.has(id))
    const effectiveUnlocked = unlocked.length === 0 ? others : unlocked

    if (unlocked.length === 0) {
      setLockedMembers(new Set([memberId]))
    } else {
      setLockedMembers((prev) => new Set(prev).add(memberId))
    }

    const lockedSum = effectiveLocked.reduce((sum, id) => sum + (parseInt(customAmounts.get(id) ?? "0", 10) || 0), 0)
    kr = Math.min(kr, Math.max(0, parsedAmount - lockedSum))

    const remaining = Math.max(0, parsedAmount - kr - lockedSum)
    const nextAmounts = new Map<string, string>()
    nextAmounts.set(memberId, String(kr))
    for (const id of effectiveLocked) {
      nextAmounts.set(id, customAmounts.get(id) ?? "0")
    }
    if (effectiveUnlocked.length > 0) {
      const share = Math.floor(remaining / effectiveUnlocked.length)
      const rem = remaining - share * effectiveUnlocked.length
      const sorted = [...effectiveUnlocked].sort()
      sorted.forEach((id, i) => nextAmounts.set(id, String(share + (i < rem ? 1 : 0))))
    }
    setCustomAmounts(nextAmounts)

    if (parsedAmount > 0) {
      const nextPct = new Map<string, string>()
      for (const [id, v] of nextAmounts) {
        const amt = parseInt(v, 10) || 0
        nextPct.set(id, String(Math.round((amt / parsedAmount) * 1000) / 10))
      }
      setCustomPercentages(nextPct)
    }
  }

  function handleCustomPercentage(memberId: string, value: string) {
    let pct = parseFloat(value) || 0
    const others = [...splitAmong].filter((id) => id !== memberId)

    const unlocked = others.filter((id) => !lockedMembers.has(id))
    const effectiveLocked = unlocked.length === 0 ? [] : [...lockedMembers].filter((id) => id !== memberId && splitAmong.has(id))
    const effectiveUnlocked = unlocked.length === 0 ? others : unlocked

    if (unlocked.length === 0) {
      setLockedMembers(new Set([memberId]))
    } else {
      setLockedMembers((prev) => new Set(prev).add(memberId))
    }

    const lockedPctSum = effectiveLocked.reduce((sum, id) => sum + (parseFloat(customPercentages.get(id) ?? "0") || 0), 0)
    pct = Math.min(pct, Math.max(0, Math.round((100 - lockedPctSum) * 10) / 10))

    const remainingPct = Math.max(0, 100 - pct - lockedPctSum)
    const nextPct = new Map<string, string>()
    nextPct.set(memberId, String(pct))
    for (const id of effectiveLocked) {
      nextPct.set(id, customPercentages.get(id) ?? "0")
    }
    if (effectiveUnlocked.length > 0) {
      const share = Math.round((remainingPct / effectiveUnlocked.length) * 10) / 10
      const sorted = [...effectiveUnlocked].sort()
      let left = Math.round(remainingPct * 10) / 10
      sorted.forEach((id, i) => {
        if (i === sorted.length - 1) {
          nextPct.set(id, String(Math.round(left * 10) / 10))
        } else {
          nextPct.set(id, String(share))
          left -= share
        }
      })
    }
    setCustomPercentages(nextPct)

    if (parsedAmount > 0) {
      const nextAmounts = new Map<string, string>()
      for (const [id, v] of nextPct) {
        const p = parseFloat(v) || 0
        nextAmounts.set(id, String(Math.round((p / 100) * parsedAmount)))
      }
      setCustomAmounts(nextAmounts)
    }
  }

  function applyPercentPreset(distribution: number[]) {
    const ids = [...splitAmong].sort()
    const pm = new Map<string, string>()
    ids.forEach((id, i) => pm.set(id, String(distribution[i] ?? 0)))
    setCustomPercentages(pm)
    if (parsedAmount > 0) {
      const am = new Map<string, string>()
      ids.forEach((id, i) => {
        const kr = Math.round(((distribution[i] ?? 0) / 100) * parsedAmount)
        am.set(id, String(kr))
      })
      setCustomAmounts(am)
    }
    setLockedMembers(new Set())
  }

  function handleCustomClick() {
    if (splitMode !== "custom") {
      setSplitMode("custom")
      setCustomInputMode("amount")
      prefillEqual()
    }
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
    <Drawer open={open} onOpenChange={onOpenChange} container={phoneFrame ?? undefined} noBodyStyles={!!phoneFrame}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-lg font-extrabold">
            {isEditing
              ? t("editExpense")
              : categoryInfo
                ? `${categoryInfo.emoji} ${tCat(category)}`
                : t("addExpense")}
          </DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          <div className="flex items-end gap-3">
            <div className={`relative ${category === "custom" || isEditing ? "w-1/3" : "flex-1"}`}>
              <Input
                type="number"
                inputMode="numeric"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                autoFocus
                className="text-2xl font-bold pr-8 h-12 rounded-xl"
                style={{ fontFamily: "var(--font-receipt)" }}
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-semibold">
                {CURRENCY}
              </span>
            </div>

            {(category === "custom" || isEditing) && (
              <div className="flex-1">
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  maxLength={100}
                  className="text-sm h-12 rounded-xl"
                />
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("whoPaid")}</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={paidBy === m.id ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl press-scale font-semibold"
                  onClick={() => setPaidBy(m.id)}
                >
                  {m.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("splitAmong")}</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <Button
                  key={m.id}
                  type="button"
                  variant={splitAmong.has(m.id) ? "default" : "outline"}
                  size="sm"
                  className="rounded-xl press-scale font-semibold"
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
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("splitMode")}</label>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={splitMode === "equal" ? "default" : "outline"}
                size="sm"
                className="rounded-xl press-scale font-semibold"
                onClick={() => setSplitMode("equal")}
              >
                {t("equal")}
              </Button>
              <div className="flex">
                <Button
                  type="button"
                  variant={splitMode === "custom" ? "default" : "outline"}
                  size="sm"
                  className={`rounded-xl press-scale font-semibold ${splitMode === "custom" ? "rounded-r-none border-r-0" : ""}`}
                  onClick={handleCustomClick}
                >
                  {t("customSplit")}
                </Button>
                {splitMode === "custom" && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-l-none rounded-r-xl font-bold"
                    onClick={() => setCustomInputMode((prev) => (prev === "amount" ? "percent" : "amount"))}
                  >
                    {customInputMode === "amount" ? CURRENCY : "%"}
                  </Button>
                )}
              </div>
              {parsedAmount > 0 && splitAmong.size > 0 && splitMode === "equal" && (
                <span className="ml-auto text-sm text-muted-foreground font-semibold" style={{ fontFamily: "var(--font-receipt)" }}>
                  {t("yourShare", { amount: yourShare, currency: CURRENCY })}
                </span>
              )}
            </div>
          </div>

          {splitMode === "custom" && (
            <div className="mt-6 space-y-2">
              {customInputMode === "percent" && selectedMembers.length === 2 && (
                <div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" className="h-7 px-3 text-xs rounded-lg font-bold press-scale"
                    onClick={() => applyPercentPreset([50, 50])}>50/50</Button>
                  <Button type="button" variant="outline" className="h-7 px-3 text-xs rounded-lg font-bold press-scale"
                    onClick={() => applyPercentPreset([60, 40])}>60/40</Button>
                  <Button type="button" variant="outline" className="h-7 px-3 text-xs rounded-lg font-bold press-scale"
                    onClick={() => applyPercentPreset([70, 30])}>70/30</Button>
                </div>
              )}

              <div className="space-y-1.5">
                {selectedMembers.map((m) => {
                  const krVal = parseInt(customAmounts.get(m.id) ?? "0", 10) || 0
                  const pctVal = parseFloat(customPercentages.get(m.id) ?? "0") || 0
                  const sliderMax = customInputMode === "amount" ? parsedAmount : 100
                  const val = customInputMode === "amount" ? krVal : pctVal
                  return (
                    <div key={m.id} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 truncate text-sm font-bold">{m.name}</span>
                      <input
                        type="range"
                        min={0}
                        max={sliderMax}
                        step={customInputMode === "amount" ? 1 : 0.1}
                        value={val}
                        onChange={(e) => {
                          if (customInputMode === "amount") {
                            handleCustomAmount(m.id, e.target.value)
                          } else {
                            handleCustomPercentage(m.id, e.target.value)
                          }
                        }}
                        className="range range-primary range-lg flex-1"
                      />
                      <div className="flex w-16 shrink-0 items-center rounded-lg border px-1.5 py-1">
                        <input
                          type="number"
                          inputMode={customInputMode === "amount" ? "numeric" : "decimal"}
                          min={0}
                          max={sliderMax}
                          step={customInputMode === "amount" ? 1 : 0.1}
                          value={customInputMode === "amount" ? (customAmounts.get(m.id) ?? "") : (customPercentages.get(m.id) ?? "")}
                          onChange={(e) => {
                            if (customInputMode === "amount") {
                              handleCustomAmount(m.id, e.target.value)
                            } else {
                              handleCustomPercentage(m.id, e.target.value)
                            }
                          }}
                          className="w-full border-0 bg-transparent p-0 text-right text-sm font-bold tabular-nums outline-none"
                          style={{ fontFamily: "var(--font-receipt)" }}
                        />
                        <span className="ml-0.5 shrink-0 text-xs text-muted-foreground font-semibold">
                          {customInputMode === "amount" ? CURRENCY : "%"}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <DrawerFooter className="px-0">
            <Button
              type="submit"
              disabled={!parsedAmount || loading || !customValid || splitAmong.size === 0}
              className="h-12 rounded-xl press-scale font-bold text-base"
            >
              {loading
                ? isEditing ? t("saving") : t("adding")
                : isEditing ? t("saveChanges") : t("addExpense")}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" className="rounded-xl font-semibold">{t("cancel")}</Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
