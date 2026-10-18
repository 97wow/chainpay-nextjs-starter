# ChainPay Next.js Starter

一个可直接运行的 ChainPay 商户集成示例，包含登录、定价页、USDT 收款和 Webhook 验签。

## 已包含

- Next.js 16 App Router
- 邮箱/JWT 示例认证
- ChainPay 多应用 `appId` 路由
- `Idempotency-Key` 与 `externalId` 防重复订单
- HMAC-SHA256 Webhook 验签（恒定时间比较）
- Webhook 事件幂等消费示例
- 可选双向业务回执：本地业务完成后向 ChainPay 发送签名确认

## 快速开始

```bash
git clone https://github.com/97wow/chainpay-nextjs-starter
cd chainpay-nextjs-starter
cp .env.example .env.local
npm install
npm run dev
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | 生产环境使用的 PostgreSQL 连接串 |
| `NEXTAUTH_SECRET` | JWT 签名随机密钥 |
| `GOOGLE_CLIENT_ID` | 可选 Google OAuth Client ID |
| `GOOGLE_CLIENT_SECRET` | 可选 Google OAuth Client Secret |
| `CHAINPAY_API_KEY` | ChainPay 商户或应用 API Key |
| `CHAINPAY_WEBHOOK_SECRET` | 应用 Webhook Secret |
| `CHAINPAY_BASE_URL` | 可选，默认 `https://chainpay.pro` |
| `CHAINPAY_BEP20_ENABLED` | 默认关闭。仅在 ChainPay 为本商户配置 BSC 收款且能力接口可用后设为 `1` |

API Key 和 Webhook Secret 的完整值只在创建或轮换时显示一次，请立即保存到密钥管理系统，不要提交到 Git。

## ChainPay 配置

