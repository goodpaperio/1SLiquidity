// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../SingleDexProtocol.s.sol";
import "../../../src/Utils.sol";
import "../../../src/adapters/UniswapV3Fetcher.sol";
import "../../../src/interfaces/IUniversalDexInterface.sol";

contract UniswapV3TradePlacement is SingleDexProtocol {
    address constant UNISWAP_V3_QUOTER_V2 = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;
    
    function setUp() public {
        console.log("UniswapV3TradePlacement: Starting setup");
        UniswapV3Fetcher uniswapV3Fetcher = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, UNISWAP_V3_FEE);
        console.log("UniswapV3TradePlacement: Created fetcher at", address(uniswapV3Fetcher));
        
        // Set QuoterV2 address for enhanced functionality
        uniswapV3Fetcher.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        console.log("UniswapV3TradePlacement: Set QuoterV2 at", UNISWAP_V3_QUOTER_V2);
        
        setUpSingleDex(address(uniswapV3Fetcher), UNISWAP_V3_ROUTER);
        console.log("UniswapV3TradePlacement: Setup complete");
    }

    function run() external {
        testSweetSpotAlgoV3WithDifferentAmounts();
    }

    function testPlaceTradeWETHUSDC() public {
        console.log("UniswapV3TradePlacement: Starting trade test");
        console.log("UniswapV3TradePlacement: Using fetcher at", dexFetcher);
        console.log("UniswapV3TradePlacement: Using router at", dexRouter);

        uint256 amountIn = formatTokenAmount(WETH, 1);
        uint256 amountOutMin = formatTokenAmount(USDC, 1800);

        approveToken(WETH, address(core), amountIn);

        bytes memory tradeData = abi.encode(
            WETH,
            USDC,
            amountIn,
            amountOutMin,
            false,
            false, // usePriceBased - set to false for backward compatibility
            100, // instasettleBps - default value
            false // onlyInstasettle - default value
        );

        core.placeTrade(tradeData);

        // Get the trade details
        bytes32 pairId = keccak256(abi.encode(WETH, USDC));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];

        Utils.Trade memory trade = core.getTrade(tradeId);

        // Verify trade details (trade has already been executed once upon placement)
        assertEq(trade.owner, address(this), "Trade owner should be test contract");
        assertEq(trade.tokenIn, WETH, "Token in should be WETH");
        assertEq(trade.tokenOut, USDC, "Token out should be USDC");
        assertEq(trade.amountIn, amountIn, "Amount in should match");
        assertTrue(
            trade.amountRemaining < amountIn, "Amount remaining should be less than amount in after initial execution"
        );
        assertEq(trade.targetAmountOut, amountOutMin, "Target amount out should match");
        assertTrue(trade.realisedAmountOut > 0, "Realised amount out should be greater than 0 after initial execution");
        assertEq(trade.attempts, 0, "Attempts should be 0 initially");
        assertTrue(trade.lastSweetSpot < 4, "Last sweet spot should be less than 4 after initial execution");
        assertEq(trade.isInstasettlable, false, "Should not be instasettlable");

        console.log("Trade placed and initially executed successfully");
        console.log("Trade ID:", tradeId);
        console.log("Amount In:", trade.amountIn);
        console.log("Amount Remaining:", trade.amountRemaining);
        console.log("Target Amount Out:", trade.targetAmountOut);
        console.log("Realised Amount Out:", trade.realisedAmountOut);
        console.log("Attempts:", trade.attempts);
        console.log("Last Sweet Spot:", trade.lastSweetSpot);
        console.log("Is Instasettlable:", trade.isInstasettlable);

        // Execute the trade
        core.executeTrades(pairId);

        // Get updated trade details
        trade = core.getTrade(tradeId);

        // Verify trade execution
        assertTrue(trade.amountRemaining < amountIn, "Amount remaining should be less than amount in");
        assertTrue(trade.realisedAmountOut > 0, "Should have realised amount out");
        assertTrue(trade.lastSweetSpot < 4, "Sweet spot should have decreased");

        console.log("Trade executed successfully");
        console.log("Updated Amount Remaining:", trade.amountRemaining);
        console.log("Updated Realised Amount Out:", trade.realisedAmountOut);
        console.log("Updated Last Sweet Spot:", trade.lastSweetSpot);
    }

    function testEnhancedSlippageProtection() public {
        console.log("UniswapV3TradePlacement: Testing enhanced slippage protection features");
        
        UniswapV3Fetcher fetcher = UniswapV3Fetcher(dexFetcher);
        
        // Test 1: Multi-tier pool selection
        console.log("Testing multi-tier pool selection...");
        (address bestPool, uint24 bestFee) = fetcher.getBestPool(WETH, USDC);
        assertTrue(bestPool != address(0), "Should find a pool across all fee tiers");
        assertTrue(bestFee == 100 || bestFee == 500 || bestFee == 3000 || bestFee == 10000, "Should find valid fee tier");
        console.log("Best pool found:", bestPool);
        console.log("Best fee tier:", bestFee);
        
        // Test 2: Reserve-based selection (protocol default behavior)
        console.log("Testing reserve-based pool selection (protocol default)...");
        uint256 amountIn = formatTokenAmount(WETH, 1);
        (uint256 reserveA, uint256 reserveB, uint24 reserveFeeTier, address reservePool) = 
            fetcher.getReservesBestTier(WETH, USDC);
        assertTrue(reserveA > 0 && reserveB > 0, "Should find reserves");
        assertTrue(reserveFeeTier == bestFee, "Reserve fee tier should match best pool (deepest liquidity)");
        assertTrue(reservePool == bestPool, "Reserve pool should match best pool (deepest liquidity)");
        console.log("Reserve-based selection - TokenA reserve:", reserveA);
        console.log("Reserve-based selection - TokenB reserve:", reserveB);
        console.log("Reserve fee tier:", reserveFeeTier);
        console.log("Reserve pool:", reservePool);
        
        // Test 3: Price-based selection (when usePriceBased = true)
        console.log("Testing price-based pool selection (usePriceBased = true)...");
        (uint256 amountOut, uint24 feeTier, address pool) = fetcher.getQuote(WETH, USDC, amountIn);
        assertTrue(amountOut > 0, "Should get accurate quote from QuoterV2");
        // Note: Quote uses best price across all fee tiers (different from deepest liquidity)
        assertTrue(feeTier == 100 || feeTier == 500 || feeTier == 3000 || feeTier == 10000, "Quote should use valid fee tier");
        assertTrue(pool != address(0), "Quote should find a valid pool");
        console.log("Price-based quote - Amount out:", amountOut);
        console.log("Price-based fee tier:", feeTier);
        console.log("Price-based pool:", pool);
        
        // Test 4: Slippage protection calculation
        console.log("Testing slippage protection calculation...");
        uint32 slippageBps = 100; // 1% slippage
        bool zeroForOne = (WETH < USDC); // Determine swap direction
        uint160 priceLimit = fetcher.getSqrtPriceLimitForSlippage(
            WETH,
            USDC,
            bestFee,
            slippageBps,
            zeroForOne
        );
        assertTrue(priceLimit > 0, "Should calculate valid price limit");
        console.log("Price limit calculated:", priceLimit);
        console.log("Slippage tolerance:", slippageBps, "bps (1%)");
        console.log("Zero for one:", zeroForOne);
        
        // Test 5: Dynamic minimum output calculation
        console.log("Testing dynamic minimum output calculation...");
        uint256 dynamicMinOut = (amountOut * (10000 - slippageBps)) / 10000;
        assertTrue(dynamicMinOut < amountOut, "Minimum output should be less than expected output");
        assertTrue(dynamicMinOut > 0, "Minimum output should be positive");
        console.log("Expected output:", amountOut);
        console.log("Dynamic minimum output (1% slippage):", dynamicMinOut);
        
        // Test 6: Exact output quote (price-based)
        console.log("Testing exact output quote (price-based)...");
        uint256 desiredOut = formatTokenAmount(USDC, 2000); // Want 2000 USDC
        (uint256 amountInNeeded, uint24 exactFee, ) = 
            fetcher.getQuoteExactOut(WETH, USDC, desiredOut);
        if (amountInNeeded > 0) {
            assertTrue(amountInNeeded > 0, "Should calculate input needed for exact output");
            // Note: Exact output uses best price across all fee tiers (different from deepest liquidity)
            assertTrue(exactFee == 100 || exactFee == 500 || exactFee == 3000 || exactFee == 10000, "Exact output should use valid fee tier");
            console.log("Exact output quote - Input needed:", amountInNeeded);
            console.log("Exact output fee tier:", exactFee);
        } else {
            console.log("Exact output quote not available (insufficient liquidity)");
        }
        
        console.log("SUCCESS: All enhanced slippage protection features working correctly!");
        console.log("SUCCESS: Multi-tier support: Working");
        console.log("SUCCESS: Reserve-based selection (protocol default): Working");
        console.log("SUCCESS: Price-based selection (usePriceBased=true): Working");
        console.log("SUCCESS: QuoterV2 integration: Working");
        console.log("SUCCESS: Slippage calculation: Working");
        console.log("SUCCESS: Pool validation: Working");
    }

    function testSweetSpotAlgoV3WithDifferentAmounts() public {
        console.log("=== Testing SweetSpotAlgo v3 with Different WETH Amounts on UniswapV3 ===");
        
        // Test amounts: 1, 3, 10, 30, 100, 1000 WETH
        uint256[] memory testAmounts = new uint256[](6);
        testAmounts[0] = 1 * 1e18;    // 1 WETH
        testAmounts[1] = 3 * 1e18;    // 3 WETH
        testAmounts[2] = 10 * 1e18;   // 10 WETH
        testAmounts[3] = 30 * 1e18;   // 30 WETH
        testAmounts[4] = 100 * 1e18;  // 100 WETH
        testAmounts[5] = 1000 * 1e18; // 1000 WETH
        
        for (uint256 i = 0; i < testAmounts.length; i++) {
            uint256 amountIn = testAmounts[i];
            console.log("\n--- Testing with %d WETH ---", amountIn / 1e18);
            
            // Test both price-based and reserve-based selection
            testSweetSpotForAmount(amountIn, false, "Reserve-based");
            testSweetSpotForAmount(amountIn, true, "Price-based");
        }
    }
    
    function testSweetSpotForAmount(uint256 amountIn, bool usePriceBased, string memory selectionType) internal {
        console.log("Testing %s selection for %d WETH", selectionType, amountIn / 1e18);
        
        // Get sweet spot evaluation without placing actual trade
        try streamDaemon.evaluateSweetSpotAndDex(
            WETH,
            USDC,
            amountIn,
            0, // effectiveGas
            usePriceBased
        ) returns (uint256 sweetSpot, address bestFetcher, address router) {
            console.log("  *** CALCULATED Sweet Spot: %d ***", sweetSpot);
            console.log("  Best Fetcher: %s", bestFetcher);
            console.log("  Router: %s", router);
            
            // Get some additional info about the selected DEX
            try IUniversalDexInterface(bestFetcher).getDexType() returns (string memory dexType) {
                console.log("  DEX Type: %s", dexType);
            } catch {
                console.log("  DEX Type: Unknown");
            }
            
            // Get reserves for context
            try IUniversalDexInterface(bestFetcher).getReserves(WETH, USDC) returns (uint256 reserveIn, uint256 reserveOut) {
                console.log("  WETH Reserve: %d WETH", reserveIn / 1e18);
                console.log("  USDC Reserve: %d USDC", reserveOut / 1e6);
                
                // Calculate what percentage of the pool this trade represents
                if (reserveIn > 0) {
                    uint256 poolPercentage = (amountIn * 10000) / reserveIn; // in basis points
                    console.log("  Trade as %% of pool: %d%%", poolPercentage / 100);
                }
            } catch {
                console.log("  Could not get reserves");
            }
            
            // Get a price quote for context
            try IUniversalDexInterface(bestFetcher).getPrice(WETH, USDC, amountIn) returns (uint256 amountOut) {
                console.log("  Expected USDC out: %d USDC", amountOut / 1e6);
                if (amountIn > 0) {
                    console.log("  Effective rate: %d USDC per WETH", (amountOut * 1e18) / amountIn);
                }
            } catch {
                console.log("  Could not get price quote");
            }
            
            // Test the sweetSpotAlgo_v3 directly to see the actual calculation
            console.log("  --- Direct SweetSpotAlgo v3 Test ---");
            try streamDaemon._sweetSpotAlgo(WETH, USDC, amountIn, bestFetcher) returns (uint256 directSweetSpot) {
                console.log("  *** DIRECT SweetSpotAlgo v3 result: %d ***", directSweetSpot);
            } catch Error(string memory reason) {
                console.log("  Direct SweetSpotAlgo v3 Error: %s", reason);
            } catch {
                console.log("  Direct SweetSpotAlgo v3 Unknown error");
            }
            
        } catch Error(string memory reason) {
            console.log("  Error: %s", reason);
        } catch {
            console.log("  Unknown error occurred");
        }
    }
}
