import { NextResponse } from 'next/server'
import { availablePaymentNetworks, NETWORKS } from '@/lib/payment-networks'

export async function GET() {
  try {
    return NextResponse.json({ networks: (await availablePaymentNetworks()).map(chain => ({ chain, label: NETWORKS[chain] })) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ error: 'Payment networks unavailable' }, { status: 503 })
  }
}
