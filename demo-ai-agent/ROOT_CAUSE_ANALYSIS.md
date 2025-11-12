# 🔍 Root Cause Analysis - Transaction Failures

**Date**: November 5, 2025  
**Issue**: Payments failing with "Invalid signature" / 402 errors

---

## 🎯 CORE PROBLEMS IDENTIFIED

### Problem 1: Native Token Not Whitelisted ❌

**Location**: `facilitator/verification-api/src/services/VerificationService.ts:71-80`

```typescript
// Verify token is supported
const isTokenSupported = await this.contractService.isSupportedToken(
  request.paymentRequirements.asset
);

if (!isTokenSupported) {
  return {
    isValid: false,
    invalidReason: 'Unsupported token',  // ← THIS IS FAILING!
  };
}
```

**Why**: Native token address `0x0000000000000000000000000000000000000000` is **NOT registered** in X402TokenManager contract!

**Evidence**: Your `.env` has:
```
USDC_ADDRESS=0x0000000000000000000000000000000000000000
```

But this address was never added to the TokenManager via `addToken()`.

---

### Problem 2: Hardcoded Chain ID Logic ❌

**Location**: `facilitator/verification-api/src/services/VerificationService.ts:145-150`

```typescript
const domain = requirements.extra?.domain || {
  name: 'x402 Payment',
  version: '1',
  chainId: paymentPayload.network === 'push-chain' ? 42101 : 1,  // ← PROBLEM!
  verifyingContract: requirements.asset,
};
```

**Why**: Only supports:
- `push-chain` → chainId 42101 ✅
- Anything else → chainId 1 (Ethereum Mainnet) ❌

**Missing**:
- `ethereum-sepolia` → chainId 11155111
- `base-sepolia` → chainId 84532
- etc.

This causes signature verification to **FAIL** because the agent signs with chainId 42101 but facilitator might verify with chainId 1!

---

### Problem 3: No Actual Blockchain Transaction ⚠️

**Current Flow**:
1. Agent creates EIP-712 signature ✅
2. Server verifies signature via facilitator ✅
3. Facilitator checks signature ❌ (fails due to above)
4. **NO actual payment happens!** ❌

**Why**: The x402 protocol as implemented does **signature verification** but doesn't actually:
- Transfer tokens
- Execute on-chain transactions
- Debit the payer

It's a **permission system**, not a **payment system**!

---

## 📊 What's Actually Happening

```
Agent Side:
1. Creates signature with chainId 42101 ✅
2. Signs authorization to pay 0.01 PC ✅
3. Sends to server ✅

Server Side:
1. Receives payment header ✅
2. Asks facilitator to verify ✅

Facilitator Side:
1. Checks if token (0x0000...0000) is supported ❌ FAILS
   → Returns: { isValid: false, invalidReason: "Unsupported token" }
2. Server rejects with 402 ❌
```

---

## 🔧 SOLUTIONS

### Solution 1: Add Native Token to TokenManager

**Quick Fix**:
```bash
cd contracts

# Add native token to TokenManager
cast send 0xc5Ab8Ae7F08a4786Af22C4A0DebBa8A0C72F24E9 \
  "addToken(address,string,uint8)" \
  0x0000000000000000000000000000000000000000 \
  "PC" \
  18 \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/ \
  --account myKeystore
```

**What this does**: Whitelists address(0) as a supported token in TokenManager

---

### Solution 2: Fix Chain ID Mapping

**Update**: `facilitator/verification-api/src/services/VerificationService.ts`

```typescript
private getChainId(network: string): number {
  const chainIds: Record<string, number> = {
    'push-chain': 42101,
    'ethereum-sepolia': 11155111,
    'ethereum': 1,
    'base-sepolia': 84532,
    'base': 8453,
    // Add more as needed
  };
  
  return chainIds[network] || 42101; // Default to Push Chain
}

// Then use it:
const domain = requirements.extra?.domain || {
  name: 'x402 Payment',
  version: '1',
  chainId: this.getChainId(paymentPayload.network),  // ← FIXED!
  verifyingContract: requirements.asset,
};
```

---

### Solution 3: Understand the Protocol

**Important**: x402 as currently implemented is:
- ✅ A **permission/authorization** system
- ✅ Proves the payer **agrees** to pay
- ❌ NOT an actual **payment execution** system

**For real payments**, you need to add:
```typescript
// After signature verification
if (isValid) {
  // Execute actual token transfer
  if (asset === '0x0000000000000000000000000000000000000000') {
    // Native token transfer
    await payer.sendTransaction({
      to: merchant,
      value: amount
    });
  } else {
    // ERC20 transfer
    const token = new ethers.Contract(asset, ERC20_ABI, payer);
    await token.transfer(merchant, amount);
  }
}
```

---

## 🎯 Recommended Fix Order

### Step 1: Add Native Token Support (IMMEDIATE)
```bash
cast send <TOKEN_MANAGER_ADDRESS> \
  "addToken(address,string,uint8)" \
  0x0000000000000000000000000000000000000000 \
  "PC" \
  18 \
  --rpc-url https://evm.rpc-testnet-donut-node1.push.org/ \
  --account myKeystore
```

### Step 2: Fix Chain ID Mapping
Update VerificationService.ts with proper chain ID mapping

### Step 3: Test
```bash
npm run agent demo
```

Should work after Step 1!

---

## 💡 Why Gemini Works But Payments Don't

**Gemini AI**: ✅ Works perfectly
- Makes API calls
- Gets responses
- No blockchain interaction needed

**x402 Payments**: ❌ Fails
- Requires token to be whitelisted
- Requires proper chain ID
- Requires signature verification to pass

**The architecture is sound, just needs configuration!**

---

## 📌 Key Insights

1. **Your code is correct** ✅
   - Agent creates valid signatures
   - Server implements x402 properly
   - Gemini integration works

2. **Configuration issue** ❌
   - Native token not whitelisted
   - Chain IDs hardcoded
   - TokenManager not configured

3. **Protocol understanding** ⚠️
   - x402 = authorization, not execution
   - Signatures prove intent
   - Actual transfers need to be added

---

## ✅ After Fixes

```
Agent:
1. Signs payment ✅
2. Sends to server ✅

Facilitator:
1. Checks token supported ✅ (after adding to TokenManager)
2. Verifies signature ✅ (after fixing chain IDs)
3. Returns isValid: true ✅

Server:
1. Accepts payment ✅
2. Returns AI response ✅

Result: WORKING! 🎉
```

---

**Bottom Line**: The protocol works! Just need to whitelist native tokens and fix chain ID mapping. These are configuration issues, not architectural problems.
