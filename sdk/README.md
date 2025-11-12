# x402 Protocol SDK

Complete SDK for integrating HTTP 402 payments on Push Chain.

## 📦 Packages

### [@push-x402/client](./client)
Client-side SDK for handling 402 responses and creating payments.

```bash
npm install @push-x402/client
```

### [@push-x402/server](./server)
Server-side SDK for creating payment requirements and verification.

```bash
npm install @push-x402/server
```

### [@push-x402/middleware](./middleware)
Express middleware for easy payment protection.

```bash
npm install @push-x402/middleware
```

---

## 🚀 Quick Start

### Client Usage

```typescript
import { X402Client } from '@push-x402/client';
import { ethers } from 'ethers';

// Initialize client
const client = new X402Client({
  facilitatorUrl: 'https://facilitator.example.com',
});

// Make a request
try {
  const data = await client.request('https://api.example.com/premium');
  console.log(data);
} catch (error) {
  if (error instanceof X402Error) {
    // Handle 402 - payment required
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Create and send payment
    const payment = await client.createPayment(error.x402Response, {
      signer,
      validFor: 3600, // 1 hour
    });

    // Retry with payment
    const data = await client.payAndRetry(
      'https://api.example.com/premium',
      error.x402Response,
      { signer }
    );
    console.log(data);
  }
}
```

### Server Usage

```typescript
import { X402Server } from '@push-x402/server';
import express from 'express';

const app = express();
const x402 = new X402Server({
  facilitatorUrl: 'http://localhost:3001',
});

app.get('/premium', async (req, res) => {
  const paymentHeader = req.headers['x-payment'];

  if (!paymentHeader) {
    // Return 402 Payment Required
    const response = x402.create402Response({
      resource: '/premium',
      amount: '1000000', // 1 USDC
      asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      network: 'base-sepolia',
      description: 'Premium API Access',
      payTo: '0xYourAddress',
    });

    return res.status(402)
      .set(response.headers)
      .json(response.body);
  }

  // Verify and settle payment
  const settlement = await x402.settlePayment(paymentHeader, {
    resource: '/premium',
    amount: '1000000',
    asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    network: 'base-sepolia',
    description: 'Premium API Access',
    payTo: '0xYourAddress',
  });

  if (!settlement.success) {
    return res.status(402).json({ error: 'Invalid payment' });
  }

  // Payment verified! Return premium content
  res.json({ data: 'Premium content', paymentId: settlement.paymentId });
});
```

### Middleware Usage

```typescript
import express from 'express';
import { requirePayment } from '@push-x402/middleware';

const app = express();

// Protect routes with x402
app.use('/api/premium/*', requirePayment({
  payTo: '0xYourAddress',
  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  network: 'base-sepolia',
  facilitatorUrl: 'http://localhost:3001',
  getPriceForResource: (resource) => {
    // Dynamic pricing
    if (resource.includes('/premium/gold')) return '5000000'; // 5 USDC
    return '1000000'; // 1 USDC
  },
  getDescription: (resource) => `Access to ${resource}`,
  onPaymentVerified: async (paymentId, req) => {
    console.log('Payment verified:', paymentId);
    // Track in database, etc.
  },
}));

// Protected route
app.get('/api/premium/data', (req, res) => {
  // Payment already verified by middleware
  res.json({ data: 'Premium content' });
});
```

---

## 📖 Features

### Client SDK
- ✅ Automatic 402 detection
- ✅ EIP-712 signature generation
- ✅ Payment verification
- ✅ Auto-retry with payment
- ✅ TypeScript support

### Server SDK
- ✅ 402 response generation
- ✅ Payment verification
- ✅ On-chain settlement
- ✅ Status tracking
- ✅ TypeScript support

### Middleware
- ✅ Express integration
- ✅ Route protection
- ✅ Dynamic pricing
- ✅ Payment callbacks
- ✅ TypeScript support

---

## 🔧 Configuration

### Client Config

```typescript
{
  facilitatorUrl: string;      // Facilitator API URL
  autoRetry: boolean;          // Auto-retry on 402 (default: true)
  defaultValidFor: number;     // Payment validity in seconds (default: 3600)
}
```

### Server Config

```typescript
{
  facilitatorUrl: string;      // Facilitator API URL
  registryAddress: string;     // Registry contract address
  defaultNetwork: string;      // Default network (default: 'push-chain')
  defaultTimeout: number;      // Default timeout in seconds (default: 3600)
}
```

---

## 📚 Examples

See the [examples](./examples) directory for complete working examples:

- [Basic Client](./examples/client-basic.ts)
- [Express Server](./examples/server-express.ts)
- [Next.js API Route](./examples/nextjs-api.ts)
- [React Hook](./examples/react-hook.tsx)

---

## 🧪 Testing

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run tests
npm test
```

---

## 📄 License

MIT
