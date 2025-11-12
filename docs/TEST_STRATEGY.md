# Test Strategy - x402 Protocol on Push Chain

## Test-Driven Development (TDD) Approach

We follow a strict TDD methodology:
1. **Write tests first** - Define expected behavior
2. **Run tests** - Confirm they fail (red)
3. **Write minimal code** - Make tests pass (green)
4. **Refactor** - Improve code while keeping tests green
5. **Repeat** - For each new feature

## Test Pyramid

```
           /\
          /  \
         / E2E\       ← Few, slow, expensive
        /______\
       /        \
      /Integration\   ← Some, medium speed
     /____________\
    /              \
   /  Unit Tests    \  ← Many, fast, cheap
  /__________________\
```

## Testing Layers

### 1. Unit Tests (70% coverage target)

#### Smart Contract Unit Tests (Foundry)

**Location**: `contracts/test/`

**Test Files**:
```
contracts/test/
├── X402PaymentRegistry.t.sol
├── X402PaymentEscrow.t.sol
├── X402TokenManager.t.sol
└── helpers/
    └── TestHelpers.sol
```

**Example Test Structure**:
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/X402PaymentRegistry.sol";

contract X402PaymentRegistryTest is Test {
    X402PaymentRegistry public registry;
    address public merchant;
    address public facilitator;
    
    function setUp() public {
        registry = new X402PaymentRegistry();
        merchant = makeAddr("merchant");
        facilitator = makeAddr("facilitator");
        
        // Setup roles
        registry.registerMerchant(merchant);
        registry.grantRole(registry.FACILITATOR_ROLE(), facilitator);
    }
    
    function testRegisterMerchant() public {
        address newMerchant = makeAddr("newMerchant");
        registry.registerMerchant(newMerchant);
        assertTrue(registry.hasRole(registry.MERCHANT_ROLE(), newMerchant));
    }
    
    function testCreatePaymentRequirement() public {
        vm.startPrank(merchant);
        
        registry.createPaymentRequirement(
            "/api/premium",
            "exact",
            "base-sepolia",
            1000000, // 1 USDC
            "Premium API access",
            "application/json",
            merchant,
            60,
            address(0xUSDC) // USDC address
        );
        
        vm.stopPrank();
        
        X402PaymentRegistry.PaymentRequirement memory req = 
            registry.getPaymentRequirement(merchant, "/api/premium");
        
        assertEq(req.maxAmountRequired, 1000000);
        assertEq(req.payTo, merchant);
        assertTrue(req.isActive);
    }
    
    function testFailUnauthorizedCreatePaymentRequirement() public {
        address unauthorized = makeAddr("unauthorized");
        vm.prank(unauthorized);
        
        registry.createPaymentRequirement(
            "/api/premium",
            "exact",
            "base-sepolia",
            1000000,
            "Premium API access",
            "application/json",
            merchant,
            60,
            address(0xUSDC)
        );
    }
    
    function testRecordPayment() public {
        // Setup payment requirement first
        vm.prank(merchant);
        registry.createPaymentRequirement(
            "/api/premium",
            "exact",
            "base-sepolia",
            1000000,
            "Premium API access",
            "application/json",
            merchant,
            60,
            address(0xUSDC)
        );
        
        // Record payment as facilitator
        vm.prank(facilitator);
        bytes32 paymentId = registry.recordPayment(
            merchant,
            "/api/premium",
            address(0x123),
            1000000,
            bytes32(uint256(0x456))
        );
        
        X402PaymentRegistry.PaymentRecord memory record = 
            registry.paymentRecords(paymentId);
        
        assertEq(record.amount, 1000000);
        assertEq(record.payer, address(0x123));
        assertFalse(record.settled);
    }
}
```

**Test Coverage Goals**:
- ✅ All public functions tested
- ✅ All access control rules validated
- ✅ Edge cases covered (zero amounts, invalid addresses)
- ✅ Event emissions verified
- ✅ Revert conditions tested

**Running Contract Tests**:
```bash
cd contracts
forge test                           # Run all tests
forge test -vvv                      # Verbose output
forge test --match-test testRecordPayment  # Run specific test
forge coverage                       # Coverage report
forge test --gas-report             # Gas usage report
```

---

#### SDK Unit Tests (Jest + TypeScript)

**Location**: `sdk/test/unit/`

**Test Files**:
```
sdk/test/unit/
├── client/
│   ├── X402Client.test.ts
│   ├── PaymentHandler.test.ts
│   └── WalletConnector.test.ts
└── server/
    ├── X402Server.test.ts
    ├── PaymentVerifier.test.ts
    └── Middleware.test.ts
