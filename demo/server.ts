/**
 * Demo Server - Protected API with x402
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const FACILITATOR_URL = 'http://localhost:3001';
const MERCHANT_ADDRESS = '0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952';
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Simple x402 middleware implementation
async function x402Protect(req: any, res: any, next: any) {
  const paymentHeader = req.headers['x-payment'];

  if (!paymentHeader) {
    // Return 402 Payment Required
    const paymentRequirements = {
      scheme: 'exact',
      network: 'base-sepolia',
      maxAmountRequired: '1000000', // 1 USDC
      resource: req.path,
      description: `Access to ${req.path}`,
      mimeType: 'application/json',
      payTo: MERCHANT_ADDRESS,
      maxTimeoutSeconds: 3600,
      asset: USDC_ADDRESS,
    };

    const encoded = Buffer.from(JSON.stringify(paymentRequirements)).toString('base64');

    return res.status(402)
      .set('X-Payment-Requirements', encoded)
      .json({
        error: 'Payment Required',
        message: `Payment of 1 USDC required for ${req.path}`,
        paymentRequirements,
      });
  }

  // Verify payment
  try {
    const verifyResponse = await axios.post(`${FACILITATOR_URL}/api/v1/verify`, {
      x402Version: 1,
      paymentHeader,
      paymentRequirements: {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: '1000000',
        resource: req.path,
        description: `Access to ${req.path}`,
        mimeType: 'application/json',
        payTo: MERCHANT_ADDRESS,
        maxTimeoutSeconds: 3600,
        asset: USDC_ADDRESS,
      },
    });

    if (!verifyResponse.data.isValid) {
      return res.status(402).json({
        error: 'Invalid payment',
        reason: verifyResponse.data.invalidReason,
      });
    }

    // Settle payment
    const settleResponse = await axios.post(`${FACILITATOR_URL}/api/v1/settle`, {
      x402Version: 1,
      paymentHeader,
      paymentRequirements: {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: '1000000',
        resource: req.path,
        description: `Access to ${req.path}`,
        mimeType: 'application/json',
        payTo: MERCHANT_ADDRESS,
        maxTimeoutSeconds: 3600,
        asset: USDC_ADDRESS,
      },
    });

    if (!settleResponse.data.success) {
      return res.status(500).json({
        error: 'Settlement failed',
        reason: settleResponse.data.error,
      });
    }

    // Payment verified and settled!
    req.payment = {
      paymentId: settleResponse.data.registryTxHash,
      txHash: settleResponse.data.txHash,
    };

    console.log('✅ Payment verified:', req.payment.paymentId);
    next();
  } catch (error: any) {
    console.error('Payment verification error:', error.message);
    res.status(500).json({ error: 'Payment processing failed' });
  }
}

// Public endpoint
app.get('/api/public', (req, res) => {
  res.json({
    message: 'This is public data - no payment required',
    timestamp: Date.now(),
  });
});

// Protected endpoint
app.get('/api/premium', x402Protect, (req: any, res) => {
  res.json({
    message: 'This is premium data - payment verified!',
    data: {
      secret: 'Premium content here',
      features: ['advanced', 'exclusive', 'unlimited'],
    },
    payment: req.payment,
    timestamp: Date.now(),
  });
});

// Another protected endpoint
app.get('/api/premium/gold', x402Protect, (req: any, res) => {
  res.json({
    message: 'Gold tier data',
    data: {
      tier: 'gold',
      benefits: ['priority support', 'custom features', 'dedicated resources'],
    },
    payment: req.payment,
    timestamp: Date.now(),
  });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   x402 Demo Server                                        ║
║                                                           ║
║   Status: Running                                         ║
║   Port: ${PORT}                                           ║
║                                                           ║
║   Endpoints:                                              ║
║   - GET /api/public          (Free)                      ║
║   - GET /api/premium         (1 USDC - Protected)        ║
║   - GET /api/premium/gold    (1 USDC - Protected)        ║
║                                                           ║
║   Facilitator: ${FACILITATOR_URL}                    ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
