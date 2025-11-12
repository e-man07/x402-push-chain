// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title X402PaymentRegistry
 * @notice Central registry for x402 payment requirements and transaction records
 * @dev Integrates with Push Chain's UEA Factory to detect payment origin chains
 */
contract X402PaymentRegistry is AccessControl, ReentrancyGuard {
    
    // ============================================
    // Roles
    // ============================================
    
    bytes32 public constant MERCHANT_ROLE = keccak256("MERCHANT_ROLE");
    bytes32 public constant FACILITATOR_ROLE = keccak256("FACILITATOR_ROLE");
    
    // ============================================
    // Structs
    // ============================================
    
    /// @notice Payment requirement configuration
    struct PaymentRequirement {
        string scheme;                    // "exact"
        string network;                   // "base-sepolia", "ethereum-sepolia", etc.
        uint256 maxAmountRequired;        // Amount in atomic units
        string resource;                  // Resource path
        string description;               // Human-readable description
        string mimeType;                  // Expected response MIME type
        address payTo;                    // Recipient address
        uint256 maxTimeoutSeconds;        // Payment validity window
        address asset;                    // Token contract address (0x0 for native)
        bool isActive;                    // Active status
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    /// @notice Payment transaction record
    struct PaymentRecord {
        bytes32 requirementId;
        address payer;                    // UEA address on Push Chain
        string originChain;               // Chain payment originated from (e.g., "eip155:11155111")
        address originAddress;            // Original payer address on source chain
        bool isUEA;                       // True if payer is UEA, false if native Push Chain
        uint256 amount;
        uint256 timestamp;
        bytes32 txHash;
        bool settled;
    }
    
    // ============================================
    // State Variables
    // ============================================
    
    /// @notice UEA Factory interface for origin detection
    IUEAFactory public constant UEA_FACTORY = 
        IUEAFactory(0x00000000000000000000000000000000000000eA);
    
    /// @notice Merchant => ResourcePath => PaymentRequirement
    mapping(address => mapping(string => PaymentRequirement)) public paymentRequirements;
    
    /// @notice Payment ID => PaymentRecord
    mapping(bytes32 => PaymentRecord) public paymentRecords;
    
    /// @notice Merchant => Payment IDs
    mapping(address => bytes32[]) private merchantPayments;
    
    // ============================================
    // Events
    // ============================================
    
    event MerchantRegistered(address indexed merchant, uint256 timestamp);
    event PaymentRequirementCreated(
        address indexed merchant,
        string resource,
        uint256 amount,
        address asset
    );
    event PaymentRequirementUpdated(address indexed merchant, string resource);
    event PaymentRecorded(
        bytes32 indexed paymentId,
        address indexed merchant,
        address indexed payer,
        uint256 amount,
        string originChain,
        address originAddress,
        bool isUEA
    );
    event PaymentSettled(bytes32 indexed paymentId, bytes32 settlementTxHash);
    
    // ============================================
    // Constructor
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(FACILITATOR_ROLE, msg.sender);
    }
    
    // ============================================
    // Merchant Management
    // ============================================
    
    /**
     * @notice Register a new merchant
     * @param merchant Address of the merchant to register
     */
    function registerMerchant(address merchant) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(MERCHANT_ROLE, merchant);
        emit MerchantRegistered(merchant, block.timestamp);
    }
    
    // ============================================
    // Payment Requirements
    // ============================================
    
    /**
     * @notice Create a payment requirement for a resource
     * @param resource Resource path (e.g., "/api/premium")
     * @param scheme Payment scheme (e.g., "exact")
     * @param network Network identifier (e.g., "base-sepolia")
     * @param maxAmountRequired Amount in atomic units
     * @param description Human-readable description
     * @param mimeType Expected response MIME type
     * @param payTo Recipient address
     * @param maxTimeoutSeconds Payment validity window
     * @param asset Token contract address (address(0) for native)
     */
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
    ) external onlyRole(MERCHANT_ROLE) {
        require(bytes(resource).length > 0, "Resource cannot be empty");
        require(maxAmountRequired > 0, "Amount must be greater than 0");
        require(payTo != address(0), "Invalid payTo address");
        
        paymentRequirements[msg.sender][resource] = PaymentRequirement({
            scheme: scheme,
            network: network,
            maxAmountRequired: maxAmountRequired,
            resource: resource,
            description: description,
            mimeType: mimeType,
            payTo: payTo,
            maxTimeoutSeconds: maxTimeoutSeconds,
            asset: asset,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        emit PaymentRequirementCreated(msg.sender, resource, maxAmountRequired, asset);
    }
    
    /**
     * @notice Get payment requirement for a merchant and resource
     * @param merchant Merchant address
     * @param resource Resource path
     * @return Payment requirement details
     */
    function getPaymentRequirement(address merchant, string memory resource)
        external
        view
        returns (PaymentRequirement memory)
    {
        return paymentRequirements[merchant][resource];
    }
    
    // ============================================
    // Payment Recording
    // ============================================
    
    /**
     * @notice Record a payment transaction with automatic origin chain detection
     * @param merchant Merchant address
     * @param resource Resource path
     * @param payer Payer address (UEA on Push Chain or native EOA)
     * @param amount Payment amount
     * @param txHash Transaction hash
     * @return paymentId Unique payment identifier
     */
    function recordPayment(
        address merchant,
        string memory resource,
        address payer,
        uint256 amount,
        bytes32 txHash
    ) external onlyRole(FACILITATOR_ROLE) nonReentrant returns (bytes32) {
        PaymentRequirement memory requirement = paymentRequirements[merchant][resource];
        require(requirement.isActive, "Payment requirement not active");
        require(amount >= requirement.maxAmountRequired, "Insufficient payment amount");
        
        // Get origin chain from UEA Factory
        (IUEAFactory.UniversalAccountId memory originAccount, bool isUEA) = 
            UEA_FACTORY.getOriginForUEA(payer);
        
        string memory originChain;
        address originAddress;
        
        if (isUEA) {
            // Payer is a UEA - extract origin chain and address
            originChain = string(abi.encodePacked(
                originAccount.chainNamespace, 
                ":", 
                originAccount.chainId
            ));
            
            // Convert bytes to address (first 20 bytes)
            originAddress = address(bytes20(originAccount.owner));
        } else {
            // Payer is native Push Chain EOA
            originChain = "push-chain";
            originAddress = payer;
        }
        
        bytes32 paymentId = keccak256(abi.encodePacked(
            merchant,
            resource,
            payer,
            amount,
            block.timestamp,
            txHash
        ));
        
        paymentRecords[paymentId] = PaymentRecord({
            requirementId: keccak256(abi.encodePacked(merchant, resource)),
            payer: payer,
            originChain: originChain,
            originAddress: originAddress,
            isUEA: isUEA,
            amount: amount,
            timestamp: block.timestamp,
            txHash: txHash,
            settled: false
        });
        
        merchantPayments[merchant].push(paymentId);
        
        emit PaymentRecorded(paymentId, merchant, payer, amount, originChain, originAddress, isUEA);
        
        return paymentId;
    }
    
    /**
     * @notice Mark a payment as settled
     * @param paymentId Payment identifier
     * @param settlementTxHash Settlement transaction hash
     */
    function markPaymentSettled(bytes32 paymentId, bytes32 settlementTxHash)
        external
        onlyRole(FACILITATOR_ROLE)
    {
        require(paymentRecords[paymentId].timestamp > 0, "Payment not found");
        require(!paymentRecords[paymentId].settled, "Payment already settled");
        
        paymentRecords[paymentId].settled = true;
        
        emit PaymentSettled(paymentId, settlementTxHash);
    }
    
    // ============================================
    // Query Functions
    // ============================================
    
    /**
     * @notice Get all payment IDs for a merchant
     * @param merchant Merchant address
     * @return Array of payment IDs
     */
    function getMerchantPayments(address merchant) 
        external 
        view 
        returns (bytes32[] memory) 
    {
        return merchantPayments[merchant];
    }
    
    /**
     * @notice Get payment record by ID
     * @param paymentId Payment identifier
     * @return Payment record details
     */
    function getPaymentRecord(bytes32 paymentId)
        external
        view
        returns (PaymentRecord memory)
    {
        return paymentRecords[paymentId];
    }
}

/**
 * @notice Interface for Push Chain UEA Factory
 * @dev Predeployed at 0x00000000000000000000000000000000000000eA
 * @dev Used to automatically detect payment origin chain for cross-chain payments
 */
interface IUEAFactory {
    /**
     * @notice Universal Account ID structure
     * @param chainNamespace Chain namespace (e.g., "eip155" for EVM, "solana" for Solana)
     * @param chainId Chain-specific identifier (e.g., "1" for Ethereum, "11155111" for Sepolia)
     * @param owner Original address on the source chain (as bytes)
     */
    struct UniversalAccountId {
        string chainNamespace;
        string chainId;
        bytes owner;
    }
    
    /**
     * @notice Get origin information for any address on Push Chain
     * @param addr Address to query (can be UEA or native Push Chain EOA)
     * @return account Universal account information containing origin details
     * @return isUEA True if address is a UEA (cross-chain), false if native Push Chain EOA
     */
    function getOriginForUEA(address addr) 
        external view 
        returns (UniversalAccountId memory account, bool isUEA);
}
