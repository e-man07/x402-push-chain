// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/X402PaymentRegistry.sol";
import "../src/X402PaymentEscrow.sol";
import "../src/X402TokenManager.sol";

/**
 * @title DeployWithKeystore
 * @notice Deployment script using Foundry keystore
 */
contract DeployWithKeystore is Script {
    function run() external {
        // Get deployer from keystore (will prompt for password)
        address deployer = msg.sender;
        
        console.log("=== x402 Protocol Deployment ===");
        console.log("Deploying to: Push Chain Donut Testnet");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        require(deployer.balance > 0, "Insufficient balance for deployment");
        
        vm.startBroadcast();
        
        // Deploy X402PaymentRegistry
        console.log("\n[1/3] Deploying X402PaymentRegistry...");
        X402PaymentRegistry registry = new X402PaymentRegistry();
        console.log("      Deployed at:", address(registry));
        
        // Deploy X402PaymentEscrow
        console.log("\n[2/3] Deploying X402PaymentEscrow...");
        X402PaymentEscrow escrow = new X402PaymentEscrow();
        console.log("      Deployed at:", address(escrow));
        
        // Deploy X402TokenManager
        console.log("\n[3/3] Deploying X402TokenManager...");
        X402TokenManager tokenManager = new X402TokenManager();
        console.log("      Deployed at:", address(tokenManager));
        
        vm.stopBroadcast();
        
        // Print summary
        console.log("\n=== Deployment Complete! ===");
        console.log("\nContract Addresses:");
        console.log("-------------------");
        console.log("X402PaymentRegistry:  ", address(registry));
        console.log("X402PaymentEscrow:    ", address(escrow));
        console.log("X402TokenManager:     ", address(tokenManager));
        
        console.log("\n=== Next Steps ===");
        console.log("1. Verify contracts on BlockScout");
        console.log("2. Save addresses to DEPLOYED_ADDRESSES.md");
        console.log("3. Initialize contracts (grant roles, add tokens)");
        console.log("4. Test on-chain interactions");
        
        console.log("\nBlockScout Explorer:");
        console.log("https://donut.push.network/");
    }
}
