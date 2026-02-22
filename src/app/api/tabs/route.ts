import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateSlug, generateCode } from "@/lib/slugs"

export async function POST(request: Request) {
  const supabase = await createClient()
  const body = await request.json().catch(() => ({}))

  const code = generateCode()
  const name = body.name || null
  let slug = ""
  let tabId = ""

  // Retry slug generation on collision
  for (let attempt = 0; attempt < 5; attempt++) {
    slug = generateSlug()
    if (attempt >= 3) slug += `-${Math.floor(10 + Math.random() * 90)}`

    const { data, error } = await supabase.rpc("create_tab", {
      tab_slug: slug,
      tab_code: code,
      tab_name: name,
    })

    if (!error && data) {
      tabId = data
      break
    }

    // If not a unique constraint violation, bail
    if (error && !error.message.includes("unique")) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if (!tabId) {
    return NextResponse.json(
      { error: "Could not generate unique slug" },
      { status: 500 }
    )
  }

  return NextResponse.json({ slug, code, tabId })
}
