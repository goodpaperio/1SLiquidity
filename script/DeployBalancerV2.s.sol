// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/adapters/BalancerV2PoolRegistry.sol";
import "../src/adapters/BalancerV2Fetcher.sol";

contract DeployBalancerV2 is Script {
    // Mainnet addresses
    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    
    // Common token addresses for testing
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant BAL = 0xba100000625a3754423978a60c9317c58a424e3D;
    
    // Known Balancer pool addresses for testing
    address constant BAL_WETH_POOL = 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56;
    address constant USDC_WETH_POOL = 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56; // Using same for now, will update with real USDC/WETH pool

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying Balancer V2 contracts...");
        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy BalancerV2PoolRegistry
        BalancerV2PoolRegistry registry = new BalancerV2PoolRegistry(deployer);
        console.log("BalancerV2PoolRegistry deployed at:", address(registry));

        // Deploy BalancerV2Fetcher
        BalancerV2Fetcher fetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(registry));
        console.log("BalancerV2Fetcher deployed at:", address(fetcher));

        // Set up initial pool mappings for testing
        console.log("Setting up initial pool mappings...");
        
        // Set up BAL/WETH pool
        address[] memory balWethPools = new address[](1);
        balWethPools[0] = BAL_WETH_POOL;
        registry.setPoolsForPair(BAL, WETH, balWethPools, 0);
        console.log("BAL/WETH pool configured");

        // Set up WETH/BAL pool (reverse order)
        address[] memory wethBalPools = new address[](1);
        wethBalPools[0] = BAL_WETH_POOL;
        registry.setPoolsForPair(WETH, BAL, wethBalPools, 0);
        console.log("WETH/BAL pool configured");

        // Set up USDC/WETH pool (using same pool for now - will need real USDC/WETH pool)
        address[] memory usdcWethPools = new address[](1);
        usdcWethPools[0] = USDC_WETH_POOL;
        registry.setPoolsForPair(USDC, WETH, usdcWethPools, 0);
        console.log("USDC/WETH pool configured");

        // Set up WETH/USDC pool (reverse order)
        address[] memory wethUsdcPools = new address[](1);
        wethUsdcPools[0] = USDC_WETH_POOL;
        registry.setPoolsForPair(WETH, USDC, wethUsdcPools, 0);
        console.log("WETH/USDC pool configured");

        vm.stopBroadcast();

        console.log("\n=== Deployment Summary ===");
        console.log("Registry:", address(registry));
        console.log("Fetcher:", address(fetcher));
        console.log("Vault:", BALANCER_VAULT);
        console.log("WETH:", WETH);
        console.log("USDC:", USDC);
        console.log("BAL:", BAL);
        console.log("BAL/WETH Pool:", BAL_WETH_POOL);
        console.log("USDC/WETH Pool:", USDC_WETH_POOL);
    }
}
