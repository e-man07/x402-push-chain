# Phase 1: Smart Contract Implementation

## Overview
Deploy core smart contracts on Push Chain to handle payment registry, escrow, and token management.

## Contract 1: X402PaymentRegistry

### Responsibilities
- Register merchants
- Store payment requirements
- Record payment transactions
- Track settlement status
- Detect origin chain via UEA Factory

### Key Functions

```solidity
// Merchant Management
function registerMerchant(address merchant) external onlyRole(DEFAULT_ADMIN_ROLE);

// Payment Requirements
function createPaymentRequirement(
    string memory resource,
    string memory scheme,
    string memory network,
    uint256 maxAmountRequired,
    string memory description,
    string memory mimeType,
    address payTo,
    uint256 maxTimeoutSeconds,
    address asset
) external onlyRole(MERCHANT_ROLE);

function getPaymentRequirement(address merchant, string memory resource)
    external view returns (PaymentRequirement memory);

// Payment Recording
function recordPayment(
    address merchant,
    string memory resource,
    address payer,
    uint256 amount,
    bytes32 txHash
) external onlyRole(FACILITATOR_ROLE) returns (bytes32);

function markPaymentSettled(bytes32 paymentId, bytes32 settlementTxHash)
    external onlyRole(FACILITATOR_ROLE);

// Query Functions
function getMerchantPayments(address merchant) external view returns (bytes32[] memory);
function getPaymentRecord(bytes32 paymentId) external view returns (PaymentRecord memory);
```

### Test Cases (TDD - Write First!)

```solidity
contract X402PaymentRegistryTest is Test {
    X402PaymentRegistry registry;
    address admin = address(1);
    address merchant = address(2);
    address facilitator = address(3);
    address unauthorized = address(4);
    
    function setUp() public {
        vm.prank(admin);
        registry = new X402PaymentRegistry();
        
        vm.startPrank(admin);
        registry.registerMerchant(merchant);
        registry.grantRole(registry.FACILITATOR_ROLE(), facilitator);
        vm.stopPrank();
    }
    
    // Merchant Registration Tests
    function test_RegisterMerchant_Success() public { }
    function test_RegisterMerchant_OnlyAdmin() public { }
    function test_RegisterMerchant_EmitsEvent() public { }
    
    // Payment Requirement Tests
    function test_CreatePaymentRequirement_Success() public { }
    function test_CreatePaymentRequirement_OnlyMerchant() public { }
    function test_CreatePaymentRequirement_InvalidAmount() public { }
    function test_CreatePaymentRequirement_InvalidAddress() public { }
    function test_CreatePaymentRequirement_EmitsEvent() public { }
    
    // Payment Recording Tests
    function test_RecordPayment_Success() public { }
    function test_RecordPayment_OnlyFacilitator() public { }
    function test_RecordPayment_DetectsOriginChain() public { }
    function test_RecordPayment_RequirementNotActive() public { }
    function test_RecordPayment_InsufficientAmount() public { }
    function test_RecordPayment_EmitsEvent() public { }
    
    // Settlement Tests
    function test_MarkPaymentSettled_Success() public { }
    function test_MarkPaymentSettled_OnlyFacilitator() public { }
    function test_MarkPaymentSettled_PaymentNotFound() public { }
    function test_MarkPaymentSettled_AlreadySettled() public { }
    function test_MarkPaymentSettled_EmitsEvent() public { }
    
    // Query Tests
    function test_GetPaymentRequirement_Success() public { }
    function test_GetMerchantPayments_Success() public { }
    function test_GetPaymentRecord_Success() public { }
}
```

### Deployment Script

```solidity
// script/DeployRegistry.s.sol
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/X402PaymentRegistry.sol";

contract DeployRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        X402PaymentRegistry registry = new X402PaymentRegistry();
        
        console.log("X402PaymentRegistry deployed at:", address(registry));
        
        vm.stopBroadcast();
    }
}
```

---

## Contract 2: X402PaymentEscrow

### Responsibilities
- Hold payments in escrow
- Release payments on confirmation
- Refund on timeout/cancellation
- Support multiple tokens (native + ERC20)

### Key Functions

```solidity
function createEscrow(
    address payee,
    address asset,
    uint256 amount,
    uint256 timeoutSeconds,
    bytes32 paymentId,
    string memory resource
) external payable returns (bytes32);

function releaseEscrow(bytes32 escrowId) external onlyRole(FACILITATOR_ROLE);

function refundEscrow(bytes32 escrowId) external;

function getEscrowStatus(bytes32 escrowId) external view returns (EscrowStatus);
```

### Test Cases

```solidity
contract X402PaymentEscrowTest is Test {
    // Setup similar to Registry
    
    // Escrow Creation Tests
    function test_CreateEscrow_WithNativeToken() public { }
    function test_CreateEscrow_WithERC20() public { }
    function test_CreateEscrow_InvalidPayee() public { }
    function test_CreateEscrow_ZeroAmount() public { }
    function test_CreateEscrow_InsufficientValue() public { }
    function test_CreateEscrow_EmitsEvent() public { }
    
    // Escrow Release Tests
    function test_ReleaseEscrow_Success() public { }
    function test_ReleaseEscrow_OnlyFacilitator() public { }
    function test_ReleaseEscrow_NotActive() public { }
    function test_ReleaseEscrow_TransfersCorrectAmount() public { }
    function test_ReleaseEscrow_EmitsEvent() public { }
    
    // Escrow Refund Tests
    function test_RefundEscrow_ByPayer() public { }
    function test_RefundEscrow_AfterTimeout() public { }
    function test_RefundEscrow_ByFacilitator() public { }
    function test_RefundEscrow_NotActive() public { }
    function test_RefundEscrow_TransfersCorrectAmount() public { }
    function test_RefundEscrow_EmitsEvent() public { }
    
    // Query Tests
    function test_GetEscrowStatus_Success() public { }
}
```

