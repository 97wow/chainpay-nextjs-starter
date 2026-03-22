import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/30 rounded-full px-4 py-1.5 text-green-400 text-sm font-medium mb-8">
          <span>⚡</span>
          <span>Powered by ChainPay · 0.8% fee · No KYC</span>
        </div>
        <h1 className="text-5xl font-bold mb-6 leading-tight">
          Accept Crypto Payments<br />
          <span className="text-green-400">in 5 Minutes</span>
        </h1>
        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
          This starter template includes user auth, a pricing page, and full ChainPay USDT payment integration.
          Clone, configure, deploy.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register"
            className="bg-green-500 text-black px-8 py-3.5 rounded-xl font-bold text-lg hover:bg-green-400 transition-colors">
            Get Started Free
          </Link>
          <Link href="/pricing"
            className="border border-gray-700 text-white px-8 py-3.5 rounded-xl font-semibold text-lg hover:border-gray-500 transition-colors">
            View Pricing
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '🔐', title: 'Auth Built-in', desc: 'JWT register/login out of the box. Swap in any auth provider.' },
            { icon: '💳', title: 'USDT Payments', desc: 'TRC20 by default. ETH, BTC, SOL also supported via ChainPay.' },
            { icon: '🔔', title: 'Webhook Ready', desc: 'HMAC-verified webhook handler that auto-activates subscriptions.' },
          ].map(f => (
            <div key={f.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
