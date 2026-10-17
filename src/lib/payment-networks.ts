export const NETWORKS = {
  trc20: 'Tron',
  erc20: 'Ethereum',
  bep20: 'BNB Smart Chain',
  arbitrum: 'Arbitrum One · USDT0',
  optimism: 'OP Mainnet · USDT0',
  polygon: 'Polygon PoS · USDT0',
  avalanche: 'Avalanche C-Chain',
} as const
export type PaymentChain = keyof typeof NETWORKS

export async function availablePaymentNetworks(): Promise<PaymentChain[]> {
  const response = await fetch('https://chainpay.pro/api/v1/capabilities', { cache: 'no-store', signal: AbortSignal.timeout(8000) })
  if (!response.ok) throw new Error('Payment networks unavailable')
  const data = await response.json()
  if (!Array.isArray(data.pairs)) throw new Error('Invalid capabilities')
  return (Object.keys(NETWORKS) as PaymentChain[]).filter(chain =>
    (chain !== 'bep20' || process.env.CHAINPAY_BEP20_ENABLED === '1') &&
    (['trc20','erc20','bep20'].includes(chain) || (process.env.CHAINPAY_EVM_ENABLED_CHAINS || '').split(',').map(v => v.trim()).includes(chain)) &&
    data.pairs.some((pair: { currency: string; chain: string; available: boolean }) => pair.currency === 'USDT' && pair.chain === chain && pair.available === true))
}
