/**
 * Test script for x402 Verification API
 */

const API_URL = 'http://localhost:3001';

async function testHealthCheck() {
  console.log('\n1️⃣  Testing Health Check...');
  const response = await fetch(`${API_URL}/health`);
  const data = await response.json();
  console.log('✅ Health:', data);
  return data;
}

async function testVerification() {
  console.log('\n2️⃣  Testing Payment Verification...');
  
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'push-chain',
    payload: {
      signature: '0x' + '0'.repeat(130),
      authorization: {
        from: '0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22',
        to: '0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952',
        value: '1000000',
        validAfter: '0',
        validBefore: '9999999999',
        nonce: '0x' + Math.random().toString(16).substring(2).padStart(64, '0'),
      },
    },
  };

  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

  const request = {
    x402Version: 1,
    paymentHeader,
    paymentRequirements: {
      scheme: 'exact',
      network: 'base-sepolia',
      maxAmountRequired: '1000000',
      resource: '/api/premium',
      description: 'Premium API Access',
      mimeType: 'application/json',
      payTo: '0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952',
      maxTimeoutSeconds: 60,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
  };

  const response = await fetch(`${API_URL}/api/v1/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data = await response.json();
  console.log('Verification result:', data);
  return data;
}

async function testSettlement() {
  console.log('\n3️⃣  Testing Payment Settlement...');
  
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'push-chain',
    payload: {
      signature: '0x' + '0'.repeat(130),
      authorization: {
        from: '0x742d35Cc6C3E3b24a3A4c1537e2b68b5e04e7A22',
        to: '0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952',
        value: '1500000', // 1.5 USDC
        validAfter: '0',
        validBefore: '9999999999',
        nonce: '0x' + Math.random().toString(16).substring(2).padStart(64, '0'),
      },
    },
  };

  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

  const request = {
    x402Version: 1,
    paymentHeader,
    paymentRequirements: {
      scheme: 'exact',
      network: 'base-sepolia',
      maxAmountRequired: '1000000',
      resource: '/api/premium',
      description: 'Premium API Access',
      mimeType: 'application/json',
      payTo: '0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952',
      maxTimeoutSeconds: 60,
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
    paymentId: '0x' + Math.random().toString(16).substring(2).padStart(64, '0'),
  };

  const response = await fetch(`${API_URL}/api/v1/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const data = await response.json();
  console.log('Settlement result:', data);
  
  if (data.success && data.registryTxHash) {
    console.log('\n✅ Settlement successful!');
    console.log('Transaction Hash:', data.txHash);
    console.log('Payment ID:', data.registryTxHash);
    return data;
  } else {
    console.log('\n❌ Settlement failed:', data.error || data.message);
    return null;
  }
}

async function testStatus(paymentId) {
  if (!paymentId) {
    console.log('\n⏭️  Skipping status check (no payment ID)');
    return;
  }

  console.log('\n4️⃣  Testing Payment Status...');
  console.log('Payment ID:', paymentId);

  const response = await fetch(`${API_URL}/api/v1/status/${paymentId}`);
  const data = await response.json();
  console.log('Status:', data);
  return data;
}

async function runTests() {
  console.log('==========================================');
  console.log('🧪 x402 Verification API Tests');
  console.log('==========================================');

  try {
    // Test 1: Health Check
    await testHealthCheck();

    // Test 2: Verification
    await testVerification();

    // Test 3: Settlement
    const settlementResult = await testSettlement();

    // Test 4: Status (if settlement succeeded)
    if (settlementResult && settlementResult.registryTxHash) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
      await testStatus(settlementResult.registryTxHash);
    }

    console.log('\n==========================================');
    console.log('✅ All tests completed!');
    console.log('==========================================\n');
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

runTests();
