// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "../src/adapters/UniswapV3Fetcher.sol";

contract SetQuoterV2 is Script {
    // Uniswap V3 QuoterV2 address on mainnet
    address constant UNISWAP_V3_QUOTER_V2 = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;
    
    // The deployed UniswapV3Fetcher address (update this after deployment)
    address constant UNISWAP_V3_FETCHER = 0x0000000000000000000000000000000000000000; // UPDATE THIS
    
    function run() external {
        require(UNISWAP_V3_FETCHER != address(0), "Please update UNISWAP_V3_FETCHER address");
        
        vm.startBroadcast();
        
        UniswapV3Fetcher fetcher = UniswapV3Fetcher(UNISWAP_V3_FETCHER);
        
        // Set QuoterV2 address
        fetcher.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        
        console.log("QuoterV2 set successfully!");
        console.log("Fetcher address:", UNISWAP_V3_FETCHER);
        console.log("QuoterV2 address:", UNISWAP_V3_QUOTER_V2);
        
        vm.stopBroadcast();
    }
}
