// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/X402PaymentRegistry.sol";
import "./mocks/MockUEAFactory.sol";

/**
 * @title X402PaymentRegistryTest
 * @notice Test suite for X402PaymentRegistry contract
 * @dev Following TDD approach - tests written before implementation
 */
contract X402PaymentRegistryTest is Test {
    X402PaymentRegistry public registry;
    MockUEAFactory public mockUEAFactory;
    
    address public admin;
    address public merchant;
    address public facilitator;
    address public unauthorized;
    address public payer;
    
    // Test constants
    address constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    string constant TEST_RESOURCE = "/api/premium";
    uint256 constant TEST_AMOUNT = 1000000; // 1 USDC (6 decimals)
    
    event MerchantRegistered(address indexed merchant, uint256 timestamp);
    event PaymentRequirementCreated(
        address indexed merchant,
        string resource,
        uint256 amount,
        address asset
    );
    event PaymentRecorded(
        bytes32 indexed paymentId,
        address indexed merchant,
        address indexed payer,
        uint256 amount,
        string originChain
    );
    event PaymentSettled(bytes32 indexed paymentId, bytes32 settlementTxHash);
    
    function setUp() public {
        admin = address(this);
        merchant = makeAddr("merchant");
        facilitator = makeAddr("facilitator");
        unauthorized = makeAddr("unauthorized");
        payer = makeAddr("payer");
        
        // Deploy mock UEA Factory at the expected address
        mockUEAFactory = new MockUEAFactory();
        vm.etch(address(0x00000000000000000000000000000000000000eA), address(mockUEAFactory).code);
        
        // Deploy registry
        registry = new X402PaymentRegistry();
        
        // Setup roles
        registry.registerMerchant(merchant);
        registry.grantRole(registry.FACILITATOR_ROLE(), facilitator);
        
        // Setup default origin for payer (simulating Ethereum Sepolia)
        MockUEAFactory(address(0x00000000000000000000000000000000000000eA)).setOrigin(
            payer,
            "eip155",
            "11155111",
            abi.encodePacked(payer),
            true
        );
    }
    
    // ============================================
    // Merchant Registration Tests
    // ============================================
    
    function test_RegisterMerchant_Success() public {
        address newMerchant = makeAddr("newMerchant");
        
        vm.expectEmit(true, false, false, true);
        emit MerchantRegistered(newMerchant, block.timestamp);
        
        registry.registerMerchant(newMerchant);
        
        assertTrue(registry.hasRole(registry.MERCHANT_ROLE(), newMerchant));
    }
    
    function test_RegisterMerchant_OnlyAdmin() public {
        address newMerchant = makeAddr("newMerchant");
        
        vm.prank(unauthorized);
        vm.expectRevert();
        registry.registerMerchant(newMerchant);
    }
    
    // ============================================
    // Payment Requirement Tests
    // ============================================
    
    function test_CreatePaymentRequirement_Success() public {
        vm.startPrank(merchant);
        
        vm.expectEmit(true, false, false, true);
        emit PaymentRequirementCreated(merchant, TEST_RESOURCE, TEST_AMOUNT, USDC_ADDRESS);
        
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        vm.stopPrank();
        
        X402PaymentRegistry.PaymentRequirement memory req = 
            registry.getPaymentRequirement(merchant, TEST_RESOURCE);
        
        assertEq(req.maxAmountRequired, TEST_AMOUNT);
        assertEq(req.payTo, merchant);
        assertEq(req.asset, USDC_ADDRESS);
        assertTrue(req.isActive);
        assertEq(req.scheme, "exact");
        assertEq(req.network, "base-sepolia");
    }
    
    function test_CreatePaymentRequirement_OnlyMerchant() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
    }
    
    function test_CreatePaymentRequirement_InvalidAmount() public {
        vm.prank(merchant);
        vm.expectRevert("Amount must be greater than 0");
        
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            0, // Invalid amount
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
    }
    
    function test_CreatePaymentRequirement_InvalidPayTo() public {
        vm.prank(merchant);
        vm.expectRevert("Invalid payTo address");
        
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            address(0), // Invalid address
            60,
            USDC_ADDRESS
        );
    }
    
    function test_CreatePaymentRequirement_EmptyResource() public {
        vm.prank(merchant);
        vm.expectRevert("Resource cannot be empty");
        
        registry.createPaymentRequirement(
            "", // Empty resource
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
    }
    
    // ============================================
    // Payment Recording Tests
    // ============================================
    
    function test_RecordPayment_Success() public {
        // Setup payment requirement first
        vm.prank(merchant);
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        // Record payment as facilitator
        bytes32 txHash = bytes32(uint256(0x123));
        
        vm.prank(facilitator);
        bytes32 paymentId = registry.recordPayment(
            merchant,
            TEST_RESOURCE,
            payer,
            TEST_AMOUNT,
            txHash
        );
        
        // Verify payment record
        X402PaymentRegistry.PaymentRecord memory record = 
            registry.getPaymentRecord(paymentId);
        
        assertEq(record.amount, TEST_AMOUNT);
        assertEq(record.payer, payer);
        assertEq(record.txHash, txHash);
        assertFalse(record.settled);
        assertTrue(bytes(record.originChain).length > 0);
    }
    
    function test_RecordPayment_OnlyFacilitator() public {
        vm.prank(merchant);
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        vm.prank(unauthorized);
        vm.expectRevert();
        
        registry.recordPayment(
            merchant,
            TEST_RESOURCE,
            payer,
            TEST_AMOUNT,
            bytes32(uint256(0x123))
        );
    }
    
    function test_RecordPayment_RequirementNotActive() public {
        vm.prank(facilitator);
        vm.expectRevert("Payment requirement not active");
        
        registry.recordPayment(
            merchant,
            "/nonexistent",
            payer,
            TEST_AMOUNT,
            bytes32(uint256(0x123))
        );
    }
    
    function test_RecordPayment_InsufficientAmount() public {
        vm.prank(merchant);
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        vm.prank(facilitator);
        vm.expectRevert("Insufficient payment amount");
        
        registry.recordPayment(
            merchant,
            TEST_RESOURCE,
            payer,
            TEST_AMOUNT - 1, // Insufficient
            bytes32(uint256(0x123))
        );
    }
    
    function test_RecordPayment_EmitsEvent() public {
        vm.prank(merchant);
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        vm.prank(facilitator);
        // Check that event is emitted with correct indexed parameters
        // We can't predict the exact paymentId, so we check other fields
        vm.expectEmit(false, true, true, false);
        emit PaymentRecorded(bytes32(0), merchant, payer, TEST_AMOUNT, "");
        
        registry.recordPayment(
            merchant,
            TEST_RESOURCE,
            payer,
            TEST_AMOUNT,
            bytes32(uint256(0x123))
        );
    }
    
    // ============================================
    // Payment Settlement Tests
    // ============================================
    
    function test_MarkPaymentSettled_Success() public {
        // Setup and record payment
        vm.prank(merchant);
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        vm.prank(facilitator);
        bytes32 paymentId = registry.recordPayment(
            merchant,
            TEST_RESOURCE,
            payer,
            TEST_AMOUNT,
            bytes32(uint256(0x123))
        );
        
        // Mark as settled
        bytes32 settlementTxHash = bytes32(uint256(0x456));
        
        vm.prank(facilitator);
        vm.expectEmit(true, false, false, true);
        emit PaymentSettled(paymentId, settlementTxHash);
        
        registry.markPaymentSettled(paymentId, settlementTxHash);
        
        // Verify settled
        X402PaymentRegistry.PaymentRecord memory record = 
            registry.getPaymentRecord(paymentId);
        assertTrue(record.settled);
    }
    
    function test_MarkPaymentSettled_OnlyFacilitator() public {
        vm.prank(merchant);
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        vm.prank(facilitator);
        bytes32 paymentId = registry.recordPayment(
            merchant,
            TEST_RESOURCE,
            payer,
            TEST_AMOUNT,
            bytes32(uint256(0x123))
        );
        
        vm.prank(unauthorized);
        vm.expectRevert();
        
        registry.markPaymentSettled(paymentId, bytes32(uint256(0x456)));
    }
    
    function test_MarkPaymentSettled_PaymentNotFound() public {
        bytes32 nonexistentId = bytes32(uint256(0x999));
        
        vm.prank(facilitator);
        vm.expectRevert("Payment not found");
        
        registry.markPaymentSettled(nonexistentId, bytes32(uint256(0x456)));
    }
    
    function test_MarkPaymentSettled_AlreadySettled() public {
        vm.prank(merchant);
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        vm.prank(facilitator);
        bytes32 paymentId = registry.recordPayment(
            merchant,
            TEST_RESOURCE,
            payer,
            TEST_AMOUNT,
            bytes32(uint256(0x123))
        );
        
        vm.prank(facilitator);
        registry.markPaymentSettled(paymentId, bytes32(uint256(0x456)));
        
        // Try to settle again
        vm.prank(facilitator);
        vm.expectRevert("Payment already settled");
        
        registry.markPaymentSettled(paymentId, bytes32(uint256(0x789)));
    }
    
    // ============================================
    // Query Function Tests
    // ============================================
    
    function test_GetPaymentRequirement_Success() public {
        vm.prank(merchant);
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        X402PaymentRegistry.PaymentRequirement memory req = 
            registry.getPaymentRequirement(merchant, TEST_RESOURCE);
        
        assertEq(req.maxAmountRequired, TEST_AMOUNT);
        assertTrue(req.isActive);
    }
    
    function test_GetMerchantPayments_Success() public {
        vm.prank(merchant);
        registry.createPaymentRequirement(
            TEST_RESOURCE,
            "exact",
            "base-sepolia",
            TEST_AMOUNT,
            "Premium API access",
            "application/json",
            merchant,
            60,
            USDC_ADDRESS
        );
        
        // Record multiple payments
        vm.startPrank(facilitator);
        registry.recordPayment(merchant, TEST_RESOURCE, payer, TEST_AMOUNT, bytes32(uint256(0x1)));
        registry.recordPayment(merchant, TEST_RESOURCE, payer, TEST_AMOUNT, bytes32(uint256(0x2)));
        registry.recordPayment(merchant, TEST_RESOURCE, payer, TEST_AMOUNT, bytes32(uint256(0x3)));
        vm.stopPrank();
        
        bytes32[] memory payments = registry.getMerchantPayments(merchant);
        
        assertEq(payments.length, 3);
    }
    
    function test_GetMerchantPayments_EmptyForNewMerchant() public {
        address newMerchant = makeAddr("newMerchant");
        registry.registerMerchant(newMerchant);
        
        bytes32[] memory payments = registry.getMerchantPayments(newMerchant);
        
        assertEq(payments.length, 0);
    }
}
