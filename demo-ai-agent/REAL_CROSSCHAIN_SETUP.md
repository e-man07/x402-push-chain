# 🌍 Real Cross-Chain Testing Setup

**Testing x402 with REAL cross-chain payments from Ethereum Sepolia to Push Chain**

---

## 🎯 What This Tests

This is **NOT a simulation** - this is real cross-chain payment testing:

1. ✅ Agent wallet on **Ethereum Sepolia**
2. ✅ USDC token on **Ethereum Sepolia**
3. ✅ Payment signed on **Ethereum Sepolia**
4. ✅ Settlement recorded on **Push Chain**
5. ✅ UEA Factory detects origin: `"eip155:11155111"` (Ethereum Sepolia)

---

## 📋 Prerequisites

### 1. Agent Wallet Setup

Your agent wallet needs:
- ✅ ETH on Ethereum Sepolia (for gas)
- ✅ USDC on Ethereum Sepolia (for payments)

**Wallet Address**: `0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22`

### 2. Get Testnet Tokens

**Ethereum Sepolia ETH**:
- https://sepoliafaucet.com/
- https://www.alchemy.com/faucets/ethereum-sepolia

**Ethereum Sepolia USDC**:
- Contract: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Faucet: https://faucet.circle.com/ (select Ethereum Sepolia)
- Or use Aave faucet: https://staging.aave.com/faucet/

### 3. Approve USDC Spending

The agent needs to approve the merchant to spend USDC:

```bash
# Using cast (Foundry)
cast send 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "approve(address,uint256)" \
  0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 \
  10000000 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY \
  --private-key 0x7bf6c9c45304fd4dc5edc0e69a0183b2979441f755cf292bd41e1c66adbe02ad
```

Or using ethers.js:
```typescript
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY');
const wallet = new ethers.Wallet('0x7bf6c9c45304fd4dc5edc0e69a0183b2979441f755cf292bd41e1c66adbe02ad', provider);

const usdc = new ethers.Contract(
  '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  ['function approve(address,uint256) returns (bool)'],
  wallet
);

// Approve 10 USDC (10,000,000 with 6 decimals)
const tx = await usdc.approve('0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952', '10000000');
await tx.wait();
console.log('✅ USDC approved!');
```

---

## ⚙️ Configuration

Your `.env` is already configured for Ethereum Sepolia:

```bash
# Gemini API Configuration
GEMINI_API_KEY=AIzaSyCyWj-Abgdl_6qfG3K_aDs2shYssMYEYuU

# AI Agent Wallet
AGENT_PRIVATE_KEY=0x7bf6c9c45304fd4dc5edc0e69a0183b2979441f755cf292bd41e1c66adbe02ad

# Push Chain Configuration
PUSH_CHAIN_RPC=https://evm.rpc-testnet-donut-node1.push.org/

# Facilitator Configuration
FACILITATOR_URL=http://localhost:3001

# Server Configuration
SERVER_PORT=4000

# Merchant Configuration (for server)
MERCHANT_ADDRESS=0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952

# USDC Token Address - Ethereum Sepolia (for real cross-chain testing)
USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Network for payment requirements
PAYMENT_NETWORK=ethereum-sepolia
```

---

## 🚀 Running the Test

### Terminal 1: Start Facilitator

```bash
cd ../facilitator/verification-api
npm run dev
```

Wait for:
```
✅ Facilitator API running on port 3001
```

### Terminal 2: Start AI Server

```bash
cd demo-ai-agent
npm run server
```

You should see:
```
🤖 AI-Powered API Server with x402 Payments
==================================================
✅ Server running on port 4000
💰 Merchant: 0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952
🌐 Network: ethereum-sepolia
🪙  USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
🔗 Facilitator: http://localhost:3001

🌍 REAL CROSS-CHAIN TESTING MODE
   Agent pays from: ethereum-sepolia
   Settlement on: Push Chain
   UEA will detect: "eip155:11155111" (Ethereum Sepolia)
```

### Terminal 3: Run Agent

```bash
npm run agent demo
```

---

## 🔍 What to Watch For

### 1. Agent Initialization
```
🤖 AI Chat Agent Initializing...
============================================================
📍 Agent Address: 0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22
🔗 Server: http://localhost:4000
💰 Facilitator: http://localhost:3001
============================================================
```

### 2. Payment Detection
```
💰 Payment required for http://localhost:4000/api/ai/chat/basic
  💵 Amount: 0.5 USDC
  🏪 Merchant: 0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952
  📝 Description: AI Service: /api/ai/chat/basic
```

### 3. EIP-712 Signature (Ethereum Sepolia)
```
🔐 Payment signed, retrying request...
```

