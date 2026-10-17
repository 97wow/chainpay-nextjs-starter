export interface ExchangeDepositEvidence {
  type: 'exchange_deposit'
  provider: 'binance'
  reference: string
  amount: string
  currency: 'USDT'
  confirmedAt: string
}

/** Called after HMAC verification. A Binance reference is not a blockchain hash. */
export async function verifyExchangeDeposit(event: Record<string, unknown>): Promise<void> {
  if (event.paymentEvidence == null) return
  const proof = event.paymentEvidence as ExchangeDepositEvidence
  if (proof.type !== 'exchange_deposit' || proof.provider !== 'binance' || proof.currency !== 'USDT'
    || !/^binance-email-[a-f0-9]{40}$/.test(proof.reference) || event.txHash !== null
    || !/^\d+(\.\d{1,8})?$/.test(proof.amount) || Number(proof.amount) <= 0 || !Number.isFinite(Date.parse(proof.confirmedAt)))
    throw new Error('Invalid exchange deposit evidence')
  const baseUrl = (process.env.CHAINPAY_BASE_URL || 'https://chainpay.pro').replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/api/v1/orders/${encodeURIComponent(String(event.orderId))}`, {
    headers: { Authorization: `Bearer ${process.env.CHAINPAY_API_KEY || ''}` }, signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error('Cannot verify exchange deposit')
  const remote = await response.json()
  if (remote.status !== 'completed' || remote.txHash !== null || remote.environment !== 'live'
    || ['orderId', 'externalId', 'chain', 'currency', 'amount'].some(key => remote[key] !== event[key])
    || !remote.paymentEvidence || Object.keys(proof).some(key => remote.paymentEvidence[key] !== proof[key as keyof ExchangeDepositEvidence]))
    throw new Error('Exchange deposit does not match the stored payment')
}
