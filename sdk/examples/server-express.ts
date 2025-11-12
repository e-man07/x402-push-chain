/**
 * Express Server Example
 * Shows how to protect API endpoints with x402
 */

import express from 'express';
import { requirePayment } from '@push-x402/middleware';

const app = express();

// Your merchant address
const MERCHANT_ADDRESS = '0x10a5E9659AE16cDAaD7A31391CFcDc49D6B93952';

// USDC Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// Protect premium endpoints
app.use('/api/premium/*', requirePayment({
  payTo: MERCHANT_ADDRESS,
  asset: USDC_ADDRESS,
  network: 'base-sepolia',
  facilitatorUrl: 'http://localhost:3001',
  
  // Dynamic pricing based on endpoint
  getPriceForResource: (resource) => {
    if (resource.includes('/gold')) return '5000000'; // 5 USDC
    if (resource.includes('/silver')) return '2000000'; // 2 USDC
    return '1000000'; // 1 USDC (default)
  },
  
  // Custom descriptions
  getDescription: (resource) => {
    if (resource.includes('/gold')) return 'Gold Tier API Access';
    if (resource.includes('/silver')) return 'Silver Tier API Access';
    return 'Premium API Access';
  },
  
  // Payment callback
  onPaymentVerified: async (paymentId, req) => {
    console.log(`✅ Payment verified: ${paymentId}`);
    console.log(`   Resource: ${req.path}`);
    console.log(`   IP: ${req.ip}`);
    
    // Track in database, analytics, etc.
  },
}));

// Protected endpoints
app.get('/api/premium/data', (req, res) => {
  res.json({
    message: 'Premium data',
    timestamp: Date.now(),
    paymentId: (req as any).payment?.paymentId,
  });
});

app.get('/api/premium/gold/data', (req, res) => {
  res.json({
    message: 'Gold tier data',
    features: ['advanced', 'priority', 'unlimited'],
    timestamp: Date.now(),
  });
});

// Public endpoint (no payment required)
app.get('/api/public/data', (req, res) => {
  res.json({
    message: 'Public data - no payment required',
    timestamp: Date.now(),
  });
});

// Start server
const PORT = 4000;
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   x402 Protected API Server                               ║
║                                                           ║
║   Status: Running                                         ║
║   Port: ${PORT}                                           ║
║                                                           ║
║   Endpoints:                                              ║
║   - GET /api/public/data         (Free)                  ║
║   - GET /api/premium/data        (1 USDC)                ║
║   - GET /api/premium/gold/data   (5 USDC)                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});
