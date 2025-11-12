import { ethers } from 'ethers';
import { ContractService } from '../contracts/ContractService';
import { 
  VerificationRequest, 
  VerificationResponse, 
  PaymentPayload,
  ErrorCode 
} from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Payment verification service
 */
export class VerificationService {
  private contractService: ContractService;

  constructor() {
    this.contractService = new ContractService();
  }

  /**
   * Verify a payment without settling it
   */
  async verifyPayment(request: VerificationRequest): Promise<VerificationResponse> {
    try {
      // Decode payment header
      const paymentPayload = this.decodePaymentHeader(request.paymentHeader);

      // Validate x402 version
      if (paymentPayload.x402Version !== request.x402Version) {
        return {
          isValid: false,
          invalidReason: 'Version mismatch',
        };
      }

      // Validate scheme
      if (paymentPayload.scheme !== 'exact') {
        return {
          isValid: false,
          invalidReason: 'Unsupported payment scheme',
        };
      }

      // Verify signature
      const isSignatureValid = await this.verifySignature(
        paymentPayload,
        request.paymentRequirements
      );

      if (!isSignatureValid) {
        return {
          isValid: false,
          invalidReason: 'Invalid signature',
        };
      }

      // Verify amount
      const authorization = paymentPayload.payload.authorization;
      const requiredAmount = BigInt(request.paymentRequirements.maxAmountRequired);
      const providedAmount = BigInt(authorization.value);

      if (providedAmount < requiredAmount) {
        return {
          isValid: false,
          invalidReason: `Insufficient amount. Required: ${requiredAmount}, Provided: ${providedAmount}`,
        };
      }

      // Verify token is supported (skip check for native tokens)
      const isNativeToken = request.paymentRequirements.asset === '0x0000000000000000000000000000000000000000';
      
      if (!isNativeToken) {
        const isTokenSupported = await this.contractService.isSupportedToken(
          request.paymentRequirements.asset
        );

        if (!isTokenSupported) {
          return {
            isValid: false,
            invalidReason: 'Unsupported token',
          };
        }
      }
      // Native tokens (address(0)) are always supported

      // Verify timing
      const now = Math.floor(Date.now() / 1000);
      const validAfter = parseInt(authorization.validAfter);
      const validBefore = parseInt(authorization.validBefore);

      if (now < validAfter) {
        return {
          isValid: false,
          invalidReason: 'Payment not yet valid',
        };
      }

      if (now > validBefore) {
        return {
          isValid: false,
          invalidReason: 'Payment expired',
        };
      }

      // All checks passed
      return {
        isValid: true,
        invalidReason: null,
        estimatedGas: '300000', // Estimated gas for settlement
        expiresAt: validBefore,
      };
    } catch (error) {
      console.error('Verification error:', error);
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Verification failed',
        500,
        error
      );
    }
  }

  /**
   * Decode base64 payment header
   */
  private decodePaymentHeader(paymentHeader: string): PaymentPayload {
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    } catch (error) {
      throw new AppError(
        ErrorCode.INVALID_REQUEST,
        'Invalid payment header encoding'
      );
    }
  }

  /**
   * Get chain ID for network
   */
  private getChainId(network: string): number {
    const chainIds: Record<string, number> = {
      'push-chain': 42101,
      'ethereum-sepolia': 11155111,
      'ethereum': 1,
      'base-sepolia': 84532,
      'base': 8453,
      'arbitrum': 42161,
      'optimism': 10,
      'polygon': 137,
    };
    
    return chainIds[network] || 42101; // Default to Push Chain
  }

  /**
   * Verify EIP-712 signature
   */
  private async verifySignature(
    paymentPayload: PaymentPayload,
    requirements: any
  ): Promise<boolean> {
    try {
      const { signature, authorization } = paymentPayload.payload;

      // Build EIP-712 domain with proper chain ID mapping
      const domain = requirements.extra?.domain || {
        name: 'x402 Payment',
        version: '1',
        chainId: this.getChainId(paymentPayload.network),
        verifyingContract: requirements.asset,
      };

      // Build typed data
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

      // Recover signer
      const recoveredAddress = ethers.verifyTypedData(
        domain,
        types,
        authorization,
        signature
      );

      // Verify signer matches 'from' address
      return recoveredAddress.toLowerCase() === authorization.from.toLowerCase();
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }
}
