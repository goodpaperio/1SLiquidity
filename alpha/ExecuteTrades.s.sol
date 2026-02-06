// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "lib/forge-std/src/Script.sol";
import "lib/forge-std/src/console.sol";
import "../src/Core.sol";

contract ExecuteTrades is Script {
    function run() external {
        // Get the pairId from command line argument
        string memory pairIdStr = vm.envString("PAIR_ID");
        bytes32 pairId = vm.parseBytes32(pairIdStr);
        
        // Get the Core contract address
        address coreAddress = vm.envAddress("CORE_ADDRESS");
        
        // Create contract instance
        Core core = Core(coreAddress);
        
        // Start broadcasting transactions
        vm.startBroadcast();
        
        // Execute trades for the given pairId
        core.executeTrades(pairId);
        
        // Stop broadcasting
        vm.stopBroadcast();
        
        console.log("Executed trades for pairId:", vm.toString(pairId));
    }
}
