import { Router } from 'express';
import { StatusService } from '../services/StatusService';
import { AppError } from '../middleware/errorHandler';
import { ErrorCode } from '../types';

const router = Router();
const statusService = new StatusService();

/**
 * GET /api/v1/status/:paymentId
 * Get payment status
 */
router.get('/:paymentId', async (req, res, next) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId || paymentId.length !== 66) {
      throw new AppError(
        ErrorCode.INVALID_REQUEST,
        'Invalid payment ID format'
      );
    }

    const status = await statusService.getPaymentStatus(paymentId);

    if (!status) {
      throw new AppError(
        ErrorCode.PAYMENT_NOT_FOUND,
        'Payment not found',
        404
      );
    }

    res.json(status);
  } catch (error) {
    next(error);
  }
});

export { router as statusRouter };
