/**
 * AI-Powered API Server with x402 Payment Protection
 * Provides premium AI services that require payment
 */

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Configuration
const PORT = process.env.SERVER_PORT || 4000;
const FACILITATOR_URL = process.env.FACILITATOR_URL || 'http://localhost:3001';
const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS!;
const USDC_ADDRESS = process.env.USDC_ADDRESS!;
const PAYMENT_NETWORK = process.env.PAYMENT_NETWORK || 'ethereum-sepolia';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY!;

// Initialize Gemini AI (official @google/genai SDK)
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// Pricing tiers (adjusts based on token - USDC uses 6 decimals, native uses 18)
const PRICING = {
  '/api/ai/chat/basic': USDC_ADDRESS === '0x0000000000000000000000000000000000000000' ? '10000000000000000' : '10000',      // 0.01 PC/USDC
  '/api/ai/chat/advanced': USDC_ADDRESS === '0x0000000000000000000000000000000000000000' ? '20000000000000000' : '20000',   // 0.02 PC/USDC
  '/api/ai/chat/premium': USDC_ADDRESS === '0x0000000000000000000000000000000000000000' ? '50000000000000000' : '50000',    // 0.05 PC/USDC
  '/api/ai/analyze': USDC_ADDRESS === '0x0000000000000000000000000000000000000000' ? '30000000000000000' : '30000',         // 0.03 PC/USDC
  '/api/ai/summarize': USDC_ADDRESS === '0x0000000000000000000000000000000000000000' ? '15000000000000000' : '15000',       // 0.015 PC/USDC
};

/**
 * x402 Payment Middleware
 */
