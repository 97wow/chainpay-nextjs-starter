'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserInfo {
  email: string
  subscriptionStatus: 'free' | 'pro'
  subscriptionExpiresAt: string | null
}

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    // Decode JWT payload (client-side, no verification — just for display)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      setUser({
        email: payload.email,
        subscriptionStatus: 'free', // In real app, fetch from API
        subscriptionExpiresAt: null,
      })
    } catch {
      localStorage.removeItem('token')
      router.push('/login')
    }
    setLoading(false)
  }, [router])

  function logout() {
    localStorage.removeItem('token')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <main className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">
            👋 Hello, {user.email}
          </h1>
          <p className="text-gray-400">Welcome to your dashboard.</p>
        </div>

        {/* Subscription Status */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Subscription Status</h2>
          {user.subscriptionStatus === 'pro' ? (
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div>
                <p className="font-medium text-green-400">Pro Plan Active</p>
                {user.subscriptionExpiresAt && (
                  <p className="text-sm text-gray-400">
                    Expires: {new Date(user.subscriptionExpiresAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-3 h-3 rounded-full bg-gray-500" />
                <p className="text-gray-400">Free Plan</p>
              </div>
              <Link href="/pricing"
                className="inline-block bg-green-500 text-black px-5 py-2 rounded-lg font-semibold text-sm hover:bg-green-400 transition-colors">
                Upgrade to Pro
              </Link>
            </div>
          )}
        </div>

        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          Sign out
        </button>
      </div>
    </main>
  )
}
