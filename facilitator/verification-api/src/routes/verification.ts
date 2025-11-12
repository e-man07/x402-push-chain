import { Router } from 'express';
import { VerificationService } from '../services/VerificationService';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode } from '../types';

const router = Router();
const verificationService = new VerificationService();

/**
 * POST /api/v1/verify
 * Verify a payment without settling it
 */
router.post('/', async (req, res, next) => {
  try {
    const { x402Version, paymentHeader, paymentRequirements } = req.body;

    // Validate request
    if (!x402Version || !paymentHeader || !paymentRequirements) {
      throw new AppError(
        ErrorCode.INVALID_REQUEST,
        'Missing required fields: x402Version, paymentHeader, paymentRequirements'
      );
    }

    // Verify payment
    const result = await verificationService.verifyPayment({
      x402Version,
      paymentHeader,
      paymentRequirements,
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
});

export { router as verificationRouter };
