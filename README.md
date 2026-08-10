# ChainPay Next.js Starter

一个可直接运行的 ChainPay 商户集成示例，包含登录、定价页、USDT 收款和 Webhook 验签。

## 已包含

- Next.js 16 App Router
- 邮箱/JWT 示例认证
- ChainPay 多应用 `appId` 路由
- `Idempotency-Key` 与 `externalId` 防重复订单
- HMAC-SHA256 Webhook 验签（恒定时间比较）
- Webhook 事件幂等消费示例

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

API Key 和 Webhook Secret 的完整值只在创建或轮换时显示一次，请立即保存到密钥管理系统，不要提交到 Git。

## ChainPay 配置

1. 在 [chainpay.pro](https://chainpay.pro) 注册并完成适用的风险审核。
2. 在 Dashboard → Apps 创建应用。
3. 将 Webhook URL 设置为 `https://yourdomain.com/api/webhooks/chainpay`。
4. 生成应用 API Key，并保存 API Key 与 Webhook Secret。

创建支付时，Starter 会为每次结账发送 `Idempotency-Key` 和同值 `externalId`，并通过 `metadata.returnUrl` 安全跳回商户站点。同一结账 ID 的相同请求会返回原订单；如果金额、套餐、链、应用或元数据发生变化，ChainPay 会返回 `409 IDEMPOTENCY_CONFLICT`，调用方应生成新的结账 ID。

## Webhook

当前处理 `payment.completed`。必须用原始请求体和 `X-ChainPay-Signature` 做 HMAC-SHA256 验签，并以 `event + orderId` 做幂等消费。

Starter 为了易读使用内存数据结构；生产环境必须把用户、结账 ID 和已消费 Webhook 事件写入数据库，并通过唯一索引保证并发幂等。

## 费用与审核

- 平台费：每笔 0.8%
- 结算网络费：按链和实时网络情况从结算额扣除
- 月费：无
- 商户审核：风险分级，具体要求取决于地区、业务和交易规模

## License

MIT