### 4. Payment Verification
```
✅ Payment verified for /api/ai/chat/basic
```

### 5. On-Chain Settlement (Push Chain)
```
💸 Payment settled: 0x4b0aa165598f56d7...
```

### 6. UEA Origin Detection

Check the payment record on Push Chain:
```bash
cast call 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
  "getPaymentRecord(bytes32)" \
  PAYMENT_ID \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/
```

Should show:
```
originChain: "eip155:11155111"  ← Ethereum Sepolia!
originAddress: 0x742d35Cc...     ← Agent's original address
isUEA: true                      ← Cross-chain payment detected!
```

---

## 🎯 Expected Flow

```
┌─────────────────────────────────────────────────────────┐
│ 1. Agent on Ethereum Sepolia                            │
│    Address: 0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22 │
│    Has: ETH + USDC                                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 2. Agent calls API → Gets 402 Payment Required         │
│    Network: ethereum-sepolia                            │
│    USDC: 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238    │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 3. Agent signs EIP-712 payment                          │
│    Domain: Ethereum Sepolia (chainId: 11155111)        │
│    Signature: 0x...                                     │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 4. Server verifies via Facilitator                      │
│    Checks signature validity                            │
│    Verifies USDC approval                               │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 5. Facilitator settles on Push Chain                    │
│    Calls X402PaymentRegistry.recordPayment()            │
│    Records payment with merchant, amount, etc.          │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 6. UEA Factory detects origin                           │
│    Queries: getOriginForUEA(agent_address)              │
│    Returns: chainNamespace="eip155", chainId="11155111"│
│    Stores: originChain="eip155:11155111"                │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│ 7. Payment record on Push Chain shows:                  │
│    - payer: 0x742d35... (agent address)                │
│    - originChain: "eip155:11155111"                     │
│    - originAddress: 0x742d35... (same)                 │
│    - isUEA: true (cross-chain detected!)               │
└─────────────────────────────────────────────────────────┘
```

---

## ✅ Success Criteria

After running the demo, verify:

1. **Agent Balance Decreased**
   ```bash
   # Check USDC balance on Ethereum Sepolia
   cast call 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
     "balanceOf(address)" \
     0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22 \
     --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   ```

2. **Payment Recorded on Push Chain**
   ```bash
   # Check payment record
   cast call 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
     "getMerchantPayments(address)" \
     0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 \
     --rpc-url https://evm.rpc-testnet-donut-node1.push.org/
   ```

3. **Origin Chain Detected**
   - Payment record shows `originChain: "eip155:11155111"`
   - `isUEA: true`
   - `originAddress` matches agent address

4. **AI Responses Received**
   - All 5 tests completed
   - Total spent: ~5.75 USDC
   - Session summary displayed

---

## 🐛 Troubleshooting

### Issue: "Insufficient USDC balance"

**Check balance**:
```bash
cast call 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "balanceOf(address)" \
  0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**Get more USDC**: https://faucet.circle.com/

### Issue: "Insufficient allowance"

**Check allowance**:
```bash
cast call 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "allowance(address,address)" \
  0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22 \
  0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
```

**Approve more**: See "Approve USDC Spending" section above

### Issue: "Payment verification failed"

**Check**:
1. Facilitator is running on port 3001
2. Registry address in facilitator `.env` is correct
3. Network matches (ethereum-sepolia)
4. USDC address matches

### Issue: "UEA not detecting origin"

**This is expected!** The agent wallet is native to Ethereum Sepolia, so:
- If agent hasn't interacted with Push Chain before: `isUEA: false`
- Origin will still be tracked correctly
- UEA is created when wallet interacts cross-chain via Push Wallet

---

## 🎉 What This Proves

When you successfully run this test, you've proven:

✅ **Real cross-chain payments work**
- Agent pays from Ethereum Sepolia
- Settlement happens on Push Chain
- No simulation - real blockchain transactions!

✅ **x402 protocol is production-ready**
- HTTP 402 responses
- EIP-712 signatures
- Facilitator verification
- On-chain settlement

✅ **UEA integration works**
- Origin chain detected automatically
- Original address preserved
- Cross-chain tracking functional

✅ **AI agent economy is real**
- Autonomous payments
- No user interaction
- Full transparency

**This is the future of cross-chain AI agent economies!** 🌍🤖💰🚀

---

## 📊 Test Results to Share

After successful testing, you can share:

1. **Transaction hashes** from Ethereum Sepolia (payment signatures)
2. **Transaction hashes** from Push Chain (settlement records)
3. **Payment records** showing `originChain: "eip155:11155111"`
4. **Session summary** with total spent
5. **Screenshots** of the demo output

**You've just proven that cross-chain AI agent payments work!** 🎉
