// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Executor} from "src/Executor.sol";

contract DeployExecutor is Script {
    function run() external returns (Executor) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        Executor executor = createNewExecutor();
        vm.stopBroadcast();
        return executor;
    }

    function createNewExecutor() public returns (Executor) {
        return new Executor();
    }
}
