// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Standard WETH interface
interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}

contract WrapETHScript is Script {
    // WETH contract address on Ethereum mainnet
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    
    // Amount of ETH to wrap (0.1 ETH)
    uint256 constant ETH_TO_WRAP = 10 ether;

    function run() external {
        address sender = msg.sender;
        
        console.log("=== ETH Wrapping Script ===");
        console.log("Sender address:", sender);
        
        // Log ETH balance before wrapping
        uint256 ethBalanceBefore = address(sender).balance;
        console.log("ETH balance before wrapping:", ethBalanceBefore);
        console.log("ETH balance in ETH:", ethBalanceBefore / 1e18, "ETH");
        
        // Check if sender has enough ETH to wrap
        if (ethBalanceBefore < ETH_TO_WRAP) {
            console.log("ERROR: Insufficient ETH balance to wrap", ETH_TO_WRAP / 1e18, "ETH");
            console.log("Available ETH:", ethBalanceBefore / 1e18, "ETH");
            return;
        }
        
        // Log WETH balance before wrapping
        uint256 wethBalanceBefore = IERC20(WETH).balanceOf(sender);
        console.log("WETH balance before wrapping:", wethBalanceBefore);
        console.log("WETH balance in WETH:", wethBalanceBefore / 1e18, "WETH");
        
        console.log("\nAttempting to wrap", ETH_TO_WRAP , "ETH to WETH...");
        
        // Start broadcasting transactions
        vm.startBroadcast();
        
        try IWETH(WETH).deposit{value: ETH_TO_WRAP}() {
            console.log("SUCCESS: ETH wrapped to WETH successfully!");
            
            // Log balances after wrapping
            uint256 ethBalanceAfter = address(sender).balance;
            uint256 wethBalanceAfter = IERC20(WETH).balanceOf(sender);
            
            console.log("\n=== Balance Summary ===");
            console.log("ETH balance after wrapping:", ethBalanceAfter);
            console.log("ETH balance in ETH:", (ethBalanceAfter / 1e18), "ETH");
            console.log("WETH balance after wrapping:", wethBalanceAfter);
            console.log("WETH balance in WETH:", (wethBalanceAfter / 1e18), "WETH");
            
            console.log("\n=== Transaction Details ===");
            console.log("ETH spent:", (ethBalanceBefore - ethBalanceAfter) / 1e18, "ETH");
            console.log("WETH received:", (wethBalanceAfter - wethBalanceBefore) / 1e18, "WETH");
            
        } catch Error(string memory reason) {
            console.log("ERROR: Failed to wrap ETH with reason:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("ERROR: Failed to wrap ETH with low level error");
            console.log("Error data length:", lowLevelData.length);
        }
        
        vm.stopBroadcast();
        
        console.log("\n=== Script Complete ===");
    }
} 