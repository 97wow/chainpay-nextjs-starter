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
  assert.equal((await route.POST(request('polygon'))).status, 400);
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
