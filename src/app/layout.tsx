import type { Metadata, Viewport } from "next"
import { Nunito, IBM_Plex_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
})

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-receipt",
  weight: ["400", "600"],
  subsets: ["latin"],
})

export const viewport: Viewport = {
  themeColor: "#f97068",
  interactiveWidget: "resizes-content",
}

export const metadata: Metadata = {
  title: "Settle",
  description: "Split expenses without the hassle",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "Settle",
    description: "Split expenses without the hassle",
    images: [{ url: "/icon-512.png", width: 512, height: 512 }],
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${nunito.variable} ${ibmPlexMono.variable} font-[family-name:var(--font-nunito)] antialiased`}
      >
        <ThemeProvider attribute="data-theme" defaultTheme="system" themes={["light", "dark"]} value={{ light: "settle-light", dark: "settle-dark" }}>
        <NextIntlClientProvider messages={messages}>
          <div className="md:fixed md:inset-0 md:flex md:items-center md:justify-center md:overflow-auto md:bg-base-300">
            <div id="phone-frame" className="md:relative md:border-[oklch(25%_0.02_275)] md:bg-gradient-to-b md:from-[oklch(20%_0.025_275)] md:to-[oklch(15%_0.02_275)] md:border-[14px] md:rounded-[2.5rem] md:h-[844px] md:w-[390px] md:shadow-2xl md:my-8 md:[transform:translateZ(0)] md:overflow-hidden">
              <div className="hidden md:block w-[120px] h-[24px] bg-[oklch(20%_0.025_275)] top-0 rounded-b-[1rem] left-1/2 -translate-x-1/2 absolute z-10" />
              <div className="hidden md:block h-[46px] w-[3px] bg-[oklch(25%_0.02_275)] absolute -left-[17px] top-[124px] rounded-l-lg" />
              <div className="hidden md:block h-[46px] w-[3px] bg-[oklch(25%_0.02_275)] absolute -left-[17px] top-[178px] rounded-l-lg" />
              <div className="hidden md:block h-[64px] w-[3px] bg-[oklch(25%_0.02_275)] absolute -right-[17px] top-[142px] rounded-r-lg" />
              <main className="mx-auto min-h-dvh max-w-md px-5 py-6 md:min-h-0 md:h-full md:max-w-none md:rounded-[2rem] md:overflow-y-auto md:bg-base-100">
                {children}
              </main>
            </div>
          </div>
          <Toaster position="bottom-center" />
        </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
