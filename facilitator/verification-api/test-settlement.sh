#!/bin/bash

# Test settlement with actual on-chain payment requirement

API_URL="http://localhost:3001"

echo "=========================================="
echo "Testing Real Payment Settlement"
echo "=========================================="
echo ""

# Using the actual payment requirement we created on-chain
# Merchant: 0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952
# Resource: /api/premium
# Amount: 1000000 (1 USDC)

# For testing, we'll bypass signature verification and just test settlement
# In production, this would have a real EIP-712 signature

PAYMENT_PAYLOAD='{
  "x402Version": 1,
  "scheme": "exact",
  "network": "push-chain",
  "payload": {
    "signature": "0x0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000",
    "authorization": {
      "from": "0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22",
      "to": "0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952",
      "value": "1000000",
      "validAfter": "0",
      "validBefore": "9999999999",
      "nonce": "0x' $(openssl rand -hex 32) '"
    }
  }
}'

PAYMENT_HEADER=$(echo -n "$PAYMENT_PAYLOAD" | base64)

echo "Testing with payment header (first 100 chars):"
echo "${PAYMENT_HEADER:0:100}..."
echo ""

# Test settlement
SETTLE_REQUEST='{
  "x402Version": 1,
  "paymentHeader": "'"$PAYMENT_HEADER"'",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "base-sepolia",
    "maxAmountRequired": "1000000",
    "resource": "/api/premium",
    "description": "Premium API Access",
    "mimeType": "application/json",
    "payTo": "0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952",
    "maxTimeoutSeconds": 60,
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
}'

echo "Attempting settlement..."
RESPONSE=$(curl -s -X POST "${API_URL}/api/v1/settle" \
  -H "Content-Type: application/json" \
  -d "$SETTLE_REQUEST")

echo "$RESPONSE" | jq

# Extract payment ID if successful
if echo "$RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  PAYMENT_ID=$(echo "$RESPONSE" | jq -r '.registryTxHash')
  echo ""
  echo "✅ Settlement successful!"
  echo "Payment ID: $PAYMENT_ID"
  echo ""
  
  # Check status
  if [ "$PAYMENT_ID" != "null" ] && [ ! -z "$PAYMENT_ID" ]; then
    echo "Checking payment status..."
    sleep 2
    curl -s "${API_URL}/api/v1/status/${PAYMENT_ID}" | jq
  fi
else
  echo ""
  echo "❌ Settlement failed"
fi

echo ""
echo "=========================================="
