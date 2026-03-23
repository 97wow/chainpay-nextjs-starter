# ChainPay Next.js Starter

> Accept crypto payments (USDT/ETH/BTC/SOL) in your Next.js app — no KYC, 5-minute setup.

## Features

- ✅ User auth (JWT, register/login)
- ✅ Pricing page with monthly/annual plans
- ✅ ChainPay payment integration (USDT TRC20 default)
- ✅ Webhook handler with HMAC signature verification
- ✅ Subscription activation on payment confirmation
- ✅ Protected dashboard

## Quick Start

1. Clone this repo
2. Copy `.env.example` to `.env.local`
3. Fill in your ChainPay API key (get one at chainpay.pro)
4. `npm install && npm run dev`

## Environment Variables

```
CHAINPAY_API_KEY=sk_live_your_api_key
CHAINPAY_WEBHOOK_SECRET=whsec_your_webhook_secret
JWT_SECRET=your-random-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## How It Works

1. User clicks "Subscribe" → POST /api/payment/create → ChainPay creates order (returns `orderId` + `checkoutUrl`)
2. User redirected to ChainPay checkout (USDT QR code, 30min timer)
3. User pays → ChainPay sends `payment.completed` webhook → POST /api/webhooks/chainpay
4. Webhook signature verified → subscription activated → user can access dashboard

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with dark theme
│   ├── page.tsx            # Landing page
│   ├── globals.css
│   ├── dashboard/page.tsx  # Protected user dashboard
│   ├── pricing/page.tsx    # Pricing with monthly/annual plans
│   ├── login/page.tsx      # Login form
│   ├── register/page.tsx   # Register form
│   └── api/
│       ├── auth/register/  # Email+password registration
│       ├── auth/login/     # JWT login
│       ├── payment/create/ # Create ChainPay order
│       └── webhooks/chainpay/ # Payment confirmation webhook
└── lib/
    ├── auth.ts             # JWT sign/verify
    └── db.ts               # In-memory store (swap for real DB)
```

## Replacing the In-Memory Database

The starter uses a simple in-memory store for demo purposes. For production, replace `src/lib/db.ts` with:

- **Prisma + PostgreSQL** — `npx prisma init`
- **Drizzle + SQLite** — lightweight, great for small apps
- **Supabase** — hosted Postgres with auth built-in

## What You Get

- **`/`** — Landing page with pricing CTA
- **`/register`** — Sign up with email + password
- **`/login`** — Sign in
- **`/dashboard`** — Protected page, shows subscription status
- **`/pricing`** — Pricing page, click to pay with USDT via ChainPay

## File Structure

```
src/
├── app/
│   ├── page.tsx              # Landing page
│   ├── login/page.tsx        # Login
│   ├── register/page.tsx     # Register
│   ├── dashboard/page.tsx    # Protected dashboard
│   ├── pricing/page.tsx      # Pricing + payment
│   └── api/
│       ├── auth/register/    # POST: create user
│       ├── auth/login/       # POST: login → JWT
│       ├── payment/create/   # POST: create ChainPay order
│       └── webhooks/chainpay/ # POST: handle payment webhook
└── lib/
    ├── auth.ts               # JWT helpers
    └── db.ts                 # In-memory store (swap for real DB)
```

## Customizing

1. Replace `src/lib/db.ts` with Prisma + PostgreSQL for production
2. Update plan prices in `src/app/api/payment/create/route.ts`
3. Add your product features to `src/app/dashboard/page.tsx`
4. Style with Tailwind to match your brand

## Webhook Configuration

In your [ChainPay Dashboard](https://chainpay.pro/dashboard/settings), set the Webhook URL to:

```
https://yourdomain.com/api/webhooks/chainpay
```

ChainPay will send `payment.completed` events to this endpoint with HMAC-SHA256 signature verification.

## Powered by ChainPay

Built with [ChainPay](https://chainpay.pro) — 0.8% platform fee + network settlement fee (TRC20 ~$1), no KYC, global reach.

---

## 中文说明

这是一个集成 ChainPay 加密货币支付的 Next.js starter 模板。

### 快速开始

1. 克隆此仓库
2. 复制 `.env.example` 为 `.env.local`
3. 填入你的 ChainPay API Key（在 chainpay.pro 获取）
4. `npm install && npm run dev`

### 支付流程

1. 用户点击"订阅" → 调用 `/api/payment/create` → ChainPay 创建订单
2. 用户跳转到 ChainPay 结账页（USDT 二维码，30分钟倒计时）
3. 用户完成支付 → ChainPay 发送 webhook → `/api/webhooks/chainpay`
4. Webhook 验证通过 → 激活订阅 → 用户可访问 dashboard
