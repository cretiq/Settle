"use client"

import { useState } from "react"
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
import type { Member } from "@/lib/types"

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: string
  tabId: string
  members: Member[]
  currentMemberId: string
}

export function ExpenseForm({
  open,
  onOpenChange,
  category,
  tabId,
  members,
  currentMemberId,
}: Props) {
  const [amount, setAmount] = useState("")
  const [paidBy, setPaidBy] = useState(currentMemberId)
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)

  const categoryInfo = CATEGORIES.find((c) => c.key === category)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = parseInt(amount, 10)
    if (!parsed || parsed <= 0) return

    setLoading(true)
    const supabase = createClient()

    await supabase.from("expenses").insert({
      tab_id: tabId,
      paid_by: paidBy,
      category,
      amount: parsed,
      description: description.trim() || null,
    })

    setLoading(false)
    setAmount("")
    setDescription("")
    setPaidBy(currentMemberId)
    onOpenChange(false)
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>
            {categoryInfo
              ? `${categoryInfo.emoji} ${categoryInfo.label}`
              : "Add expense"}
          </DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Amount ({CURRENCY})
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

          {category === "custom" && (
            <div>
              <label className="mb-1 block text-sm font-medium">
                Description
              </label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was it for?"
                maxLength={100}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium">Who paid?</label>
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

          <DrawerFooter className="px-0">
            <Button type="submit" disabled={!amount || loading}>
              {loading ? "Adding…" : "Add expense"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  )
}
