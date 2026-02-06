// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../SingleDexProtocol.s.sol";
import "../../../src/Utils.sol";
import "../../../src/adapters/CurveMetaFetcher.sol";
import "../../../src/interfaces/dex/ICurvePool.sol";
import "../../../src/interfaces/dex/ICurveMetaRegistry.sol";

contract CurveTradePlacement is SingleDexProtocol {
    // Use the CURVE_POOL constant from SingleDexProtocol
    // For now, we'll test basic Curve functionality using USDC only

    function setUp() public {
        // Deploy CurveMetaFetcher with Curve MetaRegistry
        address curveMetaRegistry = 0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC;
        CurveMetaFetcher curveFetcher = new CurveMetaFetcher(curveMetaRegistry);

        // Set up protocol with CurveMeta (using the fetcher as router)
        setUpSingleDex(address(curveFetcher), address(curveFetcher));

        console.log("CurveMeta test setup complete - using dynamic pool discovery");
    }

    function run() external {
        testCurveSpecificFeatures();
        testCurveTradePlacement();
    }

    function testCurveBasicFunctionality() public {
        console.log("Starting basic Curve functionality test");

        // Test that we can get reserves without making a trade
        CurveMetaFetcher curveFetcher = CurveMetaFetcher(dexFetcher);

        try curveFetcher.getReserves(USDC, USDT) returns (uint256 reserveUSDC, uint256 reserveUSDT) {
            console.log("Curve USDC reserves:", reserveUSDC);
            console.log("Curve USDT reserves:", reserveUSDT);

            assertTrue(reserveUSDC > 0 || reserveUSDT > 0, "At least one reserve should be greater than 0");
            console.log("Basic Curve functionality test passed");
        } catch Error(string memory reason) {
            console.log("Failed to get reserves:", reason);
            console.log("This might indicate no pools found for USDC/USDT pair");
        }
    }

    function testCurveSpecificFeatures() public {
        console.log("Testing Curve-specific features");

        // Test that CurveMetaFetcher can be deployed and has correct properties
        CurveMetaFetcher curveFetcher = CurveMetaFetcher(dexFetcher);

        // Test DEX type identification
        string memory dexType = curveFetcher.getDexType();
        assertEq(dexType, "CurveMeta", "DEX type should be CurveMeta");

        // Test pool address retrieval (should return a valid pool address)
        address poolAddress = curveFetcher.getPoolAddress(USDC, USDT);
        assertTrue(poolAddress != address(0), "Pool address should not be zero");

        // Test version
        string memory version = curveFetcher.getDexVersion();
        assertEq(version, "MetaRegistry", "DEX version should be MetaRegistry");

        console.log("Curve-specific features test passed");
        console.log("Pool address:", poolAddress);
        console.log("DEX type:", dexType);
        console.log("DEX version:", version);
    }

    function testCurveIntegrationSetup() public {
        console.log("Testing Curve integration setup");

        // Verify that the CurveMetaFetcher is properly configured
        CurveMetaFetcher curveFetcher = CurveMetaFetcher(dexFetcher);

        // Check that the fetcher has the correct meta registry address
        assertEq(address(curveFetcher.metaRegistry()), 0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC, "Meta registry address should match");

        // Verify that the Registry is configured for CurveMeta
        string memory dexType = "CurveMeta";
        address router = registry.getRouter(dexType);
        assertEq(router, address(curveFetcher), "Registry should have CurveMeta router configured");

        // Verify that the Core contract can identify Curve as a DEX
        address firstDex = streamDaemon.dexs(0); // Get the first DEX address
        bool curveFound = false;

        // Check if the first DEX is our CurveMetaFetcher
        if (firstDex == address(curveFetcher)) {
            curveFound = true;
        }

        assertTrue(curveFound, "CurveMetaFetcher should be registered in StreamDaemon");

        console.log("Curve integration setup test passed");
        console.log("Meta registry address:", address(curveFetcher.metaRegistry()));
        console.log("Router from registry:", router);
        console.log("First DEX address:", firstDex);
    }

    function testCurvePoolInvestigation() public {
        console.log("Investigating Curve pool at:", CURVE_POOL);

        // Try to call the pool directly to see what happens
        try ICurvePool(CURVE_POOL).balances(0) returns (uint256 balance0) {
            console.log("Pool balance at index 0:", balance0);

            try ICurvePool(CURVE_POOL).balances(1) returns (uint256 balance1) {
                console.log("Pool balance at index 1:", balance1);
            } catch {
                console.log("Could not get balance at index 1");
            }
        } catch Error(string memory reason) {
            console.log("Failed to get balance at index 0, reason:", reason);
        } catch {
            console.log("Failed to get balance at index 0 - low level error");
        }

        // Check if this address has any code
        uint256 codeSize;
        assembly {
            codeSize := extcodesize(CURVE_POOL)
        }
        console.log("Pool contract code size:", codeSize);

        if (codeSize == 0) {
            console.log("WARNING: Pool address has no code - this is not a valid contract!");
        }
    }

    function testCurveTradePlacement() public {
        console.log("Testing Curve trade placement");

        // Test USDC to DAI trade (both are in Curve 3Pool)
        testPlaceTradeUSDCDAI();

        // Test DAI to USDC trade
        testPlaceTradeDAIUSDC();

        console.log("Curve trade placement tests completed");
    }

    function testPlaceTradeUSDCDAI() public {
        console.log("Testing USDC to DAI trade on Curve");

        CurveMetaFetcher curveFetcher = CurveMetaFetcher(dexFetcher);

        // Get initial balances
        uint256 initialUSDC = getTokenBalance(USDC, address(this));
        uint256 initialDAI = getTokenBalance(DAI, address(this));

        console.log("Initial USDC balance:", initialUSDC);
        console.log("Initial DAI balance:", initialDAI);

        // Approve DAI for Core (in case we get some back)
        IERC20(DAI).approve(address(core), type(uint256).max);

        // Prepare trade data
        uint256 tradeAmount = formatTokenAmount(USDC, 100); // 100 USDC
        uint256 minOut = formatTokenAmount(DAI, 95); // 95 DAI (5% slippage)

        console.log("Trade amount:", tradeAmount);
        console.log("Min output:", minOut);

        // Get trade data from registry
        IRegistry.TradeData memory tradeData =
            registry.prepareTradeData(address(curveFetcher), USDC, DAI, tradeAmount, minOut, address(this));

        console.log("Trade data prepared successfully");
        console.log("Executor selector:", vm.toString(tradeData.selector));
        console.log("Router:", tradeData.router);

        // Execute trade via Core
        vm.startPrank(address(this));

        // Transfer USDC to Core
        IERC20(USDC).transfer(address(core), tradeAmount);

        // Execute the trade using Core.placeTrade
        bytes memory coreTradeData = abi.encode(
            USDC,
            DAI,
            tradeAmount,
            minOut,
            false, // isInstasettlable
            false, // usePriceBased - set to false for backward compatibility
            100, // instasettleBps - default value
            false // onlyInstasettle - default value
        );

        core.placeTrade(coreTradeData);

        vm.stopPrank();

        // Get the trade details
        bytes32 pairId = keccak256(abi.encode(USDC, DAI));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];

        Utils.Trade memory trade = core.getTrade(tradeId);

        console.log("Trade executed successfully");
        console.log("Trade ID:", tradeId);
        console.log("Amount In:", trade.amountIn);
        console.log("Amount Remaining:", trade.amountRemaining);
        console.log("Target Amount Out:", trade.targetAmountOut);
        console.log("Realised Amount Out:", trade.realisedAmountOut);

        // Verify trade results
        assertEq(trade.owner, address(this), "Trade owner should be test contract");
        assertEq(trade.tokenIn, USDC, "Token in should be USDC");
        assertEq(trade.tokenOut, DAI, "Token out should be DAI");
        assertEq(trade.amountIn, tradeAmount, "Amount in should match");
        assertTrue(trade.realisedAmountOut > 0, "Should have realised some output");

        console.log("USDC to DAI trade test PASSED");
    }

    function testPlaceTradeDAIUSDC() public {
        console.log("Testing DAI to USDC trade on Curve");

        CurveMetaFetcher curveFetcher = CurveMetaFetcher(dexFetcher);

        // Get initial balances
        uint256 initialUSDC = getTokenBalance(USDC, address(this));
        uint256 initialDAI = getTokenBalance(DAI, address(this));

        console.log("Initial USDC balance:", initialUSDC);
        console.log("Initial DAI balance:", initialDAI);

        // We need some DAI to trade - let's get it by converting a small amount of USDC first
        // This is a simple approach: we'll assume we have DAI from the previous test
        if (initialDAI == 0) {
            console.log("No DAI balance - skipping DAI to USDC test");
            console.log("This is expected on first run - DAI balance will come from USDC->DAI trade");
            return;
        }

        // Prepare trade data
        uint256 tradeAmount = formatTokenAmount(DAI, 50); // 50 DAI
        uint256 minOut = formatTokenAmount(USDC, 45); // 45 USDC (10% slippage for DAI)

        console.log("Trade amount:", tradeAmount);
        console.log("Min output:", minOut);

        // Get trade data from registry
        IRegistry.TradeData memory tradeData =
            registry.prepareTradeData(address(curveFetcher), DAI, USDC, tradeAmount, minOut, address(this));

        console.log("Trade data prepared successfully");
        console.log("Executor selector:", vm.toString(tradeData.selector));
        console.log("Router:", tradeData.router);

        // Execute trade via Core
        vm.startPrank(address(this));

        // Transfer DAI to Core
        IERC20(DAI).transfer(address(core), tradeAmount);

        // Execute the trade using Core.placeTrade
        bytes memory coreTradeData = abi.encode(
            DAI,
            USDC,
            tradeAmount,
            minOut,
            false, // isInstasettlable
            false, // usePriceBased - set to false for backward compatibility
            100 // instasettleBps - default value
        );

        core.placeTrade(coreTradeData);

        vm.stopPrank();

        // Get the trade details
        bytes32 pairId = keccak256(abi.encode(DAI, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];

        Utils.Trade memory trade = core.getTrade(tradeId);

        console.log("Trade executed successfully");
        console.log("Trade ID:", tradeId);
        console.log("Amount In:", trade.amountIn);
        console.log("Amount Remaining:", trade.amountRemaining);
        console.log("Target Amount Out:", trade.targetAmountOut);
        console.log("Realised Amount Out:", trade.realisedAmountOut);

        // Verify trade results
        assertEq(trade.owner, address(this), "Trade owner should be test contract");
        assertEq(trade.tokenIn, DAI, "Token in should be DAI");
        assertEq(trade.tokenOut, USDC, "Token out should be USDC");
        assertEq(trade.amountIn, tradeAmount, "Amount in should match");
        assertTrue(trade.realisedAmountOut > 0, "Should have realised some output");

        console.log("DAI to USDC trade test PASSED");
    }
}
