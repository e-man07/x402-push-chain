import { ethers } from 'ethers';
import { PushChain } from '@pushchain/core';
import { EIP3009_ABI, ERC20_ABI } from '../contracts/abis';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode } from '../types';

/**
 * Payment execution service
 * Handles actual token transfers using Push Chain's universal transaction layer
 */
export class PaymentExecutor {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private pushChain: PushChain | null = null;

  constructor(provider: ethers.JsonRpcProvider, privateKey: string) {
    this.provider = provider;
    this.wallet = new ethers.Wallet(privateKey, provider);
    this.initializePushChain().catch(console.error);
  }

  /**
   * Initialize Push Chain SDK with universal signer
   */
  private async initializePushChain(): Promise<void> {
    try {
      // Create a universal signer wrapper for ethers wallet
      const universalSigner = {
        account: {
          address: this.wallet.address as `0x${string}`,
          chain: PushChain.CONSTANTS.CHAIN.PUSH_TESTNET_DONUT,
        },
        signMessage: async (data: Uint8Array) => {
          const message = ethers.hexlify(data);
          const signature = await this.wallet.signMessage(ethers.getBytes(message));
          return ethers.getBytes(signature);
        },
        signAndSendTransaction: async (tx: any) => {
          const response = await this.wallet.sendTransaction(tx);
          return response.hash as `0x${string}`;
        },
      };

      // Initialize PushChain with universal signer
      this.pushChain = await PushChain.initialize(universalSigner as any, {
        network: PushChain.CONSTANTS.PUSH_NETWORK.TESTNET_DONUT,
        printTraces: false,
      });

      console.log('✅ Push Chain SDK initialized with universal transactions');
      const origin = this.pushChain.universal.origin;
      const account = this.pushChain.universal.account;
      console.log(`   Origin: ${(origin as any).address || origin}`);
      console.log(`   UEA: ${(account as any).address || account}`);
    } catch (error) {
      console.error('⚠️  Failed to initialize Push Chain SDK:', error);
      console.log('   Falling back to direct ethers.js calls');
    }
  }

  /**
   * Execute a payment using the provided authorization
   * @param authorization - EIP-712 signed authorization
   * @param signature - The signature from the authorization
   * @param asset - Token address (0x0 for native)
   * @returns Transaction hash of the transfer
   */
  async executePayment(
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    },
    signature: string,
    asset: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    const isNativeToken = asset === '0x0000000000000000000000000000000000000000';

    console.log('\n💰 Executing Real Payment...');
    console.log(`   From: ${authorization.from}`);
    console.log(`   To: ${authorization.to}`);
    console.log(`   Amount: ${ethers.formatEther(authorization.value)} ${isNativeToken ? 'PC' : 'tokens'}`);
    console.log(`   Asset: ${asset}`);