function requirePayment(resource: string) {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const paymentHeader = req.headers['x-payment'] as string;
    const amount = PRICING[resource as keyof typeof PRICING] || '1000000';

    if (!paymentHeader) {
      // Return 402 Payment Required
      const requirements = {
        scheme: 'exact',
        network: PAYMENT_NETWORK,
        maxAmountRequired: amount,
        resource,
        description: `AI Service: ${resource}`,
        mimeType: 'application/json',
        payTo: MERCHANT_ADDRESS,
        maxTimeoutSeconds: 3600,
        asset: USDC_ADDRESS,
      };

      const encoded = Buffer.from(JSON.stringify(requirements)).toString('base64');

      const isNative = USDC_ADDRESS === '0x0000000000000000000000000000000000000000';
      const formattedAmount = isNative 
        ? `${ethers.formatEther(amount)} PC`
        : `${ethers.formatUnits(amount, 6)} USDC`;

      return res.status(402)
        .set('X-Payment-Requirements', encoded)
        .json({
          error: 'Payment Required',
          message: `Payment of ${formattedAmount} required for ${resource}`,
          paymentRequirements: requirements,
        });
    }

    // Verify payment
    try {
      console.log(`💰 Verifying payment for ${resource}...`);
      
      const verifyResponse = await axios.post(`${FACILITATOR_URL}/api/v1/verify`, {
        x402Version: 1,
        paymentHeader,
        paymentRequirements: {
          scheme: 'exact',
          network: PAYMENT_NETWORK,
          maxAmountRequired: amount,
          resource,
          description: `AI Service: ${resource}`,
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

      console.log(`✅ Payment verified for ${resource}`);

      // Settle payment
      const settleResponse = await axios.post(`${FACILITATOR_URL}/api/v1/settle`, {
        x402Version: 1,
        paymentHeader,
        paymentRequirements: {
          scheme: 'exact',
          network: PAYMENT_NETWORK,
          maxAmountRequired: amount,
          resource,
          description: `AI Service: ${resource}`,
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

      console.log(`💸 Payment settled: ${settleResponse.data.registryTxHash}`);

      // Attach payment info to request
      (req as any).payment = {
        paymentId: settleResponse.data.registryTxHash,
        amount,
        verified: true,
      };

      next();
    } catch (error: any) {
      console.error('Payment error:', error.message);
      res.status(500).json({ error: 'Payment processing failed' });
    }
  };
}

// ============================================
// Public Endpoints (Free)
// ============================================

app.get('/api/public/info', (req, res) => {
  res.json({
    service: 'AI-Powered API with x402 Payments',
    version: '1.0.0',
    endpoints: {
      free: ['/api/public/info', '/api/public/pricing'],
      paid: [
        '/api/ai/chat/basic',
        '/api/ai/chat/advanced',
        '/api/ai/chat/premium',
        '/api/ai/analyze',
        '/api/ai/summarize',
      ],
    },
    message: 'Premium AI services require payment via x402 protocol',
  });
});

app.get('/api/public/pricing', (req, res) => {
  const isNative = USDC_ADDRESS === '0x0000000000000000000000000000000000000000';
  
  const pricing = Object.entries(PRICING).map(([endpoint, amount]) => ({
    endpoint,
    price: isNative 
      ? `${ethers.formatEther(amount)} PC`
      : `${ethers.formatUnits(amount, 6)} USDC`,
    priceWei: amount,
  }));

  res.json({
    currency: isNative ? 'PC (Native)' : 'USDC',
    network: PAYMENT_NETWORK,
    tokenAddress: USDC_ADDRESS,
    pricing,
  });
});

// ============================================
// Protected AI Endpoints (Paid)
// ============================================

app.post('/api/ai/chat/basic', requirePayment('/api/ai/chat/basic'), async (req, res) => {
  const { message } = req.body;
  const payment = (req as any).payment;

  try {
    // Call Gemini AI using official SDK
    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: message,
    });
    const aiResponse = result.text;

    const response = {
      reply: aiResponse,
      tier: 'basic',
      cost: ethers.formatUnits(payment.amount, 6) + ' USDC',
      paymentId: payment.paymentId,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Gemini AI error:', error);
    res.status(500).json({ error: 'AI generation failed', details: error.message });
  }
});

app.post('/api/ai/chat/advanced', requirePayment('/api/ai/chat/advanced'), async (req, res) => {
  const { message, context } = req.body;
  const payment = (req as any).payment;

  try {
    // Advanced prompt with context
    const prompt = context 
      ? `Context: ${context}\n\nQuestion: ${message}\n\nProvide a detailed, analytical response with reasoning and insights.`
      : `Analyze this question in depth and provide detailed insights: ${message}`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });
    const aiResponse = result.text;

    const response = {
      reply: aiResponse,
      analysis: {
        sentiment: 'analyzed',
        complexity: message.length > 50 ? 'high' : 'medium',
        topics: ['detailed analysis'],
      },
      tier: 'advanced',
      cost: ethers.formatUnits(payment.amount, 6) + ' USDC',
      paymentId: payment.paymentId,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Gemini AI error:', error);
    res.status(500).json({ error: 'AI generation failed', details: error.message });
  }
});

app.post('/api/ai/chat/premium', requirePayment('/api/ai/chat/premium'), async (req, res) => {
  const { message, context } = req.body;
  const payment = (req as any).payment;

  try {
    // Premium prompt with comprehensive instructions
    const prompt = context 
      ? `Context: ${context}\n\nQuestion: ${message}\n\nProvide a comprehensive, detailed response with:\n1. In-depth analysis\n2. Multiple perspectives\n3. Practical examples\n4. Actionable insights\n5. Related considerations`
      : `Provide a comprehensive, expert-level response to: ${message}\n\nInclude detailed analysis, practical examples, and actionable insights.`;

    const result = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: prompt,
    });
    const aiResponse = result.text;

    const response = {
      reply: aiResponse,
      analysis: {
        sentiment: 'analyzed',
        complexity: 'high',
        topics: ['comprehensive analysis', 'context-aware', 'actionable insights'],
        confidence: 0.95,
      },
      suggestions: [
        'Review the detailed analysis provided',
        'Apply insights to your specific context',
        'Consider the multiple perspectives offered',
      ],
      tier: 'premium',
      cost: ethers.formatUnits(payment.amount, 6) + ' USDC',
      paymentId: payment.paymentId,
      timestamp: new Date().toISOString(),
    };

    res.json(response);
  } catch (error: any) {
    console.error('Gemini AI error:', error);
    res.status(500).json({ error: 'AI generation failed', details: error.message });
  }
});

app.post('/api/ai/analyze', requirePayment('/api/ai/analyze'), (req, res) => {
  const { data } = req.body;
  const payment = (req as any).payment;

  // Simulate data analysis
  const response = {
    analysis: {
      dataPoints: Array.isArray(data) ? data.length : 1,
      summary: 'Data analyzed successfully',
      insights: [
        'Pattern detected in data structure',
        'Correlation found between variables',
        'Anomalies identified and flagged',
      ],
      confidence: 0.92,
    },
    service: 'data-analysis',
    cost: ethers.formatUnits(payment.amount, 6) + ' USDC',
    paymentId: payment.paymentId,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

app.post('/api/ai/summarize', requirePayment('/api/ai/summarize'), (req, res) => {
  const { text } = req.body;
  const payment = (req as any).payment;

  // Simulate text summarization
  const wordCount = text.split(' ').length;
  const summary = text.length > 100 
    ? text.substring(0, 100) + '...' 
    : text;

  const response = {
    summary,
    originalLength: text.length,
    summaryLength: summary.length,
    wordCount,
    compressionRatio: ((summary.length / text.length) * 100).toFixed(2) + '%',
    service: 'summarization',
    cost: ethers.formatUnits(payment.amount, 6) + ' USDC',
    paymentId: payment.paymentId,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

// ============================================
// Server Start
// ============================================

app.listen(PORT, () => {
  const isNative = USDC_ADDRESS === '0x0000000000000000000000000000000000000000';
  
  console.log('\n🤖 AI-Powered API Server with x402 Payments');
  console.log('='.repeat(50));
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`💰 Merchant: ${MERCHANT_ADDRESS}`);
  console.log(`🌐 Network: ${PAYMENT_NETWORK}`);
  console.log(`🪙  Token: ${isNative ? 'Native PC' : USDC_ADDRESS}`);
  console.log(`🔗 Facilitator: ${FACILITATOR_URL}`);
  console.log('\n📊 Available Endpoints:');
  console.log('  Free:');
  console.log('    GET  /api/public/info');
  console.log('    GET  /api/public/pricing');
  console.log('  Paid (x402 Protected):');
  console.log('    POST /api/ai/chat/basic      - 0.01 PC');
  console.log('    POST /api/ai/chat/advanced   - 0.02 PC');
  console.log('    POST /api/ai/chat/premium    - 0.05 PC');
  console.log('    POST /api/ai/analyze         - 0.03 PC');
  console.log('    POST /api/ai/summarize       - 0.015 PC');
  console.log('='.repeat(50));
  console.log('\n🔗 PUSH CHAIN NATIVE TOKEN MODE');
  console.log(`   Network: Push Chain Donut Testnet`);
  console.log(`   Payment: Native PC tokens`);
  console.log(`   Settlement: On-chain via x402 protocol`);
  console.log('\n💡 Tip: Start the facilitator first with "npm run dev"');
  console.log('💡 Then run the agent with "npm run agent"\n');
});
