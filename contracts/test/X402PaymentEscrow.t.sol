// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/X402PaymentEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockERC20
 * @notice Mock ERC20 token for testing
 */
contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {
        _mint(msg.sender, 1000000 * 10**6); // 1M USDC
    }
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
    
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

/**
 * @title X402PaymentEscrowTest
 * @notice Test suite for X402PaymentEscrow contract
 * @dev Following TDD approach - tests written before implementation
 */
contract X402PaymentEscrowTest is Test {
    X402PaymentEscrow public escrow;
    MockERC20 public usdc;
    
    address public admin;
    address public facilitator;
    address public payer;
    address public payee;
    address public unauthorized;
    
    // Test constants
    uint256 constant TEST_AMOUNT = 1000000; // 1 USDC
    uint256 constant TIMEOUT = 3600; // 1 hour
    
    event EscrowCreated(
        bytes32 indexed escrowId,
        address indexed payer,
        address indexed payee,
        uint256 amount,
        address asset
    );
    event EscrowReleased(bytes32 indexed escrowId, address indexed payee);
    event EscrowRefunded(bytes32 indexed escrowId, address indexed payer);
    event EscrowDisputed(bytes32 indexed escrowId);
    
    function setUp() public {
        admin = address(this);
        facilitator = makeAddr("facilitator");
        payer = makeAddr("payer");
        payee = makeAddr("payee");
        unauthorized = makeAddr("unauthorized");
        
        // Deploy contracts
        escrow = new X402PaymentEscrow();
        usdc = new MockERC20();
        
        // Setup roles
        escrow.grantRole(escrow.FACILITATOR_ROLE(), facilitator);
        
        // Fund payer with ETH and USDC
        vm.deal(payer, 10 ether);
        usdc.mint(payer, 10 * TEST_AMOUNT);
    }
    
    // ============================================
    // Escrow Creation Tests - Native Token
    // ============================================
    
    function test_CreateEscrow_WithNativeToken_Success() public {
        vm.startPrank(payer);
        
        // Check event emission (can't predict escrowId, so skip first indexed param)
        vm.expectEmit(false, true, true, true);
        emit EscrowCreated(bytes32(0), payer, payee, TEST_AMOUNT, address(0));
        
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0), // Native token
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        vm.stopPrank();
        
        // Verify escrow details
        X402PaymentEscrow.Escrow memory escrowData = escrow.getEscrow(escrowId);
        assertEq(escrowData.payer, payer);
        assertEq(escrowData.payee, payee);
        assertEq(escrowData.amount, TEST_AMOUNT);
        assertEq(escrowData.asset, address(0));
        assertTrue(escrowData.status == X402PaymentEscrow.EscrowStatus.Active);
    }
    
    function test_CreateEscrow_WithNativeToken_IncorrectValue() public {
        vm.prank(payer);
        vm.expectRevert("Incorrect native token amount");
        
        escrow.createEscrow{value: TEST_AMOUNT - 1}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
    }
    
    // ============================================
    // Escrow Creation Tests - ERC20
    // ============================================
    
    function test_CreateEscrow_WithERC20_Success() public {
        vm.startPrank(payer);
        
        // Approve escrow contract
        usdc.approve(address(escrow), TEST_AMOUNT);
        
        // Check event emission (can't predict escrowId, so skip first indexed param)
        vm.expectEmit(false, true, true, true);
        emit EscrowCreated(bytes32(0), payer, payee, TEST_AMOUNT, address(usdc));
        
        bytes32 escrowId = escrow.createEscrow(
            payee,
            address(usdc),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        vm.stopPrank();
        
        // Verify escrow and token transfer
        X402PaymentEscrow.Escrow memory escrowData = escrow.getEscrow(escrowId);
        assertEq(escrowData.amount, TEST_AMOUNT);
        assertEq(escrowData.asset, address(usdc));
        assertEq(usdc.balanceOf(address(escrow)), TEST_AMOUNT);
    }
    
    function test_CreateEscrow_WithERC20_ShouldNotSendNativeToken() public {
        vm.startPrank(payer);
        usdc.approve(address(escrow), TEST_AMOUNT);
        
        vm.expectRevert("Should not send native token");
        
        escrow.createEscrow{value: 1 ether}(
            payee,
            address(usdc),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        vm.stopPrank();
    }
    
    function test_CreateEscrow_InvalidPayee() public {
        vm.prank(payer);
        vm.expectRevert("Invalid payee");
        
        escrow.createEscrow{value: TEST_AMOUNT}(
            address(0),
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
    }
    
    function test_CreateEscrow_ZeroAmount() public {
        vm.prank(payer);
        vm.expectRevert("Amount must be greater than 0");
        
        escrow.createEscrow(
            payee,
            address(0),
            0,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
    }
    
    // ============================================
    // Escrow Release Tests
    // ============================================
    
    function test_ReleaseEscrow_NativeToken_Success() public {
        // Create escrow
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        uint256 payeeBalanceBefore = payee.balance;
        
        // Release escrow
        vm.prank(facilitator);
        vm.expectEmit(true, true, false, false);
        emit EscrowReleased(escrowId, payee);
        
        escrow.releaseEscrow(escrowId);
        
        // Verify release
        X402PaymentEscrow.Escrow memory escrowData = escrow.getEscrow(escrowId);
        assertTrue(escrowData.status == X402PaymentEscrow.EscrowStatus.Released);
        assertEq(payee.balance, payeeBalanceBefore + TEST_AMOUNT);
    }
    
    function test_ReleaseEscrow_ERC20_Success() public {
        // Create escrow
        vm.startPrank(payer);
        usdc.approve(address(escrow), TEST_AMOUNT);
        bytes32 escrowId = escrow.createEscrow(
            payee,
            address(usdc),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        vm.stopPrank();
        
        uint256 payeeBalanceBefore = usdc.balanceOf(payee);
        
        // Release escrow
        vm.prank(facilitator);
        escrow.releaseEscrow(escrowId);
        
        // Verify release
        assertEq(usdc.balanceOf(payee), payeeBalanceBefore + TEST_AMOUNT);
    }
    
    function test_ReleaseEscrow_OnlyFacilitator() public {
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        vm.prank(unauthorized);
        vm.expectRevert();
        escrow.releaseEscrow(escrowId);
    }
    
    function test_ReleaseEscrow_NotActive() public {
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        // Release once
        vm.prank(facilitator);
        escrow.releaseEscrow(escrowId);
        
        // Try to release again
        vm.prank(facilitator);
        vm.expectRevert("Escrow not active");
        escrow.releaseEscrow(escrowId);
    }
    
    // ============================================
    // Escrow Refund Tests
    // ============================================
    
    function test_RefundEscrow_ByPayer_Success() public {
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        uint256 payerBalanceBefore = payer.balance;
        
        vm.prank(payer);
        vm.expectEmit(true, true, false, false);
        emit EscrowRefunded(escrowId, payer);
        
        escrow.refundEscrow(escrowId);
        
        // Verify refund
        X402PaymentEscrow.Escrow memory escrowData = escrow.getEscrow(escrowId);
        assertTrue(escrowData.status == X402PaymentEscrow.EscrowStatus.Refunded);
        assertEq(payer.balance, payerBalanceBefore + TEST_AMOUNT);
    }
    
    function test_RefundEscrow_AfterTimeout_Success() public {
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        // Fast forward past timeout
        vm.warp(block.timestamp + TIMEOUT + 1);
        
        uint256 payerBalanceBefore = payer.balance;
        
        // Anyone can refund after timeout
        vm.prank(unauthorized);
        escrow.refundEscrow(escrowId);
        
        assertEq(payer.balance, payerBalanceBefore + TEST_AMOUNT);
    }
    
    function test_RefundEscrow_ByFacilitator_Success() public {
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        vm.prank(facilitator);
        escrow.refundEscrow(escrowId);
        
        X402PaymentEscrow.Escrow memory escrowData = escrow.getEscrow(escrowId);
        assertTrue(escrowData.status == X402PaymentEscrow.EscrowStatus.Refunded);
    }
    
    function test_RefundEscrow_UnauthorizedBeforeTimeout() public {
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        vm.prank(unauthorized);
        vm.expectRevert("Not authorized to refund");
        escrow.refundEscrow(escrowId);
    }
    
    function test_RefundEscrow_ERC20_Success() public {
        vm.startPrank(payer);
        usdc.approve(address(escrow), TEST_AMOUNT);
        bytes32 escrowId = escrow.createEscrow(
            payee,
            address(usdc),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        vm.stopPrank();
        
        uint256 payerBalanceBefore = usdc.balanceOf(payer);
        
        vm.prank(payer);
        escrow.refundEscrow(escrowId);
        
        assertEq(usdc.balanceOf(payer), payerBalanceBefore + TEST_AMOUNT);
    }
    
    // ============================================
    // Query Function Tests
    // ============================================
    
    function test_GetEscrow_Success() public {
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        X402PaymentEscrow.Escrow memory escrowData = escrow.getEscrow(escrowId);
        
        assertEq(escrowData.payer, payer);
        assertEq(escrowData.payee, payee);
        assertEq(escrowData.amount, TEST_AMOUNT);
        assertEq(escrowData.asset, address(0));
        assertTrue(escrowData.status == X402PaymentEscrow.EscrowStatus.Active);
    }
    
    function test_GetEscrowStatus_Success() public {
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        X402PaymentEscrow.EscrowStatus status = escrow.getEscrowStatus(escrowId);
        assertTrue(status == X402PaymentEscrow.EscrowStatus.Active);
        
        // Release and check again
        vm.prank(facilitator);
        escrow.releaseEscrow(escrowId);
        
        status = escrow.getEscrowStatus(escrowId);
        assertTrue(status == X402PaymentEscrow.EscrowStatus.Released);
    }
    
    // ============================================
    // Edge Case Tests
    // ============================================
    
    function test_MultipleEscrows_Success() public {
        vm.startPrank(payer);
        
        bytes32 escrowId1 = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        bytes32 escrowId2 = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x456)),
            "/api/premium"
        );
        
        vm.stopPrank();
        
        assertTrue(escrowId1 != escrowId2);
        
        X402PaymentEscrow.Escrow memory escrow1 = escrow.getEscrow(escrowId1);
        X402PaymentEscrow.Escrow memory escrow2 = escrow.getEscrow(escrowId2);
        
        assertEq(escrow1.paymentId, bytes32(uint256(0x123)));
        assertEq(escrow2.paymentId, bytes32(uint256(0x456)));
    }
    
    function test_EscrowExpiration_Success() public {
        vm.prank(payer);
        bytes32 escrowId = escrow.createEscrow{value: TEST_AMOUNT}(
            payee,
            address(0),
            TEST_AMOUNT,
            TIMEOUT,
            bytes32(uint256(0x123)),
            "/api/premium"
        );
        
        X402PaymentEscrow.Escrow memory escrowData = escrow.getEscrow(escrowId);
        assertEq(escrowData.expiresAt, block.timestamp + TIMEOUT);
        
        // Verify timeout works
        vm.warp(block.timestamp + TIMEOUT + 1);
        
        vm.prank(unauthorized);
        escrow.refundEscrow(escrowId); // Should work after timeout
    }
}
