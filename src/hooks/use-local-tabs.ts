"use client"

import { useCallback, useSyncExternalStore } from "react"

type LocalTab = {
  slug: string
  name: string | null
  accessCode: string
  joinedAt: string
}

const STORAGE_KEY = "settle-tabs"
const EMPTY: LocalTab[] = []

let cachedRaw = ""
let cachedTabs: LocalTab[] = []

function getSnapshot(): LocalTab[] {
  if (typeof window === "undefined") return EMPTY
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || "[]"
    if (raw !== cachedRaw) {
      cachedRaw = raw
      cachedTabs = JSON.parse(raw)
    }
    return cachedTabs
  } catch {
    return EMPTY
  }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  return () => window.removeEventListener("storage", callback)
}

function getServerSnapshot(): LocalTab[] {
  return EMPTY
}

export function useLocalTabs() {
  const tabs = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const saveTab = useCallback(
    (tab: LocalTab) => {
      const existing = getSnapshot().filter((t) => t.slug !== tab.slug)
      const updated = [tab, ...existing]
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      window.dispatchEvent(new Event("storage"))
    },
    []
  )

  const removeTab = useCallback((slug: string) => {
    const updated = getSnapshot().filter((t) => t.slug !== slug)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    window.dispatchEvent(new Event("storage"))
  }, [])

  return { tabs, saveTab, removeTab }
}
