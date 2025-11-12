# x402 Verification API

Payment verification and settlement API for the x402 protocol on Push Chain.

## Features

- ✅ Payment verification (EIP-712 signatures)
- ✅ On-chain settlement
- ✅ Payment status tracking
- ✅ Push Chain UEA integration
- ✅ Multi-token support

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Edit `.env` and add your facilitator private key:

```env
FACILITATOR_PRIVATE_KEY=your_private_key_here
```

### 3. Start Server

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

The API will be available at `http://localhost:3001`

## API Endpoints

### POST /api/v1/verify

Verify a payment without settling it on-chain.

**Request:**
```json
{
  "x402Version": 1,
  "paymentHeader": "base64_encoded_payment_payload",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "1000000",
    "resource": "/api/premium",
    "description": "Premium API Access",
    "mimeType": "application/json",
    "payTo": "0x...",
    "maxTimeoutSeconds": 60,
    "asset": "0x..."
  }
}
```

**Response:**
```json
{
  "isValid": true,
  "invalidReason": null,
  "estimatedGas": "300000",
  "expiresAt": 1699123456
}
```

### POST /api/v1/settle

Verify and settle a payment on-chain.

**Request:**
```json
{
  "x402Version": 1,
  "paymentHeader": "base64_encoded_payment_payload",
  "paymentRequirements": { ... },
  "paymentId": "optional_payment_id"
}
```

**Response:**
```json
{
  "success": true,
  "error": null,
  "txHash": "0x...",
  "networkId": "push-chain",
  "timestamp": 1699123456,
  "registryTxHash": "0x..."
}
```

### GET /api/v1/status/:paymentId

Get payment status.

**Response:**
```json
{
  "paymentId": "0x...",
  "status": "settled",
  "amount": "1000000",
  "payer": "0x...",
  "network": "push-chain",
  "createdAt": 1699123456,
  "settledAt": 1699123500,
  "txHash": "0x...",
  "originChain": "push-chain"
}
```

### GET /health

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1699123456,
  "version": "0.1.0",
  "network": "push-chain-donut-testnet"
}
```

## Testing

```bash
# Run tests
npm test

# With coverage
npm run test:coverage
```

## Contract Addresses

- **Registry**: `0xE1ED01e0623BBae51df78341297F16eE75a0009B`
- **Escrow**: `0xe75F48f2aeF1554Ca964eE5A3b6a19048C3D48bA`
- **Token Manager**: `0xc5Ab8Ae7F08a4786Af22C4A0DebBa8A0C72F24E9`

## Architecture

```
verification-api/
├── src/
│   ├── index.ts              # Main server
│   ├── types/                # TypeScript types
│   ├── config/               # Configuration
│   ├── contracts/            # Contract interactions
│   │   ├── abis.ts          # Contract ABIs
│   │   └── ContractService.ts
│   ├── services/             # Business logic
│   │   ├── VerificationService.ts
│   │   ├── SettlementService.ts
│   │   └── StatusService.ts
│   ├── routes/               # API routes
│   │   ├── verification.ts
│   │   ├── settlement.ts
│   │   └── status.ts
│   └── middleware/           # Express middleware
│       └── errorHandler.ts
```

## Error Codes

- `INVALID_REQUEST` - Malformed request
- `INVALID_SIGNATURE` - Signature verification failed
- `INSUFFICIENT_AMOUNT` - Payment amount too low
- `EXPIRED_PAYMENT` - Payment has expired
- `UNSUPPORTED_NETWORK` - Network not supported
- `UNSUPPORTED_TOKEN` - Token not supported
- `SETTLEMENT_FAILED` - On-chain settlement failed
- `PAYMENT_NOT_FOUND` - Payment ID not found
- `INTERNAL_ERROR` - Server error

## License

MIT
