// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Registry} from "../src/Registry.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";

/**
 * @title FixOwnershipAndRegisterDEXs
 * @notice Fix the ownership issue and complete DEX registration for deployed protocol
 * @dev This script fixes the ownership issue and registers DEXs in the deployed protocol
 */
contract FixOwnershipAndRegisterDEXs is Script {
    // Deployed contract addresses from the deployment
    address constant REGISTRY_ADDRESS = 0x12bD48cBb8da9f2138bf8C7eDD4165f4566670B6;
    address constant STREAM_DAEMON_ADDRESS = 0xc1DdC2d77E47c5f0AEAEC1781d6dECA3f7b571a5;

    // DEX Routers
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    // DEX Fetcher addresses from deployment
    address constant UNISWAP_V2_FETCHER = 0x43DA7Eafc9d244e93d57E9697d6e8C980Cf61DC1;
    address constant SUSHISWAP_FETCHER = 0xd483AAb5036800D93BbCB2ac4e98c28A970cc28C;

    function run() public {
        vm.startBroadcast();

        console.log("=== Fixing Ownership and Completing DEX Registration ===");
        console.log("Deployer:", msg.sender);
        console.log("Network:", block.chainid);
        console.log("Block:", block.number);
        console.log("");

        // Step 1: Check current Registry ownership
        console.log("Step 1: Checking Registry ownership...");
        Registry registry = Registry(REGISTRY_ADDRESS);
        address currentOwner = registry.owner();
        console.log("Current Registry owner:", currentOwner);
        console.log("Expected owner (deployer):", msg.sender);
        console.log("");

        // Step 2: Transfer Registry ownership to deployer if needed
        if (currentOwner != msg.sender) {
            console.log("Step 2: Transferring Registry ownership to deployer...");
            try registry.transferOwnership(msg.sender) {
                console.log("SUCCESS: Registry ownership transferred to:", msg.sender);
            } catch Error(string memory reason) {
                console.log("FAILED: Failed to transfer ownership:", reason);
                console.log("This might require manual intervention");
                return;
            }
        } else {
            console.log("SUCCESS: Registry ownership already correct");
        }
        console.log("");

        // Step 3: Register DEXs in Registry
        console.log("Step 3: Registering DEXs in Registry...");

        try registry.setRouter("UniswapV2", UNISWAP_V2_ROUTER) {
            console.log("SUCCESS: UniswapV2 registered in Registry");
        } catch Error(string memory reason) {
            console.log("FAILED: Failed to register UniswapV2:", reason);
        }

        try registry.setRouter("Sushiswap", SUSHISWAP_ROUTER) {
            console.log("SUCCESS: Sushiswap registered in Registry");
        } catch Error(string memory reason) {
            console.log("FAILED: Failed to register Sushiswap:", reason);
        }
        console.log("");

        // Step 4: Register DEX fetchers in StreamDaemon
        console.log("Step 4: Registering DEX fetchers in StreamDaemon...");
        StreamDaemon streamDaemon = StreamDaemon(STREAM_DAEMON_ADDRESS);

        try streamDaemon.registerDex(UNISWAP_V2_FETCHER) {
            console.log("UniswapV2 Fetcher registered in StreamDaemon");
        } catch Error(string memory reason) {
            console.log(" Failed to register UniswapV2 Fetcher:", reason);
        }

        try streamDaemon.registerDex(SUSHISWAP_FETCHER) {
            console.log(" Sushiswap Fetcher registered in StreamDaemon");
        } catch Error(string memory reason) {
            console.log(" Failed to register Sushiswap Fetcher:", reason);
        }
        console.log("");

        // Step 5: Verify the setup
        console.log("Step 5: Verifying setup...");

        // Check if DEXs are registered in Registry
        try registry.getRouter("UniswapV2") {
            console.log(" UniswapV2 router verified in Registry");
        } catch {
            console.log(" UniswapV2 router not found in Registry");
        }

        try registry.getRouter("Sushiswap") {
            console.log(" Sushiswap router verified in Registry");
        } catch {
            console.log(" Sushiswap router not found in Registry");
        }

        vm.stopBroadcast();

        console.log("");
        console.log("=== FIX COMPLETE ===");
        console.log("Registry:", REGISTRY_ADDRESS);
        console.log("StreamDaemon:", STREAM_DAEMON_ADDRESS);
        console.log("UniswapV2 Fetcher:", UNISWAP_V2_FETCHER);
        console.log("Sushiswap Fetcher:", SUSHISWAP_FETCHER);
        console.log("=====================");
    }
}
