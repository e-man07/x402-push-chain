import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Push Chain
  pushChain: {
    rpc: process.env.PUSH_CHAIN_RPC || 'https://evm.rpc-testnet-donut-node1.push.org/',
    chainId: parseInt(process.env.PUSH_CHAIN_CHAIN_ID || '42101', 10),
  },

  // Contracts
  contracts: {
    registry: process.env.REGISTRY_ADDRESS || '0xE1ED01e0623BBae51df78341297F16eE75a0009B',
    escrow: process.env.ESCROW_ADDRESS || '0xe75F48f2aeF1554Ca964eE5A3b6a19048C3D48bA',
    tokenManager: process.env.TOKEN_MANAGER_ADDRESS || '0xc5Ab8Ae7F08a4786Af22C4A0DebBa8A0C72F24E9',
  },

  // Facilitator
  facilitator: {
    privateKey: process.env.FACILITATOR_PRIVATE_KEY || '',
  },

  // API
  api: {
    keyHeader: process.env.API_KEY_HEADER || 'X-API-Key',
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Database (optional)
  database: {
    url: process.env.DATABASE_URL,
  },

  // Redis (optional)
  redis: {
    url: process.env.REDIS_URL,
  },
} as const;

// Validation
export function validateConfig() {
  const errors: string[] = [];

  if (!config.facilitator.privateKey) {
    errors.push('FACILITATOR_PRIVATE_KEY is required');
  }

  if (!config.contracts.registry) {
    errors.push('REGISTRY_ADDRESS is required');
  }

  if (!config.contracts.escrow) {
    errors.push('ESCROW_ADDRESS is required');
  }

  if (!config.contracts.tokenManager) {
    errors.push('TOKEN_MANAGER_ADDRESS is required');
  }

  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
}
