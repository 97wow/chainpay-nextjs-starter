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

API Key 和 Webhook Secret 的完整值只在创建或轮换时显示一次，请立即保存到密钥管理系统，不要提交到 Git。

## ChainPay 配置

1. 在 [chainpay.pro](https://chainpay.pro) 注册并完成适用的风险审核。
2. 在 Dashboard → Apps 创建应用。
3. 将 Webhook URL 设置为 `https://yourdomain.com/api/webhooks/chainpay`。
4. 生成应用 API Key，并保存 API Key 与 Webhook Secret。

创建支付时，Starter 会为每次结账发送 `Idempotency-Key` 和同值 `externalId`，并通过 `metadata.returnUrl` 安全跳回商户站点。同一结账 ID 的相同请求会返回原订单；如果金额、套餐、链、应用或元数据发生变化，ChainPay 会返回 `409 IDEMPOTENCY_CONFLICT`，调用方应生成新的结账 ID。

## Webhook

当前处理 `payment.completed`。必须用原始请求体和 `X-ChainPay-Signature` 做 HMAC-SHA256 验签，并以 `event + orderId` 做幂等消费。

在 Dashboard 为应用启用“业务回执”后，Webhook 会携带 `receiptRequired: true`。商户服务必须先完成本地幂等事务，再向 `POST /api/v1/fulfillment-receipts` 提交 `fulfillment.completed`，并用同一个 Webhook Secret 对原始 JSON 计算 HMAC-SHA256，放入 `X-ChainPay-Fulfillment-Signature`。只有回执被 ChainPay 接受后才向原 Webhook 返回 200；回执失败应返回 500，让 ChainPay 安全重试。

自动化边界：客服或 LLM Agent 不得构造回执、读取 Webhook Secret 或直接修改余额。若业务回执超时，只能由 ChainPay 的受限内部处置器重放原始签名付款通知；本项目继续通过同一幂等事务处理重放并由商户服务器回签。

回执 ID 必须稳定且与本地订单唯一绑定。Webhook 重试时，即使本地业务已经完成，也应重新提交相同回执，绝不能重复增加余额或延长套餐。Agent 不得生成业务回执，也不得直接修改余额。

Starter 为了易读使用内存数据结构；生产环境必须把用户、结账 ID 和已消费 Webhook 事件写入数据库，并通过唯一索引保证并发幂等。

## 费用与审核

- 平台费：每笔 0.8%
- 实盘订单最低 1 USD；`400 AMOUNT_TOO_SMALL` 表示金额不足，`503 PAYMENT_UNAVAILABLE` 表示该网络暂不可用。可通过 `GET /api/v1/capabilities` 查询当前可用网络。
- TRC20 USDT：商户专属地址复用，净余额至少累计 10 USD（或商户设置的更高金额）后按地址合并结算，每批网络服务费 1 USDT，而不是每笔 1 USDT 订单都扣 1 USDT。
- Ethereum：最低结算额 50 USD（或商户设置的更高金额），按转账前报价扣除网络费；不同收款地址分别转账。
- 必须引导付款人按收银台 `cryptoAmount` 精确转账；并发订单可能有小额尾数调整，不要自行把美元标价当作链上应付金额。
- `payment.completed` 表示付款确认；商户履约回执和平台结算分别记录。后台余额只统计实盘，广播中的结算不等于已到账。`preview` 模式不会广播结算，需由平台补足手续费储备并启用结算后完成打款。
- 月费：无
- 商户审核：风险分级，具体要求取决于地区、业务和交易规模

## License

MIT
