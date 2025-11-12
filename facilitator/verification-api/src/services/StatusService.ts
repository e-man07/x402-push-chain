import { ContractService } from '../contracts/ContractService';
import { PaymentStatus, ErrorCode } from '../types';
import { AppError } from '../middleware/errorHandler';

/**
 * Payment status service
 */
export class StatusService {
  private contractService: ContractService;

  constructor() {
    this.contractService = new ContractService();
  }

  /**
   * Get payment status by ID
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus | null> {
    try {
      // Get payment record from contract
      const record = await this.contractService.getPaymentRecord(paymentId);

      // Check if payment exists
      if (record.timestamp === 0) {
        return null;
      }

      // Determine status
      let status: PaymentStatus['status'];
      if (record.settled) {
        status = 'settled';
      } else {
        // Check if expired (assuming 1 hour timeout)
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = record.timestamp + 3600;
        status = now > expiresAt ? 'expired' : 'verified';
      }

      return {
        paymentId,
        status,
        amount: record.amount,
        asset: '', // Would need to fetch from requirement
        payer: record.payer,
        payee: '', // Would need to fetch from requirement
        network: record.originChain,
        resource: '', // Would need to fetch from requirement
        createdAt: record.timestamp,
        verifiedAt: record.timestamp,
        settledAt: record.settled ? record.timestamp : undefined,
        txHash: record.txHash,
        originChain: record.originChain,
      };
    } catch (error) {
      console.error('Status check error:', error);
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Failed to get payment status',
        500,
        error
      );
    }
  }
}
