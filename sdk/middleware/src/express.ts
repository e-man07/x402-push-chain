import { Request, Response, NextFunction } from 'express';
import { X402Server, PaymentRequirement } from '@push-x402/server';

/**
 * Middleware configuration
 */
export interface X402MiddlewareConfig {
  facilitatorUrl?: string;
  payTo: string;
  asset: string;
  network?: string;
  getPriceForResource?: (resource: string) => string | Promise<string>;
  getDescription?: (resource: string) => string;
  onPaymentVerified?: (paymentId: string, req: Request) => void | Promise<void>;
}

/**
 * Create x402 payment middleware for Express
 */
export function x402Middleware(config: X402MiddlewareConfig) {
  const server = new X402Server({
    facilitatorUrl: config.facilitatorUrl,
    defaultNetwork: config.network || 'push-chain',
  });

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Check for payment header
      const paymentHeader = req.headers['x-payment'] as string;

      if (!paymentHeader) {
        // No payment provided, return 402
        return send402Response(req, res, config, server);
      }

      // Verify payment
      const price = config.getPriceForResource
        ? await config.getPriceForResource(req.path)
        : '1000000'; // Default 1 USDC

      const requirement: PaymentRequirement = {
        resource: req.path,
        amount: price,
        asset: config.asset,
        network: config.network || 'push-chain',
        description: config.getDescription
          ? config.getDescription(req.path)
          : `Access to ${req.path}`,
        payTo: config.payTo,
      };

      const verification = await server.verifyPayment(paymentHeader, requirement);

      if (!verification.isValid) {
        return res.status(402).json({
          error: 'Invalid payment',
          reason: verification.invalidReason,
        });
      }

      // Settle payment
      const settlement = await server.settlePayment(paymentHeader, requirement);

      if (!settlement.success) {
        return res.status(500).json({
          error: 'Settlement failed',
          reason: settlement.error,
        });
      }

      // Payment verified and settled
      if (config.onPaymentVerified && settlement.paymentId) {
        await config.onPaymentVerified(settlement.paymentId, req);
      }

      // Attach payment info to request
      (req as any).payment = {
        paymentId: settlement.paymentId,
        txHash: settlement.txHash,
        verified: true,
      };

      next();
    } catch (error) {
      console.error('x402 middleware error:', error);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  };
}

/**
 * Send 402 response
 */
function send402Response(
  req: Request,
  res: Response,
  config: X402MiddlewareConfig,
  server: X402Server
) {
  const price = config.getPriceForResource
    ? config.getPriceForResource(req.path)
    : '1000000';

  const requirement: PaymentRequirement = {
    resource: req.path,
    amount: typeof price === 'string' ? price : '1000000',
    asset: config.asset,
    network: config.network || 'push-chain',
    description: config.getDescription
      ? config.getDescription(req.path)
      : `Access to ${req.path}`,
    payTo: config.payTo,
  };

  const response = server.create402Response(requirement);

  res.status(402)
    .set(response.headers)
    .json(response.body);
}

/**
 * Protect specific routes with x402
 */
export function requirePayment(config: X402MiddlewareConfig) {
  return x402Middleware(config);
}
