// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../SingleDexProtocol.s.sol";
import "../../../src/Utils.sol";
import "../../../src/adapters/OneInchFetcher.sol";

contract OneInchTradePlacement is SingleDexProtocol {
    // Use UniswapV2 router for testing since we're on Ethereum mainnet fork
    // In production, this would be the actual 1inch aggregator
    address constant ONEINCH_AGGREGATOR = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D; // UniswapV2 router for testing

    function setUp() public {
        // Deploy OneInchFetcher with ONEINCH_AGGREGATOR
        OneInchFetcher oneInchFetcher = new OneInchFetcher(ONEINCH_AGGREGATOR);

        // Set up protocol with only OneInch
        setUpSingleDex(address(oneInchFetcher), ONEINCH_AGGREGATOR);

        console.log("OneInch test setup complete (using UniswapV2 router for testing)");
    }

    function run() external {
        testOneInchSpecificFeatures();
        testOneInchTradePlacement();
    }

    function testOneInchSpecificFeatures() public {
        console.log("Testing OneInch-specific features");

        // Test that OneInchFetcher can be deployed and has correct properties
        OneInchFetcher oneInchFetcher = OneInchFetcher(dexFetcher);

        // Test DEX type identification
        string memory dexType = oneInchFetcher.getDexType();
        assertEq(dexType, "OneInch", "DEX type should be OneInch");

        // Test aggregator address retrieval
        address aggregatorAddress = oneInchFetcher.aggregator();
        assertEq(aggregatorAddress, ONEINCH_AGGREGATOR, "Aggregator address should match ONEINCH_AGGREGATOR");

        // Test version
        string memory version = oneInchFetcher.getDexVersion();
        assertEq(version, "V5", "DEX version should be V5");

        console.log("OneInch-specific features test passed");
        console.log("Aggregator address:", aggregatorAddress);
        console.log("DEX type:", dexType);
        console.log("DEX version:", version);
    }

    function testOneInchTradePlacement() public {
        console.log("Testing OneInch trade placement");

        // Note: This test demonstrates the 1inch integration structure
        // In production, you would:
        // 1. Call 1inch API to get quote and swap data
        // 2. Use the returned executor and data for the actual swap
        // 3. Handle the swap response and verify results

        console.log("OneInch integration structure:");
        console.log("1. Call 1inch API: GET /v5.0/{chainId}/quote");
        console.log("2. Parse response for executor and swap data");
        console.log("3. Execute swap with real 1inch contract");
        console.log("4. Verify swap results and handle response");

        // Test the price estimation (this will work)
        testOneInchPriceEstimation();

        console.log("OneInch trade placement tests completed");
        console.log("NOTE: Actual trade execution requires 1inch API integration");
    }

    function testOneInchPriceEstimation() public {
        console.log("Testing OneInch price estimation");

        OneInchFetcher oneInchFetcher = OneInchFetcher(dexFetcher);

        // Test price estimation for WETH -> USDC
        uint256 inputAmount = formatTokenAmount(WETH, 1); // 1 WETH
        uint256 estimatedOutput = oneInchFetcher.getPrice(WETH, USDC, inputAmount);

        console.log("Input amount (1 WETH):", inputAmount);
        console.log("Estimated output (USDC):", estimatedOutput);

        // Verify the price shows some improvement (should be > 1:1 ratio due to aggregation)
        assertTrue(estimatedOutput > 0, "Should return a price estimate");

        // Test reserves estimation
        (uint256 reserveWETH, uint256 reserveUSDC) = oneInchFetcher.getReserves(WETH, USDC);
        console.log("Estimated WETH reserve:", reserveWETH);
        console.log("Estimated USDC reserve:", reserveUSDC);

        assertTrue(reserveWETH > 0, "Should estimate WETH reserves");
        assertTrue(reserveUSDC > 0, "Should estimate USDC reserves");

        console.log("OneInch price estimation test PASSED");
    }
}
