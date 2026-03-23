import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/auth'

const PLANS = {
  monthly: { amount: 9.00, label: 'Monthly Pro' },
  annual: { amount: 90.00, label: 'Annual Pro' },
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const payload = verifyToken(authHeader.slice(7))
  if (!payload) return NextResponse.json({ error: 'Invalid token' }, { status: 401 })

  const { plan = 'monthly', appId } = await req.json()
  const planConfig = PLANS[plan as keyof typeof PLANS]
  if (!planConfig) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const order = await fetch('https://chainpay.pro/api/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CHAINPAY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: planConfig.amount,
      currency: 'USDT',
      chain: 'trc20',
      orderId: `${payload.userId}_${plan}_${Date.now()}`,
      appId: appId || undefined,
      metadata: { userId: payload.userId, plan, email: payload.email },
    }),
  }).then(r => r.json())

  if (order.error) return NextResponse.json({ error: 'Failed to create order' }, { status: 500 })

  return NextResponse.json({
    checkoutUrl: order.checkoutUrl,
    orderId: order.orderId,
    amount: planConfig.amount,
    plan,
  })
}
