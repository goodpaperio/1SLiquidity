// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";

interface ISetQuoterV2 {
    function setQuoterV2(address _quoter) external;
}

contract SetQuoterV2PhaseA is Script {
    address constant QUOTER_V2 = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;

    function run() external {
        address v3_500   = vm.envAddress("DEPLOY_BAREBONES_V3_500");
        address v3_3000  = vm.envAddress("DEPLOY_BAREBONES_V3_3000");
        address v3_10000 = vm.envAddress("DEPLOY_BAREBONES_V3_10000");

        console.log("Setting QuoterV2 on all three fetchers...");
        vm.startBroadcast();
        ISetQuoterV2(v3_500).setQuoterV2(QUOTER_V2);
        ISetQuoterV2(v3_3000).setQuoterV2(QUOTER_V2);
        ISetQuoterV2(v3_10000).setQuoterV2(QUOTER_V2);
        vm.stopBroadcast();
        console.log("Done. QuoterV2 set on all three fetchers.");
    }
}
