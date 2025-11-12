#!/bin/bash

# Test script for x402 Verification API

API_URL="http://localhost:3001"

echo "=========================================="
echo "Testing x402 Verification API"
echo "=========================================="
echo ""

# 1. Health Check
echo "1. Testing Health Check..."
curl -s "${API_URL}/health" | jq
echo ""
echo ""

# 2. Test Verification (with mock data)
echo "2. Testing Payment Verification..."

# Create a mock payment payload
PAYMENT_PAYLOAD='{
  "x402Version": 1,
  "scheme": "exact",
  "network": "push-chain",
  "payload": {
    "signature": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12",
    "authorization": {
      "from": "0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952",
      "to": "0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952",
      "value": "1000000",
      "validAfter": "0",
      "validBefore": "9999999999",
      "nonce": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
    }
  }
}'

# Base64 encode the payload
PAYMENT_HEADER=$(echo -n "$PAYMENT_PAYLOAD" | base64)

# Create verification request
VERIFY_REQUEST='{
  "x402Version": 1,
  "paymentHeader": "'"$PAYMENT_HEADER"'",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "push-chain",
    "maxAmountRequired": "1000000",
    "resource": "/api/premium",
    "description": "Premium API Access",
    "mimeType": "application/json",
    "payTo": "0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952",
    "maxTimeoutSeconds": 60,
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  }
}'

curl -s -X POST "${API_URL}/api/v1/verify" \
  -H "Content-Type: application/json" \
  -d "$VERIFY_REQUEST" | jq
echo ""
echo ""

# 3. Test Settlement
echo "3. Testing Payment Settlement..."

SETTLE_REQUEST='{
  "x402Version": 1,
  "paymentHeader": "'"$PAYMENT_HEADER"'",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "push-chain",
    "maxAmountRequired": "1000000",
    "resource": "/api/premium",
    "description": "Premium API Access",
    "mimeType": "application/json",
    "payTo": "0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952",
    "maxTimeoutSeconds": 60,
    "asset": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },
  "paymentId": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
}'

curl -s -X POST "${API_URL}/api/v1/settle" \
  -H "Content-Type: application/json" \
  -d "$SETTLE_REQUEST" | jq
echo ""
echo ""

echo "=========================================="
echo "API Tests Complete!"
echo "=========================================="