```

**Example Test**:
```typescript
// sdk/test/unit/client/X402Client.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { X402Client } from '../../../src/client/X402Client';
import { mockFetch, mockSigner } from '../../helpers';

describe('X402Client', () => {
  let client: X402Client;
  let fetchMock: ReturnType<typeof vi.fn>;
  
  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    client = new X402Client({
      signer: mockSigner(),
      facilitatorUrl: 'https://facilitator.test'
    });
  });
  
  describe('makeRequest', () => {
    it('should handle 402 response and retry with payment', async () => {
      // First call returns 402
      fetchMock.mockResolvedValueOnce({
        status: 402,
        json: async () => ({
          x402Version: 1,
          error: 'Payment required',
          accepts: [{
            scheme: 'exact',
            network: 'base-sepolia',
            maxAmountRequired: '1000000',
            resource: '/premium',
            payTo: '0x123',
            asset: '0xUSDC',
            maxTimeoutSeconds: 60
          }]
        })
      });
      
      // Second call with payment succeeds
      fetchMock.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ content: 'Premium data' })
      });
      
      const response = await client.makeRequest('https://api.test/premium');
      
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-PAYMENT': expect.any(String)
          })
        })
      );
    });
    
    it('should pass through non-402 responses', async () => {
      fetchMock.mockResolvedValueOnce({
        status: 200,
        json: async () => ({ data: 'Public data' })
      });
      
      const response = await client.makeRequest('https://api.test/public');
      
      expect(response.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
    
    it('should select best payment option based on network', async () => {
      const multipleAccepts = {
        x402Version: 1,
        error: 'Payment required',
        accepts: [
          {
            scheme: 'exact',
            network: 'ethereum-sepolia',
            maxAmountRequired: '2000000',
            asset: '0xUSDC1'
          },
          {
            scheme: 'exact',
            network: 'base-sepolia',
            maxAmountRequired: '1000000',
            asset: '0xUSDC2'
          }
        ]
      };
      
      fetchMock.mockResolvedValueOnce({
        status: 402,
        json: async () => multipleAccepts
      });
      
      const selected = client['selectPaymentRequirement'](multipleAccepts.accepts);
      
      // Should prefer lower amount
      expect(selected.maxAmountRequired).toBe('1000000');
    });
  });
  
  describe('createPaymentHeader', () => {
    it('should create valid base64-encoded payment header', async () => {
      const requirements = {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: '1000000',
        payTo: '0x123',
        asset: '0xUSDC',
        maxTimeoutSeconds: 60
      };
      
      const header = await client['createPaymentHeader'](1, requirements);
      
      expect(header).toBeTruthy();
      expect(() => Buffer.from(header, 'base64')).not.toThrow();
      
      const decoded = JSON.parse(Buffer.from(header, 'base64').toString());
      expect(decoded.x402Version).toBe(1);
      expect(decoded.scheme).toBe('exact');
      expect(decoded.payload).toHaveProperty('signature');
      expect(decoded.payload).toHaveProperty('authorization');
    });
    
    it('should include correct authorization fields', async () => {
      const requirements = {
        scheme: 'exact',
        network: 'base-sepolia',
        maxAmountRequired: '1000000',
        payTo: '0x123',
        asset: '0xUSDC',
        maxTimeoutSeconds: 60
      };
      
      const header = await client['createPaymentHeader'](1, requirements);
      const decoded = JSON.parse(Buffer.from(header, 'base64').toString());
      const auth = decoded.payload.authorization;
      
      expect(auth).toHaveProperty('from');
      expect(auth).toHaveProperty('to');
      expect(auth).toHaveProperty('value');
      expect(auth).toHaveProperty('validAfter');
      expect(auth).toHaveProperty('validBefore');
      expect(auth).toHaveProperty('nonce');
      expect(auth.value).toBe('1000000');
      expect(auth.to).toBe('0x123');
    });
  });
});
```

**Running SDK Tests**:
```bash
cd sdk
npm test                    # Run all tests
npm test -- --coverage      # With coverage
npm test -- --watch         # Watch mode
npm test -- X402Client      # Specific test file
```

---

### 2. Integration Tests (20% coverage target)

**Purpose**: Test interaction between multiple components

**Location**: `tests/integration/`

**Test Scenarios**:

```typescript
// tests/integration/payment-flow.test.ts
describe('Complete Payment Flow Integration', () => {
  let registry: Contract;
  let escrow: Contract;
  let facilitatorAPI: Server;
  let testServer: Server;
  
  beforeAll(async () => {
    // Deploy contracts
    registry = await deployContract('X402PaymentRegistry');
    escrow = await deployContract('X402PaymentEscrow');
    
    // Start facilitator service
    facilitatorAPI = await startFacilitatorService();
    
    // Start test merchant server
    testServer = await startTestServer();
  });
  
  it('should complete end-to-end payment from Ethereum user', async () => {
    // 1. Client makes request
    const response1 = await fetch('http://localhost:3000/premium');
    expect(response1.status).toBe(402);
    
    // 2. Parse payment requirements
    const paymentData = await response1.json();
    
    // 3. Create and sign payment
    const signer = await getEthereumSigner();
    const payment = await createPaymentAuthorization(paymentData.accepts[0], signer);
    
    // 4. Retry with payment
    const response2 = await fetch('http://localhost:3000/premium', {
      headers: { 'X-PAYMENT': payment }
    });
    
    expect(response2.status).toBe(200);
    
    // 5. Verify payment recorded on-chain
    const merchantPayments = await registry.getMerchantPayments(MERCHANT_ADDRESS);
    expect(merchantPayments.length).toBeGreaterThan(0);
    
    // 6. Verify settlement occurred
    const paymentRecord = await registry.paymentRecords(merchantPayments[0]);
    expect(paymentRecord.settled).toBe(true);
  });
  
  it('should handle payment from Solana user via UEA', async () => {
    // Similar flow but with Solana signer
    const signer = await getSolanaSigner();
    // ... rest of test
  });
  
  it('should handle escrow creation and release', async () => {
    // Test escrow lifecycle
  });
});
```

**Running Integration Tests**:
```bash
npm run test:integration
```

---

### 3. End-to-End Tests (10% coverage target)

**Purpose**: Test complete user journeys in a production-like environment

**Location**: `tests/e2e/`

**Tools**: Playwright or Cypress

**Test Scenarios**:

```typescript
// tests/e2e/payment-journey.spec.ts
import { test, expect } from '@playwright/test';

