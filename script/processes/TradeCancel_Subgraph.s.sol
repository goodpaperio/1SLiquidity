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
    function _cancelTrade(uint256 tradeId) external returns (bool);
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

contract TradeCancel is Script {
    // === Replace these with your deployed contract addresses ===
    address constant CORE = 0x2451c39ED4f33D0a9A786445C41e68396f7cd80c;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    function run() external {
        // Set up EOA (msg.sender) as the recipient
        address recipient = msg.sender;
        uint256 tradeId = 0; // Replace with actual trade ID to cancel

        console.log("EOA address:", recipient);
        console.log("Trade ID to cancel:", tradeId);
        
        // Store initial balances
        uint256 initialEthBalance = address(recipient).balance;
        uint256 initialWethBalance = IERC20(WETH).balanceOf(recipient);
        uint256 initialUsdcBalance = IERC20(USDC).balanceOf(recipient);
        
        console.log("ETH balance before:", initialEthBalance);
        console.log("WETH balance before:", initialWethBalance);
        console.log("USDC balance before:", initialUsdcBalance);

        // Check Core contract balances before cancellation
        console.log("\n=== Core Contract Balances Before Cancellation ===");
        console.log("Core WETH balance:", IERC20(WETH).balanceOf(CORE));
        console.log("Core USDC balance:", IERC20(USDC).balanceOf(CORE));

        // Get trade details before cancellation
        console.log("\n=== Trade Details Before Cancellation ===");
        (
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
        ) = ICore(CORE).trades(tradeId);

        if (owner == address(0)) {
            console.log("ERROR: Trade does not exist!");
            return;
        }

        console.log("Trade owner:", owner);
        console.log("Token In:", tokenIn);
        console.log("Token Out:", tokenOut);
        console.log("Original amount in:", amountIn);
        console.log("Amount remaining:", amountRemaining);
        console.log("Target amount out:", targetAmountOut);
        console.log("Realised amount out:", realisedAmountOut);
        console.log("Cumulative gas entailed:", cumulativeGasEntailed);
        console.log("Attempts:", attempts);
        console.log("Bot gas allowance:", botGasAllowance_);
        console.log("Last sweet spot:", lastSweetSpot);
        console.log("Is instasettlable:", isInstasettlable);

        // Verify ownership
        if (owner != recipient) {
            console.log("ERROR: Only trade owner can cancel the trade!");
            console.log("Trade owner:", owner);
            console.log("Current caller:", recipient);
            return;
        }

        // Start broadcasting transactions from our EOA
        vm.startBroadcast();

        // Cancel the trade
        console.log("\n=== Cancelling Trade ===");
        console.log("Attempting to cancel trade ID:", tradeId);
        
        try ICore(CORE)._cancelTrade(tradeId) returns (bool success) {
            if (success) {
                console.log("SUCCESS: Trade cancelled successfully!");
            } else {
                console.log("ERROR: Trade cancellation returned false");
                return;
            }
        } catch Error(string memory reason) {
            console.log("ERROR: Failed to cancel trade with reason:", reason);
            return;
        } catch (bytes memory lowLevelData) {
            console.log("ERROR: Failed to cancel trade with low level error");
            return;
        }

        vm.stopBroadcast();

        // Get final balances
        uint256 finalEthBalance = address(recipient).balance;
        uint256 finalWethBalance = IERC20(WETH).balanceOf(recipient);
        uint256 finalUsdcBalance = IERC20(USDC).balanceOf(recipient);

        console.log("\n=== Final Balances ===");
        console.log("ETH balance after:", finalEthBalance);
        console.log("WETH balance after:", finalWethBalance);
        console.log("USDC balance after:", finalUsdcBalance);

        // Check Core contract balances after cancellation
        console.log("\n=== Core Contract Balances After Cancellation ===");
        console.log("Core WETH balance:", IERC20(WETH).balanceOf(CORE));
        console.log("Core USDC balance:", IERC20(USDC).balanceOf(CORE));

        // Verify trade is deleted
        console.log("\n=== Verifying Trade Deletion ===");
        (address ownerAfter,,,,,,,,,,,,,) = ICore(CORE).trades(tradeId);
        if (ownerAfter == address(0)) {
            console.log("SUCCESS: Trade successfully deleted from storage");
        } else {
            console.log("WARNING: Trade still exists in storage");
        }
    }

    // Helper function to find active trades for a specific pair
    function findActiveTrades(address tokenIn, address tokenOut) external view returns (uint256[] memory) {
        bytes32 pairId = keccak256(abi.encode(tokenIn, tokenOut));
        return ICore(CORE).getPairIdTradeIds(pairId);
    }

    // Helper function to list all trades for the current user
    function listUserTrades(address user) external view {
        console.log("=== Listing Trades for User:", user);
        
        // Check WETH -> USDC trades
        bytes32 wethUsdcPairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory wethUsdcTrades = ICore(CORE).getPairIdTradeIds(wethUsdcPairId);
        
        console.log("WETH -> USDC trades found:", wethUsdcTrades.length);
        for (uint256 i = 0; i < wethUsdcTrades.length; i++) {
            uint256 tradeId = wethUsdcTrades[i];
            (
                address owner,
                ,,,,,
                uint256 amountRemaining,
                ,
                uint256 realisedAmountOut,
                ,,,,
                
            ) = ICore(CORE).trades(tradeId);
            
            if (owner == user && amountRemaining > 0) {
                console.log("Active trade ID:", tradeId);
                console.log("  Amount remaining:", amountRemaining);
                console.log("  Realised amount out:", realisedAmountOut);
            }
        }

        // Check USDC -> WETH trades
        bytes32 usdcWethPairId = keccak256(abi.encode(USDC, WETH));
        uint256[] memory usdcWethTrades = ICore(CORE).getPairIdTradeIds(usdcWethPairId);
        
        console.log("USDC -> WETH trades found:", usdcWethTrades.length);
        for (uint256 i = 0; i < usdcWethTrades.length; i++) {
            uint256 tradeId = usdcWethTrades[i];
            (
                address owner,
                ,,,,,
                uint256 amountRemaining,
                ,
                uint256 realisedAmountOut,
                ,,,,
                
            ) = ICore(CORE).trades(tradeId);
            
            if (owner == user && amountRemaining > 0) {
                console.log("Active trade ID:", tradeId);
                console.log("  Amount remaining:", amountRemaining);
                console.log("  Realised amount out:", realisedAmountOut);
            }
        }
    }
} 