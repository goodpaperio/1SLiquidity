// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../../src/Core.sol";
import "../../../src/StreamDaemon.sol";
import "../../../src/Create2Factory.sol";
import "../../../src/interfaces/IETHSupport.sol";

/**
 * @title DeployBarebonesCore
 * @notice Deploys new Core and StreamDaemon via CREATE2 (deterministic addresses)
 * @dev Run after `forge build --via-ir`. Uses Create2Factory; ownership is transferred to broadcaster.
 *
 *      Optional env (override defaults without editing this file):
 *        DEPLOY_BAREBONES_SALT_TAG     — e.g. "1.0.7" → salts keccak256("StreamDaemon-<tag>") / keccak256("Core-<tag>")
 *        DEPLOY_BAREBONES_REGISTRY     — new Registry from Phase B
 *        DEPLOY_BAREBONES_V3_500       — UniswapV3Fetcher 0.05% (Phase A)
 *        DEPLOY_BAREBONES_V3_3000      — UniswapV3Fetcher 0.3%
 *        DEPLOY_BAREBONES_V3_10000     — UniswapV3Fetcher 1%
 *        DEPLOY_BAREBONES_V2           — optional override UniswapV2 fetcher
 *        DEPLOY_BAREBONES_SUSHI        — optional Sushiswap fetcher
 *        DEPLOY_BAREBONES_BALANCER     — optional BalancerV2 fetcher
 */
