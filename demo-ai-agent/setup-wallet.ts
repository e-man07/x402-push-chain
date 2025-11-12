/**
 * Setup script to check balances and approve USDC spending
 */

import { ethers } from 'ethers';
import dotenv from 'dotenv';

dotenv.config();

const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY!;
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS!;
const USDC_ADDRESS = process.env.USDC_ADDRESS!;

// Ethereum Sepolia RPC
const SEPOLIA_RPC = 'https://eth-sepolia.g.alchemy.com/v2/demo'; // Using public endpoint

const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

async function main() {
  console.log('\n🔧 Wallet Setup for Cross-Chain Testing');
  console.log('='.repeat(60));

  // Connect to Ethereum Sepolia
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const wallet = new ethers.Wallet(AGENT_PRIVATE_KEY, provider);

  console.log(`\n📍 Agent Wallet: ${wallet.address}`);
  console.log(`🌐 Network: Ethereum Sepolia`);
  console.log(`🪙  USDC: ${USDC_ADDRESS}`);
  console.log(`🏪 Merchant: ${MERCHANT_ADDRESS}`);

  // Check ETH balance
  console.log('\n💰 Checking Balances...');
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`   ETH: ${ethers.formatEther(ethBalance)} ETH`);

  // Check USDC balance
  const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, wallet);
  const usdcBalance = await usdc.balanceOf(wallet.address);
  const decimals = await usdc.decimals();
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, decimals)} USDC`);

  // Check allowance
  console.log('\n🔍 Checking USDC Allowance...');
  const allowance = await usdc.allowance(wallet.address, MERCHANT_ADDRESS);
  console.log(`   Current Allowance: ${ethers.formatUnits(allowance, decimals)} USDC`);

  // Check if we have enough
  const requiredAmount = ethers.parseUnits('10', decimals); // 10 USDC for demo
  
  if (usdcBalance < requiredAmount) {
    console.log('\n❌ Insufficient USDC balance!');
    console.log(`   Need: 10 USDC`);
    console.log(`   Have: ${ethers.formatUnits(usdcBalance, decimals)} USDC`);
    console.log('\n💡 Get testnet USDC from: https://faucet.circle.com/');
    return;
  }

  if (allowance < requiredAmount) {
    console.log('\n⚠️  Insufficient allowance. Approving USDC...');
    
    try {
      const approveTx = await usdc.approve(MERCHANT_ADDRESS, requiredAmount);
      console.log(`   Transaction sent: ${approveTx.hash}`);
      console.log('   Waiting for confirmation...');
      
      await approveTx.wait();
      console.log('   ✅ USDC approved!');
      
      const newAllowance = await usdc.allowance(wallet.address, MERCHANT_ADDRESS);
      console.log(`   New Allowance: ${ethers.formatUnits(newAllowance, decimals)} USDC`);
    } catch (error: any) {
      console.error('\n❌ Approval failed:', error.message);
      return;
    }
  } else {
    console.log('   ✅ Sufficient allowance already set!');
  }

  console.log('\n✅ Wallet Setup Complete!');
  console.log('='.repeat(60));
  console.log('\n🚀 Ready to run: npm run agent demo');
  console.log('\n');
}

main().catch(console.error);
