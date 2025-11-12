/**
 * Check payment details using Payment ID
 */

import { ethers } from 'ethers';

const PAYMENT_ID = process.argv[2] || '0x8f6e966690ebcafc0ceef476a56e3ea9688d2d77a0640dc1b49ca7556e93cd76';
const REGISTRY_ADDRESS = '0xc5BE240FA4eD863Fdd39dDfB239BD939d88aCe74';
const RPC_URL = 'https://evm.rpc-testnet-donut-node1.push.org/';

const REGISTRY_ABI = [
  'function getPaymentRecord(bytes32 paymentId) view returns (tuple(bytes32 requirementId, address payer, string originChain, address originAddress, bool isUEA, uint256 amount, uint256 timestamp, bytes32 txHash, bool settled))',
];

async function checkPayment() {
  console.log('\n🔍 Payment Record Lookup');
  console.log('='.repeat(60));
  console.log(`📝 Payment ID: ${PAYMENT_ID}`);
  console.log(`📍 Registry: ${REGISTRY_ADDRESS}`);
  console.log('');

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const registry = new ethers.Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);

    console.log('🔎 Fetching payment record...\n');
    
    const record = await registry.getPaymentRecord(PAYMENT_ID);

    console.log('✅ Payment Record Found!');
    console.log('='.repeat(60));
    console.log(`📋 Requirement ID: ${record.requirementId}`);
    console.log(`👤 Payer: ${record.payer}`);
    console.log(`🌍 Origin Chain: ${record.originChain || 'N/A'}`);
    console.log(`📍 Origin Address: ${record.originAddress}`);
    console.log(`🔗 Is UEA: ${record.isUEA}`);
    console.log(`💰 Amount: ${ethers.formatEther(record.amount)} PC`);
    console.log(`⏰ Timestamp: ${new Date(Number(record.timestamp) * 1000).toISOString()}`);
    console.log(`📝 Transaction Hash: ${record.txHash}`);
    console.log(`✔️  Settled: ${record.settled}`);
    console.log('='.repeat(60));
    
    if (record.txHash && record.txHash !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
      const explorerUrl = `https://donut.push.network/tx/${record.txHash}`;
      console.log('\n🔗 View on Block Explorer:');
      console.log(`   ${explorerUrl}`);
    } else {
      console.log('\n⚠️  No transaction hash recorded (payment verification only)');
    }

    console.log('\n💡 Note:');
    console.log('   • Payment ID = Unique identifier for this payment record');
    console.log('   • Transaction Hash = Blockchain transaction that recorded the payment');
    console.log('');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('Payment not found')) {
      console.log('\n💡 This Payment ID does not exist in the registry.');
      console.log('   Payment IDs are generated when payments are recorded on-chain.');
    }
  }
}

checkPayment().catch(console.error);
