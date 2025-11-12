#!/bin/bash

# Register all payment requirements

# Advanced Chat - 0.02 PC
cast send 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/chat/advanced" "exact" "push-chain" 20000000000000000 \
  "AI Service: Advanced Chat" "application/json" \
  0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 3600 \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/ \
  --account myKeystore

# Premium Chat - 0.05 PC
cast send 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/chat/premium" "exact" "push-chain" 50000000000000000 \
  "AI Service: Premium Chat" "application/json" \
  0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 3600 \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/ \
  --account myKeystore

# Data Analysis - 0.03 PC
cast send 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/analyze" "exact" "push-chain" 30000000000000000 \
  "AI Service: Data Analysis" "application/json" \
  0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 3600 \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/ \
  --account myKeystore

# Text Summarization - 0.015 PC
cast send 0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74 \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/ai/summarize" "exact" "push-chain" 15000000000000000 \
  "AI Service: Text Summarization" "application/json" \
  0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952 3600 \
  0x0000000000000000000000000000000000000000 \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/ \
  --account myKeystore

echo "✅ All endpoints registered!"
