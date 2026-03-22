'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function PricingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  async function subscribe(plan: 'monthly' | 'annual') {
    setLoading(plan)
    const token = localStorage.getItem('token')
    if (!token) { router.push('/login'); return }

    const res = await fetch('/api/payment/create', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl
    }
    setLoading(null)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-8">
      <div className="max-w-2xl w-full">
        <h1 className="text-4xl font-bold text-center mb-2">Simple Pricing</h1>
        <p className="text-gray-400 text-center mb-12">Pay with USDT. No credit card required.</p>
        <div className="grid md:grid-cols-2 gap-6">
          {/* Monthly */}
          <div className="border border-gray-700 rounded-2xl p-8">
            <h2 className="text-xl font-bold mb-1">Monthly</h2>
            <div className="text-4xl font-bold mb-6">$9<span className="text-lg text-gray-400">/mo</span></div>
            <ul className="space-y-2 text-gray-300 text-sm mb-8">
              {['Full access', 'Cancel anytime', 'USDT payment'].map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
              ))}
            </ul>
            <button onClick={() => subscribe('monthly')} disabled={!!loading}
              className="w-full py-3 rounded-xl border border-gray-600 font-semibold hover:border-gray-400 transition-colors disabled:opacity-50">
              {loading === 'monthly' ? 'Redirecting...' : 'Subscribe Monthly'}
            </button>
          </div>
          {/* Annual */}
          <div className="border-2 border-green-500 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-black text-xs font-bold px-3 py-1 rounded-full">SAVE 17%</div>
            <h2 className="text-xl font-bold mb-1">Annual</h2>
            <div className="text-4xl font-bold mb-6">$90<span className="text-lg text-gray-400">/yr</span></div>
            <ul className="space-y-2 text-gray-300 text-sm mb-8">
              {['Full access', '2 months free', 'USDT payment'].map(f => (
                <li key={f} className="flex items-center gap-2"><span className="text-green-400">✓</span>{f}</li>
              ))}
            </ul>
            <button onClick={() => subscribe('annual')} disabled={!!loading}
              className="w-full py-3 rounded-xl bg-green-500 text-black font-bold hover:bg-green-400 transition-colors disabled:opacity-50">
              {loading === 'annual' ? 'Redirecting...' : 'Subscribe Annual'}
            </button>
          </div>
        </div>
        <p className="text-center text-gray-500 text-xs mt-8">Powered by <a href="https://chainpay.pro" className="text-green-400 hover:underline">ChainPay</a> — 0.8% fee, no KYC</p>
      </div>
    </main>
  )
}
