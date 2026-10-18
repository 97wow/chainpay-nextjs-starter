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
  if (!['trc20', 'bep20'].includes(String(event.chain)) || proof.type !== 'exchange_deposit' || proof.provider !== 'binance' || proof.currency !== 'USDT'
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

const USDT_TOKENS: Record<string, { chainId: number | null; tokenContract: string; tokenDecimals: number; tokenSymbol: string }> = {
  trc20: { chainId: null, tokenContract: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t', tokenDecimals: 6, tokenSymbol: 'USDT' },
  erc20: { chainId: 1, tokenContract: '0xdac17f958d2ee523a2206206994597c13d831ec7', tokenDecimals: 6, tokenSymbol: 'USDT' },
  bep20: { chainId: 56, tokenContract: '0x55d398326f99059ff775485246999027b3197955', tokenDecimals: 18, tokenSymbol: 'USDT' },
  arbitrum: { chainId: 42161, tokenContract: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', tokenDecimals: 6, tokenSymbol: 'USDT0' },
  optimism: { chainId: 10, tokenContract: '0x01bff41798a0bcf287b996046ca68b395dbc1071', tokenDecimals: 6, tokenSymbol: 'USDT0' },
  polygon: { chainId: 137, tokenContract: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', tokenDecimals: 6, tokenSymbol: 'USDT0' },
  avalanche: { chainId: 43114, tokenContract: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', tokenDecimals: 6, tokenSymbol: 'USDT' },
}
function units(value: unknown): bigint {
  if (typeof value !== 'string' || !/^\d+(?:\.\d{1,18})?$/.test(value)) throw new Error('Invalid payment amount')
  const [whole, part = ''] = value.split('.')
  return BigInt(whole) * BigInt("1000000000000000000") + BigInt(part.padEnd(18, '0'))
}
/** HMAC is verified by the route before this authenticated, read-only receipt check. */
export async function verifyCompletedPayment(event: Record<string, unknown>): Promise<void> {
  if (event.paymentEvidence != null) return verifyExchangeDeposit(event)
  const pinned = USDT_TOKENS[String(event.chain)]
  if (!pinned) return
  if (event.currency !== 'USDT' || typeof event.txHash !== 'string' || !(event.chain === 'trc20' ? /^[a-f0-9]{64}$/i : /^0x[a-f0-9]{64}$/i).test(event.txHash)) throw new Error('Invalid chain payment')
  const baseUrl = (process.env.CHAINPAY_BASE_URL || 'https://chainpay.pro').replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/api/v1/orders/${encodeURIComponent(String(event.orderId))}`, {
    headers: { Authorization: `Bearer ${process.env.CHAINPAY_API_KEY || ''}` }, signal: AbortSignal.timeout(10000), redirect: 'error',
  })
  if (!response.ok) throw new Error('Cannot verify payment')
  const remote = await response.json()
  if (remote.receiveMode === 'dedicated' || event.receiveMode === 'dedicated') {
    for (const value of [remote,event]) {
      if (value.receiveMode !== 'dedicated' || value.confirmationSource !== 'blockchain' || value.requiresFinalizedBlock !== true
        || value.exactAmountRequired !== false || value.minimumAmountRequired !== true || value.partialPaymentsSupported !== true
        || value.addressReuse !== 'never') throw new Error('Invalid dedicated payment metadata')
    }
    if (remote.settlementAddress !== event.settlementAddress || units(remote.cryptoAmount) !== units(event.cryptoAmount)
      || units(remote.receivedAmount) !== units(event.receivedAmount)) throw new Error('Dedicated payment amount mismatch')
  }
  if (remote.status !== 'completed' || remote.environment !== 'live' || remote.paymentEvidence != null
    || ['orderId','externalId','chain','currency','amount','txHash','payAddress'].some(key => remote[key] !== event[key])
    || typeof remote.payAddress !== 'string' || !(event.chain === 'trc20' ? /^T[1-9A-HJ-NP-Za-km-z]{33}$/ : /^0x[a-f0-9]{40}$/i).test(remote.payAddress)
    || units(remote.receivedAmount) < units(remote.cryptoAmount) || units(remote.cryptoAmount) <= BigInt(0)
    || Object.entries(pinned).some(([key, value]) => remote[key] !== value || event[key] !== value)) throw new Error('Stored payment does not match the callback')
  if (remote.exactAmountRequired === true && units(remote.receivedAmount) !== units(remote.cryptoAmount)) throw new Error('Exact amount mismatch')
}
