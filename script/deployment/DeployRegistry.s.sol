// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.30;

import {Script, console} from "forge-std/Script.sol";
import {Registry} from "src/Registry.sol";
import {HelperConfig} from "./HelperConfig.s.sol";

contract DeployRegistry is Script {
    function run() external returns (Registry) {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        HelperConfig helperConfig = new HelperConfig();
        HelperConfig.DexTypeRouter[] memory dexTypeRouters = helperConfig.getActiveDexTypesRouters();

        vm.startBroadcast(deployerPrivateKey);
        Registry registry = createNewRegistry(dexTypeRouters);
        vm.stopBroadcast();
        return registry;
    }

    function createNewRegistry(HelperConfig.DexTypeRouter[] memory dexTypeRouters) public returns (Registry) {
        Registry registry = new Registry();
        for (uint256 i = 0; i < dexTypeRouters.length; i++) {
            registry.setRouter(dexTypeRouters[i].dexType, dexTypeRouters[i].router);
        }

        return registry;
    }
}
