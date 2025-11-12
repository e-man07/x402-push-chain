# 🌐 Ethereum Sepolia USDC Cross-Chain Payment Setup

**Goal**: Enable agent on Ethereum Sepolia to pay with USDC for AI services on Push Chain

---

## 📋 Prerequisites

1. ✅ Facilitator running with Push Chain SDK
2. ✅ Server running with Gemini AI
3. ⚠️  Agent wallet needs:
   - ETH on Sepolia (for gas)
   - USDC on Sepolia (for payments)
   - Approval for facilitator to spend USDC

---

## 🔧 Configuration

### Step 1: Update Environment Variables

Copy the Sepolia configuration:

```bash
cd demo-ai-agent
cp .env.sepolia .env
```

Or manually update `.env`:

```bash
# Network Configuration
PAYMENT_NETWORK=ethereum-sepolia

# USDC Address on Ethereum Sepolia
USDC_ADDRESS=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238

# Update pricing to use USDC decimals (6)
```

### Step 2: Update Server Pricing

The server needs to be updated for USDC pricing (6 decimals instead of 18):

```typescript
// In server.ts - Update PRICING object
const PRICING = {
  '/api/ai/chat/basic': '10000',         // 0.01 USDC
  '/api/ai/chat/advanced': '20000',      // 0.02 USDC
  '/api/ai/chat/premium': '50000',       // 0.05 USDC
  '/api/ai/analyze': '30000',            // 0.03 USDC
  '/api/ai/summarize': '15000',          // 0.015 USDC
};
```

---

## 🪙 Get Test Tokens

### 1. Get Sepolia ETH

Use a faucet:
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- https://www.alchemy.com/faucets/ethereum-sepolia

### 2. Get Sepolia USDC

**Option A: Use Faucet** (if available)
- Check for USDC faucets on Sepolia

**Option B: Mint from Contract**

```bash
# USDC on Sepolia has a faucet function
cast send 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "mint(address,uint256)" \
  YOUR_ADDRESS \
  100000000 \
  --rpc-url https://eth-sepolia.public.blastapi.io \
  --private-key YOUR_PRIVATE_KEY
```

### 3. Verify Balances

```bash
# Check ETH
cast balance YOUR_ADDRESS --rpc-url https://eth-sepolia.public.blastapi.io

# Check USDC
cast call 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "balanceOf(address)(uint256)" \
  YOUR_ADDRESS \
  --rpc-url https://eth-sepolia.public.blastapi.io
```

---

## 📝 Register Payment Requirements for Cross-Chain

You need to register endpoints that accept Ethereum Sepolia USDC:

```bash
cd contracts

# Register Basic Chat with Sepolia USDC
cast send 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/chat/basic" \
  "exact" \
  "ethereum-sepolia" \
  10000 \
  "AI Service: Basic Chat (Sepolia USDC)" \
  "application/json" \
  0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 \
  3600 \
  0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/ \
  --account myKeystore

# Register Advanced Chat
cast send 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/chat/advanced" \
  "exact" \
  "ethereum-sepolia" \
  20000 \
  "AI Service: Advanced Chat (Sepolia USDC)" \
  "application/json" \
  0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 \
  3600 \
  0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/ \
  --account myKeystore

# Register Premium Chat
cast send 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/chat/premium" \
  "exact" \
  "ethereum-sepolia" \
  50000 \
  "AI Service: Premium Chat (Sepolia USDC)" \
  "application/json" \
  0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 \
  3600 \
  0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/ \
  --account myKeystore
```

---

## 🚀 Test Cross-Chain Payment

### 1. Restart Server with Sepolia Config

```bash
cd demo-ai-agent

# Make sure .env has Sepolia configuration
npm run server
```

### 2. Run Agent Demo

```bash
npm run agent demo
```

### Expected Flow:

