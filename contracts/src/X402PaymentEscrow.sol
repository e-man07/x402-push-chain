// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title X402PaymentEscrow
 * @notice Escrow contract for x402 payments
 * @dev Holds payments until service delivery confirmation
 * Following Push Chain patterns for secure token handling
 */
contract X402PaymentEscrow is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============================================
    // Roles
    // ============================================
    
    bytes32 public constant FACILITATOR_ROLE = keccak256("FACILITATOR_ROLE");
    
    // ============================================
    // Enums
    // ============================================
    
    enum EscrowStatus { Active, Released, Refunded, Disputed }
    
    // ============================================
    // Structs
    // ============================================
    
    struct Escrow {
        address payer;
        address payee;
        address asset;              // Address(0) for native token
        uint256 amount;
        uint256 createdAt;
        uint256 expiresAt;
        EscrowStatus status;
        bytes32 paymentId;
        string resource;
    }
    
    // ============================================
    // State Variables
    // ============================================
    
    mapping(bytes32 => Escrow) public escrows;
    
    // ============================================
    // Events
    // ============================================
    
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
    
    // ============================================
    // Constructor
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FACILITATOR_ROLE, msg.sender);
    }
    
    // ============================================
    // Escrow Creation
    // ============================================
    
    /**
     * @notice Create a new escrow
     * @param payee Recipient address
     * @param asset Token address (address(0) for native)
     * @param amount Amount to escrow
     * @param timeoutSeconds Timeout duration
     * @param paymentId Associated payment ID
     * @param resource Resource being paid for
     * @return escrowId Unique escrow identifier
     */
    function createEscrow(
        address payee,
        address asset,
        uint256 amount,
        uint256 timeoutSeconds,
        bytes32 paymentId,
        string memory resource
    ) external payable nonReentrant returns (bytes32) {
        require(payee != address(0), "Invalid payee");
        require(amount > 0, "Amount must be greater than 0");
        
        if (asset == address(0)) {
            // Native token
            require(msg.value == amount, "Incorrect native token amount");
        } else {
            // ERC20 token
            require(msg.value == 0, "Should not send native token");
            IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        }
        
        bytes32 escrowId = keccak256(abi.encodePacked(
            msg.sender,
            payee,
            amount,
            block.timestamp,
            paymentId
        ));
        
        escrows[escrowId] = Escrow({
            payer: msg.sender,
            payee: payee,
            asset: asset,
            amount: amount,
            createdAt: block.timestamp,
            expiresAt: block.timestamp + timeoutSeconds,
            status: EscrowStatus.Active,
            paymentId: paymentId,
            resource: resource
        });
        
        emit EscrowCreated(escrowId, msg.sender, payee, amount, asset);
        
        return escrowId;
    }
    
    // ============================================
    // Escrow Release
    // ============================================
    
    /**
     * @notice Release escrow to payee
     * @param escrowId Escrow identifier
     * @dev Only facilitator can release
     */
    function releaseEscrow(bytes32 escrowId) 
        external 
        onlyRole(FACILITATOR_ROLE) 
        nonReentrant 
    {
        Escrow storage escrowData = escrows[escrowId];
        require(escrowData.status == EscrowStatus.Active, "Escrow not active");
        
        escrowData.status = EscrowStatus.Released;
        
        if (escrowData.asset == address(0)) {
            // Native token transfer
            (bool success, ) = escrowData.payee.call{value: escrowData.amount}("");
            require(success, "Native transfer failed");
        } else {
            // ERC20 token transfer
            IERC20(escrowData.asset).safeTransfer(escrowData.payee, escrowData.amount);
        }
        
        emit EscrowReleased(escrowId, escrowData.payee);
    }
    
    // ============================================
    // Escrow Refund
    // ============================================
    
    /**
     * @notice Refund escrow to payer
     * @param escrowId Escrow identifier
     * @dev Can be called by payer, facilitator, or anyone after timeout
     */
    function refundEscrow(bytes32 escrowId) external nonReentrant {
        Escrow storage escrowData = escrows[escrowId];
        require(escrowData.status == EscrowStatus.Active, "Escrow not active");
        require(
            msg.sender == escrowData.payer || 
            block.timestamp > escrowData.expiresAt ||
            hasRole(FACILITATOR_ROLE, msg.sender),
            "Not authorized to refund"
        );
        
        escrowData.status = EscrowStatus.Refunded;
        
        if (escrowData.asset == address(0)) {
            // Native token transfer
            (bool success, ) = escrowData.payer.call{value: escrowData.amount}("");
            require(success, "Native transfer failed");
        } else {
            // ERC20 token transfer
            IERC20(escrowData.asset).safeTransfer(escrowData.payer, escrowData.amount);
        }
        
        emit EscrowRefunded(escrowId, escrowData.payer);
    }
    
    // ============================================
    // Query Functions
    // ============================================
    
    /**
     * @notice Get escrow details
     * @param escrowId Escrow identifier
     * @return Escrow details
     */
    function getEscrow(bytes32 escrowId) 
        external 
        view 
        returns (Escrow memory) 
    {
        return escrows[escrowId];
    }
    
    /**
     * @notice Get escrow status
     * @param escrowId Escrow identifier
     * @return Escrow status
     */
    function getEscrowStatus(bytes32 escrowId) 
        external 
        view 
        returns (EscrowStatus) 
    {
        return escrows[escrowId].status;
    }
}
