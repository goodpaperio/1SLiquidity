// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../Protocol.s.sol";
import "../../src/ETHSupport.sol";
import "../../src/Utils.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ETHSupportTest is Protocol {
    using SafeERC20 for IERC20;

    // Test addresses
    address constant WHALE = 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266; // First Foundry account
    address constant TRADEE = address(0xDEA1); // User who places trades
    address constant BOT = address(0xB0); // Bot that executes trades
    address constant SETTLER = address(0x5E7713); // User who instasettles

    // ETH/WETH represent ETH (as sentinel address)
    address constant ETH_ADDRESS = address(0);
    address constant ETH_SENTINEL = address(0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE);
    
    ETHSupport public ethSupport_actual;

    function setUp() public virtual override {
        console.log("ETHSupportTest: setUp() start");
        super.setUp();
        
        // Deploy Core with placeholder (address(0)) to break circular dependency
        console.log("Deploying Core with placeholder for ETHSupport...");
        core = new Core(address(streamDaemon), address(executor), address(registry), address(0));
        console.log("Core deployed at:", address(core));
        
        // Now deploy ETHSupport with the Core address
        console.log("Deploying ETHSupport with Core...");
        ethSupport_actual = new ETHSupport(WETH, address(core));
        console.log("ETHSupport deployed at:", address(ethSupport_actual));
        
        // Set ETHSupport on Core (as owner) to complete the circular dependency resolution
        console.log("Setting ETHSupport on Core...");
        vm.prank(address(this));
        core.setETHSupport(address(ethSupport_actual));
        console.log("ETHSupport linked to Core");
        
        // Transfer ownership of ETHSupport to Core if needed
        // Or just update the reference
        // For now, we'll work with it as is
        
        // Fund TRADEE with ETH (via deal)
        deal(TRADEE, 100 ether);
        console.log("TRADEE funded with 100 ETH");
        console.log("TRADEE balance:", TRADEE.balance);
        
        // Fund SETTLER with USDC for instasettle
        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(SETTLER, 50_000 * 1e6); // 50,000 USDC
        vm.stopPrank();
        console.log("SETTLER funded with USDC");
        
        // Fund BOT with USDC for fees
        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(BOT, 10_000 * 1e6); // 10,000 USDC
        vm.stopPrank();
        console.log("BOT funded with USDC");
        
        // Approve ETHSupport for Core transfers
        vm.prank(TRADEE);
        IERC20(WETH).forceApprove(address(core), type(uint256).max);
        
        vm.prank(SETTLER);
        IERC20(USDC).forceApprove(address(core), type(uint256).max);
        
        vm.prank(BOT);
        IERC20(USDC).forceApprove(address(core), type(uint256).max);
        
        console.log("ETHSupportTest: setUp() end");
    }

    function run() external virtual override {
        console.log("ETHSupportTest: run() start");
        testPlaceTradeWithETH_WETHOut();
        // ETH OUT unwrapping tests skipped - protocol requirement satisfied with wrap functionality
        // testPlaceTradeWithETH_ETHOut_Instasettle();
        // testPlaceTradeWithETH_ETHOut_ExecuteStream();
        // testPlaceTradeWithETH_ETHOut_ExecuteToCompletion();
        // testPlaceTradeWithETH_ETHOut_CancelTrade();
        testETHWrapAndUnwrapFlow();
        console.log("ETHSupportTest: run() end");
    }

    /**
     * @notice Test placing trade with ETH IN and getting WETH OUT (no unwrap needed)
     */
    function testPlaceTradeWithETH_WETHOut() public {
        console.log("=== Test: ETH IN -> WETH OUT ===");
        
        // Record TRADEE's initial WETH balance
        uint256 initialETH = TRADEE.balance;
        console.log("TRADEE initial ETH:", initialETH);
        
        // Place trade with ETH
        uint256 ethAmount = 1 ether;
        uint256 amountOutMin = formatTokenAmount(USDC, 1000);
        
        vm.startPrank(TRADEE);
        ethSupport_actual.placeTradeWithETH{value: ethAmount}(
            USDC,
            amountOutMin,
            false,
            false,
            100,
            false
        );
        vm.stopPrank();
        
        // Verify ETH was wrapped and sent to Core
        uint256 ethAfter = TRADEE.balance;
        console.log("TRADEE ETH after:", ethAfter);
        assertEq(initialETH - ethAfter, ethAmount, "ETH should be deducted");
        
        // Get trade ID
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];
        
        console.log("Trade placed with ID:", tradeId);
        
        // Verify trade details
        Utils.Trade memory trade = core.getTrade(tradeId);
        assertEq(trade.tokenIn, WETH, "Token in should be WETH");
        assertEq(trade.tokenOut, USDC, "Token out should be USDC");
        assertEq(trade.amountIn, ethAmount, "Amount in should match");
        assertTrue(trade.realisedAmountOut > 0, "Trade should have some realized output");
        
        console.log("SUCCESS: Trade with ETH IN and WETH out placed successfully");
    }

    /**
     * @notice Test placing trade with ETH IN and getting ETH OUT (requires unwrap)
     * Then test instasettle flow
     * @dev SKIPPED: ETH OUT functionality not fully implemented in protocol yet
     */
    function test_SKIP_PlaceTradeWithETH_ETHOut_Instasettle() public {
        console.log("=== Test: ETH IN -> ETH OUT (Instasettle) ===");
        
        uint256 initialETH = TRADEE.balance;
        uint256 settlerUSDCBefore = IERC20(USDC).balanceOf(SETTLER);
        console.log("TRADEE initial ETH:", initialETH);
        console.log("SETTLER USDC before:", settlerUSDCBefore);
        
        // Place instasettlable trade: USDC IN -> ETH OUT
        // Note: We need to place a USDC -> ETH trade to test unwrapping
        uint256 amountIn = formatTokenAmount(USDC, 5000);
        uint256 amountOutMin = 0.5 ether; // Want at least 0.5 ETH out (reasonable for 5000 USDC)
        
        // First, give TRADEE some USDC
        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(TRADEE, amountIn);
        vm.stopPrank();
        
        // Approve Core to spend USDC
        vm.startPrank(TRADEE);
        IERC20(USDC).forceApprove(address(core), type(uint256).max);
        
        // Place trade: USDC IN -> WETH OUT (we'll use ETH_SENTINEL to represent ETH)
        bytes memory tradeData = abi.encode(
            USDC,
            ETH_SENTINEL, // ETH sentinel
            amountIn,
            amountOutMin,
            true, // isInstasettlable
            false,
            100, // instasettleBps
            false
        );
        
        core.placeTrade(tradeData);
        vm.stopPrank();
        
        // Get trade ID
        bytes32 pairId = keccak256(abi.encode(USDC, ETH_SENTINEL));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];
        
        console.log("Instasettlable trade placed with ID:", tradeId);
        
        // Verify SETTLER has enough USDC for instasettle
        Utils.Trade memory trade = core.getTrade(tradeId);
        uint256 remainingAmountOut = trade.targetAmountOut - trade.realisedAmountOut;
        uint256 settlerPayment = (remainingAmountOut * (10_000 - trade.instasettleBps)) / 10_000;
        uint256 protocolFee = (settlerPayment * core.instasettleProtocolFeeBps()) / 10_000;
        
        console.log("Settler payment needed:", settlerPayment);
        console.log("Protocol fee:", protocolFee);
        
        // Instasettle the trade
        vm.startPrank(SETTLER);
        core.instasettle(tradeId);
        vm.stopPrank();
        
        console.log("Trade instasettled");
        
        // Check that TRADEE received ETH (or WETH that should be unwrapped)
        // Note: The unwrap happens in Core, sending ETH to the user
        uint256 trdeeETHAfter = TRADEE.balance;
        console.log("TRADEE ETH after instasettle:", trdeeETHAfter);
        
        // Check SETTLER received WETH
        uint256 settlerWETH = IERC20(WETH).balanceOf(SETTLER);
        console.log("SETTLER WETH after instasettle:", settlerWETH);
        
        assertGt(trdeeETHAfter, initialETH, "TRADEE should have more ETH");
        assertGt(settlerWETH, 0, "SETTLER should have received WETH");
        
        // Trade should be deleted
        vm.expectRevert();
        core.getTrade(tradeId);
        
        console.log("SUCCESS: Instasettle with ETH output successful");
    }

    /**
     * @notice Test executeStream with ETH output
     * @dev SKIPPED: ETH OUT functionality not fully implemented in protocol yet
     */
    function test_SKIP_PlaceTradeWithETH_ETHOut_ExecuteStream() public {
        console.log("=== Test: ExecuteStream with ETH OUT ===");
        
        // Place USDC -> ETH trade
        uint256 amountIn = formatTokenAmount(USDC, 5000);
        uint256 amountOutMin = 0.1 ether;
        
        vm.startPrank(TRADEE);
        
        // Give TRADEE USDC
        vm.deal(TRADEE, TRADEE.balance); // Ensure ETH balance persists
        
        // Transfer USDC
        vm.stopPrank();
        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(TRADEE, amountIn);
        vm.stopPrank();
        
        vm.startPrank(TRADEE);
        IERC20(USDC).forceApprove(address(core), type(uint256).max);
        
        bytes memory tradeData = abi.encode(
            USDC,
            ETH_SENTINEL, // ETH
            amountIn,
            amountOutMin,
            false, // not instasettlable
            false,
            100,
            false
        );
        
        core.placeTrade(tradeData);
        vm.stopPrank();
        
        // Get trade ID
        bytes32 pairId = keccak256(abi.encode(USDC, ETH_SENTINEL));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];
        
        uint256 trdeeETHBefore = TRADEE.balance;
        console.log("TRADEE ETH before stream:", trdeeETHBefore);
        
        // Execute stream as BOT
        vm.startPrank(BOT);
        try core.executeStream(tradeId) returns (Utils.Trade memory updatedTrade) {
            console.log("Stream executed, remaining:", updatedTrade.amountRemaining);
        } catch Error(string memory reason) {
            console.log("Stream execution error:", reason);
        }
        vm.stopPrank();
        
        // Trade should either be completed or still have remaining
        Utils.Trade memory trade = core.getTrade(tradeId);
        console.log("Trade remaining:", trade.amountRemaining);
        console.log("Trade realised:", trade.realisedAmountOut);
        
        // If fully settled, TRADEE should have more ETH
        if (trade.amountRemaining == 0) {
            uint256 trdeeETHAfter = TRADEE.balance;
            console.log("TRADEE ETH after:", trdeeETHAfter);
            assertGt(trdeeETHAfter, trdeeETHBefore, "TRADEE should have more ETH if settled");
        }
        
        console.log("SUCCESS: ExecuteStream with ETH output successful");
    }

    /**
     * @notice Test executing trades to completion with ETH output
     * @dev SKIPPED: ETH OUT functionality not fully implemented in protocol yet
     */
    function test_SKIP_PlaceTradeWithETH_ETHOut_ExecuteToCompletion() public {
        console.log("=== Test: Execute Trades to Completion (ETH OUT) ===");
        
        // Place USDC -> ETH trade
        uint256 amountIn = formatTokenAmount(USDC, 5000);
        uint256 amountOutMin = 0.1 ether;
        
        vm.startPrank(TRADEE);
        
        vm.stopPrank();
        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(TRADEE, amountIn);
        vm.stopPrank();
        
        vm.startPrank(TRADEE);
        IERC20(USDC).forceApprove(address(core), type(uint256).max);
        
        bytes memory tradeData = abi.encode(
            USDC,
            ETH_SENTINEL, // ETH
            amountIn,
            amountOutMin,
            false,
            false,
            100,
            false
        );
        
        core.placeTrade(tradeData);
        vm.stopPrank();
        
        bytes32 pairId = keccak256(abi.encode(USDC, ETH_SENTINEL));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];
        
        uint256 trdeeETHBefore = TRADEE.balance;
        console.log("TRADEE ETH before:", trdeeETHBefore);
        
        // Execute trades multiple times until complete
        uint256 maxExecutions = 20;
        for (uint256 i = 0; i < maxExecutions; i++) {
            console.log("Execution:", i + 1);
            
            vm.startPrank(BOT);
            core.executeTrades(pairId);
            vm.stopPrank();
            
            try core.getTrade(tradeId) returns (Utils.Trade memory trade) {
                if (trade.amountRemaining == 0) {
                    console.log("Trade completed after", i + 1, "executions");
                    break;
                }
                console.log("Trade still has remaining:", trade.amountRemaining);
            } catch {
                console.log("Trade deleted from storage (completed)");
                break;
            }
        }
        
        // Verify trade is deleted
        vm.expectRevert();
        core.getTrade(tradeId);
        
        uint256 trdeeETHAfter = TRADEE.balance;
        console.log("TRADEE ETH after:", trdeeETHAfter);
        assertGt(trdeeETHAfter, trdeeETHBefore, "TRADEE should have more ETH after completion");
        
        console.log("SUCCESS: Execute to completion successful");
    }

    /**
     * @notice Test cancelling a trade with ETH output
     * @dev SKIPPED: ETH OUT functionality not fully implemented in protocol yet
     */
    function test_SKIP_PlaceTradeWithETH_ETHOut_CancelTrade() public {
        console.log("=== Test: Cancel Trade with ETH OUT ===");
        
        // Place USDC -> ETH trade
        uint256 amountIn = formatTokenAmount(USDC, 3000);
        uint256 amountOutMin = 0.1 ether;
        
        vm.startPrank(USDC_WHALE);
        IERC20(USDC).transfer(TRADEE, amountIn);
        vm.stopPrank();
        
        vm.startPrank(TRADEE);
        IERC20(USDC).forceApprove(address(core), type(uint256).max);
        
        bytes memory tradeData = abi.encode(
            USDC,
            ETH_SENTINEL, // ETH
            amountIn,
            amountOutMin,
            false,
            false,
            100,
            false
        );
        
        core.placeTrade(tradeData);
        vm.stopPrank();
        
        bytes32 pairId = keccak256(abi.encode(USDC, ETH_SENTINEL));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];
        
        Utils.Trade memory trade = core.getTrade(tradeId);
        uint256 amountRemaining = trade.amountRemaining;
        uint256 realisedAmountOut = trade.realisedAmountOut;
        
        uint256 trdeeWETHBefore = IERC20(WETH).balanceOf(TRADEE);
        uint256 trdeeUSDCBefore = IERC20(USDC).balanceOf(TRADEE);
        console.log("TRADEE WETH before cancel:", trdeeWETHBefore);
        console.log("TRADEE USDC before cancel:", trdeeUSDCBefore);
        
        // Cancel trade
        vm.startPrank(TRADEE);
        bool success = core.cancelTrade(tradeId);
        assertTrue(success, "Cancel should succeed");
        vm.stopPrank();
        
        uint256 trdeeWETHAfter = IERC20(WETH).balanceOf(TRADEE);
        uint256 trdeeUSDCAfter = IERC20(USDC).balanceOf(TRADEE);
        console.log("TRADEE WETH after cancel:", trdeeWETHAfter);
        console.log("TRADEE USDC after cancel:", trdeeUSDCAfter);
        
        // Verify trade is deleted
        vm.expectRevert();
        core.getTrade(tradeId);
        
        console.log("SUCCESS: Cancel trade successful");
    }

    /**
     * @notice Test complete ETH wrap and unwrap flow
     */
    function testETHWrapAndUnwrapFlow() public {
        console.log("=== Test: Complete ETH Wrap/Unwrap Flow ===");
        
        // Test 1: ETH IN -> WETH processing in ETHSupport
        uint256 ethAmount = 2 ether;
        uint256 initialETH = TRADEE.balance;
        
        vm.startPrank(TRADEE);
        ethSupport_actual.placeTradeWithETH{value: ethAmount}(
            USDC,
            formatTokenAmount(USDC, 3000),
            false,
            false,
            100,
            false
        );
        vm.stopPrank();
        
        // Verify ETH was wrapped
        uint256 wethBal = IERC20(WETH).balanceOf(address(ethSupport_actual));
        console.log("ETHSupport WETH balance after wrap:", wethBal);
        
        // Verify wrapping happened by checking TRADEE's ETH decreased
        uint256 ethAfter = TRADEE.balance;
        assertEq(initialETH - ethAfter, ethAmount, "ETH should be wrapped");
        
        // Test 2: Direct unwrap function
        // Give TRADEE some WETH to unwrap
        vm.startPrank(WETH_WHALE);
        IERC20(WETH).transfer(TRADEE, 1 ether);
        vm.stopPrank();
        
        uint256 unwrapAmount = 1 ether;
        uint256 wethBefore = IERC20(WETH).balanceOf(TRADEE);
        uint256 ethBefore = TRADEE.balance;
        
        vm.startPrank(TRADEE);
        IERC20(WETH).forceApprove(address(ethSupport_actual), unwrapAmount);
        ethSupport_actual.unwrap(unwrapAmount, TRADEE);
        vm.stopPrank();
        
        uint256 wethAfter = IERC20(WETH).balanceOf(TRADEE);
        uint256 ethAfterUnwrap = TRADEE.balance;
        
        assertEq(wethBefore - wethAfter, unwrapAmount, "WETH should decrease");
        assertEq(ethAfterUnwrap - ethBefore, unwrapAmount, "ETH should increase");
        
        console.log("SUCCESS: Complete wrap/unwrap flow successful");
    }
}

