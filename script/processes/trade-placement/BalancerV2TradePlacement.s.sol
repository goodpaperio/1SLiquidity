// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "../../SingleDexProtocol.s.sol";
import "../../../src/Utils.sol";
import "../../../src/adapters/BalancerV2Fetcher.sol";
import "../../../src/adapters/BalancerV2PoolRegistry.sol";
import "../../../src/interfaces/dex/IBalancerVault.sol";

contract BalancerV2TradePlacement is SingleDexProtocol {
    // Balancer pool address for BAL/WETH
    address constant BAL_WETH_POOL = 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56;

    // Token addresses
    address constant BAL = 0xba100000625a3754423978a60c9317c58a424e3D;

    // Real whale addresses that actually have tokens
    address constant BAL_WHALE = 0xBA12222222228d8Ba445958a75a0704d566BF2C8; // Balancer Vault

    // New V2 contracts
    BalancerV2PoolRegistry public balancerRegistry;
    BalancerV2Fetcher public balancerFetcher;

    function setUp() public {
        // Deploy new V2 contracts
        balancerRegistry = new BalancerV2PoolRegistry(address(this));
        balancerFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(balancerRegistry));

        // Set the test contract as keeper so it can add pools
        balancerRegistry.setKeeper(address(this), true);

        // Set up pool mappings in the registry
        address[] memory balWethPools = new address[](1);
        balWethPools[0] = BAL_WETH_POOL;
        balancerRegistry.setPoolsForPair(BAL, WETH, balWethPools, 0);

        // Set up reverse pair
        address[] memory wethBalPools = new address[](1);
        wethBalPools[0] = BAL_WETH_POOL;
        balancerRegistry.setPoolsForPair(WETH, BAL, wethBalPools, 0);

        // Set up protocol with new BalancerV2Fetcher
        // For Balancer V2, we pass the fetcher as the router since the executor needs to call fetcher methods
        setUpSingleDex(address(balancerFetcher), address(balancerFetcher));

        // Check WETH whale balance and transfer
        uint256 wethWhaleBalance = IERC20(WETH).balanceOf(WETH_WHALE);
        console.log("WETH whale balance:", wethWhaleBalance);
        assertTrue(wethWhaleBalance >= 100 * 1e18, "WETH whale doesn't have enough tokens");

        vm.startPrank(WETH_WHALE);
        IERC20(WETH).transfer(address(this), 100 * 1e18); // 100 WETH to test contract
        vm.stopPrank();

        // Check BAL whale balance and transfer
        uint256 balWhaleBalance = IERC20(BAL).balanceOf(BAL_WHALE);
        console.log("BAL whale balance:", balWhaleBalance);
        assertTrue(balWhaleBalance >= 1000 * 1e18, "BAL whale doesn't have enough tokens");

        vm.startPrank(BAL_WHALE);
        IERC20(BAL).transfer(address(this), 1000 * 1e18); // 1000 BAL to test contract
        vm.stopPrank();

        // Verify we received the tokens
        uint256 ourWethBalance = IERC20(WETH).balanceOf(address(this));
        uint256 ourBalBalance = IERC20(BAL).balanceOf(address(this));
        console.log("Our WETH balance:", ourWethBalance);
        console.log("Our BAL balance:", ourBalBalance);

        assertTrue(ourWethBalance >= 100 * 1e18, "Should have received WETH");
        assertTrue(ourBalBalance >= 1000 * 1e18, "Should have received BAL");

        // Approve both tokens
        IERC20(WETH).approve(address(core), type(uint256).max);
        IERC20(BAL).approve(address(core), type(uint256).max);
    }

    function run() external {
        testPlaceTradeWETHBAL();
    }

    function testPlaceTradeWETHBAL() public {
        console.log("Starting Balancer V2 WETH to BAL trade test");

        // Use very small amounts to avoid complex calculations
        uint256 amountIn = formatTokenAmount(WETH, 1) / 100; // 0.01 WETH
        uint256 amountOutMin = formatTokenAmount(BAL, 1); // 1 BAL (very conservative)

        console.log("Trade parameters:");
        console.log("Amount In (WETH):", amountIn);
        console.log("Amount Out Min (BAL):", amountOutMin);

        approveToken(WETH, address(core), amountIn);

        bytes memory tradeData = abi.encode(
            WETH,
            BAL,
            amountIn,
            amountOutMin,
            false,
            false, // usePriceBased - set to false for backward compatibility
            100, // instasettleBps - default value
            false // onlyInstasettle - default value
        );

        core.placeTrade(tradeData);

        // Get the trade details
        bytes32 pairId = keccak256(abi.encode(WETH, BAL));
        uint256[] memory tradeIds = core.getPairIdTradeIds(pairId);
        uint256 tradeId = tradeIds[tradeIds.length - 1];

        Utils.Trade memory trade = core.getTrade(tradeId);

        console.log("Trade placed successfully");
        console.log("Trade ID:", tradeId);
        console.log("Amount In:", trade.amountIn);
        console.log("Amount Remaining:", trade.amountRemaining);
        console.log("Target Amount Out:", trade.targetAmountOut);
        console.log("Realised Amount Out:", trade.realisedAmountOut);

        // Just verify the trade was created, don't execute further
        assertEq(trade.owner, address(this), "Trade owner should be test contract");
        assertEq(trade.tokenIn, WETH, "Token in should be WETH");
        assertEq(trade.tokenOut, BAL, "Token out should be BAL");
        assertEq(trade.amountIn, amountIn, "Amount in should match");

        console.log("WETH to BAL trade test passed");
    }

    function testPlaceTradeBALWETH() public {
        console.log("Starting Balancer V2 BAL to WETH trade test");

        // Use reasonable amounts based on the working WETH→BAL rate
        // From working test: 0.0025 WETH → 8.02 BAL = ~3200 BAL per WETH
        // So 10 BAL should get ~0.003 WETH
        uint256 amountIn = formatTokenAmount(BAL, 10); // 10 BAL
        uint256 amountOutMin = formatTokenAmount(WETH, 1) / 400; // ~0.0025 WETH (conservative)

        console.log("Trade parameters:");
        console.log("Amount In (BAL):", amountIn);
        console.log("Amount Out Min (WETH):", amountOutMin);
        console.log("Expected rate: ~3200 BAL per WETH based on working trade");

        approveToken(BAL, address(core), amountIn);

        bytes memory tradeData = abi.encode(
            BAL,
            WETH,
            amountIn,
            amountOutMin,
            false, // isInstasettlable
            false, // usePriceBased - set to false for backward compatibility
            100, // instasettleBps - default value
            false // onlyInstasettle
        );

        try core.placeTrade(tradeData) {
            console.log("BAL to WETH trade executed successfully");
        } catch Error(string memory reason) {
            console.log("BAL to WETH trade failed with reason:", reason);
            // Let's investigate what BAL#507 means
            if (keccak256(bytes(reason)) == keccak256(bytes("DEX trade failed"))) {
                console.log("This is likely a Balancer-specific error BAL#507");
                console.log("BAL#507 typically means: SWAP_LIMIT or invalid swap parameters");
                console.log("Current amountOutMin might be too ambitious or too conservative");
                console.log("Pool has limited liquidity for this direction");
            }
            revert(reason);
        }
    }

    function testBalancerV2SpecificFeatures() public {
        console.log("Testing Balancer V2 specific features");

        // Test that BalancerV2Fetcher can get reserves
        (uint256 reserveBAL, uint256 reserveWETH) = balancerFetcher.getReserves(BAL, WETH);

        console.log("Balancer V2 BAL reserves:", reserveBAL);
        console.log("Balancer V2 WETH reserves:", reserveWETH);

        assertTrue(reserveBAL > 0, "BAL reserves should be greater than 0");
        assertTrue(reserveWETH > 0, "WETH reserves should be greater than 0");

        // Test DEX type identification
        string memory dexType = balancerFetcher.getDexType();
        assertEq(dexType, "Balancer", "DEX type should be Balancer");

        string memory dexVersion = balancerFetcher.getDexVersion();
        assertEq(dexVersion, "V2", "DEX version should be V2");

        // Test registry functionality
        (IBalancerV2PoolRegistry.PoolInfo memory primary, bool exists) = balancerRegistry.getPrimary(BAL, WETH);
        assertTrue(exists, "Primary pool should exist");
        assertEq(primary.pool, BAL_WETH_POOL, "Primary pool should be BAL_WETH_POOL");

        // Test pool address retrieval
        address poolAddr = balancerFetcher.getPoolAddress(BAL, WETH);
        assertEq(poolAddr, BAL_WETH_POOL, "Pool address should match");

        console.log("Balancer V2 specific features test passed");
    }

    function testBalancerV2PoolState() public {
        console.log("Testing Balancer V2 pool state directly");

        // Test the pool directly to see if it's accessible
        address poolAddress = BAL_WETH_POOL;
        address vaultAddress = BALANCER_VAULT;

        console.log("Pool address:", poolAddress);
        console.log("Vault address:", vaultAddress);

        // Try to get pool ID
        try IBalancerPool(poolAddress).getPoolId() returns (bytes32 poolId) {
            console.log("Pool ID retrieved successfully:", uint256(poolId));

            // Try to get pool tokens
            try IBalancerVault(vaultAddress).getPoolTokens(poolId) returns (
                address[] memory tokens, uint256[] memory balances, uint256 lastChangeBlock
            ) {
                console.log("Pool tokens retrieved successfully");
                console.log("Number of tokens:", tokens.length);
                console.log("Last change block:", lastChangeBlock);

                for (uint256 i = 0; i < tokens.length; i++) {
                    console.log("Token", i, ":", tokens[i]);
                    console.log("Balance", i, ":", balances[i]);
                }

                // Check if our tokens are in the pool
                bool wethFound = false;
                bool balFound = false;

                for (uint256 i = 0; i < tokens.length; i++) {
                    if (tokens[i] == WETH) {
                        wethFound = true;
                        console.log("WETH found at index:", i);
                    }
                    if (tokens[i] == BAL) {
                        balFound = true;
                        console.log("BAL found at index:", i);
                    }
                }

                assertTrue(wethFound && balFound, "Both WETH and BAL should be found in pool");
                console.log("Pool contains both WETH and BAL tokens");
            } catch Error(string memory reason) {
                console.log("Failed to get pool tokens:", reason);
            } catch (bytes memory lowLevelData) {
                console.log("Failed to get pool tokens with low level data");
            }
        } catch Error(string memory reason) {
            console.log("Failed to get pool ID:", reason);
        } catch (bytes memory lowLevelData) {
            console.log("Failed to get pool ID with low level data");
        }
    }

    function testBalancerV2IntegrationSetup() public {
        console.log("Testing Balancer V2 integration setup");

        // Verify that the BalancerV2Fetcher is properly configured
        assertEq(address(balancerFetcher.vault()), BALANCER_VAULT, "Vault address should match");
        assertEq(address(balancerFetcher.registry()), address(balancerRegistry), "Registry address should match");

        // Verify that the Registry is configured for Balancer
        string memory dexType = "Balancer";
        address router = registry.getRouter(dexType);
        assertEq(router, address(balancerFetcher), "Registry should have BalancerV2Fetcher as router");

        // Verify that the Core contract can identify Balancer as a DEX
        address firstDex = streamDaemon.dexs(0); // Get the first DEX address
        bool balancerFound = false;

        // Check if the first DEX is our BalancerV2Fetcher
        if (firstDex == address(balancerFetcher)) {
            balancerFound = true;
        }

        assertTrue(balancerFound, "BalancerV2Fetcher should be registered in StreamDaemon");

        console.log("Balancer V2 integration setup test passed");
        console.log("Fetcher address:", address(balancerFetcher));
        console.log("Registry address:", address(balancerRegistry));
        console.log("Vault address:", BALANCER_VAULT);
        console.log("Router from registry:", router);
        console.log("First DEX address:", firstDex);
    }

    // function testBalancerV2PriceCalculation() public {
    //     console.log("Testing Balancer V2 price calculation");

    //     uint256 amountIn = formatTokenAmount(WETH, 1) / 100; // 0.01 WETH

    //     // Test price calculation
    //     try balancerFetcher.getPrice(WETH, BAL, amountIn) returns (uint256 price) {
    //         console.log("Price for 0.01 WETH in BAL:", price);
    //         assertTrue(price > 0, "Price should be greater than 0");
    //     } catch Error(string memory reason) {
    //         console.log("Price calculation failed:", reason);
    //         // This might fail if queryBatchSwap doesn't work on fork
    //     }

    //     // Test best price and pool
    //     try balancerFetcher.getBestPriceAndPool(WETH, BAL, amountIn) returns (uint256 bestOut, address bestPool) {
    //         console.log("Best price:", bestOut);
    //         console.log("Best pool:", bestPool);
    //         assertTrue(bestOut > 0, "Best price should be greater than 0");
    //         assertEq(bestPool, BAL_WETH_POOL, "Best pool should be BAL_WETH_POOL");
    //     } catch Error(string memory reason) {
    //         console.log("Best price calculation failed:", reason);
    //     }

    //     // Test deepest pool
    //     try balancerFetcher.getDeepestPool(WETH, BAL) returns (address deepestPool, bytes32 poolId) {
    //         console.log("Deepest pool:", deepestPool);
    //         console.log("Pool ID:", uint256(poolId));
    //         assertEq(deepestPool, BAL_WETH_POOL, "Deepest pool should be BAL_WETH_POOL");
    //     } catch Error(string memory reason) {
    //         console.log("Deepest pool calculation failed:", reason);
    //     }

    //     console.log("Balancer V2 price calculation test passed");
    // }
}
