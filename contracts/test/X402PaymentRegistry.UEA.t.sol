// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/X402PaymentRegistry.sol";

/**
 * @title X402PaymentRegistry UEA Integration Tests
 * @notice Tests for UEA Factory integration and cross-chain origin detection
 */
contract X402PaymentRegistryUEATest is Test {
    X402PaymentRegistry public registry;
    
    address public admin = address(1);
    address public merchant = address(2);
    address public facilitator = address(3);
    
    // Mock UEA addresses
    address public ethUEA = address(0x1000);
    address public solUEA = address(0x2000);
    address public nativePushEOA = address(0x3000);
    
    function setUp() public {
        vm.startPrank(admin);
        
        // Deploy registry
        registry = new X402PaymentRegistry();
        
        // Setup roles
        registry.registerMerchant(merchant);
        registry.grantRole(registry.FACILITATOR_ROLE(), facilitator);
        
        vm.stopPrank();
        
        // Create payment requirement
        vm.startPrank(merchant);
        registry.createPaymentRequirement(
            "/api/premium",
            "exact",
            "base-sepolia",
            1000000,
            "Premium API Access",
            "application/json",
            merchant,
            3600,
            address(0x4)
        );
        vm.stopPrank();
    }
    
    /**
     * @notice Test recording payment from Ethereum UEA
     */
    function testRecordPaymentFromEthereumUEA() public {
        // Mock UEA Factory response for Ethereum Sepolia
        vm.mockCall(
            address(0x00000000000000000000000000000000000000eA),
            abi.encodeWithSelector(
                IUEAFactory.getOriginForUEA.selector,
                ethUEA
            ),
            abi.encode(
                IUEAFactory.UniversalAccountId({
                    chainNamespace: "eip155",
                    chainId: "11155111",
                    owner: abi.encodePacked(address(0xABCD))
                }),
                true // isUEA = true
            )
        );
        
        // Record payment
        vm.prank(facilitator);
        bytes32 paymentId = registry.recordPayment(
            merchant,
            "/api/premium",
            ethUEA,
            1000000,
            bytes32(uint256(1))
        );
        
        // Verify payment record
        X402PaymentRegistry.PaymentRecord memory record = registry.getPaymentRecord(paymentId);
        
        assertEq(record.payer, ethUEA, "Payer should be UEA address");
        assertEq(record.originChain, "eip155:11155111", "Origin chain should be Ethereum Sepolia");
        assertEq(record.originAddress, address(0xABCD), "Origin address should match");
        assertTrue(record.isUEA, "Should be marked as UEA");
        assertEq(record.amount, 1000000, "Amount should match");
        assertFalse(record.settled, "Should not be settled yet");
    }
    
    /**
     * @notice Test recording payment from Solana UEA
     */
    function testRecordPaymentFromSolanaUEA() public {
        // Mock UEA Factory response for Solana
        vm.mockCall(
            address(0x00000000000000000000000000000000000000eA),
            abi.encodeWithSelector(
                IUEAFactory.getOriginForUEA.selector,
                solUEA
            ),
            abi.encode(
                IUEAFactory.UniversalAccountId({
                    chainNamespace: "solana",
                    chainId: "EtWTRABZaYq6iMfeYKouRu166VU2xqa1",
                    owner: abi.encodePacked(address(0x5678))
                }),
                true // isUEA = true
            )
        );
        
        // Record payment
        vm.prank(facilitator);
        bytes32 paymentId = registry.recordPayment(
            merchant,
            "/api/premium",
            solUEA,
            1000000,
            bytes32(uint256(2))
        );
        
        // Verify payment record
        X402PaymentRegistry.PaymentRecord memory record = registry.getPaymentRecord(paymentId);
        
        assertEq(record.payer, solUEA, "Payer should be UEA address");
        assertEq(record.originChain, "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1", "Origin chain should be Solana");
        assertEq(record.originAddress, address(0x5678), "Origin address should match");
        assertTrue(record.isUEA, "Should be marked as UEA");
    }
    
    /**
     * @notice Test recording payment from native Push Chain EOA
     */
    function testRecordPaymentFromNativePushChain() public {
        // Mock UEA Factory response for native Push Chain EOA
        vm.mockCall(
            address(0x00000000000000000000000000000000000000eA),
            abi.encodeWithSelector(
                IUEAFactory.getOriginForUEA.selector,
                nativePushEOA
            ),
            abi.encode(
                IUEAFactory.UniversalAccountId({
                    chainNamespace: "",
                    chainId: "",
                    owner: ""
                }),
                false // isUEA = false
            )
        );
        
        // Record payment
        vm.prank(facilitator);
        bytes32 paymentId = registry.recordPayment(
            merchant,
            "/api/premium",
            nativePushEOA,
            1000000,
            bytes32(uint256(3))
        );
        
        // Verify payment record
        X402PaymentRegistry.PaymentRecord memory record = registry.getPaymentRecord(paymentId);
        
        assertEq(record.payer, nativePushEOA, "Payer should be native EOA");
        assertEq(record.originChain, "push-chain", "Origin chain should be push-chain");
        assertEq(record.originAddress, nativePushEOA, "Origin address should be same as payer");
        assertFalse(record.isUEA, "Should not be marked as UEA");
    }
    
    /**
     * @notice Test event emission with UEA data
     */
    function testPaymentRecordedEventWithUEA() public {
        // Mock UEA Factory
        vm.mockCall(
            address(0x00000000000000000000000000000000000000eA),
            abi.encodeWithSelector(
                IUEAFactory.getOriginForUEA.selector,
                ethUEA
            ),
            abi.encode(
                IUEAFactory.UniversalAccountId({
                    chainNamespace: "eip155",
                    chainId: "1",
                    owner: abi.encodePacked(address(0xDEAD))
                }),
                true
            )
        );
        
        // Expect event (check indexed params only, skip paymentId)
        vm.expectEmit(false, true, true, false);
        emit X402PaymentRegistry.PaymentRecorded(
            bytes32(0), // paymentId - will be different, so we skip checking it
            merchant,
            ethUEA,
            1000000,
            "eip155:1",
            address(0xDEAD),
            true
        );
        
        // Record payment
        vm.prank(facilitator);
        bytes32 paymentId = registry.recordPayment(
            merchant,
            "/api/premium",
            ethUEA,
            1000000,
            bytes32(uint256(4))
        );
        
        // Verify the payment was recorded with correct data
        X402PaymentRegistry.PaymentRecord memory record = registry.getPaymentRecord(paymentId);
        assertEq(record.originChain, "eip155:1", "Origin chain should match");
        assertEq(record.originAddress, address(0xDEAD), "Origin address should match");
        assertTrue(record.isUEA, "Should be UEA");
    }
    
    /**
     * @notice Test multiple payments from different chains
     */
    function testMultiplePaymentsFromDifferentChains() public {
        // Setup mocks for different chains
        vm.mockCall(
            address(0x00000000000000000000000000000000000000eA),
            abi.encodeWithSelector(IUEAFactory.getOriginForUEA.selector, ethUEA),
            abi.encode(
                IUEAFactory.UniversalAccountId("eip155", "1", abi.encodePacked(address(0x1111))),
                true
            )
        );
        
        vm.mockCall(
            address(0x00000000000000000000000000000000000000eA),
            abi.encodeWithSelector(IUEAFactory.getOriginForUEA.selector, solUEA),
            abi.encode(
                IUEAFactory.UniversalAccountId("solana", "mainnet", abi.encodePacked(address(0x2222))),
                true
            )
        );
        
        vm.mockCall(
            address(0x00000000000000000000000000000000000000eA),
            abi.encodeWithSelector(IUEAFactory.getOriginForUEA.selector, nativePushEOA),
            abi.encode(
                IUEAFactory.UniversalAccountId("", "", ""),
                false
            )
        );
        
        // Record payments
        vm.startPrank(facilitator);
        
        bytes32 ethPaymentId = registry.recordPayment(
            merchant, "/api/premium", ethUEA, 1000000, bytes32(uint256(5))
        );
        
        bytes32 solPaymentId = registry.recordPayment(
            merchant, "/api/premium", solUEA, 1000000, bytes32(uint256(6))
        );
        
        bytes32 pushPaymentId = registry.recordPayment(
            merchant, "/api/premium", nativePushEOA, 1000000, bytes32(uint256(7))
        );
        
        vm.stopPrank();
        
        // Verify all payments
        bytes32[] memory merchantPayments = registry.getMerchantPayments(merchant);
        assertEq(merchantPayments.length, 3, "Should have 3 payments");
        
        // Verify each payment has correct origin
        X402PaymentRegistry.PaymentRecord memory ethRecord = registry.getPaymentRecord(ethPaymentId);
        assertEq(ethRecord.originChain, "eip155:1");
        
        X402PaymentRegistry.PaymentRecord memory solRecord = registry.getPaymentRecord(solPaymentId);
        assertEq(solRecord.originChain, "solana:mainnet");
        
        X402PaymentRegistry.PaymentRecord memory pushRecord = registry.getPaymentRecord(pushPaymentId);
        assertEq(pushRecord.originChain, "push-chain");
    }
}
