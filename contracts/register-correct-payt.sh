#!/bin/bash

echo "🔄 Re-registering with CORRECT payTo Address"
echo "=========================================================="

# OLD merchant creates requirements and receives payment
OLD_MERCHANT="0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952"
USDC="0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
REGISTRY="0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74"
RPC="https://evm.rpc-testnet-donut-node1.push.org/"

echo ""
echo "📍 Requirement Owner (msg.sender): $OLD_MERCHANT"
echo "💰 Payment Recipient (payTo): $OLD_MERCHANT"
echo "👤 Agent (Payer): 0xaa83c9bf476b0d76a575eec54e9405343bac644d"
echo ""

echo "1️⃣  Registering Basic Chat (0.01 USDC)..."
cast send $REGISTRY \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/chat/basic" \
  "exact" \
  "ethereum-sepolia" \
  10000 \
  "AI Service: Basic Chat (Real Payment)" \
  "application/json" \
  $OLD_MERCHANT \
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
  "AI Service: Advanced Chat (Real Payment)" \
  "application/json" \
  $OLD_MERCHANT \
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
  "AI Service: Premium Chat (Real Payment)" \
  "application/json" \
  $OLD_MERCHANT \
  3600 \
  $USDC \
  --rpc-url $RPC \
  --account myKeystore

echo ""
echo "✅ All endpoints registered with CORRECT payTo!"
echo "=========================================================="
echo ""
echo "📊 Configuration:"
echo "   Requirement Owner: $OLD_MERCHANT"
echo "   Payment Recipient (payTo): $OLD_MERCHANT"
echo "   Agent (Payer): 0xaa83c9bf476b0d76a575eec54e9405343bac644d"
echo ""
echo "🎯 NOW TESTING REAL PAYMENTS BETWEEN DIFFERENT ADDRESSES!"
echo "   Agent will pay 0.01 USDC to OLD merchant"
echo "   Balances WILL change!"
