import { getRequestConfig } from "next-intl/server"
import { cookies, headers } from "next/headers"

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  let locale = cookieStore.get("locale")?.value

  if (!locale) {
    const headerStore = await headers()
    const acceptLang = headerStore.get("accept-language") ?? ""
    locale = acceptLang.toLowerCase().includes("sv") ? "sv" : "en"
  }

  if (locale !== "en" && locale !== "sv") locale = "en"

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
