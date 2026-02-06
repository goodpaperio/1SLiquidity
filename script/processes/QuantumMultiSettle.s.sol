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
        IERC20(WETH).transfer(EOA2, formatTokenAmount(WETH, 20));
        IERC20(WETH).transfer(BOT_EOA, formatTokenAmount(WETH, 5));
        vm.stopPrank();

        console.log("MultiSettle: setUp() end");
    }

    function run() external virtual override {
        console.log("MultiSettle: run() start");
        testSettleSingleTrade();
        // testSettleBothTrades(); // Commented out as the function is commented
        console.log("MultiSettle: run() end");
    }

    function testSettleSingleTrade() public {
        console.log("MultiSettle: testSettleSmallTrade() start");

        // Place 1 WETH trade from test contract
        uint256 trade1Id = placeTradeFromEOA(address(this), 1);
        console.log("Placed 1 WETH trade with ID: %s", trade1Id);

        // // Execute trades 4 times as bot
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));

        //     console.log("Core: Bot executing trades");
        vm.startPrank(BOT_EOA);
        core.executeTrades(pairId);
        core.executeTrades(pairId);
        core.executeTrades(pairId);
        //     // core.executeTrades(pairId);

        // // for (uint256 i = 0; i < 4; i++) {
        // //     vm.stopPrank();

        // //     // Check trade status
        // //     checkTradeStatus(trade1Id, "Trade 1");
        // //     checkTradeStatus(trade2Id, "Trade 2");
        // // }

        // // Verify 1 WETH trade is fully settled (deleted from storage)
        // Utils.Trade memory returnedtrade = core.getTrade(trade1Id);
        // uint256 returnedId = returnedtrade.tradeId;
        // console.log("TESTING ENVIRONMENT: Returned Id is");
        // console.log(returnedId);
        // console.log("SUCCESS: 1 WETH trade fully settled and deleted from storage");

        // // Verify 10 WETH trade is still active
        // // Utils.Trade memory trade2 = core.getTrade(trade2Id);
        // // assertTrue(trade2.owner != address(0), "10 WETH trade should still exist");
        // // console.log("SUCCESS: 10 WETH trade still active");

        // console.log("MultiSettle: testSettleSmallTrade() end");
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

    // function testSettleBothTrades() public {
    //     console.log("MultiSettle: testSettleBothTrades() start");

    //     // Place 1 WETH trade from test contract
    //     uint256 trade1Id = placeTradeFromEOA(address(this), 1);
    //     console.log("Placed 1 WETH trade with ID: %s", trade1Id);

    //     // Place 10 WETH trade from EOA2
    //     uint256 trade2Id = placeTradeFromEOA(EOA2, 10);
    //     console.log("Placed 10 WETH trade with ID: %s", trade2Id);

    //     // Execute trades until both are settled
    //     bytes32 pairId = keccak256(abi.encode(WETH, USDC));
    //     uint256 executionCount = 0;
    //     uint256 maxExecutions = 50; // Safety limit

    //     while (executionCount < maxExecutions) {
    //         executionCount++;
    //         console.log("Bot executing trades - iteration %s", executionCount);

    //         vm.startPrank(BOT_EOA);
    //         core.executeTrades(pairId);
    //         vm.stopPrank();

    //         // Check if both trades are settled
    //         bool trade1Settled = false;
    //         bool trade2Settled = false;

    //         try core.getTrade(trade1Id) returns (Utils.Trade memory t1) {
    //             if (t1.owner == address(0)) trade1Settled = true;
    //         } catch {
    //             trade1Settled = true;
    //         }

    //         try core.getTrade(trade2Id) returns (Utils.Trade memory t2) {
    //             if (t2.owner == address(0)) trade2Settled = true;
    //         } catch {
    //             trade2Settled = true;
    //         }

    //         if (trade1Settled && trade2Settled) {
    //             console.log("SUCCESS: Both trades fully settled after %s executions", executionCount);
    //             break;
    //         }
    //     }

    //     assertTrue(executionCount < maxExecutions, "Max executions reached without settling both trades");

    //     console.log("MultiSettle: testSettleBothTrades() end");
    // }

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
            false, // usePriceBased - set to false for backward compatibility
            100, // instasettleBps - default value
            false // onlyInstasettle - default value
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