    try {
      if (isNativeToken) {
        return await this.executeNativeTransfer(authorization);
      } else {
        return await this.executeERC20Transfer(authorization, signature, asset);
      }
    } catch (error: any) {
      console.error('❌ Payment execution failed:', error.message);
      throw new AppError(
        ErrorCode.SETTLEMENT_FAILED,
        `Payment execution failed: ${error.message}`,
        500,
        error
      );
    }
  }

  /**
   * Execute native token transfer using Push Chain universal transactions
   */
  private async executeNativeTransfer(authorization: {
    from: string;
    to: string;
    value: string;
  }): Promise<{ txHash: string; blockNumber: number }> {
    console.log('   📤 Executing native token transfer via Push Chain universal layer...');

    // Check if payer has sufficient balance
    const payerBalance = await this.provider.getBalance(authorization.from);
    const amount = BigInt(authorization.value);

    if (payerBalance < amount) {
      throw new Error(
        `Insufficient balance. Required: ${ethers.formatEther(amount)} PC, Available: ${ethers.formatEther(payerBalance)} PC`
      );
    }

    // Use Push Chain's universal transaction if available
    if (this.pushChain) {
      try {
        console.log('   🌐 Using Push Chain universal.sendTransaction()...');
        
        const tx = await this.pushChain.universal.sendTransaction({
          to: authorization.to as `0x${string}`,
          value: amount,
          data: '0x' as `0x${string}`, // Empty data for native transfer
        });

        console.log('   📝 Universal transaction sent:', tx.hash);
        const receipt = await tx.wait();
        console.log('   ✅ Transaction confirmed in block:', receipt?.blockNumber);

        return {
          txHash: tx.hash,
          blockNumber: Number(receipt?.blockNumber || 0),
        };
      } catch (error: any) {
        console.warn('   ⚠️  Push Chain universal tx failed, falling back to direct transfer:', error.message);
      }
    }

    // Fallback: Direct ethers.js transfer
    console.log('   📤 Fallback: Direct ethers.js transfer...');
    const tx = await this.wallet.sendTransaction({
      to: authorization.to,
      value: amount,
    });

    console.log('   📝 Transaction sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('   ✅ Transaction confirmed in block:', receipt?.blockNumber);

    return {
      txHash: tx.hash,
      blockNumber: receipt?.blockNumber || 0,
    };
  }

  /**
   * Execute ERC20 transfer using Push Chain universal transactions
   * Falls back to EIP-3009 if Push Chain client unavailable
   */
  private async executeERC20Transfer(
    authorization: {
      from: string;
      to: string;
      value: string;
      validAfter: string;
      validBefore: string;
      nonce: string;
    },
    signature: string,
    asset: string
  ): Promise<{ txHash: string; blockNumber: number }> {
    console.log('   📤 Executing ERC20 transfer via Push Chain universal layer...');

    // Check payer balance
    const erc20 = new ethers.Contract(asset, ERC20_ABI, this.provider);
    const balance = await erc20.balanceOf(authorization.from);
    const amount = BigInt(authorization.value);

    if (balance < amount) {
      throw new Error(
        `Insufficient token balance. Required: ${ethers.formatUnits(amount, 6)} tokens, Available: ${ethers.formatUnits(balance, 6)} tokens`
      );
    }

    // Try Push Chain universal transaction first
    if (this.pushChain) {
      try {
        console.log('   🌐 Using Push Chain universal.sendTransaction() for ERC20...');

        // Encode the transferWithAuthorization call
        const token = new ethers.Contract(asset, EIP3009_ABI, this.provider);
        const data = token.interface.encodeFunctionData('transferWithAuthorization', [
          authorization.from,
          authorization.to,
          authorization.value,
          authorization.validAfter,
          authorization.validBefore,
          authorization.nonce,
          signature,
        ]);

        // Execute via universal transaction layer
        const tx = await this.pushChain.universal.sendTransaction({
          to: asset as `0x${string}`,
          value: BigInt(0),
          data: data as `0x${string}`,
        });

        console.log('   📝 Universal transaction sent:', tx.hash);
        const receipt = await tx.wait();
        console.log('   ✅ Transaction confirmed in block:', receipt?.blockNumber);

        return {
          txHash: tx.hash,
          blockNumber: Number(receipt?.blockNumber || 0),
        };
      } catch (error: any) {
        console.warn('   ⚠️  Push Chain universal tx failed, falling back to EIP-3009:', error.message);
      }
    }

    // Fallback: Direct EIP-3009 call
    console.log('   📤 Fallback: Direct EIP-3009 transferWithAuthorization...');
    const token = new ethers.Contract(asset, EIP3009_ABI, this.wallet);

    try {
      const tx = await token.transferWithAuthorization(
        authorization.from,
        authorization.to,
        authorization.value,
        authorization.validAfter,
        authorization.validBefore,
        authorization.nonce,
        signature
      );

      console.log('   📝 Transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('   ✅ Transaction confirmed in block:', receipt?.blockNumber);

      return {
        txHash: tx.hash,
        blockNumber: receipt?.blockNumber || 0,
      };
    } catch (error: any) {
      if (error.message.includes('authorization is used')) {
        throw new Error('Payment authorization already used (duplicate payment)');
      } else if (error.message.includes('authorization is not yet valid')) {
        throw new Error('Payment authorization not yet valid');
      } else if (error.message.includes('authorization is expired')) {
        throw new Error('Payment authorization has expired');
      } else if (error.message.includes('invalid signature')) {
        throw new Error('Invalid payment signature');
      }
      throw error;
    }
  }

  /**
   * Verify a payment was executed successfully
   */
  async verifyPaymentExecution(
    txHash: string,
    expectedFrom: string,
    expectedTo: string,
    expectedAmount: bigint,
    asset: string
  ): Promise<boolean> {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      if (!receipt) {
        return false;
      }

      // Check transaction succeeded
      if (receipt.status !== 1) {
        return false;
      }

      // For native tokens, verify transaction details
      if (asset === '0x0000000000000000000000000000000000000000') {
        const tx = await this.provider.getTransaction(txHash);
        if (!tx) return false;
        
        return (
          tx.to?.toLowerCase() === expectedTo.toLowerCase() &&
          tx.value === expectedAmount
        );
      }

      // For ERC20, check Transfer event
      const erc20 = new ethers.Contract(asset, ERC20_ABI, this.provider);
      const transferEventTopic = ethers.id('Transfer(address,address,uint256)');
      
      const transferLog = receipt.logs.find(
        (log) => log.topics[0] === transferEventTopic && log.address.toLowerCase() === asset.toLowerCase()
      );

      if (!transferLog) return false;

      const parsedLog = erc20.interface.parseLog({
        topics: [...transferLog.topics],
        data: transferLog.data,
      });

      return (
        parsedLog?.args[0].toLowerCase() === expectedFrom.toLowerCase() &&
        parsedLog?.args[1].toLowerCase() === expectedTo.toLowerCase() &&
        BigInt(parsedLog?.args[2]) === expectedAmount
      );
    } catch (error) {
      console.error('Error verifying payment execution:', error);
      return false;
    }
  }
}
