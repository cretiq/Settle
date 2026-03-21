"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useTranslations } from "next-intl"
import { ChevronLeft } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
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

  useEffect(() => {
    if (!open) return
    const scrollY = window.scrollY
    document.body.style.position = "fixed"
    document.body.style.width = "100%"
    document.body.style.top = `-${scrollY}px`
    return () => {
      document.body.style.position = ""
      document.body.style.width = ""
      document.body.style.top = ""
      window.scrollTo(0, scrollY)
    }
  }, [open])

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

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 bg-background animate-slide-up">
      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-safe-top py-3">
          <button
            type="button"
            className="h-10 w-10 rounded-full bg-base-200 flex items-center justify-center press-scale"
            onClick={() => onOpenChange(false)}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-extrabold">
            {isEditing
              ? t("editExpense")
              : categoryInfo
                ? `${categoryInfo.emoji} ${tCat(category)}`
                : t("addExpense")}
          </h1>
        </div>

        {/* Scrollable form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto overscroll-contain px-5 pb-safe-bottom">
          <div className="space-y-5 pb-6">
            {/* Amount display */}
            <div>
              <div className="flex items-baseline gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="w-full bg-transparent text-5xl font-extrabold outline-none placeholder:text-muted-foreground/30 tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  style={{ fontFamily: "var(--font-receipt)" }}
                />
                <span className="text-2xl text-muted-foreground font-semibold shrink-0">
                  {CURRENCY}
                </span>
              </div>

              {(category === "custom" || isEditing) && (
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("descriptionPlaceholder")}
                  maxLength={100}
                  className="mt-3 h-11 rounded-full bg-base-200 border-none text-sm px-4"
                />
              )}
            </div>

            {/* Who paid */}
            <div>
              <label className="mb-2 block text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("whoPaid")}</label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const isSelected = paidBy === m.id
                  const isYou = m.id === currentMemberId
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`h-9 px-4 rounded-full text-sm font-semibold press-scale transition-colors ${
                        isSelected
                          ? "bg-primary text-primary-content"
                          : "bg-base-200 text-foreground"
                      }`}
                      onClick={() => setPaidBy(m.id)}
                    >
                      {isYou && isSelected ? t("you") || "You" : m.name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Split among */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("splitAmong")}</label>
                {splitAmong.size < members.length && (
                  <button
                    type="button"
                    className="text-xs font-semibold text-primary"
                    onClick={() => setSplitAmong(new Set(members.map((m) => m.id)))}
                  >
                    {t("selectAll") || "Select all"}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {splitAmong.size === members.length && (
                  <button
                    type="button"
                    className="h-9 px-4 rounded-full text-sm font-semibold press-scale bg-primary text-primary-content"
                    onClick={() => {}}
                  >
                    {t("all") || "All"}
                  </button>
                )}
                {members.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`h-9 px-4 rounded-full text-sm font-semibold press-scale transition-colors ${
                      splitAmong.has(m.id)
                        ? splitAmong.size === members.length ? "bg-base-200 text-foreground" : "bg-primary text-primary-content"
                        : "bg-base-200 text-foreground"
                    }`}
                    onClick={() => toggleMember(m.id)}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Split mode */}
            <div>
              <label className="mb-2 block text-xs font-bold text-muted-foreground uppercase tracking-wider">{t("splitMode")}</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className={`h-10 px-5 rounded-full text-sm font-semibold press-scale transition-colors flex items-center gap-1.5 ${
                    splitMode === "equal"
                      ? "bg-primary text-primary-content"
                      : "bg-base-200 text-foreground"
                  }`}
                  onClick={() => setSplitMode("equal")}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 6h18M3 18h18" /></svg>
                  {t("equal")}
                </button>
                <button
                  type="button"
                  className={`h-10 px-5 rounded-full text-sm font-semibold press-scale transition-colors flex items-center gap-1.5 ${
                    splitMode === "custom"
                      ? "bg-primary text-primary-content"
                      : "bg-base-200 text-foreground"
                  }`}
                  onClick={handleCustomClick}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  {t("customSplit")}
                </button>
                {splitMode === "custom" && (
                  <button
                    type="button"
                    className="h-10 w-10 rounded-full bg-base-300 text-foreground text-sm font-bold press-scale flex items-center justify-center"
                    onClick={() => setCustomInputMode((prev) => (prev === "amount" ? "percent" : "amount"))}
                  >
                    {customInputMode === "amount" ? CURRENCY : "%"}
                  </button>
                )}
              </div>
              {parsedAmount > 0 && splitAmong.size > 0 && splitMode === "equal" && (
                <p className="mt-2 text-sm text-muted-foreground" style={{ fontFamily: "var(--font-receipt)" }}>
                  {t("yourShare", { amount: yourShare, currency: CURRENCY })}
                </p>
              )}
            </div>

            {splitMode === "custom" && (
              <div className="space-y-2">
                {customInputMode === "percent" && selectedMembers.length === 2 && (
                  <div className="flex flex-wrap gap-1.5">
                    <button type="button" className="h-7 px-3 text-xs rounded-full font-bold press-scale bg-base-200"
                      onClick={() => applyPercentPreset([50, 50])}>50/50</button>
                    <button type="button" className="h-7 px-3 text-xs rounded-full font-bold press-scale bg-base-200"
                      onClick={() => applyPercentPreset([60, 40])}>60/40</button>
                    <button type="button" className="h-7 px-3 text-xs rounded-full font-bold press-scale bg-base-200"
                      onClick={() => applyPercentPreset([70, 30])}>70/30</button>
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
                        <div className="flex w-16 shrink-0 items-center rounded-full bg-base-200 px-2 py-1">
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

            {/* Submit */}
            <div className="pt-2 space-y-2">
              <Button
                type="submit"
                disabled={!parsedAmount || loading || !customValid || splitAmong.size === 0}
                className="w-full h-14 rounded-full press-scale font-bold text-base"
              >
                {loading
                  ? isEditing ? t("saving") : t("adding")
                  : isEditing ? t("saveChanges") : t("addExpense")}
              </Button>
              <button
                type="button"
                className="w-full py-3 text-sm font-semibold text-foreground/60 hover:text-foreground transition-colors"
                onClick={() => onOpenChange(false)}
              >
                {t("cancel")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
