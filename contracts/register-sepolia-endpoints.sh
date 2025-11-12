#!/bin/bash

echo "🌐 Registering Ethereum Sepolia USDC Payment Requirements"
echo "=========================================================="

# USDC Sepolia Address
USDC="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
MERCHANT="0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952"
REGISTRY="0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74"
RPC="https://evm.rpc-testnet-donut-node1.push.org/"

echo ""
echo "1️⃣  Registering Basic Chat (0.01 USDC)..."
cast send $REGISTRY \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/chat/basic" \
  "exact" \
  "ethereum-sepolia" \
  10000 \
  "AI Service: Basic Chat (Sepolia USDC)" \
  "application/json" \
  $MERCHANT \
  3600 \
  $USDC \
  --rpc-url $RPC \
  --account myKeystore

echo ""
echo "2️⃣  Registering Advanced Chat (0.02 USDC)..."
cast send $REGISTRY \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/chat/advanced" \
  "exact" \
  "ethereum-sepolia" \
  20000 \
  "AI Service: Advanced Chat (Sepolia USDC)" \
  "application/json" \
  $MERCHANT \
  3600 \
  $USDC \
  --rpc-url $RPC \
  --account myKeystore

echo ""
echo "3️⃣  Registering Premium Chat (0.05 USDC)..."
cast send $REGISTRY \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/chat/premium" \
  "exact" \
  "ethereum-sepolia" \
  50000 \
  "AI Service: Premium Chat (Sepolia USDC)" \
  "application/json" \
  $MERCHANT \
  3600 \
  $USDC \
  --rpc-url $RPC \
  --account myKeystore

echo ""
echo "4️⃣  Registering Data Analysis (0.03 USDC)..."
cast send $REGISTRY \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/analyze" \
  "exact" \
  "ethereum-sepolia" \
  30000 \
  "AI Service: Data Analysis (Sepolia USDC)" \
  "application/json" \
  $MERCHANT \
  3600 \
  $USDC \
  --rpc-url $RPC \
  --account myKeystore

echo ""
echo "5️⃣  Registering Text Summarization (0.015 USDC)..."
cast send $REGISTRY \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/summarize" \
  "exact" \
  "ethereum-sepolia" \
  15000 \
  "AI Service: Text Summarization (Sepolia USDC)" \
  "application/json" \
  $MERCHANT \
  3600 \
  $USDC \
  --rpc-url $RPC \
  --account myKeystore

echo ""
echo "✅ All Ethereum Sepolia USDC endpoints registered!"
echo "=========================================================="
echo ""
echo "📝 Summary:"
echo "   Network: Ethereum Sepolia"
echo "   Token: USDC (6 decimals)"
echo "   Address: $USDC"
echo "   Merchant: $MERCHANT"
echo ""
echo "🚀 Ready to test cross-chain payments!"