```
Agent (Ethereum Sepolia) 
  ↓
Signs EIP-712 with Sepolia chainId (11155111)
  ↓
Sends payment authorization to server
  ↓
Facilitator verifies signature
  ↓
Push Chain SDK executes universal transaction
  ├→ Detects origin: Ethereum Sepolia
  ├→ Routes via UEA
  └→ Settles on Push Chain
  ↓
Gemini AI generates response
  ↓
Agent receives AI content
```

---

## 🔍 Verify Cross-Chain Payment

### Check Agent's UEA Address

```bash
# The agent's Universal Executor Account on Push Chain
# Origin: Ethereum Sepolia wallet
# UEA: Push Chain executor address

# When using Push Chain SDK, you'll see:
# Origin: 0x... (Ethereum Sepolia)
# UEA: 0x... (Push Chain)
```

### Check Payment Registry

```bash
# Query payment record by ID
cast call 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
  "getPaymentRecord(bytes32)" \
  PAYMENT_ID \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/

# Should show:
# - originChain: "ethereum-sepolia"
# - originAddress: YOUR_SEPOLIA_ADDRESS
# - isUEA: true
```

---

## 🐛 Troubleshooting

### Issue 1: "Insufficient USDC balance"

```bash
# Check balance
cast call 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238 \
  "balanceOf(address)(uint256)" \
  YOUR_ADDRESS \
  --rpc-url https://eth-sepolia.public.blastapi.io

# Mint more if needed
```

### Issue 2: "Payment requirement not active"

Make sure you registered the endpoint with:
- Correct network: `"ethereum-sepolia"`
- Correct USDC address: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`
- Correct amount in USDC decimals (6 decimals)

### Issue 3: "Invalid signature"

Check that:
- Agent is signing with Ethereum Sepolia chainId (11155111)
- USDC address matches in signature domain
- Facilitator is verifying with correct chainId

---

## 📊 Comparison: Native vs Cross-Chain

| Aspect | Push Chain Native | Ethereum Sepolia Cross-Chain |
|--------|------------------|------------------------------|
| **Token** | PC (18 decimals) | USDC (6 decimals) |
| **Network** | push-chain | ethereum-sepolia |
| **ChainId** | 42101 | 11155111 |
| **Origin** | Same as UEA | Different from UEA |
| **Routing** | Direct | Via UEA |
| **Gas** | Paid on Push Chain | Paid on Sepolia + Push |

---

## 🎯 Benefits of Cross-Chain

### Agent Flexibility
- Agent wallet can be on ANY chain
- No need to bridge tokens first
- Uses native chain assets

### Universal Payments
- Pay from Ethereum, Base, Arbitrum, Solana, etc.
- Push Chain handles routing automatically
- Single merchant address on Push Chain

### True Universality
```
Ethereum Agent → USDC → Push Chain → Merchant
Solana Agent → USDT → Push Chain → Merchant
Base Agent → ETH → Push Chain → Merchant
```

All settle on Push Chain seamlessly!

---

## ✅ Success Checklist

- [ ] Agent has ETH on Sepolia for gas
- [ ] Agent has USDC on Sepolia for payments
- [ ] Server configured for Sepolia network
- [ ] Payment requirements registered for Sepolia
- [ ] Facilitator running with Push SDK
- [ ] Test payment successful
- [ ] Gemini AI response received
- [ ] Registry shows cross-chain payment

---

## 🎓 What You're Testing

This demonstrates:

1. ✅ **Cross-Chain Payment Flow** - Agent on one chain, merchant on another
2. ✅ **Universal Transaction Layer** - Push Chain SDK routing
3. ✅ **Origin Detection** - Automatic chain detection via UEA
4. ✅ **Multi-Asset Support** - Native tokens + ERC20 (USDC)
5. ✅ **Autonomous AI Agents** - Zero user interaction
6. ✅ **Real AI Responses** - Gemini 2.0 Flash

**This is the full vision of Push Chain's universal payment system!** 🌐🚀
