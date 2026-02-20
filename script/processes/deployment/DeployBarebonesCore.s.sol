// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../../src/Core.sol";
import "../../../src/StreamDaemon.sol";
import "../../../src/interfaces/IETHSupport.sol";

/**
 * @title DeployBarebonesCore
 * @notice Deploys new Core and StreamDaemon contracts (without CREATE2 for proper ownership)
 * @dev This script:
 * 1. Deploys a new StreamDaemon (without CREATE2) with DEXs excluding Curve
 * 2. Deploys a new Core contract using existing Executor and Registry
 * 3. Sets ETHSupport on Core post-deployment
 * 4. Re-configures periphery contracts to use the new StreamDaemon
 */
contract DeployBarebonesCore is Script {
    // Existing deployed contract addresses (v1.0.3)
    address constant EXISTING_EXECUTOR = 0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878;
    address constant EXISTING_REGISTRY = 0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4;
    address constant EXISTING_ETH_SUPPORT = 0xB970aF8dA1909230a32819602d97a0C0d44C5FB5;

    // Existing fetchers (from v1.0.3)
    address constant UNISWAP_V2_FETCHER = 0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089;
    address constant UNISWAP_V3_FETCHER_0_05 = 0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B;
    address constant UNISWAP_V3_FETCHER_0_3 = 0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518;
    address constant UNISWAP_V3_FETCHER_1 = 0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43;
    address constant SUSHISWAP_FETCHER = 0x57cfC5AD0812747afbb3dCD98B23b94883A341BC;
    address constant BALANCER_V2_FETCHER = 0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6;
    // NOTE: CurveMetaFetcher is intentionally excluded

    // DEX router addresses
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    // New contracts
    Core public core;
    StreamDaemon public streamDaemon;
    IETHSupport public ethSupport;

    function run() external {
        console.log("=== Deploying New Core and StreamDaemon (Non-CREATE2) ===");
        vm.startBroadcast();
        
        address deployer = tx.origin;
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        // Verify existing contracts are deployed
        console.log("\n--- Verifying Existing Contracts ---");
        require(EXISTING_EXECUTOR.code.length > 0, "Executor not deployed");
        console.log("Executor verified at:", EXISTING_EXECUTOR);
        
        require(EXISTING_REGISTRY.code.length > 0, "Registry not deployed");
        console.log("Registry verified at:", EXISTING_REGISTRY);
        
        require(EXISTING_ETH_SUPPORT.code.length > 0, "ETHSupport not deployed");
        console.log("ETHSupport verified at:", EXISTING_ETH_SUPPORT);

        // Verify existing fetchers (excluding Curve)
        console.log("\n--- Verifying Existing Fetchers (excluding Curve) ---");
        require(UNISWAP_V2_FETCHER.code.length > 0, "UniswapV2Fetcher not deployed");
        console.log("UniswapV2Fetcher verified at:", UNISWAP_V2_FETCHER);
        
        require(UNISWAP_V3_FETCHER_0_05.code.length > 0, "UniswapV3Fetcher (0.05%) not deployed");
        console.log("UniswapV3Fetcher (0.05%) verified at:", UNISWAP_V3_FETCHER_0_05);
        
        require(UNISWAP_V3_FETCHER_0_3.code.length > 0, "UniswapV3Fetcher (0.3%) not deployed");
        console.log("UniswapV3Fetcher (0.3%) verified at:", UNISWAP_V3_FETCHER_0_3);
        
        require(UNISWAP_V3_FETCHER_1.code.length > 0, "UniswapV3Fetcher (1%) not deployed");
        console.log("UniswapV3Fetcher (1%) verified at:", UNISWAP_V3_FETCHER_1);
        
        require(SUSHISWAP_FETCHER.code.length > 0, "SushiswapFetcher not deployed");
        console.log("SushiswapFetcher verified at:", SUSHISWAP_FETCHER);
        
        require(BALANCER_V2_FETCHER.code.length > 0, "BalancerV2Fetcher not deployed");
        console.log("BalancerV2Fetcher verified at:", BALANCER_V2_FETCHER);

        // Deploy new StreamDaemon (without CREATE2) with DEXs excluding Curve
        console.log("\n--- Deploying New StreamDaemon (Non-CREATE2) ---");
        address[] memory dexs = new address[](6); // 6 DEXs (without Curve)
        address[] memory routers = new address[](6);

        dexs[0] = UNISWAP_V2_FETCHER;
        dexs[1] = UNISWAP_V3_FETCHER_0_05;
        dexs[2] = UNISWAP_V3_FETCHER_0_3;
        dexs[3] = UNISWAP_V3_FETCHER_1;
        dexs[4] = SUSHISWAP_FETCHER;
        dexs[5] = BALANCER_V2_FETCHER;

        routers[0] = UNISWAP_V2_ROUTER;
        routers[1] = UNISWAP_V3_ROUTER;
        routers[2] = UNISWAP_V3_ROUTER;
        routers[3] = UNISWAP_V3_ROUTER;
        routers[4] = SUSHISWAP_ROUTER;
        routers[5] = BALANCER_V2_FETCHER; // Balancer uses fetcher as router

        // Deploy using normal 'new' (not CREATE2) so deployer is owner
        streamDaemon = new StreamDaemon(dexs, routers);
        console.log("StreamDaemon deployed at:", address(streamDaemon));
        console.log("StreamDaemon owner:", streamDaemon.owner());
        require(streamDaemon.owner() == deployer, "StreamDaemon owner mismatch");

        // Deploy new Core contract
        console.log("\n--- Deploying New Core Contract ---");
        core = new Core(
            address(streamDaemon),
            EXISTING_EXECUTOR,
            EXISTING_REGISTRY,
            address(0) // Set ETHSupport post-deployment to resolve circular dependency
        );
        console.log("Core deployed at:", address(core));

        // Configure Core with ETHSupport
        console.log("\n--- Configuring Core with ETHSupport ---");
        core.setETHSupport(EXISTING_ETH_SUPPORT);
        console.log("Core.setETHSupport() executed successfully");
        
        // Verify ETHSupport is set
        ethSupport = core.ethSupport();
        require(address(ethSupport) == EXISTING_ETH_SUPPORT, "ETHSupport not set correctly");
        console.log("ETHSupport verified on Core:", address(ethSupport));

        // Note: Registry configuration doesn't need to change since it only has metadata
        // StreamDaemon will now use the new fetcher arrays without Curve
        console.log("\n--- Configuration Summary ---");
        console.log("Registry router configuration unchanged (contains Curve metadata but won't be used)");
        console.log("StreamDaemon configured with 6 DEXs (Curve excluded)");

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("New Core:", address(core));
        console.log("New StreamDaemon:", address(streamDaemon));
        console.log("StreamDaemon Owner:", streamDaemon.owner());
        console.log("Executor (existing):", EXISTING_EXECUTOR);
        console.log("Registry (existing):", EXISTING_REGISTRY);
        console.log("ETHSupport (existing):", EXISTING_ETH_SUPPORT);
        console.log("\nDEXs in StreamDaemon (6 total, Curve excluded):");
        console.log("  1. UniswapV2Fetcher:", UNISWAP_V2_FETCHER);
        console.log("  2. UniswapV3Fetcher (0.05%):", UNISWAP_V3_FETCHER_0_05);
        console.log("  3. UniswapV3Fetcher (0.3%):", UNISWAP_V3_FETCHER_0_3);
        console.log("  4. UniswapV3Fetcher (1%):", UNISWAP_V3_FETCHER_1);
        console.log("  5. SushiswapFetcher:", SUSHISWAP_FETCHER);
        console.log("  6. BalancerV2Fetcher:", BALANCER_V2_FETCHER);
        console.log("========================\n");

        console.log("Deployment completed successfully!");
        console.log("\nNext steps:");
        console.log("1. Verify Core contract on Etherscan");
        console.log("2. Verify StreamDaemon contract on Etherscan");
        console.log("3. Update deployment addresses JSON");
        console.log("4. Transfer ownership if needed");
    }
}
