const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const vm = require('node:vm');
const rootRequire = require;
const originalFetch = global.fetch;
const originalFlag = process.env.CHAINPAY_BEP20_ENABLED;
function load(file, imports = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInThisContext('(function(exports, require){' + code + '\n})', { filename: file })(exports, name => Object.hasOwn(imports, name) ? imports[name] : rootRequire(name));
  return exports;
}
const networks = load('src/lib/payment-networks.ts');
afterEach(() => { global.fetch = originalFetch; if (originalFlag === undefined) delete process.env.CHAINPAY_BEP20_ENABLED; else process.env.CHAINPAY_BEP20_ENABLED = originalFlag; });
function capabilityFetch() { return Response.json({ pairs: ['trc20','erc20','bep20'].map(chain => ({ chain, currency: 'USDT', available: true })) }); }
test('BEP20 is opt in and still requires an advertised capability', async () => {
  global.fetch = async () => capabilityFetch();
  delete process.env.CHAINPAY_BEP20_ENABLED;
  assert.deepEqual(await networks.availablePaymentNetworks(), ['trc20', 'erc20']);
  process.env.CHAINPAY_BEP20_ENABLED = '1';
  assert.deepEqual(await networks.availablePaymentNetworks(), ['trc20', 'erc20', 'bep20']);
  global.fetch = async () => Response.json({ pairs: [] });
  assert.deepEqual(await networks.availablePaymentNetworks(), []);
});
test('capability errors fail closed', async () => {
  global.fetch = async () => new Response('unavailable', { status: 503 });
  await assert.rejects(networks.availablePaymentNetworks());
});
const { NextRequest } = require('next/server');
const route = load('src/app/api/payment/create/route.ts', {
  '@/lib/auth': { verifyToken: () => ({ userId: 'user-1', email: 'test@example.invalid' }) },
  '@/lib/payment-networks': networks,
});
const request = chain => new NextRequest('http://localhost/api/payment/create', { method: 'POST', headers: { authorization: 'Bearer test', 'Content-Type': 'application/json' }, body: JSON.stringify({ chain, checkoutId: 'checkout-test-1' }) });
test('unknown chain and disabled BEP20 cannot reach order creation', async () => {
  let orders = 0;
  global.fetch = async url => { if (String(url).endsWith('/orders')) orders++; return capabilityFetch(); };
  delete process.env.CHAINPAY_BEP20_ENABLED;
  assert.equal((await route.POST(request('unknown-network'))).status, 400);
  assert.equal((await route.POST(request('bep20'))).status, 503);
  assert.equal(orders, 0);
});
test('selected BEP20 reaches the gateway and a different response chain is rejected', async () => {
  process.env.CHAINPAY_BEP20_ENABLED = '1'; let wrongChain = false;
  global.fetch = async (url, options) => {
    if (String(url).endsWith('/capabilities')) return capabilityFetch();
    assert.equal(JSON.parse(options.body).chain, 'bep20');
    return Response.json({ chain: wrongChain ? 'erc20' : 'bep20', currency: 'USDT', orderId: 'cp-test', checkoutUrl: 'https://chainpay.pro/pay/cp-test' });
  };
  assert.equal((await route.POST(request('bep20'))).status, 200);
  wrongChain = true;
  assert.equal((await route.POST(request('bep20'))).status, 502);
});

const evidence = load('src/lib/payment-evidence.ts');
test('exchange proof is checked against stored merchant evidence and is never a fake chain hash', async () => {
  const event = { orderId: 'cp-test', externalId: 'local-test', chain: 'bep20', currency: 'USDT', amount: '10', txHash: null,
    paymentEvidence: { type: 'exchange_deposit', provider: 'binance', reference: 'binance-email-' + 'a'.repeat(40), amount: '10.000001', currency: 'USDT', confirmedAt: new Date().toISOString() } };
  global.fetch = async () => Response.json({ ...event, status: 'completed', environment: 'live' });
  await evidence.verifyExchangeDeposit(event);
  global.fetch = async () => Response.json({ ...event, status: 'pending', environment: 'live' });
  await assert.rejects(evidence.verifyExchangeDeposit(event));
  await assert.rejects(evidence.verifyExchangeDeposit({ ...event, txHash: '0x' + 'a'.repeat(64) }));
});

