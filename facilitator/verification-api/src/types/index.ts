/**
 * x402 Protocol Types
 * Based on Coinbase x402 specification with Push Chain extensions
 */

export interface PaymentRequirements {
  scheme: 'exact';
  network: string; // "base-sepolia", "ethereum-sepolia", "solana-devnet", etc.
  maxAmountRequired: string; // Amount in atomic units
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string; // Token contract address
  extra?: Record<string, any>; // EIP-712 domain for signature verification
}

export interface Authorization {
  from: string;
  to: string;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: string;
}

export interface ExactPaymentPayload {
  signature: string;
  authorization: Authorization;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: 'exact';
  network: string;
  payload: ExactPaymentPayload;
}

export interface VerificationRequest {
  x402Version: number;
  paymentHeader: string; // Base64 encoded PaymentPayload
  paymentRequirements: PaymentRequirements;
}

export interface VerificationResponse {
  isValid: boolean;
  invalidReason: string | null;
  paymentId?: string;
  estimatedGas?: string;
  expiresAt?: number;
}

export interface SettlementRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
  paymentId: string;
}

export interface SettlementResponse {
  success: boolean;
  error: string | null;
  txHash: string | null;
  networkId: string | null;
  timestamp: number;
  gasUsed?: string;
  registryTxHash?: string;
}

export interface PaymentStatus {
  paymentId: string;
  status: 'pending' | 'verified' | 'settling' | 'settled' | 'failed' | 'expired';
  amount: string;
  asset: string;
  payer: string;
  payee: string;
  network: string;
  resource: string;
  createdAt: number;
  verifiedAt?: number;
  settledAt?: number;
  txHash?: string;
  error?: string;
  originChain?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Error codes
export enum ErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  INSUFFICIENT_AMOUNT = 'INSUFFICIENT_AMOUNT',
  EXPIRED_PAYMENT = 'EXPIRED_PAYMENT',
  NONCE_USED = 'NONCE_USED',
  UNSUPPORTED_NETWORK = 'UNSUPPORTED_NETWORK',
  UNSUPPORTED_TOKEN = 'UNSUPPORTED_TOKEN',
  SETTLEMENT_FAILED = 'SETTLEMENT_FAILED',
  PAYMENT_NOT_FOUND = 'PAYMENT_NOT_FOUND',
  ALREADY_SETTLED = 'ALREADY_SETTLED',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}
