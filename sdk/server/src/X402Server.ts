import axios from 'axios';

/**
 * Payment requirement configuration
 */
export interface PaymentRequirement {
  resource: string;
  amount: string;
  asset: string;
  network: string;
  description: string;
  mimeType?: string;
  payTo: string;
  timeoutSeconds?: number;
}

/**
 * Server configuration
 */
export interface ServerConfig {
  facilitatorUrl?: string;
  registryAddress?: string;
  defaultNetwork?: string;
  defaultTimeout?: number;
}

/**
 * X402 Server - Creates payment requirements and handles verification
 */
export class X402Server {
  private config: ServerConfig;

  constructor(config: ServerConfig = {}) {
    this.config = {
      facilitatorUrl: config.facilitatorUrl || 'http://localhost:3001',
      registryAddress: config.registryAddress || '0xE1ED01e0623BBae51df78341297F16eE75a0009B',
      defaultNetwork: config.defaultNetwork || 'push-chain',
      defaultTimeout: config.defaultTimeout || 3600,
    };
  }

  /**
   * Create a 402 response
   */
  create402Response(requirement: PaymentRequirement): X402Response {
    const paymentRequirements = {
      scheme: 'exact' as const,
      network: requirement.network || this.config.defaultNetwork!,
      maxAmountRequired: requirement.amount,
      resource: requirement.resource,
      description: requirement.description,
      mimeType: requirement.mimeType || 'application/json',
      payTo: requirement.payTo,
      maxTimeoutSeconds: requirement.timeoutSeconds || this.config.defaultTimeout!,
      asset: requirement.asset,
    };

    // Encode as base64
    const encoded = Buffer.from(JSON.stringify(paymentRequirements)).toString('base64');

    return {
      status: 402,
      headers: {
        'X-Payment-Requirements': encoded,
        'Content-Type': requirement.mimeType || 'application/json',
      },
      body: {
        error: 'Payment Required',
        message: requirement.description,
        paymentRequirements,
      },
    };
  }

  /**
   * Verify payment header
   */
  async verifyPayment(
    paymentHeader: string,
    requirement: PaymentRequirement
  ): Promise<VerificationResult> {
    const paymentRequirements = {
      scheme: 'exact' as const,
      network: requirement.network || this.config.defaultNetwork!,
      maxAmountRequired: requirement.amount,
      resource: requirement.resource,
      description: requirement.description,
      mimeType: requirement.mimeType || 'application/json',
      payTo: requirement.payTo,
      maxTimeoutSeconds: requirement.timeoutSeconds || this.config.defaultTimeout!,
      asset: requirement.asset,
    };

    try {
      const response = await axios.post(`${this.config.facilitatorUrl}/api/v1/verify`, {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      });

      return {
        isValid: response.data.isValid,
        invalidReason: response.data.invalidReason,
        estimatedGas: response.data.estimatedGas,
        expiresAt: response.data.expiresAt,
      };
    } catch (error: any) {
      return {
        isValid: false,
        invalidReason: error.response?.data?.message || error.message,
      };
    }
  }

  /**
   * Settle payment
   */
  async settlePayment(
    paymentHeader: string,
    requirement: PaymentRequirement
  ): Promise<SettlementResult> {
    const paymentRequirements = {
      scheme: 'exact' as const,
      network: requirement.network || this.config.defaultNetwork!,
      maxAmountRequired: requirement.amount,
      resource: requirement.resource,
      description: requirement.description,
      mimeType: requirement.mimeType || 'application/json',
      payTo: requirement.payTo,
      maxTimeoutSeconds: requirement.timeoutSeconds || this.config.defaultTimeout!,
      asset: requirement.asset,
    };

    try {
      const response = await axios.post(`${this.config.facilitatorUrl}/api/v1/settle`, {
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      });

      return {
        success: response.data.success,
        error: response.data.error,
        txHash: response.data.txHash,
        paymentId: response.data.registryTxHash,
        timestamp: response.data.timestamp,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message,
        txHash: null,
        paymentId: null,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      const response = await axios.get(
        `${this.config.facilitatorUrl}/api/v1/status/${paymentId}`
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }
}

/**
 * 402 Response interface
 */
export interface X402Response {
  status: 402;
  headers: {
    'X-Payment-Requirements': string;
    'Content-Type': string;
  };
  body: any;
}

/**
 * Verification result
 */
export interface VerificationResult {
  isValid: boolean;
  invalidReason: string | null;
  estimatedGas?: string;
  expiresAt?: number;
}

/**
 * Settlement result
 */
export interface SettlementResult {
  success: boolean;
  error: string | null;
  txHash: string | null;
  paymentId: string | null;
  timestamp: number;
}

/**
 * Payment status
 */
export interface PaymentStatus {
  paymentId: string;
  status: 'pending' | 'verified' | 'settling' | 'settled' | 'failed' | 'expired';
  amount: string;
  payer: string;
  network: string;
  resource: string;
  createdAt: number;
  settledAt?: number;
  txHash?: string;
}
