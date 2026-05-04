// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../src/Registry.sol";

contract ConfigureRouters is Script {
    // Default registry (v1.0.3); override with env REGISTRY_ADDRESS for a newly deployed Registry
    address constant DEFAULT_REGISTRY = 0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4;

    function _registryAddress() internal view returns (address) {
        try vm.envAddress("REGISTRY_ADDRESS") returns (address a) {
            require(a != address(0), "REGISTRY_ADDRESS zero");
            return a;
        } catch {
            return DEFAULT_REGISTRY;
        }
    }
    
    // DEX router addresses on mainnet
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    
    // Fetcher addresses from v1.0.3 deployment
    address constant BALANCER_FETCHER = 0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6;
    address constant CURVE_FETCHER = 0xdaa78BA8ff44351a7669746209d371bCdD85d062;

    function run() external {
        vm.startBroadcast();

        address REGISTRY = _registryAddress();
        Registry registry = Registry(REGISTRY);
        console.log("Configuring routers in Registry at:", REGISTRY);
        
        // Configure routers for each DEX type
        registry.setRouter("UniswapV2", UNISWAP_V2_ROUTER);
        console.log("UniswapV2 router configured:", UNISWAP_V2_ROUTER);
        
        registry.setRouter("UniswapV3", UNISWAP_V3_ROUTER);
        console.log("UniswapV3 router configured:", UNISWAP_V3_ROUTER);
        
        registry.setRouter("Sushiswap", SUSHISWAP_ROUTER);
        console.log("Sushiswap router configured:", SUSHISWAP_ROUTER);
        
        registry.setRouter("BalancerV2", BALANCER_FETCHER);
        console.log("BalancerV2 router configured:", BALANCER_FETCHER);
        
        registry.setRouter("CurveMeta", CURVE_FETCHER);
        console.log("CurveMeta router configured:", CURVE_FETCHER);
        
        console.log("");
        console.log("All routers configured successfully!");
        
        vm.stopBroadcast();
    }
}

