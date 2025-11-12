# API Specification - x402 Protocol on Push Chain

## Overview

This document defines all API endpoints for the x402 Facilitator Service and client/server interactions.

## Base URLs

- **Testnet**: `https://facilitator-testnet.push-x402.org`
- **Mainnet**: `https://facilitator.push-x402.org` (future)
- **Local Dev**: `http://localhost:3001`

## API Versioning

All endpoints are versioned: `/api/v1/...`

---

## Authentication

Facilitator API endpoints use API keys for merchant authentication.

### Headers
```http
X-API-Key: your_api_key_here
Content-Type: application/json
```

---

## Endpoints

### 1. Payment Verification

**Verify a payment authorization before settlement**

```http
POST /api/v1/verify
```

#### Request Body
```typescript
{
  x402Version: number;        // Protocol version (currently 1)
  paymentHeader: string;      // Base64-encoded payment payload
  paymentRequirements: {
    scheme: string;           // "exact"
    network: string;          // "base-sepolia", "ethereum-sepolia", etc.
    maxAmountRequired: string; // Amount in atomic units
    resource: string;         // Resource being paid for
    description: string;      // Human-readable description
    mimeType: string;         // Expected response MIME type
    payTo: string;            // Recipient address
    maxTimeoutSeconds: number; // Payment validity window
    asset: string;            // Token contract address
    extra?: Record<string, any>; // EIP-712 domain for signature
  };
}
```

#### Response
```typescript
{
  isValid: boolean;
  invalidReason: string | null;
  paymentId?: string;         // Unique payment identifier (if valid)
  estimatedGas?: string;      // Estimated gas for settlement
  expiresAt?: number;         // Unix timestamp when payment expires
}
```

#### Example
```bash
curl -X POST https://facilitator-testnet.push-x402.org/api/v1/verify \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "x402Version": 1,
    "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QifQ==",
    "paymentRequirements": {
      "scheme": "exact",
      "network": "base-sepolia",
      "maxAmountRequired": "1000000",
      "resource": "/api/premium",
      "payTo": "0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A2",
      "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
      "maxTimeoutSeconds": 60
    }
  }'
```

#### Status Codes
- `200 OK`: Verification completed
- `400 Bad Request`: Invalid request format
- `401 Unauthorized`: Invalid API key
- `422 Unprocessable Entity`: Invalid payment data
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

---

### 2. Payment Settlement

**Trigger on-chain settlement of a verified payment**

```http
POST /api/v1/settle
```

#### Request Body
```typescript
{
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirements; // Same as verify
  paymentId: string;        // From verify response
}
```

#### Response
```typescript
{
  success: boolean;
  error: string | null;
  txHash: string | null;    // On-chain transaction hash
  networkId: string | null; // Network where settlement occurred
  timestamp: number;        // Unix timestamp
  gasUsed?: string;         // Actual gas used
  registryTxHash?: string;  // Push Chain registry update tx
}
```

#### Example
```bash
curl -X POST https://facilitator-testnet.push-x402.org/api/v1/settle \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your_api_key" \
  -d '{
    "x402Version": 1,
    "paymentHeader": "eyJ4NDAyVmVyc2lvbiI6MSwic2NoZW1lIjoiZXhhY3QifQ==",
    "paymentRequirements": { ... },
    "paymentId": "0x123abc..."
  }'
```

#### Status Codes
- `200 OK`: Settlement initiated/completed
- `400 Bad Request`: Invalid request
- `401 Unauthorized`: Invalid API key
- `404 Not Found`: Payment ID not found
- `409 Conflict`: Payment already settled
- `500 Internal Server Error`: Settlement failed

---

### 3. Payment Status

**Query the status of a payment**

```http
GET /api/v1/payment/:paymentId
```

#### Path Parameters
- `paymentId`: Unique payment identifier

#### Response
```typescript
{
  paymentId: string;
  status: "pending" | "verified" | "settling" | "settled" | "failed" | "expired";
  amount: string;
  asset: string;
  payer: string;
  payee: string;
  network: string;
  resource: string;
  createdAt: number;        // Unix timestamp
  verifiedAt?: number;
  settledAt?: number;
  txHash?: string;          // Settlement transaction hash
  error?: string;           // Error message if failed
  originChain?: string;     // Chain payment originated from (via UEA)
}
```

#### Example
```bash
curl https://facilitator-testnet.push-x402.org/api/v1/payment/0x123abc \
  -H "X-API-Key: your_api_key"
```

---

### 4. Merchant Payments

**List all payments for a merchant**

```http
GET /api/v1/merchant/payments
```

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `status` (optional): Filter by status
- `from` (optional): Start date (Unix timestamp)
- `to` (optional): End date (Unix timestamp)

#### Response
```typescript
{
  payments: Payment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    totalAmount: string;
    totalPayments: number;
    settledCount: number;
    pendingCount: number;
  };
}
```

#### Example
```bash
curl "https://facilitator-testnet.push-x402.org/api/v1/merchant/payments?page=1&limit=10&status=settled" \
  -H "X-API-Key: your_api_key"
```

---

### 5. Supported Networks

**Get list of supported blockchain networks**

```http
GET /api/v1/networks
```