---

## Contract 3: X402TokenManager

### Responsibilities
- Manage supported payment tokens
- Store token metadata
- Provide conversion rates (oracle integration)

### Key Functions

```solidity
function addSupportedToken(
    address tokenAddress,
    string memory symbol,
    uint8 decimals,
    bool isActive
) external onlyRole(DEFAULT_ADMIN_ROLE);

function removeSupportedToken(address tokenAddress) 
    external onlyRole(DEFAULT_ADMIN_ROLE);

function getTokenInfo(address tokenAddress) 
    external view returns (TokenInfo memory);

function isSupportedToken(address tokenAddress) 
    external view returns (bool);
```

### Test Cases

```solidity
contract X402TokenManagerTest is Test {
    // Token Management Tests
    function test_AddSupportedToken_Success() public { }
    function test_AddSupportedToken_OnlyAdmin() public { }
    function test_AddSupportedToken_InvalidAddress() public { }
    function test_AddSupportedToken_EmitsEvent() public { }
    
    function test_RemoveSupportedToken_Success() public { }
    function test_RemoveSupportedToken_OnlyAdmin() public { }
    function test_RemoveSupportedToken_EmitsEvent() public { }
    
    // Query Tests
    function test_GetTokenInfo_Success() public { }
    function test_IsSupportedToken_True() public { }
    function test_IsSupportedToken_False() public { }
}
```

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review Coinbase x402 smart contract patterns
- [ ] Review Push Chain UEA Factory interface
- [ ] Set up Foundry project
- [ ] Configure foundry.toml for Push Chain
- [ ] Set up OpenZeppelin dependencies

### Contract Development (TDD)
- [ ] Write all test cases first
- [ ] Implement X402PaymentRegistry
  - [ ] Run tests (should fail)
  - [ ] Implement functions
  - [ ] Run tests (should pass)
  - [ ] Refactor and optimize
- [ ] Implement X402PaymentEscrow
  - [ ] Run tests (should fail)
  - [ ] Implement functions
  - [ ] Run tests (should pass)
  - [ ] Refactor and optimize
- [ ] Implement X402TokenManager
  - [ ] Run tests (should fail)
  - [ ] Implement functions
  - [ ] Run tests (should pass)
  - [ ] Refactor and optimize

### Testing & Optimization
- [ ] Run full test suite
- [ ] Check test coverage (aim for 100%)
- [ ] Run gas optimization
- [ ] Run security audit checklist
- [ ] Fix any issues found

### Deployment
- [ ] Deploy to local testnet (anvil)
- [ ] Test on local testnet
- [ ] Deploy to Push Chain Donut Testnet
- [ ] Verify contracts on block explorer
- [ ] Test deployed contracts
- [ ] Document contract addresses

### Post-Deployment
- [ ] Create contract interaction guide
- [ ] Set up initial merchants (for testing)
- [ ] Grant facilitator role to backend service
- [ ] Monitor contract events
- [ ] Create monitoring dashboard

---

## Commands Reference

### Setup
```bash
# Initialize Foundry project
forge init contracts
cd contracts

# Install dependencies
forge install OpenZeppelin/openzeppelin-contracts
forge install foundry-rs/forge-std

# Configure for Push Chain
cat > foundry.toml << EOL
[profile.default]
solc_version = "0.8.22"
src = "src"
out = "out"
libs = ["lib"]
remappings = ["@openzeppelin/=lib/openzeppelin-contracts/"]

[rpc_endpoints]
push_testnet = "https://evm.rpc-testnet-donut-node1.push.org/"

[etherscan]
push_testnet = { key = "blockscout", url = "https://donut.push.network/api", chain = 42101 }
EOL
```

### Testing
```bash
# Run all tests
forge test

# Run with verbosity
forge test -vvv

# Run specific test
forge test --match-test test_CreatePaymentRequirement_Success

# Run with gas report
forge test --gas-report

# Check coverage
forge coverage

# Coverage report in HTML
forge coverage --report lcov
genhtml lcov.info --output-directory coverage
open coverage/index.html
```

### Deployment
```bash
# Setup deployer wallet
cast wallet import myKeystore --interactive

# Deploy to testnet
forge script script/DeployRegistry.s.sol \
  --rpc-url push_testnet \
  --chain 42101 \
  --account myKeystore \
  --broadcast

# Verify contract
forge verify-contract \
  --chain 42101 \
  --verifier blockscout \
  CONTRACT_ADDRESS \
  src/X402PaymentRegistry.sol:X402PaymentRegistry
```

### Interaction
```bash
# Read function
cast call CONTRACT_ADDRESS \
  "getPaymentRequirement(address,string)(tuple)" \
  MERCHANT_ADDRESS \
  "/api/premium" \
  --rpc-url push_testnet

# Write function (as merchant)
cast send CONTRACT_ADDRESS \
  "createPaymentRequirement(string,string,string,uint256,string,string,address,uint256,address)" \
  "/api/premium" \
  "exact" \
  "base-sepolia" \
  1000000 \
  "Premium API access" \
  "application/json" \
  MERCHANT_ADDRESS \
  60 \
  USDC_ADDRESS \
  --rpc-url push_testnet \
  --account myKeystore
```

---

## Expected Outcomes

By end of Phase 1:
- ✅ 3 smart contracts deployed and verified
- ✅ 100% test coverage achieved
- ✅ Gas optimizations completed
- ✅ Security checklist passed
- ✅ Contracts documented
- ✅ Deployment guide created
- ✅ Ready for Phase 2 integration
