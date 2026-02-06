// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {Create2Factory} from "../../../src/Create2Factory.sol";
import {Core} from "../../../src/Core.sol";
import {StreamDaemon} from "../../../src/StreamDaemon.sol";
import {Executor} from "../../../src/Executor.sol";
import {Registry} from "../../../src/Registry.sol";
import {UniswapV2Fetcher} from "../../../src/adapters/UniswapV2Fetcher.sol";
import {SushiswapFetcher} from "../../../src/adapters/SushiswapFetcher.sol";

/**
 * @title ComputeAddresses
 * @notice Compute expected CREATE2 addresses for all contracts before deployment
 * @dev This script helps verify the deterministic addresses that will be used
 */
contract ComputeAddresses is Script {
    // DEX Factories (same as DeployBarebones)
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;

    function run() external {
        console.log("Computing expected CREATE2 addresses for 1SLiquidity Barebones Protocol");
        console.log("Network:", block.chainid);
        console.log("");

        // Generate base salt (same as DeployBarebones)
        bytes32 baseSalt = keccak256(abi.encodePacked("1SLiquidity", "Barebones", block.chainid, "v1.0.0"));
        console.log("Base Salt:", vm.toString(baseSalt));
        console.log("");

        // Note: We can't compute exact addresses without the CREATE2 factory address
        // But we can show the salt structure and explain the process
        console.log("Salt Structure:");

        bytes32 registrySalt = keccak256(abi.encodePacked(baseSalt, "Registry"));
        bytes32 streamDaemonSalt = keccak256(abi.encodePacked(baseSalt, "StreamDaemon"));
        bytes32 executorSalt = keccak256(abi.encodePacked(baseSalt, "Executor"));
        bytes32 coreSalt = keccak256(abi.encodePacked(baseSalt, "Core"));
        bytes32 uniswapV2Salt = keccak256(abi.encodePacked(baseSalt, "UniswapV2Fetcher"));
        bytes32 sushiswapSalt = keccak256(abi.encodePacked(baseSalt, "SushiswapFetcher"));

        console.log("  Registry Salt:", vm.toString(registrySalt));
        console.log("  StreamDaemon Salt:", vm.toString(streamDaemonSalt));
        console.log("  Executor Salt:", vm.toString(executorSalt));
        console.log("  Core Salt:", vm.toString(coreSalt));
        console.log("  UniswapV2Fetcher Salt:", vm.toString(uniswapV2Salt));
        console.log("  SushiswapFetcher Salt:", vm.toString(sushiswapSalt));
        console.log("");

        console.log("To compute exact addresses:");
        console.log("1. Deploy CREATE2 Factory first");
        console.log("2. Use factory.computeAddress(salt, bytecode, constructorArgs)");
        console.log("3. Or run the deployment script with --dry-run to see addresses");
        console.log("");

        console.log("Expected deployment order:");
        console.log("1. CREATE2 Factory (non-deterministic address)");
        console.log("2. DEX Fetchers (deterministic via CREATE2)");
        console.log("3. Registry (deterministic via CREATE2)");
        console.log("4. StreamDaemon (deterministic via CREATE2)");
        console.log("5. Executor (deterministic via CREATE2)");
        console.log("6. Core (deterministic via CREATE2)");
        console.log("");

        console.log("All contracts except CREATE2 Factory will have deterministic addresses");
        console.log("that can be computed before deployment using the salts above.");
    }
}
