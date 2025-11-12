/**
 * Test a single payment to verify real token transfer
 */

import { AIChatAgent } from './agent';

async function testSinglePayment() {
  console.log('\n🧪 Testing REAL Cross-Chain Payment');
  console.log('============================================================');
  console.log('Agent:    0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952');
  console.log('Merchant: 0xaa83c9bf476b0d76a575eec54e9405343bac644d');
  console.log('Token:    USDC Sepolia (0x1c7D...7238)');
  console.log('============================================================\n');

  const agent = new AIChatAgent();

  try {
    console.log('💬 Sending basic chat request...\n');
    
    const response = await agent.chat('What is blockchain?', 'basic');
    
    console.log('\n✅ Payment successful!');
    console.log('🤖 AI Response:', response.substring(0, 200) + '...');
    
    console.log('\n============================================================');
    console.log('✅ TEST COMPLETE');
    console.log('============================================================');
    console.log('\n💡 Now check balances to verify tokens moved!');
    console.log('   Agent should have: ~9.99 USDC (decreased by 0.01)');
    console.log('   Merchant should have: ~12.01 USDC (increased by 0.01)');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    throw error;
  }
}

testSinglePayment().catch(console.error);
