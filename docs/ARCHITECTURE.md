# Technical Architecture - x402 Protocol on Push Chain

## System Overview

The x402 Protocol on Push Chain is a multi-layer architecture that enables seamless HTTP-based payments across multiple blockchains using Push Chain's Universal Executor Account (UEA) system.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Web Apps    │  │  Mobile Apps │  │  CLI Tools   │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SDK Layer                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  @push-x402/client                                       │   │
│  │  - 402 Response Handler                                  │   │
│  │  - Payment Authorization                                 │   │
│  │  - Multi-Wallet Support                                  │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Application Server                             │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  @push-x402/server or Middleware                         │   │
│  │  - Payment Requirement Definition                        │   │
│  │  - Request Validation                                    │   │
│  │  - 402 Response Generation                               │   │
│  └─────────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Facilitator Service                             │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │ Verification API   │  │ Settlement Engine  │                │
│  │ - Signature Check  │  │ - EVM Settlement   │                │
│  │ - Amount Validate  │  │ - SVM Settlement   │                │
│  │ - Nonce Management │  │ - Batch Processing │                │
│  └────────────────────┘  └────────────────────┘                │
└───────────────────────┬─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Push Chain Layer                              │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐ │
│  │ Payment Registry│  │ Payment Escrow  │  │ Token Manager  │ │
│  │ - Merchant Mgmt │  │ - Hold Funds    │  │ - Token Info   │ │
│  │ - Requirements  │  │ - Release/Refund│  │ - Conversions  │ │
│  │ - Records       │  │ - Disputes      │  │ - Multi-Token  │ │
│  └─────────────────┘  └─────────────────┘  └────────────────┘ │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Universal Executor Account (UEA) System                  │  │
│  │  - Cross-chain identity                                   │  │
│  │  - Fee abstraction                                        │  │
│  │  - Origin chain detection                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────┬─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Ethereum   │ │    Solana    │ │     Base     │
│   Sepolia    │ │    Devnet    │ │   (Future)   │
│              │ │              │ │              │
│ - USDC       │ │ - USDC (SPL) │ │ - USDC       │
│ - Native ETH │ │ - Native SOL │ │ - Native ETH │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Component Details

### 1. Smart Contracts (On-Chain)

#### X402PaymentRegistry
```solidity
Purpose: Central registry for payment requirements and transaction records
Key Functions:
- registerMerchant(address)
- createPaymentRequirement(...)
- recordPayment(...)
- getPaymentRequirement(merchant, resource)
Storage:
- mapping(address => mapping(string => PaymentRequirement))
- mapping(bytes32 => PaymentRecord)
```

#### X402PaymentEscrow
```solidity
Purpose: Hold payments in escrow until service delivery
Key Functions:
- createEscrow(payee, asset, amount, timeout)
- releaseEscrow(escrowId)
- refundEscrow(escrowId)
Features:
- Multi-token support (native + ERC20)
- Timeout mechanism
- Dispute handling
```

#### X402TokenManager
```solidity
Purpose: Manage supported tokens and conversion rates
Key Functions:
- addSupportedToken(...)
- getTokenInfo(tokenAddress)
- getConversionRate(tokenA, tokenB)
Storage:
- Supported token registry
- Price oracle integration
```

### 2. Facilitator Service (Off-Chain)

#### Verification API
```typescript
Endpoints:
POST /api/v1/verify
  - Verify payment signature
  - Check amount sufficiency
  - Validate timestamps
  - Check nonce uniqueness

POST /api/v1/settle
  - Trigger settlement
  - Execute on-chain transfer
  - Update registry

GET /api/v1/payment/:id
  - Get payment status
  - Check settlement state
```

#### Settlement Engine
```typescript
Responsibilities:
- Execute EIP-3009 transferWithAuthorization (Ethereum)
- Execute SPL token transfers (Solana)
- Batch settlement optimization
- Retry logic for failed settlements
- Transaction monitoring
```

### 3. SDK Components

#### Client SDK (@push-x402/client)
```typescript
export class X402Client {
  // Automatic 402 handling
  async makeRequest(url: string, options?: RequestInit): Promise<Response>
  
  // Manual payment creation
  async createPaymentHeader(requirements: PaymentRequirements): Promise<string>
  
  // Wallet integration
  async connectWallet(type: WalletType): Promise<void>
}
```

#### Server SDK (@push-x402/server)
```typescript
export class X402Server {
  // Define payment requirements
  requirePayment(path: string, config: PaymentConfig): void
  
  // Verify payment
  async verifyPayment(paymentHeader: string): Promise<VerificationResult>
  
  // Handle 402 response
  create402Response(requirements: PaymentRequirements): Response
}
```

## Data Flow: Complete Payment Cycle

