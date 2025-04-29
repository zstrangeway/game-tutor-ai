import { Geist, Geist_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"
import Link from "next/link"
import { CrownIcon } from "lucide-react"
import { Button, Navbar, NavbarMenu } from "@workspace/ui"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <div className="flex flex-col h-screen w-screen">
          <Navbar>
            <Link href="/" className="flex items-center gap-3 text-lg font-semibold">
              <CrownIcon className="size-5" /> PlyDojo AI
            </Link>
            <NavbarMenu>
              <Button variant="outline" size="sm" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/login">Login</Link>
              </Button>
            </NavbarMenu>
          </Navbar>
          <div className="flex-1 mt-14">
            <Providers>{children}</Providers>
          </div>
        </div>
      </body>
    </html>
  )
}