test.describe('x402 Payment Journey', () => {
  test('User can make payment with MetaMask', async ({ page, context }) => {
    // Connect MetaMask extension
    await setupMetaMask(context);
    
    // Navigate to demo app
    await page.goto('http://localhost:3000');
    
    // Click on premium content
    await page.click('[data-testid="premium-content-btn"]');
    
    // Should show payment prompt
    await expect(page.locator('[data-testid="payment-modal"]')).toBeVisible();
    
    // Shows correct amount
    await expect(page.locator('[data-testid="payment-amount"]')).toHaveText('1.00 USDC');
    
    // Click approve
    await page.click('[data-testid="approve-payment-btn"]');
    
    // Wait for MetaMask signature prompt
    await signWithMetaMask(context);
    
    // Wait for payment processing
    await page.waitForSelector('[data-testid="payment-success"]', { timeout: 30000 });
    
    // Should display premium content
    await expect(page.locator('[data-testid="premium-content"]')).toBeVisible();
  });
  
  test('User can make payment with Phantom wallet', async ({ page, context }) => {
    // Similar flow for Solana
  });
  
  test('Payment expires after timeout', async ({ page }) => {
    // Test timeout handling
  });
});
```

**Running E2E Tests**:
```bash
npm run test:e2e
npm run test:e2e -- --headed  # With browser UI
npm run test:e2e -- --debug   # Debug mode
```

---

## Test Data Management

### Mock Data

```typescript
// tests/helpers/mockData.ts
export const MOCK_PAYMENT_REQUIREMENT = {
  scheme: 'exact',
  network: 'base-sepolia',
  maxAmountRequired: '1000000',
  resource: '/api/premium',
  description: 'Premium API access',
  mimeType: 'application/json',
  payTo: '0x742d35Cc64C3E3b24a3A4c1537e2b68b5e04e7A2',
  maxTimeoutSeconds: 60,
  asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
};

