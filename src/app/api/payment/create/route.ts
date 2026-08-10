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

  const { plan = 'monthly', appId, checkoutId } = await req.json()
  const planConfig = PLANS[plan as keyof typeof PLANS]
  if (!planConfig) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  if (typeof checkoutId !== 'string' || !/^[A-Za-z0-9_-]{8,128}$/.test(checkoutId)) {
    return NextResponse.json({ error: 'Invalid checkoutId' }, { status: 400 })
  }

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  const returnUrl = new URL('/dashboard?payment=success', appUrl).toString()
  const upstream = await fetch('https://chainpay.pro/api/v1/orders', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.CHAINPAY_API_KEY}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': checkoutId,
    },
    body: JSON.stringify({
      amount: planConfig.amount,
      currency: 'USDT',
      chain: 'trc20',
      externalId: checkoutId,
      appId: appId || undefined,
      metadata: { userId: payload.userId, plan, email: payload.email, returnUrl },
    }),
  })
  const order = await upstream.json()

  if (!upstream.ok || order.error) {
    const isConflict = upstream.status === 409 && order.error === 'IDEMPOTENCY_CONFLICT'
    return NextResponse.json(
      { error: isConflict ? 'Checkout ID was reused with different payment parameters' : 'Failed to create order' },
      { status: isConflict ? 409 : 502 },
    )
  }

  return NextResponse.json({
    checkoutUrl: order.checkoutUrl,
    orderId: order.orderId,
    amount: planConfig.amount,
    plan,
  })
}
