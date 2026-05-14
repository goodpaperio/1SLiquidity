// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../../src/StreamDaemon.sol";

/// @notice Optional: point an existing Core at the newly deployed StreamDaemon (same owner as msg.sender).
interface ICoreSetStreamDaemon {
    function setStreamDaemon(address _streamDaemon) external;
}

/**
 * @title DeployStreamDaemonFromManifest
 * @notice Deploy a new StreamDaemon using the same fetcher + router ordering as `DeployProtocolFresh` / v1.0.9 manifest.
 * @dev Usage (dry run):
 *      forge script script/processes/deployment/DeployStreamDaemonFromManifest.s.sol:DeployStreamDaemonFromManifest \
 *        --rpc-url $MAINNET_RPC_URL --via-ir -vvv
 *      Broadcast:
 *        forge script ... --broadcast --account deployKey
 *      Optional: set Core on-chain after deploy (deployer must be Core owner):
 *        STREAM_DAEMON_SET_CORE=1 forge script ... --broadcast --account deployKey
 *      Manifest path (default versions/deployment-addresses-mainnet-1.0.9.json):
 *        STREAM_DAEMON_MANIFEST=versions/deployment-addresses-mainnet-1.0.9.json
 *      Balancer excluded by default even if the manifest lists BalancerV2Fetcher; opt in with:
 *        STREAM_DAEMON_INCLUDE_BALANCER=1
 *      Extract deployed address from broadcast:
 *        jq -r '.transactions[] | select(.contractName=="StreamDaemon") | .contractAddress' \
 *          broadcast/DeployStreamDaemonFromManifest.s.sol/1/run-latest.json
 */
contract DeployStreamDaemonFromManifest is Script {
    address internal constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address internal constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address internal constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;

    function _manifestPath() internal view returns (string memory) {
        try vm.envString("STREAM_DAEMON_MANIFEST") returns (string memory p) {
            if (bytes(p).length > 0) return p;
        } catch {}
        return "versions/deployment-addresses-mainnet-1.0.9.json";
    }

    function _boolEnv(string memory key, bool def) internal view returns (bool) {
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
        string memory path = _manifestPath();
        string memory json = vm.readFile(path);

        address v2 = vm.parseJsonAddress(json, ".contracts.UniswapV2Fetcher");
        address v3_100 = vm.parseJsonAddress(json, ".contracts.UniswapV3Fetcher_0_01");
        address v3_500 = vm.parseJsonAddress(json, ".contracts.UniswapV3Fetcher_0_05");
        address v3_3000 = vm.parseJsonAddress(json, ".contracts.UniswapV3Fetcher_0_3");
        address v3_10000 = vm.parseJsonAddress(json, ".contracts.UniswapV3Fetcher_1");
        address sushi = vm.parseJsonAddress(json, ".contracts.SushiswapFetcher");
        address balancer = vm.parseJsonAddress(json, ".contracts.BalancerV2Fetcher");
        address coreAddr = vm.parseJsonAddress(json, ".contracts.Core");

        bool includeBalancer = _boolEnv("STREAM_DAEMON_INCLUDE_BALANCER", false) && balancer != address(0);
        uint256 cap = includeBalancer ? 7 : 6;
        address[] memory dexs = new address[](cap);
        address[] memory routers = new address[](cap);

        dexs[0] = v2;
        routers[0] = UNISWAP_V2_ROUTER;
        dexs[1] = v3_100;
        routers[1] = UNISWAP_V3_ROUTER;
        dexs[2] = v3_500;
        routers[2] = UNISWAP_V3_ROUTER;
        dexs[3] = v3_3000;
        routers[3] = UNISWAP_V3_ROUTER;
        dexs[4] = v3_10000;
        routers[4] = UNISWAP_V3_ROUTER;
        dexs[5] = sushi;
        routers[5] = SUSHISWAP_ROUTER;
        if (cap == 7) {
            dexs[6] = balancer;
            routers[6] = balancer;
        }

        console.log("Manifest:", path);
        console.log("Dex count:", cap);

        vm.startBroadcast();
        StreamDaemon sd = new StreamDaemon(dexs, routers);
        address deployed = address(sd);
        console.log("Deployed StreamDaemon:", deployed);

        if (_boolEnv("STREAM_DAEMON_SET_CORE", false)) {
            ICoreSetStreamDaemon(coreAddr).setStreamDaemon(deployed);
            console.log("Core.setStreamDaemon called on:", coreAddr);
        }

        vm.stopBroadcast();

        console.log("--- export for bots / env ---");
        console.log("STREAM_DAEMON_ADDRESS=", deployed);
    }
}
