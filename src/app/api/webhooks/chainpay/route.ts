import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('x-chainpay-signature')

  // Verify HMAC signature
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.CHAINPAY_WEBHOOK_SECRET || '')
    .update(body)
    .digest('hex')

  if (sig !== expected) {
    console.warn('Invalid ChainPay webhook signature')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'payment.completed') {
    const { metadata, externalId } = event
    const userId = metadata?.userId || externalId?.split('_')[0]
    const plan = metadata?.plan || 'monthly'

    if (userId) {
      const expiresAt = new Date()
      if (plan === 'annual') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      db.users.update(userId, {
        subscriptionStatus: 'pro',
        subscriptionExpiresAt: expiresAt,
      })

      console.log(`Subscription activated: user=${userId} plan=${plan} until=${expiresAt.toISOString()}`)
    }
  }

  return NextResponse.json({ received: true })
}
