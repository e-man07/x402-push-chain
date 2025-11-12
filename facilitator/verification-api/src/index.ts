import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './config';
import { verificationRouter } from './routes/verification';
import { settlementRouter } from './routes/settlement';
import { statusRouter } from './routes/status';
import { errorHandler } from './middleware/errorHandler';

// Validate configuration
try {
  validateConfig();
} catch (error) {
  console.error('Configuration validation failed:', error);
  process.exit(1);
}

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    version: '0.1.0',
    network: 'push-chain-donut-testnet',
  });
});

// API routes
app.use('/api/v1/verify', verificationRouter);
app.use('/api/v1/settle', settlementRouter);
app.use('/api/v1/status', statusRouter);

// Error handling
app.use(errorHandler);

// Start server
const server = app.listen(config.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   x402 Protocol Facilitator - Verification API            ║
║                                                           ║
║   Status: Running                                         ║
║   Port: ${config.port}                                           ║
║   Environment: ${config.nodeEnv}                             ║
║   Network: Push Chain Donut Testnet                      ║
║                                                           ║
║   Endpoints:                                              ║
║   - POST /api/v1/verify      - Verify payment            ║
║   - POST /api/v1/settle      - Settle payment            ║
║   - GET  /api/v1/status/:id  - Check payment status      ║
║   - GET  /health             - Health check              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app };