1. 在 [chainpay.pro](https://chainpay.pro) 注册并完成适用的风险审核。
2. 在 Dashboard → Apps 创建应用。
3. 将 Webhook URL 设置为 `https://yourdomain.com/api/webhooks/chainpay`。
4. 生成应用 API Key，并保存 API Key 与 Webhook Secret。

创建支付时，Starter 会为每次结账发送 `Idempotency-Key` 和同值 `externalId`，并通过 `metadata.returnUrl` 安全跳回商户站点。同一结账 ID 的相同请求会返回原订单；如果金额、套餐、链、应用或元数据发生变化，ChainPay 会返回 `409 IDEMPOTENCY_CONFLICT`，调用方应生成新的结账 ID。

定价页根据能力接口展示可用网络，并将用户选择的 `trc20`、`erc20`、`bep20`、`arbitrum`、`optimism`、`polygon` 或 `avalanche` 原样传给服务端；未知网络返回 400，不会退回其他网络。BEP20 仅开放给明确配置的运营商，普通商户不可启用。BSC 主网 chain ID 为 56，USDT 合约为 `0x55d398326f99059ff775485246999027b3197955`，代币精度为 18。客户须确保扣除提现手续费后，到账金额等于返回的 `cryptoAmount`。至少 15 次确认且区块 finalized 后才会发送完成事件。BSC 固定地址模式不自动归集；独立地址模式的归集能力以 `automaticSettlement` 为准。两种模式均不自动退款。

## Webhook

当前处理 `payment.completed`。币安邮箱确认的付款会携带 `paymentEvidence`（`type: exchange_deposit`、`provider: binance`、`reference`、`amount`、`currency`、`confirmedAt`），此时 `txHash` 为 `null`，不能拼接区块浏览器链接。示例会在验签后通过商户订单 API 再核对持久化凭证，并继续以订单号幂等履约。必须用原始请求体和 `X-ChainPay-Signature` 做 HMAC-SHA256 验签，并以 `event + orderId` 做幂等消费。

在 Dashboard 为应用启用“业务回执”后，Webhook 会携带 `receiptRequired: true`。商户服务必须先完成本地幂等事务，再向 `POST /api/v1/fulfillment-receipts` 提交 `fulfillment.completed`，并用同一个 Webhook Secret 对原始 JSON 计算 HMAC-SHA256，放入 `X-ChainPay-Fulfillment-Signature`。只有回执被 ChainPay 接受后才向原 Webhook 返回 200；回执失败应返回 500，让 ChainPay 安全重试。

自动化边界：客服或 LLM Agent 不得构造回执、读取 Webhook Secret 或直接修改余额。若业务回执超时，只能由 ChainPay 的受限内部处置器重放原始签名付款通知；本项目继续通过同一幂等事务处理重放并由商户服务器回签。

回执 ID 必须稳定且与本地订单唯一绑定。Webhook 重试时，即使本地业务已经完成，也应重新提交相同回执，绝不能重复增加余额或延长套餐。Agent 不得生成业务回执，也不得直接修改余额。

收银台将链上收款和业务开通分开显示：`status: completed` 仅表示收款完成；`fulfillmentStatus: completed` 或 `not_required` 才触发完成跳转。商户重试时必须先修复中断的业务事务，不能仅凭订单“已付款”就回执成功。收银台的“已经转账？查询付款”通过只读 `GET /api/v1/orders/:id/payment-check?txHash=...` 查询 scanner 已验证记录；`needs_review` 只表示存在待核对转账，不证明它属于该订单，也不会自动认领、修改金额或重复发放权益。金额不符时保留原始提币记录交由商户核销，勿再次支付。

自有钱包的 EVM 读取支持运营方显式配置的 HTTPS 备用 RPC（例如 `BSC_RPC_FALLBACK_URLS`）。备用节点需先验证链 ID 和固定代币精度；仅对只读请求故障切换，不广播交易，也不绕过回执、最终性、准确金额和防重放检查。节点受限的方法不会在同一次扫描中反复重试；所有可用节点均失败时仍暂停受影响网络。

Starter 为了易读使用内存数据结构；生产环境必须把用户、结账 ID 和已消费 Webhook 事件写入数据库，并通过唯一索引保证并发幂等。

## 费用与审核

- 平台费：每笔 0.8%
- 结算网络费：按链和实时网络情况从结算额扣除
- 月费：无
- 商户审核：风险分级，具体要求取决于地区、业务和交易规模

## License

MIT

### 自有 EVM 钱包与 USDT0

能力接口的 `available` 决定能否建单；`displayName`、`tokenSymbol`、`chainId`、`tokenContract`、`tokenDecimals` 描述实际网络和代币。Arbitrum One、OP Mainnet、Polygon PoS 使用固定官方合约的 USDT0，API `currency` 继续使用 `USDT`。Avalanche C-Chain 使用原生 USDT，不接受旧 USDT.e。新增四条网络需在 `CHAINPAY_EVM_ENABLED_CHAINS` 中逐项启用；BEP20 继续使用 `CHAINPAY_BEP20_ENABLED=1`。

自有钱包订单要求精确到账金额，等待 finalized 区块后完成。Ethereum 与其二层网络可能需要 15–30 分钟或更久。订单查询和付款 Webhook 同时返回网络元数据、`payAddress`、`cryptoAmount`、`receivedAmount` 与真实 `txHash`。示例先验 HMAC，再查询商户订单核对付款；无法核验时不发放订阅。旧币安邮件凭证仅适用于 Tron/BEP20，保留 `exchange_deposit` 类型，不冒充链上哈希。

TRC20 自有钱包收款同样以 `confirmationSource: blockchain` 和 `exactAmountRequired: true` 返回。以固化区块中的成功 USDT 收据为准；Tron 交易哈希为不带 `0x` 的 64 位十六进制，地址与合约均为大小写敏感的 Base58。Starter 会通过商户订单接口复核这些字段与精确到账金额；旧 Binance 邮件证据仍按单独的兼容路径验证。

## 独立订单地址模式

运营商可为 ERC20、TRC20、BEP20 启用 `receiveMode: dedicated`。新订单金额不添加识别尾数；每个订单获得从未展示过的独立地址，过期后也不分配给其他订单。旧订单继续使用原地址和原匹配规则。能力接口、建单、查单与付款回调返回 `minimumAmountRequired: true`、`exactAmountRequired: false`、`partialPaymentsSupported: true`、`addressReuse: never`、`settlementAddress`。独立收款地址与最终归集地址不同。

实际到账款项在同一订单内累计，少付不发送付款完成回调。查询中的 `receivedAmount` 为已收金额，`remainingAmount` 为尚缺金额；补款只补差额并计入提币手续费。到账累计达到报价才完成，`cryptoAmount` 保持原报价，多付差额保留审计记录。示例回调会复核商户订单、网络、收款地址、真实交易哈希和累计金额。一次链上交易同时支付多个订单地址会进入人工核对，不自动猜测归属。

归集先持久保存签名交易，再广播；重试使用同一交易哈希和签名字节。归集手续费由运营商原生币钱包支付，USDT 不扣额外加工费；按实时币价估算原生链费用，默认超过订单金额 1% 或 1 USD 则暂缓。不同地址各自转出仍分别产生链上费用。没有足够原生币、节点未通过校验或交易状态不确定时，不宣称归集完成。