contract DeployBarebonesCore is Script {
    // Default existing contract addresses (v1.0.3 / prior mainnet)
    address constant DEFAULT_EXECUTOR = 0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878;
    address constant DEFAULT_REGISTRY = 0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4;
    address constant DEFAULT_ETH_SUPPORT = 0xB970aF8dA1909230a32819602d97a0C0d44C5FB5;

    address constant DEFAULT_UNISWAP_V2_FETCHER = 0xcDd26C4361AEB4b20f9e5A2119C7aac08B9dA089;
    address constant DEFAULT_UNISWAP_V3_FETCHER_0_05 = 0xCB08e56888E59c121AD8745CEA19f75c5cCccF1B;
    address constant DEFAULT_UNISWAP_V3_FETCHER_0_3 = 0xa54f8aE895B33814c1F4824dCcBEd6597CCAc518;
    address constant DEFAULT_UNISWAP_V3_FETCHER_1 = 0xC319A30E3AEFC844F8eD9ca5DCCDAb592299CB43;
    address constant DEFAULT_SUSHISWAP_FETCHER = 0x57cfC5AD0812747afbb3dCD98B23b94883A341BC;
    address constant DEFAULT_BALANCER_V2_FETCHER = 0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6;

    // DEX router addresses
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    string constant DEFAULT_SALT_TAG = "1.0.6";

    Core public core;
    StreamDaemon public streamDaemon;
    IETHSupport public ethSupport;
    Create2Factory public factory;

    function _envAddr(string memory key, address def) internal view returns (address) {
        try vm.envAddress(key) returns (address a) {
            if (a != address(0)) return a;
        } catch {}
        return def;
    }

    function _envSaltTag() internal view returns (string memory) {
        try vm.envString("DEPLOY_BAREBONES_SALT_TAG") returns (string memory t) {
            if (bytes(t).length > 0) return t;
        } catch {}
        return DEFAULT_SALT_TAG;
    }

    function run() external {
        console.log("=== Deploying New Core and StreamDaemon (CREATE2) ===");

        string memory saltTag = _envSaltTag();
        bytes32 saltStream = keccak256(abi.encodePacked("StreamDaemon-", saltTag));
        bytes32 saltCore = keccak256(abi.encodePacked("Core-", saltTag));
        console.log("Salt tag:", saltTag);

        address executorAddr = _envAddr("DEPLOY_BAREBONES_EXECUTOR", DEFAULT_EXECUTOR);
        address registryAddr = _envAddr("DEPLOY_BAREBONES_REGISTRY", DEFAULT_REGISTRY);
        address ethSupportAddr = _envAddr("DEPLOY_BAREBONES_ETH_SUPPORT", DEFAULT_ETH_SUPPORT);

        address uniV2 = _envAddr("DEPLOY_BAREBONES_V2", DEFAULT_UNISWAP_V2_FETCHER);
        address uniV3_500 = _envAddr("DEPLOY_BAREBONES_V3_500", DEFAULT_UNISWAP_V3_FETCHER_0_05);
        address uniV3_3000 = _envAddr("DEPLOY_BAREBONES_V3_3000", DEFAULT_UNISWAP_V3_FETCHER_0_3);
        address uniV3_10000 = _envAddr("DEPLOY_BAREBONES_V3_10000", DEFAULT_UNISWAP_V3_FETCHER_1);
        address sushi = _envAddr("DEPLOY_BAREBONES_SUSHI", DEFAULT_SUSHISWAP_FETCHER);
        address balancer = _envAddr("DEPLOY_BAREBONES_BALANCER", DEFAULT_BALANCER_V2_FETCHER);

        vm.startBroadcast();

        address deployer = tx.origin;
        console.log("Deployer:", deployer);
        console.log("Chain ID:", block.chainid);

        console.log("\n--- Resolved addresses ---");
        console.log("Executor:", executorAddr);
        console.log("Registry:", registryAddr);
        console.log("ETHSupport:", ethSupportAddr);
        console.log("UniswapV2Fetcher:", uniV2);
        console.log("UniswapV3Fetcher 500:", uniV3_500);
        console.log("UniswapV3Fetcher 3000:", uniV3_3000);
        console.log("UniswapV3Fetcher 10000:", uniV3_10000);
        console.log("SushiswapFetcher:", sushi);
        console.log("BalancerV2Fetcher:", balancer);

        require(executorAddr.code.length > 0, "Executor not deployed");
        require(registryAddr.code.length > 0, "Registry not deployed");
        require(ethSupportAddr.code.length > 0, "ETHSupport not deployed");

        require(uniV2.code.length > 0, "UniswapV2Fetcher not deployed");
        require(uniV3_500.code.length > 0, "UniswapV3Fetcher (0.05%) not deployed");
        require(uniV3_3000.code.length > 0, "UniswapV3Fetcher (0.3%) not deployed");
        require(uniV3_10000.code.length > 0, "UniswapV3Fetcher (1%) not deployed");
        require(sushi.code.length > 0, "SushiswapFetcher not deployed");
        require(balancer.code.length > 0, "BalancerV2Fetcher not deployed");
        console.log("Fetchers verified (6 DEXs, Curve excluded)");

        try vm.envAddress("CREATE2_FACTORY_ADDRESS") returns (address factoryAddr) {
            require(factoryAddr != address(0) && factoryAddr.code.length > 0, "CREATE2_FACTORY_ADDRESS invalid");
            factory = Create2Factory(factoryAddr);
            console.log("\n--- Using existing Create2Factory ---");
            console.log("Create2Factory:", address(factory));
        } catch {
            console.log("\n--- Deploying Create2Factory (CREATE) ---");
            factory = new Create2Factory();
            console.log("Create2Factory deployed at:", address(factory));
        }

        address[] memory dexs = new address[](6);
        address[] memory routers = new address[](6);
        dexs[0] = uniV2;
        dexs[1] = uniV3_500;
        dexs[2] = uniV3_3000;
        dexs[3] = uniV3_10000;
        dexs[4] = sushi;
        dexs[5] = balancer;
        routers[0] = UNISWAP_V2_ROUTER;
        routers[1] = UNISWAP_V3_ROUTER;
        routers[2] = UNISWAP_V3_ROUTER;
        routers[3] = UNISWAP_V3_ROUTER;
        routers[4] = SUSHISWAP_ROUTER;
        routers[5] = balancer;

        console.log("\n--- Deploying StreamDaemon (CREATE2) ---");
        bytes memory streamDaemonBytecode = vm.parseJsonBytes(
            vm.readFile("out/StreamDaemon.sol/StreamDaemon.json"),
            ".bytecode.object"
        );
        bytes memory streamDaemonArgs = abi.encode(dexs, routers);
        address streamDaemonAddr = factory.deployWithNameAndTransferOwnership(
            0,
            saltStream,
            streamDaemonBytecode,
            streamDaemonArgs,
            "StreamDaemon"
        );
        streamDaemon = StreamDaemon(streamDaemonAddr);
        console.log("StreamDaemon deployed at:", address(streamDaemon));
        console.log("StreamDaemon owner:", streamDaemon.owner());
        require(streamDaemon.owner() == deployer, "StreamDaemon owner mismatch");

        console.log("\n--- Deploying Core (CREATE2) ---");
        bytes memory coreBytecode = vm.parseJsonBytes(vm.readFile("out/Core.sol/Core.json"), ".bytecode.object");
        bytes memory coreArgs = abi.encode(address(streamDaemon), executorAddr, registryAddr, address(0));
        address coreAddr = factory.deployWithNameAndTransferOwnership(0, saltCore, coreBytecode, coreArgs, "Core");
        core = Core(coreAddr);
        console.log("Core deployed at:", address(core));
        console.log("Core owner:", core.owner());
        require(core.owner() == deployer, "Core owner mismatch");

        console.log("\n--- Configuring Core with ETHSupport ---");
        core.setETHSupport(ethSupportAddr);
        ethSupport = core.ethSupport();
        require(address(ethSupport) == ethSupportAddr, "ETHSupport not set correctly");
        console.log("ETHSupport verified on Core:", address(ethSupport));

        vm.stopBroadcast();

        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("New Core:", address(core));
        console.log("New StreamDaemon:", address(streamDaemon));
        console.log("Create2Factory:", address(factory));
        console.log("StreamDaemon Owner:", streamDaemon.owner());
        console.log("Executor:", executorAddr);
        console.log("Registry:", registryAddr);
        console.log("ETHSupport:", ethSupportAddr);
        console.log("\nDEXs in StreamDaemon (6 total, Curve excluded):");
        console.log("  1. UniswapV2Fetcher:", uniV2);
        console.log("  2. UniswapV3Fetcher (0.05%):", uniV3_500);
        console.log("  3. UniswapV3Fetcher (0.3%):", uniV3_3000);
        console.log("  4. UniswapV3Fetcher (1%):", uniV3_10000);
        console.log("  5. SushiswapFetcher:", sushi);
        console.log("  6. BalancerV2Fetcher:", balancer);
        console.log("========================\n");
        console.log("Deployment completed successfully!");
        console.log("Next steps: Verify Core and StreamDaemon on Etherscan; update deployment JSON.");
    }
}
