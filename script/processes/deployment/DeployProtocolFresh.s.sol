// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../../src/Core.sol";
import "../../../src/StreamDaemon.sol";
import "../../../src/Executor.sol";
import "../../../src/Registry.sol";
import "../../../src/ETHSupport.sol";
import "../../../src/Create2Factory.sol";
import "../../../src/adapters/UniswapV2Fetcher.sol";
import "../../../src/adapters/UniswapV3Fetcher.sol";
import "../../../src/adapters/SushiswapFetcher.sol";

/**
 * @title DeployProtocolFresh
 * @notice One-command fresh protocol deployment for upgrades.
 * @dev Deploys fresh fetchers (V2/Sushi/V3 tiers), Registry, Executor, StreamDaemon (CREATE2), Core (CREATE2), ETHSupport.
 */
contract DeployProtocolFresh is Script {
    address internal constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address internal constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;
    address internal constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address internal constant UNISWAP_V3_QUOTER_V2 = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;

    address internal constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address internal constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address internal constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    address internal constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;

    string internal constant DEFAULT_SALT_TAG = "1.0.9";
    string internal constant OUT_FILE = "deployments/protocol-fresh-mainnet.env";

    function _envSaltTag() internal view returns (string memory) {
        try vm.envString("DEPLOY_FRESH_SALT_TAG") returns (string memory t) {
            if (bytes(t).length > 0) return t;
        } catch {}
        return DEFAULT_SALT_TAG;
    }

    function _envAddrOrZero(string memory key) internal view returns (address) {
        try vm.envAddress(key) returns (address a) {
            return a;
        } catch {
            return address(0);
        }
    }

    /// @dev Default false — Balancer must be explicitly enabled for fresh deploys.
    function _envBool(string memory key, bool def) internal view returns (bool) {
        try vm.envBool(key) returns (bool b) {
            return b;
        } catch {}
        try vm.envString(key) returns (string memory v) {
            bytes32 h = keccak256(bytes(v));
            if (h == keccak256(bytes("1")) || h == keccak256(bytes("true")) || h == keccak256(bytes("yes"))) {
                return true;
            }
            if (h == keccak256(bytes("0")) || h == keccak256(bytes("false")) || h == keccak256(bytes("no"))) {
                return false;
            }
        } catch {}
        return def;
    }

    function run() external {
        console.log("=== DeployProtocolFresh ===");
        string memory saltTag = _envSaltTag();
        bytes32 saltStream = keccak256(abi.encodePacked("StreamDaemon-", saltTag));
        bytes32 saltCore = keccak256(abi.encodePacked("Core-", saltTag));
        console.log("Salt tag:", saltTag);

        vm.startBroadcast();

        // 1) Deploy fetchers
        UniswapV2Fetcher uniV2 = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        SushiswapFetcher sushi = new SushiswapFetcher(SUSHISWAP_FACTORY);
        UniswapV3Fetcher uniV3_100 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 100);
        UniswapV3Fetcher uniV3_500 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 500);
        UniswapV3Fetcher uniV3_3000 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 3000);
        UniswapV3Fetcher uniV3_10000 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, 10000);
        uniV3_100.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        uniV3_500.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        uniV3_3000.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        uniV3_10000.setQuoterV2(UNISWAP_V3_QUOTER_V2);

        // Balancer is opt-in: set DEPLOY_FRESH_INCLUDE_BALANCER=1 and DEPLOY_FRESH_BALANCER_FETCHER to the fetcher.
        address balancerFetcher = _envAddrOrZero("DEPLOY_FRESH_BALANCER_FETCHER");
        bool includeBalancer = _envBool("DEPLOY_FRESH_INCLUDE_BALANCER", false)
            && balancerFetcher != address(0)
            && balancerFetcher.code.length > 0;

        uint256 dexCount = includeBalancer ? 7 : 6;
        address[] memory dexs = new address[](dexCount);
        address[] memory routers = new address[](dexCount);
        dexs[0] = address(uniV2);
        dexs[1] = address(uniV3_100);
        dexs[2] = address(uniV3_500);
        dexs[3] = address(uniV3_3000);
        dexs[4] = address(uniV3_10000);
        dexs[5] = address(sushi);
        routers[0] = UNISWAP_V2_ROUTER;
        routers[1] = UNISWAP_V3_ROUTER;
        routers[2] = UNISWAP_V3_ROUTER;
        routers[3] = UNISWAP_V3_ROUTER;
        routers[4] = UNISWAP_V3_ROUTER;
        routers[5] = SUSHISWAP_ROUTER;
        if (includeBalancer) {
            dexs[6] = balancerFetcher;
            routers[6] = balancerFetcher;
        }

        // 2) Deploy registry and configure routers
        Registry registry = new Registry();
        registry.setRouter("UniswapV2", UNISWAP_V2_ROUTER);
        registry.setRouter("UniswapV3", UNISWAP_V3_ROUTER);
        registry.setRouter("Sushiswap", SUSHISWAP_ROUTER);
        if (includeBalancer) {
            registry.setRouter("BalancerV2", balancerFetcher);
        }

        // 3) Deploy executor
        Executor executor = new Executor();

        // 4) Deploy Create2Factory
        Create2Factory factory = new Create2Factory();

        // 5) Deploy StreamDaemon + Core via CREATE2
        bytes memory streamBytecode = vm.parseJsonBytes(
            vm.readFile("out/StreamDaemon.sol/StreamDaemon.json"),
            ".bytecode.object"
        );
        bytes memory streamArgs = abi.encode(dexs, routers);
        address streamAddr = factory.deployWithNameAndTransferOwnership(
            0,
            saltStream,
            streamBytecode,
            streamArgs,
            "StreamDaemon"
        );
        StreamDaemon streamDaemon = StreamDaemon(streamAddr);

        bytes memory coreBytecode = vm.parseJsonBytes(vm.readFile("out/Core.sol/Core.json"), ".bytecode.object");
        bytes memory coreArgs = abi.encode(address(streamDaemon), address(executor), address(registry), address(0));
        address coreAddr = factory.deployWithNameAndTransferOwnership(
            0,
            saltCore,
            coreBytecode,
            coreArgs,
            "Core"
        );
        Core core = Core(coreAddr);

        // 6) Deploy ETHSupport and configure Core
        ETHSupport ethSupport = new ETHSupport(WETH, address(core));
        core.setETHSupport(address(ethSupport));

        vm.stopBroadcast();

        // 7) Emit summary + write env output
        console.log("Create2Factory:", address(factory));
        console.log("Registry:", address(registry));
        console.log("Executor:", address(executor));
        console.log("StreamDaemon:", address(streamDaemon));
        console.log("Core:", address(core));
        console.log("ETHSupport:", address(ethSupport));
        console.log("UniswapV2Fetcher:", address(uniV2));
        console.log("UniswapV3Fetcher_0_01:", address(uniV3_100));
        console.log("UniswapV3Fetcher_0_05:", address(uniV3_500));
        console.log("UniswapV3Fetcher_0_3:", address(uniV3_3000));
        console.log("UniswapV3Fetcher_1:", address(uniV3_10000));
        console.log("SushiswapFetcher:", address(sushi));
        if (includeBalancer) {
            console.log("BalancerV2Fetcher:", balancerFetcher);
        }

        string memory envFile = string.concat(
            "# Generated by DeployProtocolFresh\n",
            "export DEPLOY_BAREBONES_REGISTRY=",
            vm.toString(address(registry)),
            "\n",
            "export DEPLOY_BAREBONES_EXECUTOR=",
            vm.toString(address(executor)),
            "\n",
            "export DEPLOY_BAREBONES_ETH_SUPPORT=",
            vm.toString(address(ethSupport)),
            "\n",
            "export DEPLOY_BAREBONES_V2=",
            vm.toString(address(uniV2)),
            "\n",
            "export DEPLOY_BAREBONES_V3_100=",
            vm.toString(address(uniV3_100)),
            "\n",
            "export DEPLOY_BAREBONES_V3_500=",
            vm.toString(address(uniV3_500)),
            "\n",
            "export DEPLOY_BAREBONES_V3_3000=",
            vm.toString(address(uniV3_3000)),
            "\n",
            "export DEPLOY_BAREBONES_V3_10000=",
            vm.toString(address(uniV3_10000)),
            "\n",
            "export DEPLOY_BAREBONES_SUSHI=",
            vm.toString(address(sushi)),
            "\n",
            "export DEPLOY_FRESH_STREAM_DAEMON=",
            vm.toString(address(streamDaemon)),
            "\n",
            "export DEPLOY_FRESH_CORE=",
            vm.toString(address(core)),
            "\n"
        );
        vm.writeFile(OUT_FILE, envFile);
        console.log("Wrote deployment env:", OUT_FILE);
    }
}
