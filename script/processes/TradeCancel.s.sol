// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "./trade-placement/TradePlacement.s.sol";

contract TradeCancel is TradePlacement {
    function run() external override {
        testCancelTrade();
        test_RevertWhen_CancellingNonExistentTrade();
        test_RevertWhen_CancellingOthersTrade();
    }

    function testCancelTrade() public {
        // First place a trade
        uint256 amountIn = formatTokenAmount(WETH, 1);
        uint256 amountOutMin = formatTokenAmount(USDC, 448);

        // Record balances before trade
        uint256 startWethBalance = getTokenBalance(WETH, address(this));
        uint256 startUsdcBalance = getTokenBalance(USDC, address(this));

        console.log("Initial balances before trade:");
        console.log("WETH:", startWethBalance);
        console.log("USDC:", startUsdcBalance);

        approveToken(WETH, address(core), amountIn);

        // Create the trade data
        bytes memory tradeData = abi.encode(
            WETH,
            USDC,
            amountIn,
            amountOutMin,
            false, // isInstasettlable
            false // usePriceBased - set to false for backward compatibility
        );
        core.placeTrade(tradeData);

        // Get trade ID
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[0];

        // Record balances before cancellation
        uint256 initialWethBalance = getTokenBalance(WETH, address(this));
        uint256 initialUsdcBalance = getTokenBalance(USDC, address(this));

        console.log("Balances after trade placement but before cancellation:");
        console.log("WETH:", initialWethBalance);
        console.log("USDC:", initialUsdcBalance);

        // Get trade details before cancellation
        Utils.Trade memory trade = core.getTrade(tradeId);
        uint256 amountRemaining = trade.amountRemaining;
        uint256 realisedAmountOut = trade.realisedAmountOut;

        // Cancel trade
        bool success = core.cancelTrade(tradeId);
        assertTrue(success, "Trade cancellation failed");

        // Verify balances after cancellation
        uint256 finalWethBalance = getTokenBalance(WETH, address(this));
        uint256 finalUsdcBalance = getTokenBalance(USDC, address(this));

        console.log("Final balances after cancellation:");
        console.log("WETH:", finalWethBalance);
        console.log("USDC:", finalUsdcBalance);

        // Verify exact balance changes
        assertEq(finalWethBalance, initialWethBalance + amountRemaining, "WETH not returned correctly");
        assertEq(finalUsdcBalance, initialUsdcBalance + realisedAmountOut, "USDC not returned correctly");

        // Verify trade is deleted
        vm.expectRevert();
        core.getTrade(tradeId);
    }

    function test_RevertWhen_CancellingNonExistentTrade() public {
        vm.expectRevert("Trade inexistent or being called from null address");
        core.cancelTrade(999_999);
    }

    function test_RevertWhen_CancellingOthersTrade() public {
        // First place a trade
        uint256 amountIn = formatTokenAmount(WETH, 1);
        uint256 amountOutMin = formatTokenAmount(USDC, 448);

        approveToken(WETH, address(core), amountIn);

        // Create the trade data
        bytes memory tradeData = abi.encode(
            WETH,
            USDC,
            amountIn,
            amountOutMin,
            false, // isInstasettlable
            false // usePriceBased - set to false for backward compatibility
        );

        // Place trade
        core.placeTrade(tradeData);

        // Get trade ID
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[0];

        // Try to cancel as a different address
        vm.prank(address(0x123));
        vm.expectRevert("Only trade owner can cancel");
        core.cancelTrade(tradeId);
    }
}
