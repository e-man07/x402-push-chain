/**
 * Demo Client - Test x402 payment flow
 */

import axios from 'axios';
import { ethers } from 'ethers';

const API_URL = 'http://localhost:4000';
const FACILITATOR_URL = 'http://localhost:3001';

// Your test wallet private key
const PRIVATE_KEY = '0x7bf6c9c45304fd4dc5edc0e69a0183b2979441f755cf292bd41e1c66adbe02ad';

async function testPublicEndpoint() {
  console.log('\n1️⃣  Testing Public Endpoint (No Payment)...');
  try {
    const response = await axios.get(`${API_URL}/api/public`);
    console.log('✅ Success:', response.data);
    return true;
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    return false;
  }
}

async function testProtectedEndpoint() {
  console.log('\n2️⃣  Testing Protected Endpoint (With Payment)...');
  
  try {
    // First request - should get 402
    console.log('   Making initial request...');
    const response = await axios.get(`${API_URL}/api/premium`);
    console.log('✅ Unexpected success (should have gotten 402):', response.data);
    return false;
  } catch (error: any) {
    if (error.response?.status === 402) {
      console.log('   ✅ Got 402 Payment Required (expected)');
      
      // Get payment requirements
      const paymentRequirementsHeader = error.response.headers['x-payment-requirements'];
      if (!paymentRequirementsHeader) {
        console.error('   ❌ Missing payment requirements header');
        return false;
      }

      console.log('   📋 Payment requirements received');
      
      // Decode requirements
      const requirements = JSON.parse(
        Buffer.from(paymentRequirementsHeader, 'base64').toString('utf-8')
      );
      console.log('   💰 Amount required:', requirements.maxAmountRequired, 'wei');
      console.log('   🪙 Asset:', requirements.asset);

      // Create payment
      console.log('\n   Creating payment...');
      const payment = await createPayment(requirements);
      console.log('   ✅ Payment created');

      // Retry with payment
      console.log('\n   Retrying request with payment...');
      const retryResponse = await axios.get(`${API_URL}/api/premium`, {
        headers: {
          'X-Payment': payment,
        },
      });

      console.log('   ✅ Success! Got premium content:');
      console.log('   ', JSON.stringify(retryResponse.data, null, 2));
      return true;
    } else {
      console.error('❌ Unexpected error:', error.message);
      return false;
    }
  }
}

async function createPayment(requirements: any): Promise<string> {
  // Setup wallet
  const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const signerAddress = wallet.address;

  console.log('   👛 Wallet:', signerAddress);

  // Create authorization
  const now = Math.floor(Date.now() / 1000);
  const authorization = {
    from: signerAddress,
    to: requirements.payTo,
    value: requirements.maxAmountRequired,
    validAfter: now.toString(),
    validBefore: (now + 3600).toString(),
    nonce: ethers.hexlify(ethers.randomBytes(32)),
  };

  // Sign with EIP-712
  const network = await provider.getNetwork();
  const domain = {
    name: 'x402 Payment',
    version: '1',
    chainId: Number(network.chainId),
    verifyingContract: requirements.asset,
  };

  const types = {
    Authorization: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
    ],
  };

  const signature = await wallet.signTypedData(domain, types, authorization);

  // Create payment payload
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: requirements.network,
    payload: {
      signature,
      authorization,
    },
  };

  // Encode as base64
  return Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║                                                           ║');
  console.log('║   x402 Integration Test                                   ║');
  console.log('║                                                           ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');

  const results = {
    public: false,
    protected: false,
  };

  // Test public endpoint
  results.public = await testPublicEndpoint();

  // Test protected endpoint
  results.protected = await testProtectedEndpoint();

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   Test Results                                            ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`Public Endpoint:    ${results.public ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Protected Endpoint: ${results.protected ? '✅ PASS' : '❌ FAIL'}`);
  console.log('');

  if (results.public && results.protected) {
    console.log('🎉 All tests passed! Integration working perfectly!');
  } else {
    console.log('❌ Some tests failed. Check the output above.');
  }
}

runTests().catch(console.error);
