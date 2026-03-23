# ChainPay Next.js Starter

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![ChainPay](https://img.shields.io/badge/ChainPay-Crypto%20Payments-blue)](https://chainpay.pro)

> Next.js starter with ChainPay crypto payments — auth + pricing + USDT in 5 minutes.

## Features

- **Google OAuth + JWT auth** — secure user authentication out of the box
- **USDT TRC20 payments via ChainPay** — 0.8% fee, no KYC required
- **Multi-app webhook routing support** — route webhooks to different apps via `appId`
- **Pricing page** with monthly/annual toggle
- **Dashboard** with payment history
- **Webhook signature verification** — HMAC-SHA256 security
- **TypeScript + Tailwind CSS** — fully typed, modern styling

## Quick Start

```bash
git clone https://github.com/97wow/chainpay-nextjs-starter
cd chainpay-nextjs-starter
cp .env.example .env.local
npm install
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (Neon recommended) |
| `NEXTAUTH_SECRET` | Random secret for JWT signing |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CHAINPAY_API_KEY` | Your ChainPay merchant API key (from [chainpay.pro/dashboard](https://chainpay.pro/dashboard)) |
| `CHAINPAY_WEBHOOK_SECRET` | App webhook secret (from [chainpay.pro/dashboard/apps](https://chainpay.pro/dashboard/apps)) |

## ChainPay Setup

1. **Sign up** at [chainpay.pro](https://chainpay.pro)
2. **Create an App** in Dashboard → Apps → New App
3. **Set webhook URL** to `https://yourdomain.com/api/webhooks/chainpay`
4. **Copy API Key and App Webhook Secret** to `.env.local`

## Webhook Events

ChainPay sends webhook events to your configured endpoint. Currently supported:

- **`payment.completed`** — triggered when a user has successfully paid

Webhook payload fields:

| Field | Description |
|-------|-------------|
| `orderId` | Your original order ID |
| `amount` | Payment amount |
| `currency` | Payment currency (e.g., USDT) |
| `chain` | Blockchain network (e.g., trc20) |
| `netAmount` | Amount after platform fee |
| `metadata` | Your custom metadata object |

All webhooks are signed with HMAC-SHA256. Verify the signature using your App Webhook Secret before processing.

## Pricing

| Fee | Amount |
|-----|--------|
| Platform fee | 0.8% per transaction |
| Settlement fee | ~$1 (TRC20), deducted from payout |
| Monthly fees | None |
| KYC required | No |

## Tech Stack

- [Next.js 14](https://nextjs.org/) (App Router)
- [Tailwind CSS](https://tailwindcss.com/)
- [Prisma](https://www.prisma.io/) + PostgreSQL
- [NextAuth.js](https://next-auth.js.org/)
- [ChainPay API](https://chainpay.pro)

## License

[MIT](LICENSE)