export const MOCK_AUTHORIZATION = {
  from: '0x1234567890123456789012345678901234567890',
  to: '0x742d35Cc64C3E3b24a3A4c1537e2b68b5e04e7A2',
  value: '1000000',
  validAfter: '1700000000',
  validBefore: '1700000060',
  nonce: '0x1234567890abcdef'
};
```

### Test Fixtures

```typescript
// tests/fixtures/contracts.ts
export async function deployTestContracts() {
  const registry = await ethers.deployContract('X402PaymentRegistry');
  await registry.waitForDeployment();
  
  const escrow = await ethers.deployContract('X402PaymentEscrow');
  await escrow.waitForDeployment();
  
  return { registry, escrow };
}
```

---

## Performance Testing

### Load Testing (k6)

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },  // Ramp up
    { duration: '3m', target: 50 },  // Stay at 50 users
    { duration: '1m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],   // < 1% failure rate
  },
};

export default function () {
  // Test payment verification endpoint
  const response = http.post('http://localhost:3001/api/v1/verify', JSON.stringify({
    x402Version: 1,
    paymentHeader: 'base64encodedpayload',
    paymentRequirements: {}
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

**Running Load Tests**:
```bash
k6 run tests/performance/load-test.js
```

---

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  contract-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Foundry
        uses: foundry-rs/foundry-toolchain@v1
      - name: Run contract tests
        run: |
          cd contracts
          forge test
          forge coverage
      
  sdk-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run SDK tests
        run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
  
  integration-tests:
    runs-on: ubuntu-latest
    needs: [contract-tests, sdk-tests]
    steps:
      - uses: actions/checkout@v3
      - name: Start services
        run: docker-compose up -d
      - name: Run integration tests
        run: npm run test:integration
  
  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    steps:
      - uses: actions/checkout@v3
      - name: Install Playwright
        run: npx playwright install --with-deps
      - name: Run E2E tests
        run: npm run test:e2e
```

---

## Coverage Goals

| Test Type | Coverage Target | Current |
|-----------|----------------|---------|
| Smart Contracts | 100% | TBD |
| SDK (Client) | 90% | TBD |
| SDK (Server) | 90% | TBD |
| Facilitator | 85% | TBD |
| Integration | N/A | TBD |
| E2E | N/A | TBD |

---

## Test Documentation

Each test should include:
1. **Description**: What is being tested
2. **Setup**: Prerequisites and test data
3. **Steps**: Clear test steps
4. **Assertions**: What should be true
5. **Cleanup**: Any cleanup needed

**Example**:
```typescript
/**
 * Test: Payment requirement creation with valid parameters
 * 
 * Setup:
 * - Deploy X402PaymentRegistry contract
 * - Register merchant account
 * 
 * Steps:
 * 1. Merchant calls createPaymentRequirement with valid params
 * 2. Retrieve payment requirement from registry
 * 
 * Assertions:
 * - Payment requirement is stored correctly
 * - All fields match input parameters
 * - isActive is true
 * - Events are emitted
 * 
 * Cleanup: None required
 */
test('createPaymentRequirement with valid parameters', async () => {
  // ... test implementation
});
```

---

## Running All Tests

```bash
# Run everything
npm run test:all

# This runs:
# 1. Solidity tests (Foundry)
# 2. SDK unit tests (Jest/Vitest)
# 3. Integration tests
# 4. E2E tests
# 5. Load tests (optional)
# 6. Generate coverage reports
```
