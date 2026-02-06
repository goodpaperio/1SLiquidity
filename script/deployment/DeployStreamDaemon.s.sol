// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {StreamDaemon} from "src/StreamDaemon.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployStreamDaemon is Script {
    function run() external returns (StreamDaemon) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        HelperConfig helperConfig = new HelperConfig();
        address[] memory dexes = helperConfig.getActiveDexes();
        address[] memory routers = helperConfig.getActiveRouters();

        vm.startBroadcast(deployerPrivateKey);
        StreamDaemon streamDaemon = createNewStreamDaemon(dexes, routers);
        vm.stopBroadcast();
        return streamDaemon;
    }

    function createNewStreamDaemon(address[] memory dexes, address[] memory routers) public returns (StreamDaemon) {
        return new StreamDaemon(dexes, routers);
    }
}
