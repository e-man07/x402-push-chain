# 🚀 Quick Start Guide - AI Agent Demo

**Get the demo running in 5 minutes!**

---

## ✅ Prerequisites Checklist

Before starting, make sure you have:

- [ ] Node.js v18+ installed
- [ ] Facilitator service running on port 3001
- [ ] Gemini API key (get from https://makersuite.google.com/app/apikey)
- [ ] Agent wallet funded with USDC on Base Sepolia

---

## 🎯 Step-by-Step Setup

### Step 1: Get Gemini API Key

1. Go to https://makersuite.google.com/app/apikey
2. Click "Create API Key"
3. Copy the key (starts with `AIza...`)

### Step 2: Configure Environment

```bash
cd demo-ai-agent

# Edit .env file
nano .env
```

Add your Gemini API key:
```bash
GEMINI_API_KEY=AIzaSyD...your_actual_key_here
```

Save and exit (Ctrl+X, Y, Enter)

### Step 3: Start Facilitator

**Terminal 1**:
```bash
cd ../facilitator/verification-api
npm run dev
```

Wait for:
```
✅ Facilitator API running on port 3001
```

### Step 4: Start AI API Server

**Terminal 2**:
```bash
cd demo-ai-agent
npm run server
```

Wait for:
```
✅ Server running on port 4000
```

### Step 5: Run Demo

**Terminal 3**:
```bash
npm run agent demo
```

---

## 🎬 What You'll See

The demo will automatically:

1. **Initialize Agent**
   ```
   🤖 AI Chat Agent Initializing...
   📍 Agent Address: 0x742d35...
   ```

2. **Run 5 Tests**
   - Basic chat (0.5 USDC)
   - Advanced chat (1.0 USDC)
   - Premium chat (2.0 USDC)
   - Data analysis (1.5 USDC)
   - Text summarization (0.75 USDC)

3. **Show Summary**
   ```
   📊 Session Summary
   💬 Total messages: 5
   💸 Total spent: 5.75 USDC
   ```

---

## 🎮 Interactive Mode

Want to chat with the AI yourself?

```bash
npm run agent
```

Then try:
```bash
> chat What is blockchain?
> premium Explain x402 protocol
> analyze [1,2,3,4,5]
> summarize The x402 protocol enables...
> summary
> exit
```

---

## 🐛 Common Issues

### Issue: "Gemini API key invalid"

**Solution**:
```bash
# Check your .env file
cat .env | grep GEMINI

# Make sure it starts with AIza
# Get new key from https://makersuite.google.com/app/apikey
```

### Issue: "Connection refused to localhost:3001"

**Solution**:
```bash
# Start facilitator first
cd ../facilitator/verification-api
npm run dev
```

### Issue: "Connection refused to localhost:4000"

**Solution**:
```bash
# Start server in another terminal
cd demo-ai-agent
npm run server
```

### Issue: "Insufficient balance"

**Solution**:
```bash
# Fund your agent wallet with USDC
# Get testnet USDC from https://faucet.circle.com/
```

---

## 📊 Expected Output

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

[... 4 more tests ...]

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

## ✅ Success Checklist

After running the demo, you should see:

- [ ] Agent initialized with address
- [ ] 5 tests completed successfully
- [ ] Payments made automatically (no user interaction!)
- [ ] AI responses received
- [ ] Session summary with total spent

---

## 🎉 What You Just Did

You successfully demonstrated:

✅ **Autonomous AI Agent** - Agent paid for services automatically  
✅ **x402 Protocol** - HTTP 402 payments working end-to-end  
✅ **UEA Integration** - Cross-chain origin detection  
✅ **Gemini AI** - Real AI integration with paid APIs  
✅ **On-Chain Settlement** - Payments recorded on Push Chain  

**This is the future of AI agent economies!** 🤖💰🚀

---

## 📚 Next Steps

1. **Try Interactive Mode** - Chat with the AI yourself
2. **Customize Services** - Add your own AI endpoints
3. **Change Pricing** - Adjust costs for different tiers
4. **Deploy to Production** - When Push Chain mainnet launches

---

## 💡 Tips

- **Save Costs**: Use `basic` tier for simple queries
- **Better Responses**: Use `premium` tier for complex analysis
- **Track Spending**: Use `summary` command to see total costs
- **Test Different Models**: Try different Gemini models

---

**Need Help?** Check the full README.md or ask for assistance!

**Ready to build?** Start creating your own AI-powered APIs with x402! 🚀
