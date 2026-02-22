import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { NextIntlClientProvider } from "next-intl"
import { getLocale, getMessages } from "next-intl/server"
import { Toaster } from "sonner"
import "./globals.css"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Settle",
  description: "Split expenses without the hassle",
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} data-theme="cupcake">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <main className="mx-auto min-h-dvh max-w-md px-4 py-6">
            {children}
          </main>
          <Toaster position="bottom-center" />
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
