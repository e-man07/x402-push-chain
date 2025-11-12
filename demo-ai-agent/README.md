# 🤖 AI Chat Agent with x402 Payments - Demo

**Complete demonstration of x402 protocol with Gemini AI integration**

This demo showcases an AI-powered chat agent that autonomously pays for premium API services using the x402 protocol on Push Chain.

---

## 🎯 What This Demo Shows

1. **AI-Powered API Server** - Express server with x402-protected endpoints
2. **Autonomous AI Agent** - Gemini-powered agent that pays for services automatically
3. **Full x402 Flow** - 402 responses, payment creation, verification, settlement
4. **UEA Integration** - Cross-chain origin detection
5. **Real-World Use Case** - AI agent economy in action

---

## 📋 Prerequisites

1. **Facilitator Service** - Must be running on port 3001
2. **Gemini API Key** - Get from https://makersuite.google.com/app/apikey
3. **Agent Wallet** - Funded with USDC on Base Sepolia
4. **Node.js** - v18 or higher

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd demo-ai-agent
npm install
```

### 2. Configure Environment

Create `.env` file:

```bash
cp .env.example .env
```

Edit `.env` and add your Gemini API key:

```bash
# Gemini API Configuration
GEMINI_API_KEY=your_actual_gemini_api_key_here

# Rest can stay as defaults
AGENT_PRIVATE_KEY=0x7bf6c9c45304fd4dc5edc0e69a0183b2979441f755cf292bd41e1c66adbe02ad
PUSH_CHAIN_RPC=https://evm.rpc-testnet-donut-node1.push.org/
FACILITATOR_URL=http://localhost:3001
SERVER_PORT=4000
MERCHANT_ADDRESS=0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952
USDC_ADDRESS=0x036CbD53842c5426634e7929541eC2318f3dCF7e
```

### 3. Start Services

**Terminal 1 - Facilitator** (if not already running):
```bash
cd ../facilitator/verification-api
npm run dev
```

**Terminal 2 - AI API Server**:
```bash
cd demo-ai-agent
npm run server
```

**Terminal 3 - AI Agent (Demo Mode)**:
```bash
npm run agent demo
```

Or **Interactive Mode**:
```bash
npm run agent
```

---

## 🎮 Demo Modes

### Automated Demo Mode

Runs a complete test flow automatically:

```bash
npm run agent demo
```

**Tests**:
1. ✅ Basic chat (0.5 USDC)
2. ✅ Advanced chat (1.0 USDC)
3. ✅ Premium chat (2.0 USDC)
4. ✅ Data analysis (1.5 USDC)
5. ✅ Text summarization (0.75 USDC)

**Total Cost**: ~5.75 USDC

### Interactive CLI Mode

Chat with the AI agent interactively:

```bash
npm run agent
```

**Commands**:
```bash
> chat <message>        # Chat with AI (advanced tier)
> basic <message>       # Chat with AI (basic tier)
> premium <message>     # Chat with AI (premium tier)
> analyze <data>        # Analyze data
> summarize <text>      # Summarize text
> summary               # Show session summary
> exit                  # Exit
```

**Examples**:
```bash
> chat What is blockchain?
> premium Explain how AI agents can use x402 protocol
> analyze [1,2,3,4,5]
> summarize The x402 protocol enables autonomous payments...
> summary
```

---

## 📊 API Endpoints

### Free Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/public/info` | Service information |
| `GET /api/public/pricing` | Pricing information |

### Paid Endpoints (x402 Protected)

| Endpoint | Price | Description |
|----------|-------|-------------|
| `POST /api/ai/chat/basic` | 0.5 USDC | Basic AI chat |
| `POST /api/ai/chat/advanced` | 1.0 USDC | Advanced AI analysis |
| `POST /api/ai/chat/premium` | 2.0 USDC | Premium AI with full features |
| `POST /api/ai/analyze` | 1.5 USDC | Data analysis |
| `POST /api/ai/summarize` | 0.75 USDC | Text summarization |

---

## 🔄 Payment Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. AI Agent sends request to /api/ai/chat/advanced         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Server returns 402 Payment Required                     │
│    - X-Payment-Requirements header                         │
│    - Amount: 1.0 USDC                                       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Agent creates EIP-712 signed payment                    │
│    - Signs with agent wallet                               │
│    - No user interaction needed!                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Agent retries request with X-Payment header             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Server verifies payment via Facilitator                 │
│    - POST /api/v1/verify                                    │
│    - Checks signature, amount, expiration                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Server settles payment on-chain                         │
│    - POST /api/v1/settle                                    │
│    - Records in X402PaymentRegistry                        │
│    - UEA origin detection automatic                        │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Server returns AI response                              │
│    - Premium content delivered                             │
│    - Payment ID included                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 Example Output

### Demo Mode Output

