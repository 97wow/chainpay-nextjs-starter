import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import crypto from 'crypto'

async function sendFulfillmentReceipt(event: Record<string, unknown>) {
  const orderId = String(event.orderId || '')
  const externalId = String(event.externalId || '')
  const creditedAmount = String(event.amount || '')
  if (!orderId || !externalId || !/^\d+(?:\.\d{1,8})?$/.test(creditedAmount)) {
    throw new Error('Cannot build a valid fulfillment receipt')
  }
  const payload = JSON.stringify({
    event: 'fulfillment.completed',
    receiptId: `starter:${externalId}:completed`,
    orderId,
    externalId,
    fulfilledAt: new Date().toISOString(),
    issuedAt: new Date().toISOString(),
    creditedAmount,
  })
  const signature = crypto
    .createHmac('sha256', process.env.CHAINPAY_WEBHOOK_SECRET || '')
    .update(payload)
    .digest('hex')
  const baseUrl = (process.env.CHAINPAY_BASE_URL || 'https://chainpay.pro').replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/api/v1/fulfillment-receipts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ChainPay-Fulfillment-Signature': signature,
    },
    body: payload,
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`Fulfillment receipt failed with HTTP ${response.status}`)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('x-chainpay-signature')

  // Verify HMAC signature
  const expected = crypto
    .createHmac('sha256', process.env.CHAINPAY_WEBHOOK_SECRET || '')
    .update(body)
    .digest('hex')

  if (!sig || sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    console.warn('Invalid ChainPay webhook signature')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const event = JSON.parse(body)

  if (event.event === 'payment.completed') {
    const { metadata, orderId } = event
    if (!orderId) return NextResponse.json({ error: 'Missing order ID' }, { status: 400 })
    const eventKey = `payment.completed:${orderId}`
    let duplicate = db.webhookEvents.has(eventKey)
    const userId = metadata?.userId || orderId?.split('_')[0]
    const plan = metadata?.plan || 'monthly'
    if (!userId) return NextResponse.json({ error: 'Local order user is missing' }, { status: 500 })

    if (!duplicate && userId) {
      const user = db.users.findById(userId)
      if (!user) return NextResponse.json({ error: 'Local order user not found' }, { status: 500 })
      const expiresAt = user?.subscriptionExpiresAt && user.subscriptionExpiresAt > new Date()
        ? new Date(user.subscriptionExpiresAt)
        : new Date()
      if (plan === 'annual') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1)
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 1)
      }

      db.users.update(userId, {
        subscriptionStatus: 'pro',
        subscriptionExpiresAt: expiresAt,
      })
      duplicate = !db.webhookEvents.claim(eventKey)

      console.log(`Subscription activated: user=${userId} plan=${plan} until=${expiresAt.toISOString()}`)
    }

    // The local business mutation above is idempotent. On every ChainPay retry,
    // retry this signed receipt too; only return 200 after ChainPay accepts it.
    if (event.receiptRequired === true) await sendFulfillmentReceipt(event)
    return NextResponse.json({ received: true, duplicate })
  }

  return NextResponse.json({ received: true })
}
