# X402 Vision AI Analysis Service

A blockchain-powered Vision AI analysis service built on **Stacks testnet** with STX micropayment support using the **X402 V2 payment protocol**. The service intelligently detects query complexity and implements dynamic pricing, charging users only for high-quality analytical responses.

**Live Demo:** https://pv2-six.vercel.app

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Blockchain Integration](#blockchain-integration)
- [Payment Flow](#payment-flow)
- [Deployment](#deployment)
- [Development](#development)
- [Troubleshooting](#troubleshooting)

---

## Features

✅ **AI-Powered Analysis**
- Google Gemini 2.5 Flash integration
- Text and image analysis support
- Dynamic complexity detection

✅ **Intelligence-Based Pricing**
- Automatic query complexity analysis
- Tier-based pricing (standard/advanced/premium/enterprise)
- Conditional payment (high-quality responses only)
- Dynamic quality scoring based on response length

✅ **Blockchain Payments**
- X402 V2 protocol for STX micropayments
- Stacks testnet integration
- Leather Wallet support
- Direct facilitator payment settlement

✅ **Production Ready**
- Vercel serverless deployment
- Automatic tier detection
- Payment verification
- Error handling and logging

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development
- **TailwindCSS** for styling
- **Leather Wallet SDK** for blockchain integration

### Backend
- **Node.js + Express** (local development)
- **Vercel Serverless Functions** (production)
- **Google Generative AI SDK** (Gemini API)
- **x402-stacks@2.0.1** (Payment protocol)

### Blockchain
- **Stacks Testnet**
- **X402 V2 Payment Protocol**
- **BIP39/BIP32** wallet derivation
- **STX Micropayments**

---

## Project Structure

```
projectv2/
├── frontend/                    # React/Vite application
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── lib/                 # Payment client library
│   │   ├── types/               # TypeScript interfaces
│   │   └── App.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── api/                         # Vercel serverless functions
│   ├── register.ts              # X402 service discovery
│   ├── health.ts                # Health check
│   └── vision/
│       ├── analyze.ts           # Standard analysis (conditional payment)
│       ├── analyze-premium.ts    # Premium analysis (required payment)
│       ├── analyze-info.ts       # Tier complexity detection
│       └── get-payment-details.ts
│
├── backend/                     # Express.js (local development only)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── vision.ts
│   │   │   └── x402.ts
│   │   └── services/
│   │       ├── gemini-service.ts
│   │       └── payment-service.ts
│   └── package.json
│
├── generate-keys.cjs            # BIP39 seed to private key derivation
├── .env.production              # Production environment (Vercel)
├── .env.local                   # Local development (git-ignored)
├── vercel.json                  # Vercel configuration
└── package.json
```

---

## Quick Start

### Prerequisites
- **Node.js 18+**
- **Leather Wallet** installed and configured
- **Stacks testnet** account with some STX for testing
- **Google Gemini API Key**

### 1. Clone & Install

```bash
# Clone repository
git clone <repo-url>
cd projectv2

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install

# Install backend dependencies
cd ../backend
npm install

# Return to root
cd ..
```

### 2. Generate Wallet Keys

Option A: Use existing seed phrase
```bash
node generate-keys.cjs "your seed phrase words..."
# Copy STACKS_PRIVATE_KEY output
```

Option B: Create new wallet
```bash
npm install -g @stacks/cli
stx make_keychain -t

# Save the output seed phrase, address, and private key
```

### 3. Configure Environment

Create `.env.local`:
```bash
# Blockchain
NETWORK=testnet
STACKS_PRIVATE_KEY=<your_private_key_hex>
STACKS_ADDRESS=<your_stacks_address>
FACILITATOR_URL=https://facilitator.stacksx402.com

# AI
GEMINI_API_KEY=<your_gemini_api_key>

# Optional
SERVER_ADDRESS=<custom_payment_address>
```

### 4. Start Development

```bash
# Terminal 1: Frontend
cd frontend
npm run dev
# Opens http://localhost:5173

# Terminal 2: Backend (optional - for local Express testing)
cd backend
npm run dev
# Runs on http://localhost:3003
```

### 5. Test Payment Flow

1. Open frontend at http://localhost:5173
2. Connect Leather Wallet
3. Ask a complex question (triggers payment)
4. Confirm payment in Leather Wallet
5. Receive analysis response after settlement

---

## Configuration

### Environment Variables

**Production (.env.production)** - Set via Vercel dashboard:
```env
NETWORK=testnet
SERVER_ADDRESS=ST2TTX11Z4QSF59TSJ7ES86H9BDXEY2Z0N8JARNF2
FACILITATOR_URL=https://facilitator.stacksx402.com
GEMINI_API_KEY=<api_key>
```

**Local Development (.env.local)** - Git-ignored file:
```env
NETWORK=testnet
STACKS_PRIVATE_KEY=<your_private_key>
STACKS_ADDRESS=<your_address>
FACILITATOR_URL=https://facilitator.stacksx402.com
GEMINI_API_KEY=<api_key>
```

### Key Generation

Use `generate-keys.cjs` to derive keys from seed phrase:
```bash
node generate-keys.cjs "your seed phrase..."

# Output:
# Private Key: 206004c56e6ea9e7164b972b6f257b9848806cea9834376314ff3d737d19286b
# Add to .env.local
```

**Derivation Path:** `m/44'/5757'/0'/0/0` (Stacks BIP44)

---

## API Endpoints

### Public Endpoints

#### 1. Service Discovery
```
POST /api/register

Response:
{
  "x402Version": 2,
  "name": "x402 Vision AI Analysis Service",
  "accepts": [
    {
      "scheme": "exact",
      "network": "stacks",
      "resource": "https://pv2-six.vercel.app/api/vision/analyze",
      "payTo": "ST2TTX11Z4QSF59TSJ7ES86H9BDXEY2Z0N8JARNF2",
      "maxAmountRequired": "15",
      "asset": "STX"
    }
  ]
}
```

#### 2. Analyze (Conditional Payment)
```
POST /api/vision/analyze
Content-Type: application/json

Request:
{
  "question": "Explain quantum computing in detail",
  "imageBase64": "<optional_base64_image>"
}

Response (No Payment Required):
{
  "success": true,
  "analysis": "...",
  "tier": "standard",
  "cost_paid": "free",
  "qualityScore": 0.6
}

Response (Payment Required - 402 Status):
{
  "x402Version": 2,
  "payTo": "ST2TTX11Z4QSF59TSJ7ES86H9BDXEY2Z0N8JARNF2",
  "maxAmountRequired": "10",
  "facilitatorUrl": "https://facilitator.stacksx402.com"
}
```

#### 3. Analyze Premium (Required Payment)
```
POST /api/vision/analyze-premium
X-Payment: <payment_header>
Content-Type: application/json

Request:
{
  "question": "Enterprise-level analysis request"
}

Response:
{
  "success": true,
  "analysis": "...",
  "tier": "premium",
  "cost_paid": "0.00001 STX",
  "payment": {
    "transaction": "0x...",
    "payer": "SP...",
    "network": "stacks"
  }
}
```

#### 4. Tier Detection
```
POST /api/vision/analyze-info

Request:
{
  "question": "What is AI?",
  "imageBase64": "<optional>"
}

Response:
{
  "success": true,
  "selectedTier": "premium",
  "complexity": 3,
  "estimatedCost": 0.00001,
  "hasSampleImage": false
}
```

#### 5. Payment Details
```
POST /api/vision/get-payment-details

Request:
{
  "tier": "premium",
  "hasImage": false
}

Response:
{
  "success": true,
  "tier": "premium",
  "amount": 0.00001,
  "microSTX": "10",
  "network": "stacks",
  "facilitatorUrl": "https://facilitator.stacksx402.com",
  "payTo": "ST2TTX11Z4QSF59TSJ7ES86H9BDXEY2Z0N8JARNF2"
}
```

---

## Blockchain Integration

### Stacks Network Details

**Network:** Stacks Testnet 2  
**Chain ID:** `stacks:2147483648` (CAIP-2)  
**RPC:** https://stacks-testnet-api.blockstack.org

### Payment Recipient

**testnet:** `ST2TTX11Z4QSF59TSJ7ES86H9BDXEY2Z0N8JARNF2`

### Faucets (Get Free STX)

- **Official:** https://testnet.stacks.org/faucet
- **BlockStack:** https://learnweb3.io/lessons/stacks-testnet-faucet

---

## Payment Flow

### X402 V2 Protocol

```
Client                    Server                 Blockchain
  │                          │                         │
  ├─── POST /analyze ────────>│                         │
  │                          │                         │
  │◄─── 402 Payment Required ┤                         │
  │     (payTo, amount)      │                         │
  │                          │                         │
  ├─ Sign TX in Wallet ──────────────────────────────>│
  │                          │                         │
  │◄─ TX Signed ────────────────────────────────────── │
  │                          │                         │
  ├─────────────────────────────── Submit TX ────────>│
  │                          │                         │
  │                          │◄── Confirm Settlement ─ │
  │                          │                         │
  ├─ POST /analyze ──────────>│                         │
  │ X-Payment: header        │                         │
  │                          │─ Verify Payment ──────>│
  │                          │                         │
  │◄─── 200 Analysis ────────┤                         │
  │     {analysis, tier}     │                         │
```

### Pricing Model

| Tier | Text | With Image | Quality Score |
|------|------|-----------|---------------|
| Standard | 0.000001 STX | 0.000005 STX | 0.55 |
| Advanced | 0.000005 STX | 0.000010 STX | 0.65 |
| Premium | 0.00001 STX | 0.000015 STX | 0.75+ |
| Enterprise | 0.000015 STX | 0.000020 STX | 0.85+ |

### Complexity Detection

Questions are auto-classified into tiers based on:
- **Word count** (>30 = enterprise)
- **Keywords** (why, how, explain = premium)
- **Detail indicators** (comprehensive, detailed = advanced)
- **Query length** (>15 words = advanced)

---

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login and link project
vercel link

# Set environment variables
vercel env add NETWORK testnet

# Deploy to production
vercel --prod --yes

# Set alias
vercel alias set <deployment-url> pv2-six.vercel.app
```

### Environment Setup (Vercel Dashboard)

1. Go to Vercel Dashboard > projectv2 > Settings > Environment Variables
2. Add production variables:
   - `NETWORK`: `testnet`
   - `SERVER_ADDRESS`: Your Stacks address
   - `GEMINI_API_KEY`: Your API key
   - `FACILITATOR_URL`: `https://facilitator.stacksx402.com`

### Verify Deployment

```bash
# Check register endpoint
curl https://pv2-six.vercel.app/api/register | jq

# Test analyze endpoint
curl -X POST https://pv2-six.vercel.app/api/vision/analyze \
  -H "Content-Type: application/json" \
  -d '{"question": "What is AI?"}'
```

---

## Development

### Local Testing

**Frontend + Backend:**
```bash
# Terminal 1: Frontend
cd frontend && npm run dev

# Terminal 2: Backend API
cd backend && npm run dev

# Frontend will auto-connect to http://localhost:3003/api
```

**Frontend + Cloud API:**
```bash
# Terminal: Frontend only
cd frontend && npm run dev

# Connects to deployed Vercel API:
# https://pv2-six.vercel.app/api
```

### File Structure Guide

- **`/api`** - Production serverless endpoints (Vercel)
- **`/backend`** - Local Express development (optional)
- **`/frontend`** - React UI (Vite)
- **`generate-keys.cjs`** - Wallet key derivation tool

### Key Files

| File | Purpose |
|------|---------|
| `api/register.ts` | X402 service registration |
| `api/vision/analyze.ts` | Main analysis endpoint (conditional payment) |
| `api/vision/analyze-premium.ts` | Premium tier (required payment) |
| `api/vision/analyze-info.ts` | Tier complexity detection |
| `frontend/lib/payment-client.ts` | Leather Wallet integration |
| `generate-keys.cjs` | BIP39 key generation |

---

## Troubleshooting

### 1. "Failed to load resource: 404"

**Problem:** Frontend can't find API endpoint

**Solution:**
```bash
# Check API_BASE_URL in SmartVisionBot.tsx
# For production: should use /api (relative)
# For localhost: should use http://localhost:3003/api

# Redeploy:
vercel --prod --yes
```

### 2. "Invalid x402 payment request"

**Problem:** Payment validation fails

**Solution:**
- Verify network format is `"stacks"` (not `"stacks:testnet"`)
- Check `payTo` address is valid
- Ensure facilitator URL is correct

### 3. "GEMINI_API_KEY not set"

**Problem:** API analysis fails

**Solution:**
```bash
# Get key from Google AI Studio
# https://makersuite.google.com/app/apikey

# Add to Vercel (production):
vercel env add GEMINI_API_KEY production

# Or local (.env.local):
GEMINI_API_KEY=your_key_here
```

### 4. "No wallet connected"

**Problem:** Leather Wallet fails to connect

**Solution:**
- Download Leather Wallet from https://www.leather.io/
- Install browser extension
- Create testnet account
- Get STX from faucet
- Refresh page and try again

### 5. "Private key generation fails"

**Problem:** `node generate-keys.cjs` errors

**Solution:**
```bash
# Ensure all deps installed
npm install bip39 bip32 tiny-secp256k1

# Run with valid seed phrase
node generate-keys.cjs "word1 word2 word3 ... word24"

# Should output hex private key
```

### 6. "Quality score too low"

**Problem:** Quality scored 0.6 but payment wasn't charged

**Solution:**
This is **expected behavior**. Payment is only charged when:
- Quality score ≥ 75% (0.75)
- Premium tier requested
- Complex question detected

For testing payment flow, ask complex questions or use `/analyze-premium` endpoint.

---

## Quick Reference

### Commands

```bash
# Development
npm run dev              # Frontend
cd backend && npm run dev  # Backend

# Build
npm run build           # Frontend production build

# Deploy
vercel --prod --yes     # Deploy to Vercel

# Key generation
node generate-keys.cjs "seed phrase..."

# API testing
curl -X POST https://pv2-six.vercel.app/api/register | jq
curl -X POST https://pv2-six.vercel.app/api/vision/analyze-info \
  -H "Content-Type: application/json" \
  -d '{"question":"What is AI?"}'
```

### Important URLs

| Service | URL |
|---------|-----|
| **Frontend (Dev)** | http://localhost:5173 |
| **Backend (Dev)** | http://localhost:3003 |
| **Production** | https://pv2-six.vercel.app |
| **Leather Wallet** | https://www.leather.io/ |
| **Stacks Faucet** | https://testnet.stacks.org/faucet |
| **Facilitator** | https://facilitator.stacksx402.com |
| **Gemini API** | https://makersuite.google.com/app/apikey |

---

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## License

MIT License - see LICENSE file for details

---

## Resources

- [X402 Documentation](https://docs.x402stacks.xyz/)
- [Stacks Blockchain](https://www.stacks.co/)
- [Leather Wallet](https://www.leather.io/)
- [Google Gemini API](https://ai.google.dev/)
- [Vercel Deployment](https://vercel.com/docs)
- [BIP39 Specification](https://github.com/trezor/python-mnemonic)

---

## Support

For issues and questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review API endpoint examples
3. Check environment variable configuration
4. Review deployment logs in Vercel dashboard

---

**Last Updated:** February 16, 2026  
**Version:** 2.0.1 (X402 V2 Protocol)
