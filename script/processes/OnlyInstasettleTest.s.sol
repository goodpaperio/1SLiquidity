// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../Protocol.s.sol";
import "../../src/Utils.sol";

contract OnlyInstasettleTest is Protocol {
    // Define missing variables
    address public constant EOA2 = address(0xB0B2); // Second test EOA
    address public constant BOT_EOA = address(0xB0B3); // Bot EOA

    function setUp() public virtual override {
        console.log("OnlyInstasettleTest: setUp() start");
        super.setUp();

        // Fund EOA2 and BOT_EOA with WETH for testing
        vm.startPrank(WETH_WHALE);
        IERC20(WETH).transfer(EOA2, formatTokenAmount(WETH, 10));
        IERC20(WETH).transfer(BOT_EOA, formatTokenAmount(WETH, 5));
        vm.stopPrank();

        // Fund BOT_EOA with USDC for settling trades
        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(BOT_EOA, formatTokenAmount(USDC, 10000)); // 10,000 USDC
        vm.stopPrank();

        // Approve Core to spend BOT_EOA's USDC for instasettle
        vm.startPrank(BOT_EOA);
        IERC20(USDC).approve(address(core), type(uint256).max);
        vm.stopPrank();

        console.log("OnlyInstasettleTest: setUp() end");
    }

    function run() external virtual override {
        console.log("OnlyInstasettleTest: run() start");
        testOnlyInstasettleTradeCreation();
        testOnlyInstasettleIgnoredInExecuteTrades();
        testOnlyInstasettleCanBeSettledViaInstasettle();
        testMixedTradesBehavior();
        console.log("OnlyInstasettleTest: run() end");
    }

    function testOnlyInstasettleTradeCreation() public {
        console.log("OnlyInstasettleTest: testOnlyInstasettleTradeCreation() start");

        // Place a trade with onlyInstasettle = true
        uint256 tradeId = placeOnlyInstasettleTrade(EOA2, 1);
        console.log("Placed onlyInstasettle trade with ID: %s", tradeId);

        // Verify trade was created and stored
        Utils.Trade memory trade = core.getTrade(tradeId);
        assertTrue(trade.owner == EOA2, "Trade owner should be EOA2");
        assertTrue(trade.onlyInstasettle == true, "Trade should be marked as onlyInstasettle");
        assertTrue(trade.realisedAmountOut == 0, "Trade should have no realised amount initially");
        assertTrue(trade.amountRemaining == trade.amountIn, "Trade should have full amount remaining");
        assertTrue(trade.lastSweetSpot == 0, "Trade should have no sweet spot initially");

        console.log("SUCCESS: OnlyInstasettle trade created correctly");
        console.log("OnlyInstasettleTest: testOnlyInstasettleTradeCreation() end");
    }

    function testOnlyInstasettleIgnoredInExecuteTrades() public {
        console.log("OnlyInstasettleTest: testOnlyInstasettleIgnoredInExecuteTrades() start");

        // Place a normal trade and an onlyInstasettle trade
        uint256 normalTradeId = placeNormalTrade(EOA2, 1);
        uint256 onlyInstasettleTradeId = placeOnlyInstasettleTrade(EOA2, 1);
        
        console.log("Placed normal trade with ID: %s", normalTradeId);
        console.log("Placed onlyInstasettle trade with ID: %s", onlyInstasettleTradeId);

        // Get initial balances
        uint256 botUsdcBalanceBefore = IERC20(USDC).balanceOf(BOT_EOA);
        uint256 protocolFeesBefore = core.protocolFees(USDC);

        // Execute trades as bot
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        vm.startPrank(BOT_EOA);
        core.executeTrades(pairId);
        vm.stopPrank();

        // Check balances after execution
        uint256 botUsdcBalanceAfter = IERC20(USDC).balanceOf(BOT_EOA);
        uint256 protocolFeesAfter = core.protocolFees(USDC);

        // Verify that fees were earned (from normal trade only)
        assertTrue(botUsdcBalanceAfter > botUsdcBalanceBefore, "Bot should have earned fees from normal trade");
        assertTrue(protocolFeesAfter > protocolFeesBefore, "Protocol should have collected fees from normal trade");

        // Verify that onlyInstasettle trade was not processed
        Utils.Trade memory onlyInstasettleTrade = core.getTrade(onlyInstasettleTradeId);
        assertTrue(onlyInstasettleTrade.owner == EOA2, "OnlyInstasettle trade should still exist");
        assertTrue(onlyInstasettleTrade.realisedAmountOut == 0, "OnlyInstasettle trade should have no realised amount");
        assertTrue(onlyInstasettleTrade.amountRemaining == onlyInstasettleTrade.amountIn, "OnlyInstasettle trade should have full amount remaining");

        console.log("SUCCESS: OnlyInstasettle trade was ignored in executeTrades");
        console.log("OnlyInstasettleTest: testOnlyInstasettleIgnoredInExecuteTrades() end");
    }

    function testOnlyInstasettleCanBeSettledViaInstasettle() public {
        console.log("OnlyInstasettleTest: testOnlyInstasettleCanBeSettledViaInstasettle() start");

        // Place an onlyInstasettle trade
        uint256 tradeId = placeOnlyInstasettleTrade(EOA2, 1);
        console.log("Placed onlyInstasettle trade with ID: %s", tradeId);

        // Verify trade exists
        Utils.Trade memory trade = core.getTrade(tradeId);
        assertTrue(trade.owner == EOA2, "Trade should exist");

        // Settle the trade via instasettle
        vm.startPrank(BOT_EOA);
        core.instasettle(tradeId);
        vm.stopPrank();

        // Verify trade was settled and deleted
        vm.expectRevert();
        core.getTrade(tradeId);
        console.log("SUCCESS: OnlyInstasettle trade was settled via instasettle");

        console.log("OnlyInstasettleTest: testOnlyInstasettleCanBeSettledViaInstasettle() end");
    }

    function testMixedTradesBehavior() public {
        console.log("OnlyInstasettleTest: testMixedTradesBehavior() start");

        // Place multiple trades: normal, onlyInstasettle, normal
        uint256 normalTrade1Id = placeNormalTrade(EOA2, 1);
        uint256 onlyInstasettleTradeId = placeOnlyInstasettleTrade(EOA2, 1);
        uint256 normalTrade2Id = placeNormalTrade(EOA2, 1);

        console.log("Placed normal trade 1 with ID: %s", normalTrade1Id);
        console.log("Placed onlyInstasettle trade with ID: %s", onlyInstasettleTradeId);
        console.log("Placed normal trade 2 with ID: %s", normalTrade2Id);

        // Execute trades multiple times
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256 executionCount = 0;
        uint256 maxExecutions = 10;

        while (executionCount < maxExecutions) {
            executionCount++;
            console.log("Bot executing trades - iteration %s", executionCount);

            vm.startPrank(BOT_EOA);
            core.executeTrades(pairId);
            vm.stopPrank();

            // Check if normal trades are settled
            bool normalTrade1Settled = false;
            bool normalTrade2Settled = false;

            try core.getTrade(normalTrade1Id) returns (Utils.Trade memory t1) {
                if (t1.owner == address(0)) normalTrade1Settled = true;
            } catch {
                normalTrade1Settled = true;
            }

            try core.getTrade(normalTrade2Id) returns (Utils.Trade memory t2) {
                if (t2.owner == address(0)) normalTrade2Settled = true;
            } catch {
                normalTrade2Settled = true;
            }

            if (normalTrade1Settled && normalTrade2Settled) {
                console.log("SUCCESS: Both normal trades settled after %s executions", executionCount);
                break;
            }
        }

        // Verify onlyInstasettle trade is still there and unchanged
        Utils.Trade memory onlyInstasettleTrade = core.getTrade(onlyInstasettleTradeId);
        assertTrue(onlyInstasettleTrade.owner == EOA2, "OnlyInstasettle trade should still exist");
        assertTrue(onlyInstasettleTrade.realisedAmountOut == 0, "OnlyInstasettle trade should have no realised amount");
        assertTrue(onlyInstasettleTrade.amountRemaining == onlyInstasettleTrade.amountIn, "OnlyInstasettle trade should have full amount remaining");

        // Now settle the onlyInstasettle trade via instasettle
        vm.startPrank(BOT_EOA);
        core.instasettle(onlyInstasettleTradeId);
        vm.stopPrank();

        // Verify it was settled
        vm.expectRevert();
        core.getTrade(onlyInstasettleTradeId);
        console.log("SUCCESS: OnlyInstasettle trade was settled via instasettle after normal trades");

        console.log("OnlyInstasettleTest: testMixedTradesBehavior() end");
    }

    function placeNormalTrade(address eoa, uint256 wethAmount) internal returns (uint256 tradeId) {
        uint256 amountIn = formatTokenAmount(WETH, wethAmount);
        uint256 amountOutMin = formatTokenAmount(USDC, wethAmount * 1800); // 1800 USDC per WETH

        vm.startPrank(eoa);

        // Approve Core to spend WETH
        approveToken(WETH, address(core), amountIn);

        // Create the trade data for normal trade
        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            false, // isInstasettlable
            false, // usePriceBased - set to false for backward compatibility
            100, // instasettleBps - default value
            false // onlyInstasettle - false for normal trade
        );

        // Place trade
        core.placeTrade(tradeData);

        // Get the trade ID
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        tradeId = tradeIds[tradeIds.length - 1]; // Get the latest trade

        vm.stopPrank();

        console.log("Placed normal %s WETH trade from %s with ID: %s", wethAmount, eoa, tradeId);
    }

    function placeOnlyInstasettleTrade(address eoa, uint256 wethAmount) internal returns (uint256 tradeId) {
        uint256 amountIn = formatTokenAmount(WETH, wethAmount);
        uint256 amountOutMin = formatTokenAmount(USDC, wethAmount * 1800); // 1800 USDC per WETH

        vm.startPrank(eoa);

        // Approve Core to spend WETH
        approveToken(WETH, address(core), amountIn);

        // Create the trade data for onlyInstasettle trade
        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            true, // isInstasettlable - must be true for instasettle
            false, // usePriceBased - set to false for backward compatibility
            100, // instasettleBps - default value
            true // onlyInstasettle - true for this test
        );

        // Place trade
        core.placeTrade(tradeData);

        // Get the trade ID
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        tradeId = tradeIds[tradeIds.length - 1]; // Get the latest trade

        vm.stopPrank();

        console.log("Placed onlyInstasettle %s WETH trade from %s with ID: %s", wethAmount, eoa, tradeId);
    }
}