```bash
🤖 AI Chat Agent Initializing...
============================================================
📍 Agent Address: 0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22
🔗 Server: http://localhost:4000
💰 Facilitator: http://localhost:3001
============================================================

🎬 Running Demo Mode...

============================================================
TEST 1: Basic Chat
============================================================

👤 You: What is blockchain?
📊 Tier: basic

💰 Payment required for http://localhost:4000/api/ai/chat/basic
  💵 Amount: 0.5 USDC
  🏪 Merchant: 0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952
  📝 Description: AI Service: /api/ai/chat/basic
  🔐 Payment signed, retrying request...
  ✅ Payment successful!

🤖 AI: Basic AI Response: I received your message "What is blockchain?". This is a simple response.

💸 Cost: 0.5 USDC
📝 Payment ID: 0x4b0aa165598f56d7...

============================================================
TEST 2: Advanced Chat
============================================================

👤 You: Explain how smart contracts work on Push Chain
📊 Tier: advanced

💰 Payment required for http://localhost:4000/api/ai/chat/advanced
  💵 Amount: 1.0 USDC
  🏪 Merchant: 0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952
  📝 Description: AI Service: /api/ai/chat/advanced
  🔐 Payment signed, retrying request...
  ✅ Payment successful!

🤖 AI: Advanced AI Response: Analyzing "Explain how smart contracts work on Push Chain"... This appears to be a detailed query. Let me provide an in-depth analysis with context and reasoning.

📊 Analysis:
   Sentiment: neutral
   Complexity: high
   Topics: general inquiry

💸 Cost: 1.0 USDC
📝 Payment ID: 0x8c3f2a9b7e4d1c5a...

[... more tests ...]

============================================================
DEMO COMPLETE
============================================================

📊 Session Summary
============================================================
💬 Total messages: 5
💸 Total spent: 5.75 USDC
📍 Agent: 0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22
============================================================
```

---

## 🎨 Features Demonstrated

### 1. Autonomous Payments
- ✅ Agent detects 402 responses
- ✅ Creates EIP-712 signatures automatically
- ✅ Retries requests with payment
- ✅ No user interaction needed

### 2. AI Integration
- ✅ Gemini AI for natural language processing
- ✅ Multiple service tiers (basic, advanced, premium)
- ✅ Data analysis capabilities
- ✅ Text summarization

### 3. x402 Protocol
- ✅ HTTP 402 status codes
- ✅ Payment requirements in headers
- ✅ EIP-712 typed signatures
- ✅ On-chain settlement

### 4. UEA Integration
- ✅ Automatic origin detection
- ✅ Cross-chain support
- ✅ Original address preservation

---

## 🔧 Customization

### Add New AI Services

Edit `server.ts`:

```typescript
app.post('/api/ai/custom', requirePayment('/api/ai/custom'), (req, res) => {
  const { data } = req.body;
  const payment = (req as any).payment;

  // Your custom AI logic here
  const result = processWithAI(data);

  res.json({
    result,
    cost: ethers.formatUnits(payment.amount, 6) + ' USDC',
    paymentId: payment.paymentId,
  });
});
```

### Change Pricing

Edit `PRICING` object in `server.ts`:

```typescript
const PRICING = {
  '/api/ai/chat/basic': '500000',      // 0.5 USDC
  '/api/ai/chat/advanced': '1000000',  // 1.0 USDC
  '/api/ai/custom': '3000000',         // 3.0 USDC (new!)
};
```

### Use Different AI Models

Edit `agent.ts`:

```typescript
// Change Gemini model
const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });

// Or use OpenAI
import OpenAI from 'openai';
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
```

---

## 🐛 Troubleshooting

### Agent Can't Pay

**Problem**: "Insufficient balance" or payment fails

**Solution**:
1. Check agent wallet has USDC on Base Sepolia
2. Fund wallet: https://faucet.circle.com/
3. Verify USDC address is correct

### 402 Not Returned

**Problem**: Server doesn't return 402

**Solution**:
1. Check facilitator is running on port 3001
2. Verify registry address in facilitator `.env`
3. Check server logs for errors

### Gemini API Errors

**Problem**: "API key invalid" or rate limit

**Solution**:
1. Get valid API key from https://makersuite.google.com/app/apikey
2. Add to `.env` file
3. Check API quota/limits

---

## 📚 Learn More

- **x402 Protocol**: `/docs/API_SPEC.md`
- **UEA Integration**: `/UEA_INTEGRATION.md`
- **Smart Contracts**: `/contracts/src/`
- **SDK Documentation**: `/sdk/README.md`

---

## 🎉 What This Proves

This demo proves that:

1. ✅ **AI agents can autonomously pay for services**
2. ✅ **x402 protocol works end-to-end**
3. ✅ **UEA integration enables cross-chain payments**
4. ✅ **No user interaction needed for payments**
5. ✅ **Real-world AI agent economy is possible**

**This is the future of autonomous AI agents!** 🤖💰🚀

---

## 📞 Support

Having issues? Check:
1. Facilitator is running
2. Agent wallet is funded
3. Gemini API key is valid
4. All services on correct ports

---

**Built with ❤️ using x402 Protocol on Push Chain**
