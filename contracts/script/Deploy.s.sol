// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

import "forge-std/Script.sol";
import "../src/X402PaymentRegistry.sol";
import "../src/X402PaymentEscrow.sol";
import "../src/X402TokenManager.sol";

/**
 * @title Deploy
 * @notice Deployment script for x402 protocol contracts on Push Chain
 */
contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with account:", deployer);
        console.log("Account balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy X402PaymentRegistry
        console.log("\n1. Deploying X402PaymentRegistry...");
        X402PaymentRegistry registry = new X402PaymentRegistry();
        console.log("   X402PaymentRegistry deployed at:", address(registry));
        
        // Deploy X402PaymentEscrow
        console.log("\n2. Deploying X402PaymentEscrow...");
        X402PaymentEscrow escrow = new X402PaymentEscrow();
        console.log("   X402PaymentEscrow deployed at:", address(escrow));
        
        // Deploy X402TokenManager
        console.log("\n3. Deploying X402TokenManager...");
        X402TokenManager tokenManager = new X402TokenManager();
        console.log("   X402TokenManager deployed at:", address(tokenManager));
        
        vm.stopBroadcast();
        
        console.log("\n=== Deployment Summary ===");
        console.log("X402PaymentRegistry:", address(registry));
        console.log("X402PaymentEscrow:", address(escrow));
        console.log("X402TokenManager:", address(tokenManager));
        console.log("\nSave these addresses for verification and Phase 2!");
    }
}
