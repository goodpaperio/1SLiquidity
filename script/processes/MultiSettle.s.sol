// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../Protocol.s.sol";
import "../../src/Utils.sol";

contract MultiSettle is Protocol {
    // Define missing variables
    address public constant EOA2 = address(0xB0B2); // Second test EOA
    address public constant BOT_EOA = address(0xB0B3); // Bot EOA

    function setUp() public virtual override {
        console.log("MultiSettle: setUp() start");
        super.setUp();

        // Fund EOA2 and BOT_EOA with WETH for testing
        vm.startPrank(WETH_WHALE);
        IERC20(WETH).transfer(EOA2, formatTokenAmount(WETH, 35));
        IERC20(WETH).transfer(BOT_EOA, formatTokenAmount(WETH, 5));
        vm.stopPrank();

        console.log("MultiSettle: setUp() end");
    }

    function run() external virtual override {
        console.log("MultiSettle: run() start");
        // testSettleSingleTrade();
        testSettleBothTrades(); // Commented out as the function is commented
        testBotFeeAccrualAndPayout(); // Test bot fee accrual and payout
        console.log("MultiSettle: run() end");
    }

    function testSettleSingleTrade() public {
        console.log("MultiSettle: testSettleSmallTrade() start");

        // Place 1 WETH trade from EOA2
        uint256 trade1Id = placeTradeFromEOA(EOA2, 1);
        console.log("Placed 1 WETH trade with ID: %s", trade1Id);

        // Execute trades 4 times as bot
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));

        console.log("Core: Bot executing trades");
        vm.startPrank(BOT_EOA);
        core.executeTrades(pairId);
        core.executeTrades(pairId);
        core.executeTrades(pairId);
        // core.executeTrades(pairId);

        // for (uint256 i = 0; i < 4; i++) {
        //     vm.stopPrank();

        //     // Check trade status
        //     checkTradeStatus(trade1Id, "Trade 1");
        //     checkTradeStatus(trade2Id, "Trade 2");
        // }

        // Verify 1 WETH trade is fully settled (deleted from storage)
        vm.expectRevert();
        core.getTrade(trade1Id);
        console.log("SUCCESS: 1 WETH trade fully settled and deleted from storage");

        // Verify 10 WETH trade is still active
        // Utils.Trade memory trade2 = core.getTrade(trade2Id);
        // assertTrue(trade2.owner != address(0), "10 WETH trade should still exist");
        // console.log("SUCCESS: 10 WETH trade still active");

        console.log("MultiSettle: testSettleSmallTrade() end");
    }

    // function testSettleSmallTrade() public {
    //     console.log("MultiSettle: testSettleSmallTrade() start");

    //     // Place 1 WETH trade from test contract
    //     uint256 trade1Id = placeTradeFromEOA(address(this), 1);
    //     console.log("Placed 1 WETH trade with ID: %s", trade1Id);

    //     // Place 10 WETH trade from EOA2
    //     uint256 trade2Id = placeTradeFromEOA(EOA2, 10);
    //     console.log("Placed 10 WETH trade with ID: %s", trade2Id);

    //     // Execute trades 4 times as bot
    //     bytes32 pairId = keccak256(abi.encode(WETH, USDC));

    //     for (uint256 i = 0; i < 4; i++) {
    //         console.log("Bot executing trades - iteration %s", i + 1);
    //         vm.startPrank(BOT_EOA);
    //         core.executeTrades(pairId);
    //         vm.stopPrank();

    //         // Check trade status
    //         checkTradeStatus(trade1Id, "Trade 1");
    //         checkTradeStatus(trade2Id, "Trade 2");
    //     }

    //     // Verify 1 WETH trade is fully settled (deleted from storage)
    //     vm.expectRevert();
    //     core.getTrade(trade1Id);
    //     console.log("SUCCESS: 1 WETH trade fully settled and deleted from storage");

    //     // Verify 10 WETH trade is still active
    //     Utils.Trade memory trade2 = core.getTrade(trade2Id);
    //     assertTrue(trade2.owner != address(0), "10 WETH trade should still exist");
    //     console.log("SUCCESS: 10 WETH trade still active");

    //     console.log("MultiSettle: testSettleSmallTrade() end");
    // }

    function testSettleBothTrades() public {
        console.log("MultiSettle: testSettleBothTrades() start");

        // Place 1 WETH trade from EOA2
        uint256 trade1Id = placeTradeFromEOA(EOA2, 1);
        console.log("Placed 1 WETH trade with ID: %s", trade1Id);

        // Place 10 WETH trade from EOA2
        uint256 trade2Id = placeTradeFromEOA(EOA2, 33);
        console.log("Placed 10 WETH trade with ID: %s", trade2Id);

        // Track bot's USDC balance before executing trades
        uint256 botUsdcBalanceBefore = IERC20(USDC).balanceOf(BOT_EOA);
        console.log("Bot USDC balance before executing trades: %s", botUsdcBalanceBefore);

        // Track protocol fees before executing trades
        uint256 protocolFeesBefore = core.protocolFees(USDC);
        console.log("Protocol fees before executing trades: %s", protocolFeesBefore);

        // Execute trades until both are settled
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256 executionCount = 0;
        uint256 maxExecutions = 50; // Safety limit
        uint256 totalBotFeesAccrued = 0;

        while (executionCount < maxExecutions) {
            executionCount++;
            console.log("Bot executing trades - iteration %s", executionCount);

            // Track bot's balance before this execution
            uint256 botBalanceBeforeExecution = IERC20(USDC).balanceOf(BOT_EOA);

            vm.startPrank(BOT_EOA);
            core.executeTrades(pairId);
            vm.stopPrank();

            // Calculate fees earned in this execution
            uint256 botBalanceAfterExecution = IERC20(USDC).balanceOf(BOT_EOA);
            uint256 protocolFeesAfterExec = core.protocolFees(USDC);

            uint256 botFeesThisExecution = botBalanceAfterExecution - botBalanceBeforeExecution;
            uint256 protocolFeesThisExecution = protocolFeesAfterExec - protocolFeesBefore;

            if (botFeesThisExecution > 0) {
                totalBotFeesAccrued += botFeesThisExecution;
                console.log("Bot earned %s USDC fees in execution %s", botFeesThisExecution, executionCount);

                // Validate that fees are reasonable for this execution
                assertGt(botFeesThisExecution, 0, "Bot fees should be positive");

                // Fees should be reasonable - not more than 200 USDC per execution
                // This accounts for USDC's 6 decimal places and allows for larger trades
                // The 0.1% fee on large trade volumes can result in significant fees
                uint256 maxReasonableFee = 200000000; // 200 USDC (200,000,000 wei)
                assertLt(botFeesThisExecution, maxReasonableFee, "Bot fees seem unreasonably high");
            }

            if (protocolFeesThisExecution > 0) {
                console.log(
                    "Protocol collected %s USDC fees in execution %s", protocolFeesThisExecution, executionCount
                );
            }

            // Log cumulative fees for clarity
            console.log("  Cumulative fees after execution %s:", executionCount);
            console.log("    Bot total: %s USDC", totalBotFeesAccrued);
            console.log("    Protocol total: %s USDC", protocolFeesAfterExec - protocolFeesBefore);

            // Check if both trades are settled
            bool trade1Settled = false;
            bool trade2Settled = false;

            try core.getTrade(trade1Id) returns (Utils.Trade memory t1) {
                if (t1.owner == address(0)) trade1Settled = true;
            } catch {
                trade1Settled = true;
            }

            try core.getTrade(trade2Id) returns (Utils.Trade memory t2) {
                if (t2.owner == address(0)) trade2Settled = true;
            } catch {
                trade2Settled = true;
            }

            if (trade1Settled && trade2Settled) {
                console.log("SUCCESS: Both trades fully settled after %s executions", executionCount);
                break;
            }
        }

        assertTrue(executionCount < maxExecutions, "Max executions reached without settling both trades");

        // ========================================
        // COMPREHENSIVE BOT FEE VALIDATION
        // ========================================
        console.log("=== BOT FEE VALIDATION ===");

        // 1. Verify bot received fees
        uint256 botUsdcBalanceAfter = IERC20(USDC).balanceOf(BOT_EOA);
        uint256 totalFeesReceived = botUsdcBalanceAfter - botUsdcBalanceBefore;

        console.log("Bot USDC balance after: %s", botUsdcBalanceAfter);
        console.log("Total fees received by bot: %s", totalFeesReceived);
        console.log("Total fees accrued during execution: %s", totalBotFeesAccrued);

        // Assert that bot received fees
        assertGt(totalFeesReceived, 0, "Bot should have received fees for settling trades");
        assertEq(totalFeesReceived, totalBotFeesAccrued, "Bot fees received should match fees accrued during execution");

        // 2. Verify protocol fees were collected
        uint256 protocolFeesAfter = core.protocolFees(USDC);
        uint256 totalProtocolFees = protocolFeesAfter - protocolFeesBefore;

        console.log("Protocol fees after: %s", protocolFeesAfter);
        console.log("Total protocol fees collected: %s", totalProtocolFees);

        // Protocol fees should be greater than 0 (10 bps per successful stream)
        assertGt(totalProtocolFees, 0, "Protocol should have collected fees");

        // 3. Verify fee calculations are reasonable
        // Bot fees should be 10 bps (0.1%) of the deltaOut from each successful stream
        // Protocol fees should be 10 bps (0.1%) of the deltaOut from each successful stream
        // Total fees per stream should be 20 bps (0.2%) of deltaOut

        console.log("Fee validation summary:");
        console.log("- Bot received: %s USDC", totalFeesReceived);
        console.log("- Protocol collected: %s USDC", totalProtocolFees);
        console.log("- Total fees: %s USDC", totalFeesReceived + totalProtocolFees);
        console.log("- Both trades settled in %s executions", executionCount);

        // 4. Verify that bot fees are paid immediately (no caching)
        // This is already verified above since we check balance changes after each execution

        // 5. Verify fee events were emitted
        // We can't easily check all events, but we can verify the final state is correct

        // 6. Additional assertions for fee system integrity
        assertTrue(totalFeesReceived > 0, "Bot must receive fees for successful trade execution");
        assertTrue(totalProtocolFees > 0, "Protocol must collect fees for successful trade execution");

        // Fee ratio should be roughly 1:1 (bot:protocol) since both are set to 10 bps
        // Allow for some variance due to rounding and multiple executions
        uint256 feeRatio = (totalFeesReceived * 100) / totalProtocolFees;
        assertTrue(
            feeRatio >= 80 && feeRatio <= 120, "Bot:Protocol fee ratio should be roughly 1:1 (allowing 20% variance)"
        );

        // 7. Validate fee amounts are reasonable
        // Total fees should not exceed 1000 USDC for the entire trade volume
        // This prevents any extreme fee calculations while allowing for reasonable fees
        uint256 maxTotalFees = 1000000000; // 1000 USDC (1,000,000,000 wei)
        assertLt(totalFeesReceived + totalProtocolFees, maxTotalFees, "Total fees exceed reasonable threshold");

        console.log("SUCCESS: Bot fee validation passed!");
        console.log("Fee ratio (Bot:Protocol): %s:100", feeRatio);
        console.log(
            "Total fees validation: %s USDC fees vs %s USDC max reasonable",
            totalFeesReceived + totalProtocolFees,
            maxTotalFees
        );

        console.log("MultiSettle: testSettleBothTrades() end");
    }

    function testBotFeeAccrualAndPayout() public {
        console.log("MultiSettle: testBotFeeAccrualAndPayout() start");

        // Place a single trade to test fee accrual - use EOA2 instead of test contract
        uint256 tradeId = placeTradeFromEOA(EOA2, 1); // 1 WETH trade from EOA2
        console.log("Placed 1 WETH trade with ID: %s", tradeId);

        // Get initial balances
        uint256 botUsdcBalanceBefore = IERC20(USDC).balanceOf(BOT_EOA);
        uint256 protocolFeesBefore = core.protocolFees(USDC);
        uint256 coreUsdcBalanceBefore = IERC20(USDC).balanceOf(address(core));

        console.log("Initial balances:");
        console.log("- Bot USDC: %s", botUsdcBalanceBefore);
        console.log("- Protocol fees: %s", protocolFeesBefore);
        console.log("- Core USDC: %s", coreUsdcBalanceBefore);

        bytes32 pairId = keccak256(abi.encode(WETH, USDC));

        // Execute trades multiple times to accumulate fees
        uint256 totalBotFees = 0;
        uint256 totalProtocolFees = 0;

        for (uint256 i = 0; i < 5; i++) {
            console.log("Execution %s:", i + 1);

            // Check trade status before execution
            Utils.Trade memory tradeBefore = core.getTrade(tradeId);
            console.log(
                "- Trade remaining: %s, realised: %s, sweetSpot: %s",
                tradeBefore.amountRemaining,
                tradeBefore.realisedAmountOut,
                tradeBefore.lastSweetSpot
            );

            // Track balances before execution
            uint256 botBalanceBefore = IERC20(USDC).balanceOf(BOT_EOA);
            uint256 protocolFeesBeforeExec = core.protocolFees(USDC);

            // Execute trades as bot
            vm.startPrank(BOT_EOA);
            core.executeTrades(pairId);
            vm.stopPrank();

            // Calculate fees earned in this execution
            uint256 botBalanceAfter = IERC20(USDC).balanceOf(BOT_EOA);
            uint256 protocolFeesAfterExec = core.protocolFees(USDC);

            uint256 botFeesThisExecution = botBalanceAfter - botBalanceBefore;
            uint256 protocolFeesThisExecution = protocolFeesAfterExec - protocolFeesBeforeExec;

            if (botFeesThisExecution > 0) {
                totalBotFees += botFeesThisExecution;
                console.log("- Bot earned: %s USDC", botFeesThisExecution);
            }

            if (protocolFeesThisExecution > 0) {
                totalProtocolFees += protocolFeesThisExecution;
                console.log("- Protocol collected: %s USDC", protocolFeesThisExecution);
            }

            // Check if trade is settled
            try core.getTrade(tradeId) returns (Utils.Trade memory tradeAfter) {
                if (tradeAfter.owner == address(0)) {
                    console.log("- Trade settled after execution %s", i + 1);
                    break;
                }
            } catch {
                console.log("- Trade settled after execution %s", i + 1);
                break;
            }
        }

        // Final balance checks
        uint256 botUsdcBalanceAfter = IERC20(USDC).balanceOf(BOT_EOA);
        uint256 protocolFeesAfter = core.protocolFees(USDC);
        uint256 coreUsdcBalanceAfter = IERC20(USDC).balanceOf(address(core));

        console.log("Final balances:");
        console.log("- Bot USDC: %s", botUsdcBalanceAfter);
        console.log("- Protocol fees: %s", protocolFeesAfter);
        console.log("- Core USDC: %s", coreUsdcBalanceAfter);

        // Validate fee system
        console.log("=== FEE VALIDATION ===");

        // 1. Bot should have received fees
        uint256 actualBotFeesReceived = botUsdcBalanceAfter - botUsdcBalanceBefore;
        console.log("Bot fees received: %s", actualBotFeesReceived);
        console.log("Bot fees tracked: %s", totalBotFees);

        assertGt(actualBotFeesReceived, 0, "Bot should receive fees for executing trades");
        assertEq(actualBotFeesReceived, totalBotFees, "Bot fees received should match tracked fees");

        // 2. Protocol should have collected fees
        uint256 actualProtocolFees = protocolFeesAfter - protocolFeesBefore;
        console.log("Protocol fees collected: %s", actualProtocolFees);
        console.log("Protocol fees tracked: %s", totalProtocolFees);

        assertGt(actualProtocolFees, 0, "Protocol should collect fees for executing trades");
        assertEq(actualProtocolFees, totalProtocolFees, "Protocol fees should match tracked fees");

        // 3. Fee ratio validation (both set to 10 bps)
        uint256 feeRatio = (actualBotFeesReceived * 100) / actualProtocolFees;
        console.log("Fee ratio (Bot:Protocol): %s:100", feeRatio);

        // Allow 20% variance due to rounding and multiple executions
        assertTrue(feeRatio >= 80 && feeRatio <= 120, "Bot:Protocol fee ratio should be roughly 1:1");

        // 4. Verify immediate payout (no caching)
        // This is verified by checking balance changes after each execution above

        // 5. Verify fee events were emitted
        // We can check the final state which confirms fees were properly processed

        console.log("SUCCESS: Bot fee accrual and payout validation passed!");
        console.log("Total bot fees: %s USDC", totalBotFees);
        console.log("Total protocol fees: %s USDC", totalProtocolFees);

        console.log("MultiSettle: testBotFeeAccrualAndPayout() end");
    }

    function placeTradeFromEOA(address eoa, uint256 wethAmount) internal returns (uint256 tradeId) {
        uint256 amountIn = formatTokenAmount(WETH, wethAmount);
        uint256 amountOutMin = formatTokenAmount(USDC, wethAmount * 1800); // 1800 USDC per WETH

        vm.startPrank(eoa);

        // Approve Core to spend WETH
        approveToken(WETH, address(core), amountIn);

        // Create the trade data
        bytes memory tradeData = abi.encode(
            WETH, // tokenIn
            USDC, // tokenOut
            amountIn, // amountIn
            amountOutMin, // amountOutMin
            false, // isInstasettlable
            false // usePriceBased - set to false for backward compatibility
        );

        // Place trade
        core.placeTrade(tradeData);

        // Get the trade ID
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        tradeId = tradeIds[tradeIds.length - 1]; // Get the latest trade

        vm.stopPrank();

        console.log("Placed %s WETH trade from %s with ID: %s", wethAmount, eoa, tradeId);
    }

    function checkTradeStatus(uint256 tradeId, string memory tradeName) internal view {
        try core.getTrade(tradeId) returns (Utils.Trade memory trade) {
            if (trade.owner == address(0)) {
                console.log("%s: Trade deleted from storage", tradeName);
            } else {
                console.log("%s: Owner=", tradeName);
                console.log("%s", trade.owner);
                console.log("AmountRemaining=", trade.amountRemaining);
                console.log("RealisedAmountOut=", trade.realisedAmountOut);
                console.log("LastSweetSpot=", trade.lastSweetSpot);
            }
        } catch {
            console.log("%s: Trade not found in storage", tradeName);
        }
    }
}
