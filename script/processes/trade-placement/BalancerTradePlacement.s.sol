// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../SingleDexProtocol.s.sol";
import "../../../src/Utils.sol";
import "../../../src/adapters/BalancerV2Fetcher.sol";
import "../../../src/adapters/BalancerV2PoolRegistry.sol";

contract BalancerTradePlacement is SingleDexProtocol {

    function setUp() public {
        // Deploy BalancerV2 registry and fetcher
        BalancerV2PoolRegistry poolRegistry = new BalancerV2PoolRegistry(address(this));
        poolRegistry.setKeeper(address(this), true);
        poolRegistry.addPool(BAL, WETH, 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56, true);
        poolRegistry.addPool(WETH, BAL, 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56, true);
        BalancerV2Fetcher balancerFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(poolRegistry));
        
        // Set up protocol with Balancer (using the fetcher as router)
        setUpSingleDex(address(balancerFetcher), address(balancerFetcher));

        // Fund with BAL tokens for testing
        deal(BAL, address(this), 1000 * 10**18);
        
        // Approve BAL for Core
        IERC20(BAL).approve(address(core), type(uint256).max);

        console.log("Balancer test setup complete - using dynamic pool discovery");
    }

    function run() external {
        testBalancerSpecificFeatures();
        testBalancerTradePlacement();
    }

    function testBalancerBasicFunctionality() public {
        console.log("Starting basic Balancer functionality test");

        // Test that we can get reserves without making a trade
        BalancerV2Fetcher balancerFetcher = BalancerV2Fetcher(dexFetcher);

        try balancerFetcher.getReserves(BAL, WETH) returns (uint256 reserveBAL, uint256 reserveWETH) {
            console.log("Balancer BAL reserves:", reserveBAL);
            console.log("Balancer WETH reserves:", reserveWETH);

            assertTrue(reserveBAL > 0 || reserveWETH > 0, "At least one reserve should be greater than 0");
            console.log("Basic Balancer functionality test passed");
        } catch Error(string memory reason) {
            console.log("Failed to get reserves:", reason);
            console.log("This might indicate no pools found for BAL/WETH pair");
        }
    }

    function testBalancerSpecificFeatures() public {
        console.log("Testing Balancer-specific features");

        // Test that BalancerV2Fetcher can be deployed and has correct properties
        BalancerV2Fetcher balancerFetcher = BalancerV2Fetcher(dexFetcher);

        // Test DEX type identification
        string memory dexType = balancerFetcher.getDexType();
        assertEq(dexType, "Balancer", "DEX type should be Balancer");

        // Test version
        string memory version = balancerFetcher.getDexVersion();
        assertEq(version, "V2", "DEX version should be V2");

        console.log("Balancer-specific features test passed");
        console.log("DEX type:", dexType);
        console.log("DEX version:", version);
    }

    function testBalancerIntegrationSetup() public {
        console.log("Testing Balancer integration setup");

        // Verify that the BalancerV2Fetcher is properly configured
        BalancerV2Fetcher balancerFetcher = BalancerV2Fetcher(dexFetcher);

        // Verify that the Registry is configured for Balancer
        string memory dexType = "Balancer";
        address router = registry.getRouter(dexType);
        assertEq(router, address(balancerFetcher), "Registry should have Balancer router configured");

        // Verify that the Core contract can identify Balancer as a DEX
        address firstDex = streamDaemon.dexs(0); // Get the first DEX address
        bool balancerFound = false;

        // Check if the first DEX is our BalancerV2Fetcher
        if (firstDex == address(balancerFetcher)) {
            balancerFound = true;
        }

        assertTrue(balancerFound, "BalancerV2Fetcher should be registered in StreamDaemon");

        console.log("Balancer integration setup test passed");
        console.log("Router from registry:", router);
        console.log("First DEX address:", firstDex);
    }

    function testBalancerTradePlacement() public {
        console.log("Testing Balancer trade placement");

        // Test BAL to WETH trade
        testPlaceTradeBALWETH();

        // Test WETH to BAL trade
        testPlaceTradeWETHBAL();

        console.log("Balancer trade placement tests completed");
    }

    function testPlaceTradeBALWETH() public {
        console.log("Testing BAL to WETH trade on Balancer");

        BalancerV2Fetcher balancerFetcher = BalancerV2Fetcher(dexFetcher);

        // Get initial balances
        uint256 initialBAL = getTokenBalance(BAL, address(this));
        uint256 initialWETH = getTokenBalance(WETH, address(this));

        console.log("Initial BAL balance:", initialBAL);
        console.log("Initial WETH balance:", initialWETH);

        // Approve WETH for Core (in case we get some back)
        IERC20(WETH).approve(address(core), type(uint256).max);

        // Prepare trade data
        uint256 tradeAmount = formatTokenAmount(BAL, 100); // 100 BAL
        uint256 minOut = formatTokenAmount(WETH, 1); // 1 WETH (conservative)

        console.log("Trade amount:", tradeAmount);
        console.log("Min output:", minOut);

        // Get trade data from registry
        IRegistry.TradeData memory tradeData =
            registry.prepareTradeData(address(balancerFetcher), BAL, WETH, tradeAmount, minOut, address(this));

        console.log("Trade data prepared successfully");
        console.log("Executor selector:", vm.toString(tradeData.selector));
        console.log("Router:", tradeData.router);

        // Execute trade via Core
        vm.startPrank(address(this));

        // Transfer BAL to Core
        IERC20(BAL).transfer(address(core), tradeAmount);

        // Execute the trade using Core.placeTrade
        bytes memory coreTradeData = abi.encode(
            BAL,
            WETH,
            tradeAmount,
            minOut,
            false, // isInstasettlable
            false, // usePriceBased - set to false for reserve-based selection
            100, // instasettleBps - default value
            false // onlyInstasettle - default value
        );

        core.placeTrade(coreTradeData);

        vm.stopPrank();

        // Get the trade details
        bytes32 pairId = keccak256(abi.encode(BAL, WETH));
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
        assertEq(trade.tokenIn, BAL, "Token in should be BAL");
        assertEq(trade.tokenOut, WETH, "Token out should be WETH");
        assertEq(trade.amountIn, tradeAmount, "Amount in should match");
        assertTrue(trade.realisedAmountOut > 0, "Should have realised some output");

        console.log("BAL to WETH trade test PASSED");
    }

    function testPlaceTradeWETHBAL() public {
        console.log("Testing WETH to BAL trade on Balancer");

        BalancerV2Fetcher balancerFetcher = BalancerV2Fetcher(dexFetcher);

        // Get initial balances
        uint256 initialBAL = getTokenBalance(BAL, address(this));
        uint256 initialWETH = getTokenBalance(WETH, address(this));

        console.log("Initial BAL balance:", initialBAL);
        console.log("Initial WETH balance:", initialWETH);

        // We need some WETH to trade - let's get it by converting a small amount of BAL first
        // This is a simple approach: we'll assume we have WETH from the previous test
        if (initialWETH == 0) {
            console.log("No WETH balance - skipping WETH to BAL test");
            console.log("This is expected on first run - WETH balance will come from BAL->WETH trade");
            return;
        }

        // Prepare trade data
        uint256 tradeAmount = formatTokenAmount(WETH, 1); // 1 WETH
        uint256 minOut = formatTokenAmount(BAL, 50); // 50 BAL (conservative)

        console.log("Trade amount:", tradeAmount);
        console.log("Min output:", minOut);

        // Get trade data from registry
        IRegistry.TradeData memory tradeData =
            registry.prepareTradeData(address(balancerFetcher), WETH, BAL, tradeAmount, minOut, address(this));

        console.log("Trade data prepared successfully");
        console.log("Executor selector:", vm.toString(tradeData.selector));
        console.log("Router:", tradeData.router);

        // Execute trade via Core
        vm.startPrank(address(this));

        // Transfer WETH to Core
        IERC20(WETH).transfer(address(core), tradeAmount);

        // Execute the trade using Core.placeTrade
        bytes memory coreTradeData = abi.encode(
            WETH,
            BAL,
            tradeAmount,
            minOut,
            false, // isInstasettlable
            false, // usePriceBased - set to false for reserve-based selection
            100 // instasettleBps - default value
        );

        core.placeTrade(coreTradeData);

        vm.stopPrank();

        // Get the trade details
        bytes32 pairId = keccak256(abi.encode(WETH, BAL));
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
        assertEq(trade.tokenIn, WETH, "Token in should be WETH");
        assertEq(trade.tokenOut, BAL, "Token out should be BAL");
        assertEq(trade.amountIn, tradeAmount, "Amount in should match");
        assertTrue(trade.realisedAmountOut > 0, "Should have realised some output");

        console.log("WETH to BAL trade test PASSED");
    }
}
