import { ethers } from 'ethers';
import { config } from '../config';
import { REGISTRY_ABI, ESCROW_ABI, TOKEN_MANAGER_ABI } from './abis';

/**
 * Contract interaction service
 */
export class ContractService {
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private registryContract: ethers.Contract;
  private escrowContract: ethers.Contract;
  private tokenManagerContract: ethers.Contract;

  constructor() {
    // Initialize provider
    this.provider = new ethers.JsonRpcProvider(config.pushChain.rpc);

    // Initialize wallet
    this.wallet = new ethers.Wallet(config.facilitator.privateKey, this.provider);

    // Initialize contracts
    this.registryContract = new ethers.Contract(
      config.contracts.registry,
      REGISTRY_ABI,
      this.wallet
    );

    this.escrowContract = new ethers.Contract(
      config.contracts.escrow,
      ESCROW_ABI,
      this.wallet
    );

    this.tokenManagerContract = new ethers.Contract(
      config.contracts.tokenManager,
      TOKEN_MANAGER_ABI,
      this.provider
    );
  }

  /**
   * Get payment requirement from registry
   */
  async getPaymentRequirement(merchant: string, resource: string) {
    const requirement = await this.registryContract.getPaymentRequirement(merchant, resource);
    return {
      scheme: requirement.scheme,
      network: requirement.network,
      maxAmountRequired: requirement.maxAmountRequired.toString(),
      resource: requirement.resource,
      description: requirement.description,
      mimeType: requirement.mimeType,
      payTo: requirement.payTo,
      maxTimeoutSeconds: Number(requirement.maxTimeoutSeconds),
      asset: requirement.asset,
      isActive: requirement.isActive,
      createdAt: Number(requirement.createdAt),
      updatedAt: Number(requirement.updatedAt),
    };
  }

  /**
   * Record payment in registry
   */
  async recordPayment(
    merchant: string,
    resource: string,
    payer: string,
    amount: bigint,
    txHash: string
  ): Promise<string> {
    const tx = await this.registryContract.recordPayment(
      merchant,
      resource,
      payer,
      amount,
      txHash
    );
    const receipt = await tx.wait();
    
    // Extract payment ID from event logs
    const event = receipt.logs.find((log: any) => {
      try {
        const parsed = this.registryContract.interface.parseLog(log);
        return parsed?.name === 'PaymentRecorded';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsed = this.registryContract.interface.parseLog(event);
      return parsed?.args[0]; // paymentId is first indexed parameter
    }

    throw new Error('Payment ID not found in transaction receipt');
  }

  /**
   * Mark payment as settled
   */
  async markPaymentSettled(paymentId: string, settlementTxHash: string): Promise<string> {
    const tx = await this.registryContract.markPaymentSettled(paymentId, settlementTxHash);
    const receipt = await tx.wait();
    return receipt.hash;
  }

  /**
   * Get payment record
   */
  async getPaymentRecord(paymentId: string) {
    const record = await this.registryContract.getPaymentRecord(paymentId);
    return {
      requirementId: record.requirementId,
      payer: record.payer,
      originChain: record.originChain,
      originAddress: record.originAddress,
      isUEA: record.isUEA,
      amount: record.amount.toString(),
      timestamp: Number(record.timestamp),
      txHash: record.txHash,
      settled: record.settled,
    };
  }

  /**
   * Check if token is supported
   */
  async isSupportedToken(tokenAddress: string): Promise<boolean> {
    return await this.tokenManagerContract.isSupportedToken(tokenAddress);
  }

  /**
   * Get token info
   */
  async getTokenInfo(tokenAddress: string) {
    const info = await this.tokenManagerContract.getTokenInfo(tokenAddress);
    return {
      tokenAddress: info.tokenAddress,
      symbol: info.symbol,
      decimals: Number(info.decimals),
      isActive: info.isActive,
      addedAt: Number(info.addedAt),
      updatedAt: Number(info.updatedAt),
    };
  }

  /**
   * Get facilitator address
   */
  getFacilitatorAddress(): string {
    return this.wallet.address;
  }

  /**
   * Get provider
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }
}
