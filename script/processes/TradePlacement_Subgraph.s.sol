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

interface ICore {
    function placeTrade(bytes calldata tradeData) external payable;
    function getPairIdTradeIds(bytes32 pairId) external view returns (uint256[] memory);
    function trades(uint256 tradeId) external view returns (
        address owner,
        uint96 cumulativeGasEntailed,
        uint8 attempts,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 amountRemaining,
        uint256 targetAmountOut,
        uint256 realisedAmountOut,
        uint256 tradeId_,
        uint256 instasettleBps,
        uint256 botGasAllowance_,
        uint256 lastSweetSpot,
        bool isInstasettlable
    );
}

contract TradePlacement is Script {
    // === Replace these with your deployed contract addresses ===
    address constant CORE = 0x2451c39ED4f33D0a9A786445C41e68396f7cd80c;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    function run() external {
        // Set up EOA (msg.sender) as the recipient
        address recipient = msg.sender;
        uint256 amountWETH = 1 ether; // 1 WETH

        console.log("EOA address:", recipient);
        console.log("ETH balance before:", address(recipient).balance);
        console.log("WETH balance before:", IERC20(WETH).balanceOf(recipient));
        console.log("USDC balance before:", IERC20(USDC).balanceOf(recipient));

        // Check Core contract balances before trade
        console.log("\n=== Core Contract Balances Before Trade ===");
        console.log("Core WETH balance:", IERC20(WETH).balanceOf(CORE));
        console.log("Core USDC balance:", IERC20(USDC).balanceOf(CORE));

        // Start broadcasting transactions from our EOA
        vm.startBroadcast();

        // 1. Wrap ETH to WETH (only if needed)
        console.log("\n=== Checking WETH Balance ===");
        uint256 currentWETHBalance = IERC20(WETH).balanceOf(recipient);
        console.log("Current WETH balance:", currentWETHBalance);
        console.log("Required WETH amount:", amountWETH);
        
        if (currentWETHBalance >= amountWETH) {
            console.log("SUCCESS: Already have sufficient WETH balance, skipping wrapping!");
        } else {
            console.log("=== Wrapping ETH to WETH ===");
            console.log("Attempting to wrap", amountWETH / 1e18, "ETH to WETH...");
            
            try IWETH(WETH).deposit{value: amountWETH}() {
                console.log("SUCCESS: ETH wrapped to WETH successfully!");
                console.log("WETH balance after wrapping:", IERC20(WETH).balanceOf(recipient));
            } catch Error(string memory reason) {
                console.log("ERROR: Failed to wrap ETH with reason:", reason);
                return;
            } catch (bytes memory lowLevelData) {
                console.log("ERROR: Failed to wrap ETH with low level error");
                return;
            }
        }

        // 3. Approve Core to spend WETH (as EOA)
        console.log("\n=== Approving WETH for Core ===");
        console.log("Allowance before approval:", IERC20(WETH).allowance(recipient, CORE));
        IERC20(WETH).approve(CORE, amountWETH);
        console.log("Allowance after approval:", IERC20(WETH).allowance(recipient, CORE));
        

        // 4. Place trade (WETH -> USDC) as EOA
        console.log("\n=== Placing Trade ===");
        uint256 amountOutMin = 448 * 1e6; // Example min USDC out (adjust as needed)
        uint256 botGasAllowance = 0.0005 ether;
        bytes memory tradeData = abi.encode(
            WETH,
            USDC,
            amountWETH,
            amountOutMin,
            false, // isInstasettlable
            false, // usePriceBased - set to false for backward compatibility
            100, // instasettleBps - default value
            false // onlyInstasettle - default value
        );
        
        console.log("Trade data details:");
        console.log("- Token In (WETH):", WETH);
        console.log("- Token Out (USDC):", USDC);
        console.log("- Amount In:", amountWETH);
        console.log("- Amount Out Min:", amountOutMin);
        console.log("- Bot Gas Allowance:", botGasAllowance);
        
        ICore(CORE).placeTrade(tradeData);
        console.log("Placed WETH->USDC trade via Core");

        vm.stopBroadcast();

        console.log("\n=== Final Balances ===");
        console.log("ETH balance after:", address(recipient).balance);
        console.log("WETH balance after:", IERC20(WETH).balanceOf(recipient));
        console.log("USDC balance after:", IERC20(USDC).balanceOf(recipient));

        // Check Core contract balances after trade
        console.log("\n=== Core Contract Balances After Trade ===");
        console.log("Core WETH balance:", IERC20(WETH).balanceOf(CORE));
        console.log("Core USDC balance:", IERC20(USDC).balanceOf(CORE));
    }
} 