test('new networks are explicit opt-in and still require a live capability', async () => {
  process.env.CHAINPAY_EVM_ENABLED_CHAINS = 'arbitrum,optimism,polygon,avalanche';
  global.fetch = async () => Response.json({ pairs: ['arbitrum','optimism','polygon','avalanche'].map(chain => ({ chain, currency: 'USDT', available: chain !== 'polygon' })) });
  assert.deepEqual(await networks.availablePaymentNetworks(), ['arbitrum','optimism','avalanche']);
  delete process.env.CHAINPAY_EVM_ENABLED_CHAINS;
});
test('on-chain metadata is verified against the stored merchant invoice', async () => {
  const event = { orderId:'evm-1',externalId:'local-1',chain:'optimism',currency:'USDT',amount:'10',txHash:'0x'+'a'.repeat(64),payAddress:'0x'+'b'.repeat(40),chainId:10,tokenContract:'0x01bff41798a0bcf287b996046ca68b395dbc1071',tokenDecimals:6,tokenSymbol:'USDT0' };
  global.fetch = async () => Response.json({...event,status:'completed',environment:'live',receivedAmount:'10.000001',cryptoAmount:'10.000001',exactAmountRequired:true});
  await evidence.verifyCompletedPayment(event);
  await assert.rejects(evidence.verifyCompletedPayment({...event,tokenSymbol:'USDT'}));
  global.fetch = async () => Response.json({...event,status:'completed',environment:'live',receivedAmount:'10',cryptoAmount:'10.000001',exactAmountRequired:true});
  await assert.rejects(evidence.verifyCompletedPayment(event));
});

test('self-custody Tron uses its own hash/address formats and exact confirmed token amount', async () => {
  const event = { orderId:'tron-1',externalId:'local-1',chain:'trc20',currency:'USDT',amount:'10',txHash:'a'.repeat(64),payAddress:'TKTrv6sw6SaysX6UDa99Wb1bsjgVkvbUDh',chainId:null,tokenContract:'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',tokenDecimals:6,tokenSymbol:'USDT' };
  const base = {...event,status:'completed',environment:'live',receivedAmount:'10.000001',cryptoAmount:'10.000001',exactAmountRequired:true};
  global.fetch = async () => Response.json(base);
  await evidence.verifyCompletedPayment(event);
  for (const change of [{txHash:'0x'+event.txHash},{tokenContract:'other-token'},{payAddress:'TLGdFswB8L1VPJoM5qdpRcdQahSnhZTTuY'},{tokenDecimals:18}]) await assert.rejects(evidence.verifyCompletedPayment({...event,...change}));
  global.fetch = async () => Response.json({...base,receivedAmount:'10'});
  await assert.rejects(evidence.verifyCompletedPayment(event));
});

test('dedicated checkout verifies aggregate receipts and refuses altered invoice policy', async () => {
  const event={orderId:'dedicated-1',externalId:'local-1',chain:'bep20',currency:'USDT',amount:'2',cryptoAmount:'2',receivedAmount:'2.05',txHash:'0x'+'a'.repeat(64),
    payAddress:'0x'+'b'.repeat(40),settlementAddress:'0x'+'c'.repeat(40),chainId:56,tokenContract:'0x55d398326f99059ff775485246999027b3197955',tokenDecimals:18,tokenSymbol:'USDT',
    receiveMode:'dedicated',confirmationSource:'blockchain',requiresFinalizedBlock:true,exactAmountRequired:false,minimumAmountRequired:true,partialPaymentsSupported:true,addressReuse:'never'};
  const base={...event,status:'completed',environment:'live'};
  global.fetch=async()=>Response.json(base);await evidence.verifyCompletedPayment(event);
  for(const change of [{receivedAmount:'2.06'},{receivedAmount:'1.99'},{cryptoAmount:'2.01'},{settlementAddress:event.payAddress},{addressReuse:'allowed'},{receiveMode:'operator_fixed'}]){
    global.fetch=async()=>Response.json({...base,...change});await assert.rejects(evidence.verifyCompletedPayment(event));
  }
});
