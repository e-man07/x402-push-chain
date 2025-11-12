import { Router } from 'express';
import { SettlementService } from '../services/SettlementService';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode } from '../types';

const router = Router();
const settlementService = new SettlementService();

/**
 * POST /api/v1/settle
 * Verify and settle a payment on-chain
 */
router.post('/', async (req, res, next) => {
  try {
    const { x402Version, paymentHeader, paymentRequirements, paymentId } = req.body;

    // Validate request
    if (!x402Version || !paymentHeader || !paymentRequirements) {
      throw new AppError(
        ErrorCode.INVALID_REQUEST,
        'Missing required fields: x402Version, paymentHeader, paymentRequirements'
      );
    }

    // Settle payment
    const result = await settlementService.settlePayment({
      x402Version,
      paymentHeader,
      paymentRequirements,
      paymentId: paymentId || '',
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as settlementRouter };
