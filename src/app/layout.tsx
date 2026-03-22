import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ChainPay Starter',
  description: 'Accept crypto payments with ChainPay — no KYC, 5-minute setup',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <nav className="border-b border-gray-800 bg-gray-950">
          <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
            <a href="/" className="text-white font-bold text-lg">
              ⚡ MyApp
            </a>
            <div className="flex items-center gap-4 text-sm">
              <a href="/pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a>
              <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">Dashboard</a>
              <a href="/login" className="text-gray-400 hover:text-white transition-colors">Login</a>
              <a href="/register" className="bg-green-500 text-black px-4 py-1.5 rounded-lg font-semibold hover:bg-green-400 transition-colors">
                Sign up
              </a>
            </div>
          </div>
        </nav>
        {children}
      </body>
    </html>
  )
}
