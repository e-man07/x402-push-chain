// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title X402TokenManager
 * @notice Manages supported payment tokens for x402 protocol
 * @dev Tracks token metadata and active status across multiple chains
 */
contract X402TokenManager is AccessControl {
    
    // ============================================
    // Structs
    // ============================================
    
    struct TokenInfo {
        address tokenAddress;
        string symbol;
        uint8 decimals;
        bool isActive;
        uint256 addedAt;
        uint256 updatedAt;
    }
    
    // ============================================
    // State Variables
    // ============================================
    
    /// @notice Mapping of token address to token info
    mapping(address => TokenInfo) private tokens;
    
    /// @notice Array of all supported token addresses
    address[] private supportedTokens;
    
    /// @notice Mapping to check if token exists
    mapping(address => bool) private tokenExists;
    
    // ============================================
    // Events
    // ============================================
    
    event TokenAdded(address indexed tokenAddress, string symbol, uint8 decimals);
    event TokenRemoved(address indexed tokenAddress);
    event TokenUpdated(address indexed tokenAddress, bool isActive);
    
    // ============================================
    // Constructor
    // ============================================
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }
    
    // ============================================
    // Token Management
    // ============================================
    
    /**
     * @notice Add a supported payment token
     * @param tokenAddress Token contract address
     * @param symbol Token symbol
     * @param decimals Token decimals
     * @param isActive Initial active status
     */
    function addSupportedToken(
        address tokenAddress,
        string memory symbol,
        uint8 decimals,
        bool isActive
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(tokenAddress != address(0), "Invalid token address");
        require(bytes(symbol).length > 0, "Symbol cannot be empty");
        require(!tokenExists[tokenAddress], "Token already exists");
        
        tokens[tokenAddress] = TokenInfo({
            tokenAddress: tokenAddress,
            symbol: symbol,
            decimals: decimals,
            isActive: isActive,
            addedAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        supportedTokens.push(tokenAddress);
        tokenExists[tokenAddress] = true;
        
        emit TokenAdded(tokenAddress, symbol, decimals);
    }
    
    /**
     * @notice Remove a supported token
     * @param tokenAddress Token contract address
     */
    function removeSupportedToken(address tokenAddress) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(tokenExists[tokenAddress], "Token does not exist");
        
        // Remove from array
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (supportedTokens[i] == tokenAddress) {
                supportedTokens[i] = supportedTokens[supportedTokens.length - 1];
                supportedTokens.pop();
                break;
            }
        }
        
        // Delete from mapping
        delete tokens[tokenAddress];
        delete tokenExists[tokenAddress];
        
        emit TokenRemoved(tokenAddress);
    }
    
    /**
     * @notice Update token active status
     * @param tokenAddress Token contract address
     * @param isActive New active status
     */
    function updateTokenStatus(address tokenAddress, bool isActive) 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE) 
    {
        require(tokenExists[tokenAddress], "Token does not exist");
        
        tokens[tokenAddress].isActive = isActive;
        tokens[tokenAddress].updatedAt = block.timestamp;
        
        emit TokenUpdated(tokenAddress, isActive);
    }
    
    // ============================================
    // Query Functions
    // ============================================
    
    /**
     * @notice Get token information
     * @param tokenAddress Token contract address
     * @return Token information
     */
    function getTokenInfo(address tokenAddress) 
        external 
        view 
        returns (TokenInfo memory) 
    {
        return tokens[tokenAddress];
    }
    
    /**
     * @notice Check if token is supported
     * @param tokenAddress Token contract address
     * @return True if token exists
     */
    function isSupportedToken(address tokenAddress) 
        external 
        view 
        returns (bool) 
    {
        return tokenExists[tokenAddress];
    }
    
    /**
     * @notice Get all supported token addresses
     * @return Array of token addresses
     */
    function getAllSupportedTokens() 
        external 
        view 
        returns (address[] memory) 
    {
        return supportedTokens;
    }
    
    /**
     * @notice Get all active token addresses
     * @return Array of active token addresses
     */
    function getActiveTokens() 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 activeCount = 0;
        
        // Count active tokens
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (tokens[supportedTokens[i]].isActive) {
                activeCount++;
            }
        }
        
        // Build array of active tokens
        address[] memory activeTokens = new address[](activeCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < supportedTokens.length; i++) {
            if (tokens[supportedTokens[i]].isActive) {
                activeTokens[index] = supportedTokens[i];
                index++;
            }
        }
        
        return activeTokens;
    }
}
