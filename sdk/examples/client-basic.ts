/**
 * Basic Client Example
 * Shows how to handle 402 responses and create payments
 */

import { X402Client, X402Error } from '@push-x402/client';
import { ethers } from 'ethers';

async function main() {
  // Initialize client
  const client = new X402Client({
    facilitatorUrl: 'http://localhost:3001',
    autoRetry: true,
  });

  // Setup wallet
  const provider = new ethers.JsonRpcProvider('https://evm.rpc-testnet-donut-node1.push.org/');
  const wallet = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);

  try {
    // Make request to protected endpoint
    console.log('Making request to protected endpoint...');
    const data = await client.request('https://api.example.com/premium');
    console.log('Success:', data);
  } catch (error) {
    if (error instanceof X402Error) {
      console.log('Payment required!');
      console.log('Requirements:', error.x402Response);

      // Create payment
      console.log('\nCreating payment...');
      const payment = await client.createPayment(error.x402Response, {
        signer: wallet,
        validFor: 3600, // Valid for 1 hour
      });

      console.log('Payment created:', payment.paymentHeader.substring(0, 50) + '...');

      // Retry request with payment
      console.log('\nRetrying with payment...');
      const data = await client.payAndRetry(
        'https://api.example.com/premium',
        error.x402Response,
        { signer: wallet }
      );

      console.log('Success:', data);
    } else {
      console.error('Error:', error);
    }
  }
}

main().catch(console.error);