### Step 1: Initial Request (No Payment)
```
Client → Server: GET /premium/content
Server → Client: 402 Payment Required
{
  "x402Version": 1,
  "error": "Payment required",
  "accepts": [{
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "1000000", // 1 USDC
    "resource": "/premium/content",
    "payTo": "0x123...",
    "asset": "0xUSDC...",
    "maxTimeoutSeconds": 60
  }]
}
```

### Step 2: Payment Creation (Client)
```
1. Client SDK detects 402 response
2. Prompts user for payment approval
3. Creates payment authorization:
   {
     from: userAddress,
     to: merchantAddress,
     value: "1000000",
     validAfter: timestamp,
     validBefore: timestamp + 60,
     nonce: randomBytes32
   }
4. Signs with EIP-712 (or equivalent for other chains)
5. Encodes as base64 payment header
```

### Step 3: Retry with Payment
```
Client → Server: GET /premium/content
Headers: { "X-PAYMENT": "base64EncodedPayload" }
```

### Step 4: Verification (Server)
```
1. Server extracts X-PAYMENT header
2. Calls Facilitator API: POST /api/v1/verify
3. Facilitator verifies:
   - Signature validity
   - Amount sufficiency
   - Timestamp validity
   - Nonce uniqueness
4. Returns verification result
```

### Step 5: Settlement (Facilitator)
```
1. Facilitator calls Settlement Engine
2. Settlement Engine:
   - Executes on-chain transfer (EIP-3009 or SPL)
   - Gets transaction hash
3. Updates Push Chain registry:
   - Calls recordPayment(...)
   - Stores payment record with origin chain info
4. Returns settlement confirmation
```

### Step 6: Response (Server → Client)
```
Server → Client: 200 OK
Headers: { "X-PAYMENT-RESPONSE": "base64Settlement" }
Body: { content: "Premium content here..." }
```

## Cross-Chain Payment Flow (using UEA)

### Ethereum User Paying on Push Chain

```
1. User has Ethereum wallet (MetaMask)
2. Push Chain SDK creates Universal Signer
3. Payment signed with Ethereum private key
4. Transaction sent to Push Chain
5. UEA Factory detects origin: "eip155:11155111"
6. Payment recorded with origin chain metadata
7. Settlement happens on Ethereum (via Universal Gateway)
8. Registry updated on Push Chain
```

### Solana User Paying on Push Chain

```
1. User has Solana wallet (Phantom)
2. Push Chain SDK creates Universal Signer
3. Payment signed with Solana keypair
4. Transaction sent to Push Chain
5. UEA Factory detects origin: "solana:devnet"
6. Payment recorded with origin chain metadata
7. Settlement happens on Solana (via Universal Gateway)
8. Registry updated on Push Chain
```

## Security Considerations

### 1. Signature Verification
- EIP-712 for Ethereum-based chains
- Ed25519 for Solana
- Proper domain separation
- Replay protection via nonce

### 2. Amount Validation
- Check minimum payment amount
- Validate token contract address
- Prevent integer overflow/underflow

### 3. Time-Based Security
- Enforce validAfter/validBefore timestamps
- Payment expiration handling
- Nonce expiration

### 4. Access Control
- Role-based access (OpenZeppelin AccessControl)
- Merchant registration required
- Facilitator authorization

### 5. Reentrancy Protection
- ReentrancyGuard on all state-changing functions
- Checks-Effects-Interactions pattern

## Scalability & Performance

### Optimization Strategies

1. **Batch Settlement**
   - Group multiple settlements into single transaction
   - Reduce gas costs
   - Increase throughput

2. **Caching**
   - Cache payment requirements
   - Cache token information
   - Cache merchant configurations

3. **Indexing**
   - Index payment records by merchant
   - Index by payer address
   - Index by timestamp for queries

4. **Off-Chain Computation**
   - Signature verification off-chain
   - On-chain verification only when settling
   - Reduce on-chain computation

## Monitoring & Observability

### Metrics to Track

1. **Payment Metrics**
   - Total payments processed
   - Success rate
   - Average payment amount
   - Payment volume by chain

2. **Performance Metrics**
   - API response time
   - Settlement time
   - Transaction confirmation time

3. **Error Metrics**
   - Verification failures
   - Settlement failures
   - Invalid signatures
   - Expired payments

### Logging Strategy

- Structured logs (JSON format)
- Log levels: DEBUG, INFO, WARN, ERROR
- Payment lifecycle tracking
- Transaction hash logging
- Error stack traces

## Future Enhancements

1. **Additional Chains**
   - Polygon, Avalanche, BSC support
   - Cosmos ecosystem integration

2. **Advanced Features**
   - Subscription payments
   - Partial payments
   - Payment splitting
   - Refund mechanisms

3. **Developer Tools**
   - Payment analytics dashboard
   - Webhook notifications
   - GraphQL API
   - Real-time payment status updates

4. **Compliance & KYC**
   - Optional KYC integration
   - Transaction limits
   - Merchant verification
   - Regulatory compliance tools
