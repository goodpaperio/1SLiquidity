// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Registry} from "src/Registry.sol";
import {HelperConfig} from "./HelperConfig.s.sol";
import {DeployStreamDaemon} from "./DeployStreamDaemon.s.sol";
import {DeployExecutor} from "./DeployExecutor.s.sol";
import {DeployRegistry} from "./DeployRegistry.s.sol";
import {Core} from "src/Core.sol";
import {StreamDaemon} from "src/StreamDaemon.sol";

contract DeployCore is Script {
    function run() external returns (Core) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        DeployStreamDaemon deployStreamDaemon = new DeployStreamDaemon();
        DeployExecutor deployExecutor = new DeployExecutor();
        DeployRegistry deployRegistry = new DeployRegistry();

        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.DexTypeRouter[] memory dexTypeRouters = helperConfig.getActiveDexTypesRouters();
        address[] memory dexes = helperConfig.getActiveDexes();
        address[] memory routers = helperConfig.getActiveRouters();

        address streamDaemon = address(deployStreamDaemon.createNewStreamDaemon(dexes, routers));
        address executor = address(deployExecutor.createNewExecutor());
        address registry = address(deployRegistry.createNewRegistry(dexTypeRouters));

        vm.startBroadcast(deployerPrivateKey);
        Core core = createNewCore(streamDaemon, executor, registry);
        vm.stopBroadcast();
        return core;
    }

    function createNewCore(address streamDaemon, address executor, address registry) public returns (Core) {
        return new Core(streamDaemon, executor, registry, address(0));
    }
}
