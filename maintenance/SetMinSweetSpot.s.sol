// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console} from "forge-std/Script.sol";
import {StreamDaemon} from "../src/StreamDaemon.sol";

/**
 * @title SetMinSweetSpot
 * @notice Set StreamDaemon.DEFAULT_SWEET_SPOT (minimum stream count floor).
 *
 * Env:
 *   STREAMDAEMON_ADDRESS — StreamDaemon proxy (defaults to mainnet v2.2.1)
 *   MIN_SWEET_SPOT       — new minimum (required)
 *
 * Example:
 *   source .env
 *   export STREAMDAEMON_ADDRESS=0xfc61Dd8254F07b515b0529032181DA1cC42518c1
 *   export MIN_SWEET_SPOT=2
 *   forge script maintenance/SetMinSweetSpot.s.sol:SetMinSweetSpot \
 *     --rpc-url $MAINNET_RPC_URL --broadcast --account deployKey \
 *     --sender 0x538e5E9797fa86eE25e97289439b6A3AbA0165b0 -vvvv
 */
contract SetMinSweetSpot is Script {
    // mainnet v2.2.1 (versions/deployment-addresses-mainnet-2.2.1.json)
    address constant STREAM_DAEMON_V2_2_1 = 0xfc61Dd8254F07b515b0529032181DA1cC42518c1;
    address constant DEPLOYER = 0x538e5E9797fa86eE25e97289439b6A3AbA0165b0;

    address public streamDaemonAddress;
    uint256 public minSweetSpot;

    function setUp() public {
        try vm.envAddress("STREAMDAEMON_ADDRESS") returns (address a) {
            streamDaemonAddress = a != address(0) ? a : STREAM_DAEMON_V2_2_1;
        } catch {
            streamDaemonAddress = STREAM_DAEMON_V2_2_1;
        }

        minSweetSpot = vm.envUint("MIN_SWEET_SPOT");
        require(minSweetSpot > 0, "MIN_SWEET_SPOT must be > 0");
    }

    function run() external {
        StreamDaemon daemon = StreamDaemon(streamDaemonAddress);
        uint256 before = daemon.DEFAULT_SWEET_SPOT();
        uint256 maximum = daemon.MAXIMUM_SWEET_SPOT();
        address owner = daemon.owner();

        console.log("Network:", block.chainid);
        console.log("StreamDaemon:", streamDaemonAddress);
        console.log("Owner:", owner);
        console.log("Expected broadcaster (deployKey):", DEPLOYER);
        console.log("DEFAULT_SWEET_SPOT before:", before);
        console.log("MAXIMUM_SWEET_SPOT:", maximum);
        console.log("Setting MIN_SWEET_SPOT to:", minSweetSpot);

        require(minSweetSpot <= maximum, "MIN_SWEET_SPOT exceeds MAXIMUM_SWEET_SPOT");
        require(owner == DEPLOYER, "StreamDaemon owner is not deployKey sender");

        vm.startBroadcast();
        daemon.setDefaultSweetSpot(minSweetSpot);
        vm.stopBroadcast();

        uint256 after_ = daemon.DEFAULT_SWEET_SPOT();
        console.log("DEFAULT_SWEET_SPOT after:", after_);
        require(after_ == minSweetSpot, "On-chain value mismatch");
    }
}
