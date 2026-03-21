"use client"

import { useEffect, useState, use } from "react"
import { useTranslations } from "next-intl"
import { createClient } from "@/lib/supabase/client"
import { useLocalTabs } from "@/hooks/use-local-tabs"
import { CodeEntry } from "@/components/tab/code-entry"
import { NameEntry } from "@/components/tab/name-entry"
import { ExpenseDashboard } from "@/components/tab/expense-dashboard"

type State =
  | { step: "loading" }
  | { step: "code" }
  | { step: "name"; tabId: string; accessCode: string }
  | {
      step: "dashboard"
      tabId: string
      memberId: string
      tabName: string | null
      accessCode: string
    }

export default function TabPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = use(params)
  const t = useTranslations("Common")
  const [state, setState] = useState<State>({ step: "loading" })
  const { saveTab } = useLocalTabs()

  useEffect(() => {
    checkAccess()

    async function checkAccess() {
      const supabase = createClient()
      let {
        data: { user },
      } = await supabase.auth.getUser()

      // Fallback: if middleware hasn't established a session yet, sign in client-side
      if (!user) {
        const { data } = await supabase.auth.signInAnonymously()
        user = data.user
      }

      if (!user) {
        setState({ step: "code" })
        return
      }

      // Creator flow: code passed via URL search param
      const codeParam = new URLSearchParams(window.location.search).get("code")
      if (codeParam) {
        const { data: tabId } = await supabase.rpc("verify_tab_code", {
          tab_slug: slug,
          code: codeParam,
        })

        if (tabId) {
          // Check if already a member
          const { data: existing } = await supabase
            .from("members")
            .select("id")
            .eq("tab_id", tabId)
            .eq("user_id", user.id)
            .single()

          if (existing) {
            const { data: tab } = await supabase
              .from("tabs")
              .select("name, access_code")
              .eq("id", tabId)
              .single()

            saveTab({
              slug,
              name: tab?.name ?? null,
              accessCode: codeParam,
              joinedAt: new Date().toISOString(),
            })

            setState({
              step: "dashboard",
              tabId,
              memberId: existing.id,
              tabName: tab?.name ?? null,
              accessCode: codeParam,
            })
            return
          }

          setState({ step: "name", tabId, accessCode: codeParam })
          return
        }
      }

      // Check if already a member of this tab (via any prior join)
      const { data: memberData } = await supabase
        .from("members")
        .select("id, tab_id, tabs:tab_id(name, access_code, slug)")
        .eq("user_id", user.id)

      if (memberData) {
        const match = memberData.find(
          (m: any) => (m.tabs as any)?.slug === slug
        )
        if (match) {
          const tab = match.tabs as any
          setState({
            step: "dashboard",
            tabId: match.tab_id,
            memberId: match.id,
            tabName: tab?.name ?? null,
            accessCode: tab?.access_code ?? "",
          })
          return
        }
      }

      setState({ step: "code" })
    }
  }, [slug, saveTab])

  function handleVerified(tabId: string, accessCode: string) {
    setState({ step: "name", tabId, accessCode })
  }

  async function handleJoined(memberId: string) {
    if (state.step !== "name") return

    const supabase = createClient()
    const { data: tab } = await supabase
      .from("tabs")
      .select("name, access_code")
      .eq("id", state.tabId)
      .single()

    const accessCode = state.accessCode

    saveTab({
      slug,
      name: tab?.name ?? null,
      accessCode,
      joinedAt: new Date().toISOString(),
    })

    setState({
      step: "dashboard",
      tabId: state.tabId,
      memberId,
      tabName: tab?.name ?? null,
      accessCode,
    })
  }

  if (state.step === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 pt-28 animate-fade-up">
        <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  if (state.step === "code") {
    return <CodeEntry slug={slug} onVerified={handleVerified} />
  }

  if (state.step === "name") {
    return <NameEntry slug={slug} accessCode={state.accessCode} onJoined={handleJoined} />
  }

  return (
    <ExpenseDashboard
      tabId={state.tabId}
      tabName={state.tabName}
      slug={slug}
      currentMemberId={state.memberId}
      accessCode={state.accessCode}
    />
  )
}
