/**
 * AI Chat Agent with x402 Payment Integration
 * Uses Gemini AI and automatically pays for API services
 */

import { GoogleGenAI } from '@google/genai';
import axios from 'axios';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

// Configuration
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;
const AGENT_PRIVATE_KEY = process.env.AGENT_PRIVATE_KEY!;
const PUSH_CHAIN_RPC = process.env.PUSH_CHAIN_RPC!;
const FACILITATOR_URL = process.env.FACILITATOR_URL!;
const SERVER_URL = `http://localhost:${process.env.SERVER_PORT || 4000}`;

// Initialize Gemini AI (as per official documentation)
const geminiAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

/**
 * x402 Payment Client for AI Agent
 */
class X402AgentClient {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;

  constructor(privateKey: string, rpcUrl: string) {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  /**
   * Call API with automatic payment handling
   */
  async call(url: string, options: any = {}): Promise<any> {
    try {
      // Try without payment first
      const response = await axios({
        url,
        method: options.method || 'POST',
        data: options.data,
        headers: options.headers,
      });
      return response.data;
    } catch (error: any) {
      // Handle 402 Payment Required
      if (error.response?.status === 402) {
        console.log(`\n💰 Payment required for ${url}`);
        return await this.handlePayment(url, error.response, options);
      }
      throw error;
    }
  }

  private async handlePayment(url: string, response402: any, options: any) {
    // Decode requirements
    const requirementsHeader = response402.headers['x-payment-requirements'];
    const requirements = JSON.parse(
      Buffer.from(requirementsHeader, 'base64').toString('utf-8')
    );

    const isNative = requirements.asset === '0x0000000000000000000000000000000000000000';
    const formattedAmount = isNative 
      ? `${ethers.formatEther(requirements.maxAmountRequired)} PC`
      : `${ethers.formatUnits(requirements.maxAmountRequired, 6)} USDC`;
    
    console.log(`  💵 Amount: ${formattedAmount}`);
    console.log(`  🏪 Merchant: ${requirements.payTo}`);
    console.log(`  📝 Description: ${requirements.description}`);

    // STEP 1: Agent executes the transfer on source chain
    console.log(`  💸 Executing payment on ${requirements.network}...`);
    const txHash = await this.executeTransfer(requirements);
    console.log(`  ✅ Payment executed: ${txHash}`);

    // STEP 2: Create payment proof with TX hash
    const paymentHeader = await this.createPayment(requirements, txHash);

    console.log(`  🔐 Payment proof created, retrying request...`);

    // STEP 3: Retry with payment proof
    const response = await axios({
      url,
      method: options.method || 'POST',
      data: options.data,
      headers: {
        ...options.headers,
        'X-Payment': paymentHeader,
      },
    });

    console.log(`  ✅ Payment verified and settled!\n`);
    return response.data;
  }

  /**
   * Execute the actual token transfer on the source chain
   */
  private async executeTransfer(requirements: any): Promise<string> {
    const isNative = requirements.asset === '0x0000000000000000000000000000000000000000';
    
    // Get provider for the source chain
    const rpcUrl = this.getRpcUrl(requirements.network);
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(this.wallet.privateKey, provider);
    
    if (isNative) {
      // Native token transfer
      const tx = await wallet.sendTransaction({
        to: requirements.payTo,
        value: requirements.maxAmountRequired,
      });
      await tx.wait();
      return tx.hash;
    } else {
      // ERC20 transfer
      const erc20ABI = ['function transfer(address to, uint256 amount) returns (bool)'];
      const token = new ethers.Contract(requirements.asset, erc20ABI, wallet);
      const tx = await token.transfer(requirements.payTo, requirements.maxAmountRequired);
      await tx.wait();
      return tx.hash;
    }
  }

  /**
   * Get RPC URL for a given network
   */
  private getRpcUrl(network: string): string {
    const rpcUrls: Record<string, string> = {
      'push-chain': 'https://evm.rpc-testnet-donut-node1.push.org/',
      'ethereum-sepolia': 'https://ethereum-sepolia-rpc.publicnode.com',
      'base-sepolia': 'https://sepolia.base.org',
    };
    return rpcUrls[network] || rpcUrls['push-chain'];
  }

  private async createPayment(requirements: any, txHash: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const authorization = {
      from: this.wallet.address,
      to: requirements.payTo,
      value: requirements.maxAmountRequired,
      validAfter: now.toString(),
      validBefore: (now + 3600).toString(),
      nonce: ethers.hexlify(ethers.randomBytes(32)),
    };

    // Sign with EIP-712 using the payment network's chain ID
    const chainId = requirements.network === 'ethereum-sepolia' ? 11155111 : 
                    requirements.network === 'base-sepolia' ? 84532 : 
                    42101; // Push Chain default
    
    const domain = {
      name: 'x402 Payment',
      version: '1',
      chainId: chainId,
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

    const signature = await this.wallet.signTypedData(domain, types, authorization);

    const paymentPayload = {
      x402Version: 1,
      scheme: 'exact',
      network: requirements.network,
      payload: { 
        signature, 
        authorization,
        txHash, // Include transaction hash as proof
      },
    };

    return Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  }

  getAddress(): string {
    return this.wallet.address;
  }

  async getBalance(tokenAddress: string): Promise<string> {
    const erc20ABI = ['function balanceOf(address) view returns (uint256)'];
    const token = new ethers.Contract(tokenAddress, erc20ABI, this.wallet);
    const balance = await token.balanceOf(this.wallet.address);
    return ethers.formatUnits(balance, 6);
  }
}

/**
 * AI Chat Agent with Gemini and x402
 */
class AIChatAgent {
  private x402Client: X402AgentClient;
  private conversationHistory: any[] = [];
  private totalSpent: bigint = 0n;

  constructor(privateKey: string, rpcUrl: string) {
    this.x402Client = new X402AgentClient(privateKey, rpcUrl);
  }

  async initialize() {
    console.log('\n🤖 AI Chat Agent Initializing...');
    console.log('='.repeat(60));
    console.log(`📍 Agent Address: ${this.x402Client.getAddress()}`);
    console.log(`🔗 Server: ${SERVER_URL}`);
    console.log(`💰 Facilitator: ${FACILITATOR_URL}`);
    console.log('='.repeat(60));
  }

  /**
   * Chat with AI using paid API
   */
  async chat(message: string, tier: 'basic' | 'advanced' | 'premium' = 'advanced') {
    console.log(`\n👤 You: ${message}`);
    console.log(`📊 Tier: ${tier}`);

    try {
      // Use Gemini AI to understand the query (as per official documentation)
      const geminiResponse = await geminiAI.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: message,
      });
      const geminiText = geminiResponse.text;

      // Call paid API for processing
      const endpoint = `${SERVER_URL}/api/ai/chat/${tier}`;
      const apiResponse = await this.x402Client.call(endpoint, {
        method: 'POST',
        data: { message, context: geminiText },
      });

      // Track spending
      this.totalSpent += BigInt(apiResponse.cost.split(' ')[0] * 1_000_000);

      // Add to history
      this.conversationHistory.push({
        user: message,
        assistant: apiResponse.reply,
        tier,
        cost: apiResponse.cost,
        timestamp: apiResponse.timestamp,
      });

      console.log(`\n🤖 AI: ${apiResponse.reply}`);
      
      if (apiResponse.analysis) {
        console.log(`\n📊 Analysis:`);
        console.log(`   Sentiment: ${apiResponse.analysis.sentiment}`);
        console.log(`   Complexity: ${apiResponse.analysis.complexity}`);
        console.log(`   Topics: ${apiResponse.analysis.topics.join(', ')}`);
      }

      if (apiResponse.suggestions) {
        console.log(`\n💡 Suggestions:`);
        apiResponse.suggestions.forEach((s: string, i: number) => {
          console.log(`   ${i + 1}. ${s}`);
        });
      }

      console.log(`\n💸 Cost: ${apiResponse.cost}`);
      console.log(`📝 Payment ID: ${apiResponse.paymentId.substring(0, 20)}...`);

      return apiResponse;
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze data using paid API
   */
  async analyze(data: any) {
    console.log(`\n📊 Analyzing data...`);

    try {
      const endpoint = `${SERVER_URL}/api/ai/analyze`;
      const response = await this.x402Client.call(endpoint, {
        method: 'POST',
        data: { data },
      });

      this.totalSpent += BigInt(response.cost.split(' ')[0] * 1_000_000);

      console.log(`\n✅ Analysis complete:`);
      console.log(`   Data points: ${response.analysis.dataPoints}`);
      console.log(`   Summary: ${response.analysis.summary}`);
      console.log(`   Confidence: ${(response.analysis.confidence * 100).toFixed(1)}%`);
      console.log(`\n💡 Insights:`);
      response.analysis.insights.forEach((insight: string, i: number) => {
        console.log(`   ${i + 1}. ${insight}`);
      });
      console.log(`\n💸 Cost: ${response.cost}`);

      return response;
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Summarize text using paid API
   */
  async summarize(text: string) {
    console.log(`\n📝 Summarizing text (${text.length} characters)...`);

    try {
      const endpoint = `${SERVER_URL}/api/ai/summarize`;
      const response = await this.x402Client.call(endpoint, {
        method: 'POST',
        data: { text },
      });

      this.totalSpent += BigInt(response.cost.split(' ')[0] * 1_000_000);

      console.log(`\n✅ Summary:`);
      console.log(`   ${response.summary}`);
      console.log(`\n📊 Stats:`);
      console.log(`   Original: ${response.originalLength} chars, ${response.wordCount} words`);
      console.log(`   Summary: ${response.summaryLength} chars`);
      console.log(`   Compression: ${response.compressionRatio}`);
      console.log(`\n💸 Cost: ${response.cost}`);

      return response;
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get conversation summary
   */
  getSummary() {
    console.log(`\n📊 Session Summary`);
    console.log('='.repeat(60));
    console.log(`💬 Total messages: ${this.conversationHistory.length}`);
    console.log(`💸 Total spent: ${ethers.formatUnits(this.totalSpent, 6)} USDC`);
    console.log(`📍 Agent: ${this.x402Client.getAddress()}`);
    console.log('='.repeat(60));

    if (this.conversationHistory.length > 0) {
      console.log(`\n📜 Conversation History:`);
      this.conversationHistory.forEach((entry, i) => {
        console.log(`\n${i + 1}. [${entry.tier}] ${entry.cost}`);
        console.log(`   You: ${entry.user}`);
        console.log(`   AI: ${entry.assistant.substring(0, 100)}...`);
      });
    }
  }
}

/**
 * Interactive CLI
 */
async function runInteractiveCLI() {
  const agent = new AIChatAgent(AGENT_PRIVATE_KEY, PUSH_CHAIN_RPC);
  await agent.initialize();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(`\n💡 Commands:`);
  console.log(`   chat <message>        - Chat with AI (advanced tier)`);
  console.log(`   basic <message>       - Chat with AI (basic tier)`);
  console.log(`   premium <message>     - Chat with AI (premium tier)`);
  console.log(`   analyze <data>        - Analyze data`);
  console.log(`   summarize <text>      - Summarize text`);
  console.log(`   summary               - Show session summary`);
  console.log(`   exit                  - Exit\n`);

  const askQuestion = () => {
    rl.question('> ', async (input) => {
      const [command, ...args] = input.trim().split(' ');
      const message = args.join(' ');

      try {
        switch (command.toLowerCase()) {
          case 'chat':
            await agent.chat(message, 'advanced');
            break;
          case 'basic':
            await agent.chat(message, 'basic');
            break;
          case 'premium':
            await agent.chat(message, 'premium');
            break;
          case 'analyze':
            await agent.analyze(JSON.parse(message || '[]'));
            break;
          case 'summarize':
            await agent.summarize(message);
            break;
          case 'summary':
            agent.getSummary();
            break;
          case 'exit':
            agent.getSummary();
            rl.close();
            return;
          default:
            console.log('Unknown command. Type "help" for available commands.');
        }
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
      }

      askQuestion();
    });
  };

  askQuestion();
}

/**
 * Demo Mode - Automated test flow
 */
async function runDemoMode() {
  const agent = new AIChatAgent(AGENT_PRIVATE_KEY, PUSH_CHAIN_RPC);
  await agent.initialize();

  console.log(`\n🎬 Running Demo Mode...\n`);

  // Test 1: Basic chat
  console.log(`\n${'='.repeat(60)}`);
  console.log(`TEST 1: Basic Chat`);
  console.log('='.repeat(60));
  await agent.chat('What is blockchain?', 'basic');

  await sleep(2000);

  // // Test 2: Advanced chat
  // console.log(`\n${'='.repeat(60)}`);
  // console.log(`TEST 2: Advanced Chat`);
  // console.log('='.repeat(60));
  // await agent.chat('Explain how smart contracts work on Push Chain', 'advanced');

  // await sleep(2000);

  // // Test 3: Premium chat
  // console.log(`\n${'='.repeat(60)}`);
  // console.log(`TEST 3: Premium Chat`);
  // console.log('='.repeat(60));
  // await agent.chat('How can AI agents use x402 protocol for autonomous payments?', 'premium');

  // await sleep(2000);

  // // Test 4: Data analysis
  // console.log(`\n${'='.repeat(60)}`);
  // console.log(`TEST 4: Data Analysis`);
  // console.log('='.repeat(60));
  // await agent.analyze([1, 2, 3, 4, 5, 10, 20, 30]);

  // await sleep(2000);

  // // Test 5: Text summarization
  // console.log(`\n${'='.repeat(60)}`);
  // console.log(`TEST 5: Text Summarization`);
  // console.log('='.repeat(60));
  // const longText = `The x402 protocol is a revolutionary payment system built on Push Chain that enables autonomous AI agents to make payments for API services. It uses HTTP 402 status codes, EIP-712 signatures, and smart contracts to create a seamless payment experience. The protocol integrates with Push Chain's UEA Factory for universal cross-chain support, allowing agents to pay from any blockchain while maintaining full transparency and security.`;
  // await agent.summarize(longText);

  // Show summary
  console.log(`\n${'='.repeat(60)}`);
  console.log(`DEMO COMPLETE`);
  console.log('='.repeat(60));
  agent.getSummary();
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main
const mode = process.argv[2];

if (mode === 'demo') {
  runDemoMode().catch(console.error);
} else {
  runInteractiveCLI().catch(console.error);
}
