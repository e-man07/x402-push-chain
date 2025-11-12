/**
 * Contract ABIs
 * Minimal ABIs for the functions we need
 */

export const REGISTRY_ABI = [
  'function getPaymentRequirement(address merchant, string resource) view returns (tuple(string scheme, string network, uint256 maxAmountRequired, string resource, string description, string mimeType, address payTo, uint256 maxTimeoutSeconds, address asset, bool isActive, uint256 createdAt, uint256 updatedAt))',
  'function recordPayment(address merchant, string resource, address payer, uint256 amount, bytes32 txHash) returns (bytes32)',
  'function markPaymentSettled(bytes32 paymentId, bytes32 settlementTxHash)',
  'function getPaymentRecord(bytes32 paymentId) view returns (tuple(bytes32 requirementId, address payer, string originChain, address originAddress, bool isUEA, uint256 amount, uint256 timestamp, bytes32 txHash, bool settled))',
  'function getMerchantPayments(address merchant) view returns (bytes32[])',
  'event PaymentRecorded(bytes32 indexed paymentId, address indexed merchant, address indexed payer, uint256 amount, string originChain, address originAddress, bool isUEA)',
] as const;

export const ESCROW_ABI = [
  'function createEscrow(address payee, address asset, uint256 amount, uint256 timeoutSeconds, bytes32 paymentId, string resource) payable returns (bytes32)',
  'function releaseEscrow(bytes32 escrowId)',
  'function refundEscrow(bytes32 escrowId)',
  'function getEscrow(bytes32 escrowId) view returns (tuple(address payer, address payee, address asset, uint256 amount, uint256 createdAt, uint256 expiresAt, uint8 status, bytes32 paymentId, string resource))',
  'function getEscrowStatus(bytes32 escrowId) view returns (uint8)',
] as const;

export const TOKEN_MANAGER_ABI = [
  'function getTokenInfo(address tokenAddress) view returns (tuple(address tokenAddress, string symbol, uint8 decimals, bool isActive, uint256 addedAt, uint256 updatedAt))',
  'function isSupportedToken(address tokenAddress) view returns (bool)',
  'function getAllSupportedTokens() view returns (address[])',
  'function getActiveTokens() view returns (address[])',
] as const;

/**
 * EIP-3009: Transfer With Authorization
 * Used for gasless ERC20 transfers (USDC, etc.)
 */
export const EIP3009_ABI = [
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, bytes signature)',
  'function transferWithAuthorization(address from, address to, uint256 value, uint256 validAfter, uint256 validBefore, bytes32 nonce, uint8 v, bytes32 r, bytes32 s)',
  'function authorizationState(address authorizer, bytes32 nonce) view returns (bool)',
  'event AuthorizationUsed(address indexed authorizer, bytes32 indexed nonce)',
] as const;

/**
 * Standard ERC20 ABI for fallback transfers
 */
export const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
] as const;
