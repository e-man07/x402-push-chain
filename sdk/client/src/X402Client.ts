import { ethers } from 'ethers';
import axios, { AxiosError } from 'axios';
import {
  X402PaymentRequirements,
  X402Response,
  PaymentOptions,
  PaymentResult,
  ClientConfig,
} from './types';

/**
 * X402 Client - Handles HTTP 402 responses and payment creation
 */
export class X402Client {
  private config: ClientConfig;

  constructor(config: ClientConfig = {}) {
    this.config = {
      facilitatorUrl: config.facilitatorUrl || 'http://localhost:3001',
      autoRetry: config.autoRetry ?? true,
      defaultValidFor: config.defaultValidFor || 3600,
    };
  }

  /**
   * Make a request that may return 402
   */
  async request(url: string, options: any = {}): Promise<any> {
    try {
      const response = await axios({
        url,
        ...options,
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 402) {
        // Handle 402 Payment Required
        const x402Response = this.parse402Response(error);
        throw new X402Error('Payment required', x402Response);
      }
      throw error;
    }
  }

  /**
   * Parse 402 response
   */
  private parse402Response(error: AxiosError): X402Response {
    const headers = error.response?.headers || {};
    const paymentRequirementsHeader = headers['x-payment-requirements'];

    if (!paymentRequirementsHeader) {
      throw new Error('Invalid 402 response: missing x-payment-requirements header');
    }

    return {
      status: 402,
      headers: {
        'x-payment-requirements': paymentRequirementsHeader,
        'content-type': headers['content-type'] || 'application/json',
      },
      body: error.response?.data,
    };
  }

  /**
   * Create payment from 402 response
   */
  async createPayment(
    x402Response: X402Response,
    options: PaymentOptions
  ): Promise<PaymentResult> {
    // Decode payment requirements
    const requirements = this.decodePaymentRequirements(
      x402Response.headers['x-payment-requirements']
    );

    // Generate authorization
    const authorization = await this.generateAuthorization(requirements, options);

    // Sign authorization
    const signature = await this.signAuthorization(authorization, requirements, options.signer);

    // Create payment payload
    const paymentPayload = {
      x402Version: 1,
      scheme: 'exact',
      network: requirements.network,
      payload: {
        signature,
        authorization,
      },
    };

    // Encode as base64
    const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

    return {
      paymentHeader,
      authorization,
      signature,
    };
  }

  /**
   * Pay and retry request
   */
  async payAndRetry(
    url: string,
    x402Response: X402Response,
    options: PaymentOptions,
    requestOptions: any = {}
  ): Promise<any> {
    // Create payment
    const payment = await this.createPayment(x402Response, options);

    // Verify payment with facilitator
    const requirements = this.decodePaymentRequirements(
      x402Response.headers['x-payment-requirements']
    );

    await this.verifyPayment(payment.paymentHeader, requirements);

    // Retry request with payment header
    const response = await axios({
      url,
      ...requestOptions,
      headers: {
        ...requestOptions.headers,
        'X-Payment': payment.paymentHeader,
      },
    });

    return response.data;
  }

  /**
   * Verify payment with facilitator
   */
  private async verifyPayment(
    paymentHeader: string,
    requirements: X402PaymentRequirements
  ): Promise<void> {
    const response = await axios.post(`${this.config.facilitatorUrl}/api/v1/verify`, {
      x402Version: 1,
      paymentHeader,
      paymentRequirements: requirements,
    });

    if (!response.data.isValid) {
      throw new Error(`Payment verification failed: ${response.data.invalidReason}`);
    }
  }

  /**
   * Decode payment requirements from base64
   */
  private decodePaymentRequirements(encoded: string): X402PaymentRequirements {
    const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
    return JSON.parse(decoded);
  }

  /**
   * Generate authorization object
   */
  private async generateAuthorization(
    requirements: X402PaymentRequirements,
    options: PaymentOptions
  ) {
    const signerAddress = await options.signer.getAddress();
    const now = Math.floor(Date.now() / 1000);
    const validFor = options.validFor || this.config.defaultValidFor || 3600;

    return {
      from: signerAddress,
      to: requirements.payTo,
      value: options.amount || requirements.maxAmountRequired,
      validAfter: now.toString(),
      validBefore: (now + validFor).toString(),
      nonce: ethers.hexlify(ethers.randomBytes(32)),
    };
  }

  /**
   * Sign authorization with EIP-712
   */
  private async signAuthorization(
    authorization: any,
    requirements: X402PaymentRequirements,
    signer: any
  ): Promise<string> {
    // Get chain ID
    const provider = signer.provider;
    const network = await provider.getNetwork();
    const chainId = Number(network.chainId);

    // Build EIP-712 domain
    const domain = requirements.extra?.domain || {
      name: 'x402 Payment',
      version: '1',
      chainId,
      verifyingContract: requirements.asset,
    };

    // Build types
    const types = {
      Authorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' },
      ],
    };

    // Sign
    return await signer.signTypedData(domain, types, authorization);
  }
}

/**
 * X402 Error class
 */
export class X402Error extends Error {
  constructor(
    message: string,
    public x402Response: X402Response
  ) {
    super(message);
    this.name = 'X402Error';
  }
}
