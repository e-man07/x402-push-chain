// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/X402PaymentRegistry.sol";
import "../src/X402PaymentEscrow.sol";
import "../src/X402TokenManager.sol";

/**
 * @title Initialize
 * @notice Initialize deployed contracts with roles and test data
 */
contract Initialize is Script {
    // Deployed contract addresses
    address constant REGISTRY = 0xE1ED01e0623BBae51df78341297F16eE75a0009B;
    address constant ESCROW = 0xe75F48f2aeF1554Ca964eE5A3b6a19048C3D48bA;
    address constant TOKEN_MANAGER = 0xc5Ab8Ae7F08a4786Af22C4A0DebBa8A0C72F24E9;
    
    // Test token addresses (USDC on different networks)
    address constant USDC_SEPOLIA = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant USDC_BASE_SEPOLIA = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
    
    function run() external {
        address deployer = msg.sender;
        
        console.log("=== Initializing x402 Protocol Contracts ===");
        console.log("Deployer:", deployer);
        
        vm.startBroadcast();
        
        // Initialize contracts
        X402PaymentRegistry registry = X402PaymentRegistry(REGISTRY);
        X402PaymentEscrow escrow = X402PaymentEscrow(ESCROW);
        X402TokenManager tokenManager = X402TokenManager(TOKEN_MANAGER);
        
        console.log("\n[1/5] Granting FACILITATOR_ROLE to deployer on Registry...");
        registry.grantRole(registry.FACILITATOR_ROLE(), deployer);
        console.log("      Done!");
        
        console.log("\n[2/5] Granting FACILITATOR_ROLE to deployer on Escrow...");
        escrow.grantRole(escrow.FACILITATOR_ROLE(), deployer);
        console.log("      Done!");
        
        console.log("\n[3/5] Registering deployer as merchant...");
        registry.registerMerchant(deployer);
        console.log("      Done!");
        
        console.log("\n[4/5] Adding USDC Sepolia to TokenManager...");
        tokenManager.addSupportedToken(
            USDC_SEPOLIA,
            "USDC",
            6,
            true
        );
        console.log("      Added:", USDC_SEPOLIA);
        
        console.log("\n[5/5] Adding USDC Base Sepolia to TokenManager...");
        tokenManager.addSupportedToken(
            USDC_BASE_SEPOLIA,
            "USDC",
            6,
            true
        );
        console.log("      Added:", USDC_BASE_SEPOLIA);
        
        vm.stopBroadcast();
        
        console.log("\n=== Initialization Complete! ===");
        console.log("\nYour address now has:");
        console.log("  - FACILITATOR_ROLE on Registry & Escrow");
        console.log("  - MERCHANT_ROLE on Registry");
        console.log("  - 2 tokens added to TokenManager");
        
        console.log("\n=== Next Steps ===");
        console.log("1. Create a payment requirement");
        console.log("2. Test the payment flow");
        console.log("3. Start building Phase 2 (Facilitator Service)");
    }
}
