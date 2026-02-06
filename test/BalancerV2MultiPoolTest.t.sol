// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/adapters/BalancerV2PoolRegistry.sol";
import "../src/adapters/BalancerV2Fetcher.sol";
import "../src/interfaces/dex/IBalancerVault.sol";

contract BalancerV2MultiPoolTest is Test {
    // Test addresses
    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant BAL = 0xba100000625a3754423978a60c9317c58a424e3D;
    
    // Multiple pool addresses for the same token pair
    address POOL_1;
    address POOL_2;
    address POOL_3;
    
    BalancerV2PoolRegistry registry;
    BalancerV2Fetcher fetcher;

    function setUp() public {
        // Create pool addresses
        POOL_1 = makeAddr("POOL_1");
        POOL_2 = makeAddr("POOL_2");
        POOL_3 = makeAddr("POOL_3");
        
        // Deploy contracts
        registry = new BalancerV2PoolRegistry(address(this));
        fetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(registry));
        
        // Mock pool ID calls
        vm.mockCall(POOL_1, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(1))));
        vm.mockCall(POOL_2, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(2))));
        vm.mockCall(POOL_3, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(3))));
        
        // Set up multiple pools for BAL/WETH pair
        address[] memory balWethPools = new address[](3);
        balWethPools[0] = POOL_1;
        balWethPools[1] = POOL_2;
        balWethPools[2] = POOL_3;
        registry.setPoolsForPair(BAL, WETH, balWethPools, 0); // POOL_1 is primary
        
        // Set up reverse pair
        address[] memory wethBalPools = new address[](3);
        wethBalPools[0] = POOL_1;
        wethBalPools[1] = POOL_2;
        wethBalPools[2] = POOL_3;
        registry.setPoolsForPair(WETH, BAL, wethBalPools, 0);
    }

    function testMultiplePoolsPerPair() public {
        console.log("Testing multiple pools per token pair...");
        
        // Test that we can get all pools
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(BAL, WETH);
        assertEq(pools.length, 3, "Should have 3 pools for BAL/WETH");
        assertEq(pools[0].pool, POOL_1, "First pool should be POOL_1");
        assertEq(pools[1].pool, POOL_2, "Second pool should be POOL_2");
        assertEq(pools[2].pool, POOL_3, "Third pool should be POOL_3");
        
        // Test pool IDs
        assertEq(uint256(pools[0].poolId), 1, "First pool ID should be 1");
        assertEq(uint256(pools[1].poolId), 2, "Second pool ID should be 2");
        assertEq(uint256(pools[2].poolId), 3, "Third pool ID should be 3");
        
        // Test primary pool selection
        (IBalancerV2PoolRegistry.PoolInfo memory primary, bool exists) = registry.getPrimary(BAL, WETH);
        assertTrue(exists, "Primary pool should exist");
        assertEq(primary.pool, POOL_1, "Primary pool should be POOL_1");
        assertEq(uint256(primary.poolId), 1, "Primary pool ID should be 1");
    }

    function testPrimaryPoolSelection() public {
        console.log("Testing primary pool selection...");
        
        // Change primary to POOL_2
        registry.setPrimaryIndex(BAL, WETH, 1);
        
        (IBalancerV2PoolRegistry.PoolInfo memory primary, bool exists) = registry.getPrimary(BAL, WETH);
        assertTrue(exists, "Primary pool should exist");
        assertEq(primary.pool, POOL_2, "Primary pool should be POOL_2");
        assertEq(uint256(primary.poolId), 2, "Primary pool ID should be 2");
        
        // Test that fetcher uses the new primary
        address poolAddr = fetcher.getPoolAddress(BAL, WETH);
        assertEq(poolAddr, POOL_2, "Fetcher should return the new primary pool");
    }

    function testPoolManagement() public {
        console.log("Testing pool management with multiple pools...");
        
        // Add a new pool
        address newPool = makeAddr("newPool");
        vm.mockCall(newPool, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(4))));
        
        registry.addPool(BAL, WETH, newPool, false);
        
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(BAL, WETH);
        assertEq(pools.length, 4, "Should have 4 pools after adding one");
        assertEq(pools[3].pool, newPool, "New pool should be added at the end");
        
        // Remove the middle pool (POOL_2)
        registry.removePoolAt(BAL, WETH, 1);
        
        pools = registry.getPools(BAL, WETH);
        assertEq(pools.length, 3, "Should have 3 pools after removing one");
        assertEq(pools[0].pool, POOL_1, "First pool should still be POOL_1");
        // After removing POOL_2 (index 1), the last element (newPool) moves to index 1
        assertEq(pools[1].pool, newPool, "Second pool should now be the new pool (moved from last position)");
        assertEq(pools[2].pool, POOL_3, "Third pool should be POOL_3");
    }

    function testBestPriceSelection() public {
        console.log("Testing best price selection across multiple pools...");
        
        // Mock different prices for different pools
        // POOL_1: 0.1 WETH for 1 BAL
        // POOL_2: 0.15 WETH for 1 BAL (better price)
        // POOL_3: 0.12 WETH for 1 BAL
        
        // Mock queryBatchSwap calls for each pool
        vm.mockCall(
            BALANCER_VAULT,
            abi.encodeWithSelector(IBalancerVault.queryBatchSwap.selector),
            abi.encode(_createDeltas(1e18, 0.1e18)) // POOL_1: 0.1 WETH
        );
        
        // Test getPrice - should return the best price across all pools
        uint256 price = fetcher.getPrice(BAL, WETH, 1e18);
        console.log("Price for 1 BAL in WETH:", price);
        assertEq(price, 0.1e18, "Price should match the mocked value");
        
        // Test getBestPriceAndPool
        (uint256 bestOut, address bestPool) = fetcher.getBestPriceAndPool(BAL, WETH, 1e18);
        console.log("Best price:", bestOut);
        console.log("Best pool:", bestPool);
        assertEq(bestOut, 0.1e18, "Best price should match mocked value");
        // Note: In this simple test, all pools return the same price, so it will pick the first one
        assertEq(bestPool, POOL_1, "Best pool should be POOL_1 (first in list)");
    }

    function testDeepestPoolSelection() public {
        console.log("Testing deepest pool selection...");
        
        // Mock different balances for different pools
        // POOL_1: 1000 BAL, 100 WETH (depth = 100 WETH)
        // POOL_2: 500 BAL, 200 WETH (depth = 500 BAL = 500e18, but normalized = 500e18)
        // POOL_3: 2000 BAL, 50 WETH (depth = 50 WETH)
        
        // Mock getPoolTokens for POOL_1
        address[] memory tokens1 = new address[](2);
        tokens1[0] = BAL;
        tokens1[1] = WETH;
        uint256[] memory balances1 = new uint256[](2);
        balances1[0] = 1000e18; // 1000 BAL
        balances1[1] = 100e18;  // 100 WETH
        
        vm.mockCall(
            BALANCER_VAULT,
            abi.encodeWithSelector(IBalancerVault.getPoolTokens.selector, bytes32(uint256(1))),
            abi.encode(tokens1, balances1, uint256(12345))
        );
        
        // Mock getPoolTokens for POOL_2
        address[] memory tokens2 = new address[](2);
        tokens2[0] = BAL;
        tokens2[1] = WETH;
        uint256[] memory balances2 = new uint256[](2);
        balances2[0] = 500e18;  // 500 BAL
        balances2[1] = 200e18;  // 200 WETH
        
        vm.mockCall(
            BALANCER_VAULT,
            abi.encodeWithSelector(IBalancerVault.getPoolTokens.selector, bytes32(uint256(2))),
            abi.encode(tokens2, balances2, uint256(12345))
        );
        
        // Mock getPoolTokens for POOL_3
        address[] memory tokens3 = new address[](2);
        tokens3[0] = BAL;
        tokens3[1] = WETH;
        uint256[] memory balances3 = new uint256[](2);
        balances3[0] = 2000e18; // 2000 BAL
        balances3[1] = 50e18;   // 50 WETH
        
        vm.mockCall(
            BALANCER_VAULT,
            abi.encodeWithSelector(IBalancerVault.getPoolTokens.selector, bytes32(uint256(3))),
            abi.encode(tokens3, balances3, uint256(12345))
        );
        
        // Test getDeepestPool
        (address deepestPool, bytes32 poolId) = fetcher.getDeepestPool(BAL, WETH);
        console.log("Deepest pool:", deepestPool);
        console.log("Pool ID:", uint256(poolId));
        
        // POOL_2 should be deepest (min(500e18, 200e18) = 200e18 > min(1000e18, 100e18) = 100e18)
        assertEq(deepestPool, POOL_2, "Deepest pool should be POOL_2");
        assertEq(poolId, bytes32(uint256(2)), "Pool ID should be 2");
    }

    function testErrorHandlingWithMultiplePools() public {
        console.log("Testing error handling with multiple pools...");
        
        // Test with non-existent token pair
        vm.expectRevert("NO_POOLS");
        fetcher.getPoolAddress(BAL, USDC);
        
        // Test with empty amount
        vm.expectRevert("AMOUNT_0");
        fetcher.getPrice(BAL, WETH, 0);
        
        // Test invalid primary index
        vm.expectRevert("BAD_PRIMARY");
        registry.setPrimaryIndex(BAL, WETH, 10); // Index out of bounds
    }

    // Helper function to create deltas array
    function _createDeltas(uint256 amountIn, uint256 amountOut) internal pure returns (int256[] memory deltas) {
        deltas = new int256[](2);
        deltas[0] = int256(amountIn);
        deltas[1] = -int256(amountOut);
    }
}
