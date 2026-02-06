// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Test} from "forge-std/Test.sol";
import {DeployExecutor} from "script/deployment/DeployExecutor.s.sol";
import {DeployStreamDaemon} from "script/deployment/DeployStreamDaemon.s.sol";
import {HelperConfig} from "script/deployment/HelperConfig.s.sol";
import {DeployRegistry} from "script/deployment/DeployRegistry.s.sol";
import {DeployCore} from "script/deployment/DeployCore.s.sol";
import {StreamDaemon} from "src/StreamDaemon.sol";
import {Executor} from "src/Executor.sol";
import {Registry} from "src/Registry.sol";
import {Core} from "src/Core.sol";

contract Deploys is Test {
    HelperConfig.DexTypeRouter[] public activeDexTypesRouters;
    address[] public dexes;
    address[] public routers;
    uint256 public activeLastGasUsed;

    Executor public executor;
    StreamDaemon public streamDaemon;
    Registry public registry;
    Core public core;

    function setUp() public virtual {
        HelperConfig helperConfig = new HelperConfig();
        activeDexTypesRouters = helperConfig.getActiveDexTypesRouters();
        dexes = helperConfig.getActiveDexes();
        routers = helperConfig.getActiveRouters();

        _deployExecutor();
        _deployStreamDaemon();
        _deployRegistry();
        _deployCore();
    }

    function _deployExecutor() internal {
        DeployExecutor deployExecutor = new DeployExecutor();
        executor = deployExecutor.createNewExecutor();
    }

    function _deployStreamDaemon() internal {
        DeployStreamDaemon deployStreamDaemon = new DeployStreamDaemon();
        streamDaemon = deployStreamDaemon.createNewStreamDaemon(dexes, routers);
    }

    function _deployRegistry() internal {
        DeployRegistry deployRegistry = new DeployRegistry();
        registry = deployRegistry.createNewRegistry(activeDexTypesRouters);
    }

    function _deployCore() internal {
        DeployCore deployCore = new DeployCore();
        core = deployCore.createNewCore(address(streamDaemon), address(executor), address(registry));
    }
}
