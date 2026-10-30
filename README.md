# noBrain AI Platform with EPS Payment Gateway

A modern AI chat platform with integrated EPS payment gateway, wallet system, and prepaid billing.

## Features

### 🚀 Core Features
- **AI Chat Interface**: Advanced chat interface with streaming responses
- **Canvas Design Studio**: Built-in graphic design tool for logos and social media posts
- **User Authentication**: Secure login/registration system

### 💰 Payment & Wallet System
- **EPS Payment Gateway**: Secure payment processing via EPS (Bangladesh)
- **Wallet Balance Management**: Users can recharge and track their balance
- **Prepaid-Only Mode**: Platform operates on prepaid credit system
- **Token-Based Billing**: Charges based on input/output token usage

### 🏦 EPS Integration
- Sandbox and production modes
- Secure transaction handling
- Payment verification and status tracking
- Refund processing capability

### 💳 Pricing Model
- **Input Tokens**: BDT 10 per million tokens
- **Output Tokens**: BDT 15 per million tokens  
- **Minimum Recharge**: BDT 500
- **Real-time Balance Deduction**: Automatic deduction after each chat

## Environment Configuration

Copy `.env.example` to `.env.local` and configure:

```bash
# EPS Payment Gateway
PLATFORM_EPS_USERNAME=Epsdemo@gmail.com
PLATFORM_EPS_PASSWORD=Epsdemo258@
PLATFORM_EPS_HASH_KEY=FHZxyzeps56789gfhg678ygu876o=
PLATFORM_EPS_MERCHANT_ID=29e86e70-0ac6-45eb-ba04-9fcb0aaed12a
PLATFORM_EPS_STORE_ID=d44e705f-9e3a-41de-98b1-1674631637da
PLATFORM_EPS_DEVICE_TYPE_ID=1
PLATFORM_EPS_SANDBOX=true
PLATFORM_EPS_ENABLED=true

# Platform Pricing
PLATFORM_INPUT_PER_MILLION_PRICE=10
PLATFORM_OUTPUT_PER_MILLION_PRICE=15
PLATFORM_MINIMUM_RECHARGE_AMOUNT=500
PLATFORM_PREPAID_ONLY=true
```

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Wallet Database
```bash
npm run init:wallet
```

### 3. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Wallet & Payment Flow

1. **User Registration/Login**: Users create accounts
2. **Wallet Access**: Users can view their balance at `/wallet`
3. **Recharge**: Users enter amount and proceed to EPS payment
4. **EPS Payment**: Redirect to secure EPS payment page
5. **Balance Update**: Upon successful payment, wallet is credited
6. **Chat Usage**: Balance automatically deducted per token usage

## Project Structure

```
src/
├── app/
│   ├── wallet/              # Wallet management pages
│   │   ├── page.tsx         # Wallet dashboard
│   │   ├── success/         # Payment success page
│   │   └── cancel/          # Payment cancellation page
│   └── api/
│       └── wallet/          # Wallet API endpoints
├── lib/
│   ├── eps.ts              # EPS payment service
│   ├── wallet.ts           # Wallet management service
│   └── db.ts               # Database utilities
└── components/
    ├── ui/                  # Reusable UI components
    └── chat/                # Chat interface components
```

## API Endpoints

### Wallet Management
- `GET /api/wallet` - Get wallet balance and transactions
- `POST /api/chat` - Chat with automatic balance deduction

### Payment Processing
- EPS Transaction Initiation
- Payment Verification
- Refund Processing

## Security Features

- Secure EPS API integration with HMAC signatures
- Environment-based configuration
- Transaction status tracking
- Balance validation before chat operations
- Secure redirect URLs for payment processing

## Testing

To test the payment system:

1. Set `PLATFORM_EPS_SANDBOX=true` for testing
2. Use test credentials provided by EPS
3. Test minimum recharge amount validation
4. Verify balance deduction during chat

## Deployment

1. Set production EPS credentials
2. Set `PLATFORM_EPS_SANDBOX=false`
3. Configure proper return URLs
4. Enable SSL for production

## License

Proprietary - All rights reserved

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

cd /var/www/noBrain && git pull origin main && npm run build && pm2 restart nobrain