// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Test.sol";
import "../src/X402TokenManager.sol";

/**
 * @title X402TokenManagerTest
 * @notice Test suite for X402TokenManager contract
 * @dev Following TDD approach - tests written before implementation
 */
contract X402TokenManagerTest is Test {
    X402TokenManager public tokenManager;
    
    address public admin;
    address public unauthorized;
    
    // Test token addresses
    address constant USDC_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    address constant USDC_BASE = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address constant NATIVE_TOKEN = address(0);
    
    event TokenAdded(address indexed tokenAddress, string symbol, uint8 decimals);
    event TokenRemoved(address indexed tokenAddress);
    event TokenUpdated(address indexed tokenAddress, bool isActive);
    
    function setUp() public {
        admin = address(this);
        unauthorized = makeAddr("unauthorized");
        
        tokenManager = new X402TokenManager();
    }
    
    // ============================================
    // Token Addition Tests
    // ============================================
    
    function test_AddSupportedToken_Success() public {
        vm.expectEmit(true, false, false, true);
        emit TokenAdded(USDC_SEPOLIA, "USDC", 6);
        
        tokenManager.addSupportedToken(
            USDC_SEPOLIA,
            "USDC",
            6,
            true
        );
        
        X402TokenManager.TokenInfo memory info = tokenManager.getTokenInfo(USDC_SEPOLIA);
        assertEq(info.symbol, "USDC");
        assertEq(info.decimals, 6);
        assertTrue(info.isActive);
    }
    
    function test_AddSupportedToken_OnlyAdmin() public {
        vm.prank(unauthorized);
        vm.expectRevert();
        
        tokenManager.addSupportedToken(
            USDC_SEPOLIA,
            "USDC",
            6,
            true
        );
    }
    
    function test_AddSupportedToken_InvalidAddress() public {
        vm.expectRevert("Invalid token address");
        
        tokenManager.addSupportedToken(
            address(0),
            "USDC",
            6,
            true
        );
    }
    
    function test_AddSupportedToken_EmptySymbol() public {
        vm.expectRevert("Symbol cannot be empty");
        
        tokenManager.addSupportedToken(
            USDC_SEPOLIA,
            "",
            6,
            true
        );
    }
    
    function test_AddSupportedToken_AlreadyExists() public {
        tokenManager.addSupportedToken(
            USDC_SEPOLIA,
            "USDC",
            6,
            true
        );
        
        vm.expectRevert("Token already exists");
        
        tokenManager.addSupportedToken(
            USDC_SEPOLIA,
            "USDC",
            6,
            true
        );
    }
    
    function test_AddSupportedToken_MultipleTokens() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        tokenManager.addSupportedToken(USDC_BASE, "USDC", 6, true);
        
        assertTrue(tokenManager.isSupportedToken(USDC_SEPOLIA));
        assertTrue(tokenManager.isSupportedToken(USDC_BASE));
    }
    
    // ============================================
    // Token Removal Tests
    // ============================================
    
    function test_RemoveSupportedToken_Success() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        
        vm.expectEmit(true, false, false, false);
        emit TokenRemoved(USDC_SEPOLIA);
        
        tokenManager.removeSupportedToken(USDC_SEPOLIA);
        
        assertFalse(tokenManager.isSupportedToken(USDC_SEPOLIA));
    }
    
    function test_RemoveSupportedToken_OnlyAdmin() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        
        vm.prank(unauthorized);
        vm.expectRevert();
        
        tokenManager.removeSupportedToken(USDC_SEPOLIA);
    }
    
    function test_RemoveSupportedToken_NotExists() public {
        vm.expectRevert("Token does not exist");
        
        tokenManager.removeSupportedToken(USDC_SEPOLIA);
    }
    
    // ============================================
    // Token Update Tests
    // ============================================
    
    function test_UpdateTokenStatus_Success() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        
        vm.expectEmit(true, false, false, true);
        emit TokenUpdated(USDC_SEPOLIA, false);
        
        tokenManager.updateTokenStatus(USDC_SEPOLIA, false);
        
        X402TokenManager.TokenInfo memory info = tokenManager.getTokenInfo(USDC_SEPOLIA);
        assertFalse(info.isActive);
    }
    
    function test_UpdateTokenStatus_OnlyAdmin() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        
        vm.prank(unauthorized);
        vm.expectRevert();
        
        tokenManager.updateTokenStatus(USDC_SEPOLIA, false);
    }
    
    function test_UpdateTokenStatus_NotExists() public {
        vm.expectRevert("Token does not exist");
        
        tokenManager.updateTokenStatus(USDC_SEPOLIA, false);
    }
    
    function test_UpdateTokenStatus_ReactivateToken() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        tokenManager.updateTokenStatus(USDC_SEPOLIA, false);
        
        assertFalse(tokenManager.getTokenInfo(USDC_SEPOLIA).isActive);
        
        tokenManager.updateTokenStatus(USDC_SEPOLIA, true);
        
        assertTrue(tokenManager.getTokenInfo(USDC_SEPOLIA).isActive);
    }
    
    // ============================================
    // Query Function Tests
    // ============================================
    
    function test_GetTokenInfo_Success() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        
        X402TokenManager.TokenInfo memory info = tokenManager.getTokenInfo(USDC_SEPOLIA);
        
        assertEq(info.tokenAddress, USDC_SEPOLIA);
        assertEq(info.symbol, "USDC");
        assertEq(info.decimals, 6);
        assertTrue(info.isActive);
        assertTrue(info.addedAt > 0);
    }
    
    function test_GetTokenInfo_NotExists() public {
        X402TokenManager.TokenInfo memory info = tokenManager.getTokenInfo(USDC_SEPOLIA);
        
        assertEq(info.tokenAddress, address(0));
        assertEq(info.symbol, "");
        assertEq(info.decimals, 0);
    }
    
    function test_IsSupportedToken_True() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        
        assertTrue(tokenManager.isSupportedToken(USDC_SEPOLIA));
    }
    
    function test_IsSupportedToken_False() public {
        assertFalse(tokenManager.isSupportedToken(USDC_SEPOLIA));
    }
    
    function test_IsSupportedToken_AfterRemoval() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        tokenManager.removeSupportedToken(USDC_SEPOLIA);
        
        assertFalse(tokenManager.isSupportedToken(USDC_SEPOLIA));
    }
    
    function test_GetAllSupportedTokens_Success() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        tokenManager.addSupportedToken(USDC_BASE, "USDC", 6, true);
        
        address[] memory tokens = tokenManager.getAllSupportedTokens();
        
        assertEq(tokens.length, 2);
        assertEq(tokens[0], USDC_SEPOLIA);
        assertEq(tokens[1], USDC_BASE);
    }
    
    function test_GetAllSupportedTokens_Empty() public {
        address[] memory tokens = tokenManager.getAllSupportedTokens();
        
        assertEq(tokens.length, 0);
    }
    
    function test_GetAllSupportedTokens_AfterRemoval() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        tokenManager.addSupportedToken(USDC_BASE, "USDC", 6, true);
        tokenManager.removeSupportedToken(USDC_SEPOLIA);
        
        address[] memory tokens = tokenManager.getAllSupportedTokens();
        
        assertEq(tokens.length, 1);
        assertEq(tokens[0], USDC_BASE);
    }
    
    function test_GetActiveTokens_Success() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        tokenManager.addSupportedToken(USDC_BASE, "USDC", 6, false);
        
        address[] memory activeTokens = tokenManager.getActiveTokens();
        
        assertEq(activeTokens.length, 1);
        assertEq(activeTokens[0], USDC_SEPOLIA);
    }
    
    function test_GetActiveTokens_AfterStatusChange() public {
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        tokenManager.addSupportedToken(USDC_BASE, "USDC", 6, true);
        
        tokenManager.updateTokenStatus(USDC_SEPOLIA, false);
        
        address[] memory activeTokens = tokenManager.getActiveTokens();
        
        assertEq(activeTokens.length, 1);
        assertEq(activeTokens[0], USDC_BASE);
    }
    
    // ============================================
    // Edge Case Tests
    // ============================================
    
    function test_TokenLifecycle_Complete() public {
        // Add token
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        assertTrue(tokenManager.isSupportedToken(USDC_SEPOLIA));
        
        // Deactivate
        tokenManager.updateTokenStatus(USDC_SEPOLIA, false);
        assertFalse(tokenManager.getTokenInfo(USDC_SEPOLIA).isActive);
        assertTrue(tokenManager.isSupportedToken(USDC_SEPOLIA)); // Still exists
        
        // Reactivate
        tokenManager.updateTokenStatus(USDC_SEPOLIA, true);
        assertTrue(tokenManager.getTokenInfo(USDC_SEPOLIA).isActive);
        
        // Remove
        tokenManager.removeSupportedToken(USDC_SEPOLIA);
        assertFalse(tokenManager.isSupportedToken(USDC_SEPOLIA));
    }
    
    function test_MultipleTokensManagement() public {
        // Add multiple tokens
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        tokenManager.addSupportedToken(USDC_BASE, "USDC", 6, true);
        
        address[] memory allTokens = tokenManager.getAllSupportedTokens();
        assertEq(allTokens.length, 2);
        
        // Deactivate one
        tokenManager.updateTokenStatus(USDC_SEPOLIA, false);
        
        address[] memory activeTokens = tokenManager.getActiveTokens();
        assertEq(activeTokens.length, 1);
        assertEq(activeTokens[0], USDC_BASE);
        
        // All tokens still exist
        allTokens = tokenManager.getAllSupportedTokens();
        assertEq(allTokens.length, 2);
    }
    
    function test_TokenWithDifferentDecimals() public {
        // USDC has 6 decimals
        tokenManager.addSupportedToken(USDC_SEPOLIA, "USDC", 6, true);
        
        // WETH has 18 decimals
        address weth = makeAddr("WETH");
        tokenManager.addSupportedToken(weth, "WETH", 18, true);
        
        assertEq(tokenManager.getTokenInfo(USDC_SEPOLIA).decimals, 6);
        assertEq(tokenManager.getTokenInfo(weth).decimals, 18);
    }
}
