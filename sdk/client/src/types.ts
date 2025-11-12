/**
 * Client SDK Types
 */

export interface X402PaymentRequirements {
  scheme: 'exact';
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra?: Record<string, any>;
}

export interface X402Response {
  status: 402;
  headers: {
    'x-payment-requirements': string; // Base64 encoded
    'content-type': string;
  };
  body?: any;
}

export interface PaymentOptions {
  signer: any; // ethers Signer
  amount?: string; // Optional override
  validFor?: number; // Seconds, default 3600
}

export interface PaymentResult {
  paymentHeader: string; // Base64 encoded
  authorization: {
    from: string;
    to: string;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: string;
  };
  signature: string;
}

export interface ClientConfig {
  facilitatorUrl?: string;
  autoRetry?: boolean;
  defaultValidFor?: number;
}
