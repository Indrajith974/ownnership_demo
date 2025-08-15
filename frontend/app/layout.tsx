import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import { Navigation } from '@/components/navigation'
import { WalletProvider } from '@/components/providers/wallet-provider';
import { AuthProvider } from '@/contexts/auth-context-stable'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'The Ownership Layer',
  description: 'Protocol for original content attribution and creator rewards',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <WalletProvider>
              <Navigation />
              <main className="min-h-screen">
                {children}
              </main>
              <Toaster />
            </WalletProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