#### Response
```typescript
{
  networks: [
    {
      id: string;           // "base-sepolia"
      name: string;         // "Base Sepolia Testnet"
      chainId: number;      // 84532
      type: "testnet" | "mainnet";
      supportedTokens: [
        {
          symbol: string;   // "USDC"
          address: string;  // Token contract address
          decimals: number; // 6
        }
      ];
      gatewayAddress: string; // Universal Gateway address
    }
  ];
}
```

---

### 6. Supported Tokens

**Get list of supported payment tokens**

```http
GET /api/v1/tokens
```

#### Query Parameters
- `network` (optional): Filter by network

#### Response
```typescript
{
  tokens: [
    {
      symbol: string;
      name: string;
      decimals: number;
      address: string;
      networks: string[];   // Networks where this token is available
      icon?: string;        // Token icon URL
    }
  ];
}
```

---

### 7. Gas Estimation

**Estimate gas costs for a payment settlement**

```http
POST /api/v1/estimate-gas
```

#### Request Body
```typescript
{
  network: string;
  asset: string;
  amount: string;
}
```

#### Response
```typescript
{
  estimatedGas: string;
  gasPrice: string;
  estimatedCost: string;    // In native token
  estimatedCostUSD: string;
}
```

---

### 8. Health Check

**Check API health status**

```http
GET /api/v1/health
```

#### Response
```typescript
{
  status: "healthy" | "degraded" | "unhealthy";
  version: string;
  timestamp: number;
  services: {
    database: "up" | "down";
    blockchain: "up" | "down";
    cache: "up" | "down";
  };
}
```

---

## Error Responses

All error responses follow this format:

```typescript
{
  error: {
    code: string;           // Machine-readable error code
    message: string;        // Human-readable message
    details?: any;          // Additional context
    timestamp: number;
  };
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Request format is invalid |
| `INVALID_SIGNATURE` | Payment signature is invalid |
| `INSUFFICIENT_AMOUNT` | Payment amount too low |
| `EXPIRED_PAYMENT` | Payment has expired |
| `NONCE_USED` | Payment nonce already used |
| `UNSUPPORTED_NETWORK` | Network not supported |
| `UNSUPPORTED_TOKEN` | Token not supported |
| `SETTLEMENT_FAILED` | On-chain settlement failed |
| `PAYMENT_NOT_FOUND` | Payment ID not found |
| `ALREADY_SETTLED` | Payment already settled |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `UNAUTHORIZED` | Invalid or missing API key |
| `INTERNAL_ERROR` | Internal server error |

---

## Rate Limiting

- **Public endpoints**: 60 requests/minute per IP
- **Authenticated endpoints**: 300 requests/minute per API key
- **Settlement endpoint**: 10 requests/minute per API key

Rate limit headers:
```http
X-RateLimit-Limit: 300
X-RateLimit-Remaining: 299
X-RateLimit-Reset: 1700000000
```

---

## Webhooks (Future)

Merchants can register webhooks to receive payment notifications.

### Events
- `payment.verified`
- `payment.settled`
- `payment.failed`
- `payment.expired`

### Webhook Payload
```typescript
{
  event: string;
  paymentId: string;
  timestamp: number;
  data: Payment;
  signature: string;  // HMAC signature for verification
}
```

---

## SDK Usage Examples

### Client SDK

```typescript
import { X402Client } from '@push-x402/client';

const client = new X402Client({
  facilitatorUrl: 'https://facilitator-testnet.push-x402.org',
  signer: universalSigner
});

// Automatic 402 handling
const response = await client.makeRequest('https://api.example.com/premium');
```

### Server SDK

```typescript
import { X402Server } from '@push-x402/server';

const x402 = new X402Server({
  apiKey: process.env.X402_API_KEY,
  facilitatorUrl: 'https://facilitator-testnet.push-x402.org',
  merchantAddress: '0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A2'
});

// Protect endpoint
app.get('/premium', 
  x402.requirePayment({
    price: '1.00',
    asset: 'USDC',
    description: 'Premium content access'
  }),
  (req, res) => {
    res.json({ content: 'Premium data' });
  }
);
```

---

## Testing

### Test API Keys

Testnet API keys for testing:
```
X-API-Key: test_pk_abc123... (full access)
X-API-Key: test_pk_readonly... (read-only)
```

### Test Tokens

Testnet USDC faucet: `https://faucet.circle.com/`

### Mock Facilitator

For local development:
```bash
npm run facilitator:mock
# Runs mock facilitator on http://localhost:3001
```

---

## Migration from Coinbase x402

Key differences:
1. **Multi-chain support**: Push Chain x402 supports payments from multiple chains
2. **Origin detection**: Automatic origin chain detection via UEA
3. **Network parameter**: Include chain-specific network identifier
4. **Settlement**: Async settlement with on-chain registry updates

Migration checklist:
- [ ] Update payment requirements to include network
- [ ] Add Push Chain RPC configuration
- [ ] Update signature verification for UEA
- [ ] Test cross-chain payments
- [ ] Update error handling

---

## Appendix

### HTTP Status Code Reference

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 402 | Payment Required (client-facing) |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Network Identifiers

| Network | Identifier | Chain ID |
|---------|-----------|----------|
| Ethereum Sepolia | `ethereum-sepolia` | 11155111 |
| Base Sepolia | `base-sepolia` | 84532 |
| Solana Devnet | `solana-devnet` | devnet |
| Push Chain Donut | `push-testnet-donut` | 42101 |
