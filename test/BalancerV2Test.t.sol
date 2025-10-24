// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/adapters/BalancerV2PoolRegistry.sol";
import "../src/adapters/BalancerV2Fetcher.sol";
import "../src/interfaces/dex/IBalancerVault.sol";

contract BalancerV2Test is Test {
    // Test addresses
    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant BAL = 0xba100000625a3754423978a60c9317c58a424e3D;
    
    // Mock pool addresses
    address constant BAL_WETH_POOL = 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56;
    address constant USDC_WETH_POOL = 0x6c6EE304399DBDB9c8EF030Ab642b10820dB8f57;
    
    BalancerV2PoolRegistry registry;
    BalancerV2Fetcher fetcher;

    function setUp() public {
        // Deploy contracts
        registry = new BalancerV2PoolRegistry(address(this));
        fetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(registry));
        
        // Mock the pool contracts to return pool IDs
        vm.mockCall(BAL_WETH_POOL, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(1))));
        vm.mockCall(USDC_WETH_POOL, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(2))));
        
        // Set up initial pool mappings
        address[] memory balWethPools = new address[](1);
        balWethPools[0] = BAL_WETH_POOL;
        registry.setPoolsForPair(BAL, WETH, balWethPools, 0);
        
        address[] memory wethBalPools = new address[](1);
        wethBalPools[0] = BAL_WETH_POOL;
        registry.setPoolsForPair(WETH, BAL, wethBalPools, 0);
        
        // Set up USDC/WETH pools
        address[] memory usdcWethPools = new address[](1);
        usdcWethPools[0] = USDC_WETH_POOL;
        registry.setPoolsForPair(USDC, WETH, usdcWethPools, 0);
        
        address[] memory wethUsdcPools = new address[](1);
        wethUsdcPools[0] = USDC_WETH_POOL;
        registry.setPoolsForPair(WETH, USDC, wethUsdcPools, 0);
    }

    function testRegistryBasicFunctionality() public {
        console.log("Testing registry basic functionality...");
        
        // Test getPools
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(BAL, WETH);
        assertEq(pools.length, 1, "Should have 1 pool for BAL/WETH");
        assertEq(pools[0].pool, BAL_WETH_POOL, "Pool address should match");
        
        // Test getPrimary
        (IBalancerV2PoolRegistry.PoolInfo memory primary, bool exists) = registry.getPrimary(BAL, WETH);
        assertTrue(exists, "Primary pool should exist");
        assertEq(primary.pool, BAL_WETH_POOL, "Primary pool should be BAL_WETH_POOL");
        
        // Test primaryIndex
        uint256 primaryIdx = registry.primaryIndex(BAL, WETH);
        assertEq(primaryIdx, 0, "Primary index should be 0");
    }

    function testFetcherBasicFunctionality() public {
        console.log("Testing fetcher basic functionality...");
        
        // Test DEX identification
        assertEq(fetcher.getDexType(), "Balancer", "DEX type should be Balancer");
        assertEq(fetcher.getDexVersion(), "V2", "DEX version should be V2");
        
        // Test getPoolAddress
        address poolAddr = fetcher.getPoolAddress(BAL, WETH);
        assertEq(poolAddr, BAL_WETH_POOL, "Pool address should match");
    }

    function testGetReserves() public {
        console.log("Testing getReserves...");
        
        // Mock vault.getPoolTokens call
        address[] memory tokens = new address[](2);
        tokens[0] = BAL;
        tokens[1] = WETH;
        uint256[] memory balances = new uint256[](2);
        balances[0] = 1000e18; // 1000 BAL
        balances[1] = 100e18;  // 100 WETH
        
        vm.mockCall(
            BALANCER_VAULT,
            abi.encodeWithSelector(IBalancerVault.getPoolTokens.selector, bytes32(uint256(1))),
            abi.encode(tokens, balances, uint256(12345))
        );
        
        (uint256 reserveBAL, uint256 reserveWETH) = fetcher.getReserves(BAL, WETH);
        console.log("BAL reserves:", reserveBAL);
        console.log("WETH reserves:", reserveWETH);
        assertEq(reserveBAL, 1000e18, "BAL reserves should match mocked value");
        assertEq(reserveWETH, 100e18, "WETH reserves should match mocked value");
    }

    function testGetPrice() public {
        console.log("Testing getPrice...");
        
        uint256 amountIn = 1e18; // 1 BAL
        
        // Mock vault.queryBatchSwap call
        int256[] memory deltas = new int256[](2);
        deltas[0] = int256(amountIn);  // Input amount
        deltas[1] = -int256(0.1e18);  // Output amount (negative for output)
        
        vm.mockCall(
            BALANCER_VAULT,
            abi.encodeWithSelector(IBalancerVault.queryBatchSwap.selector),
            abi.encode(deltas)
        );
        
        uint256 price = fetcher.getPrice(BAL, WETH, amountIn);
        console.log("Price for 1 BAL in WETH:", price);
        assertEq(price, 0.1e18, "Price should match mocked value");
    }

    function testRegistryManagement() public {
        console.log("Testing registry management...");
        
        // Test adding a pool
        address newPool = makeAddr("newPool");
        vm.mockCall(newPool, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(123))));
        
        registry.addPool(BAL, WETH, newPool, false);
        
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(BAL, WETH);
        assertEq(pools.length, 2, "Should have 2 pools after adding one");
        assertEq(pools[1].pool, newPool, "New pool should be added");
        
        // Test setting primary index
        registry.setPrimaryIndex(BAL, WETH, 1);
        uint256 primaryIdx = registry.primaryIndex(BAL, WETH);
        assertEq(primaryIdx, 1, "Primary index should be updated");
        
        // Test removing a pool
        registry.removePoolAt(BAL, WETH, 0);
        pools = registry.getPools(BAL, WETH);
        assertEq(pools.length, 1, "Should have 1 pool after removing one");
        assertEq(pools[0].pool, newPool, "Remaining pool should be the new one");
    }

    function testAccessControl() public {
        console.log("Testing access control...");
        
        address nonOwner = makeAddr("nonOwner");
        address newPool = makeAddr("newPool");
        
        // Mock the pool ID call for the new pool
        vm.mockCall(newPool, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(999))));
        
        // Test that non-owner cannot set pools
        vm.prank(nonOwner);
        vm.expectRevert("NOT_AUTH");
        address[] memory pools = new address[](1);
        pools[0] = newPool;
        registry.setPoolsForPair(BAL, WETH, pools, 0);
        
        // Test that non-owner cannot add pools
        vm.prank(nonOwner);
        vm.expectRevert("NOT_AUTH");
        registry.addPool(BAL, WETH, newPool, false);
        
        // Test keeper functionality
        registry.setKeeper(nonOwner, true);
        vm.prank(nonOwner);
        registry.addPool(BAL, WETH, newPool, false); // Should succeed now
    }

    function testErrorHandling() public {
        console.log("Testing error handling...");
        
        // Test getting pools for non-existent pair
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = registry.getPools(BAL, USDC);
        assertEq(pools.length, 0, "Should return empty array for non-existent pair");
        
        // Test getting primary for non-existent pair
        (IBalancerV2PoolRegistry.PoolInfo memory primary, bool exists) = registry.getPrimary(BAL, USDC);
        assertFalse(exists, "Primary should not exist for non-existent pair");
        
        // Test fetcher with non-existent pair
        vm.expectRevert("NO_POOLS");
        fetcher.getPoolAddress(BAL, USDC);
        
        vm.expectRevert("NO_POOLS");
        fetcher.getReserves(BAL, USDC);
        
        vm.expectRevert("NO_POOLS");
        fetcher.getPrice(BAL, USDC, 1e18);
    }

    function testHelperFunctions() public {
        console.log("Testing helper functions...");
        
        // Mock vault calls for getDeepestPool
        address[] memory tokens = new address[](2);
        tokens[0] = BAL;
        tokens[1] = WETH;
        uint256[] memory balances = new uint256[](2);
        balances[0] = 1000e18; // 1000 BAL
        balances[1] = 100e18;  // 100 WETH
        
        vm.mockCall(
            BALANCER_VAULT,
            abi.encodeWithSelector(IBalancerVault.getPoolTokens.selector, bytes32(uint256(1))),
            abi.encode(tokens, balances, uint256(12345))
        );
        
        // Test getDeepestPool
        (address pool, bytes32 poolId) = fetcher.getDeepestPool(BAL, WETH);
        console.log("Deepest pool:", pool);
        console.log("Pool ID:", uint256(poolId));
        assertEq(pool, BAL_WETH_POOL, "Deepest pool should be BAL_WETH_POOL");
        assertEq(poolId, bytes32(uint256(1)), "Pool ID should match");
        
        // Mock vault.queryBatchSwap for getBestPriceAndPool
        int256[] memory deltas = new int256[](2);
        deltas[0] = int256(1e18);  // Input amount
        deltas[1] = -int256(0.1e18);  // Output amount (negative for output)
        
        vm.mockCall(
            BALANCER_VAULT,
            abi.encodeWithSelector(IBalancerVault.queryBatchSwap.selector),
            abi.encode(deltas)
        );
        
        // Test getBestPriceAndPool
        (uint256 bestOut, address bestPool) = fetcher.getBestPriceAndPool(BAL, WETH, 1e18);
        console.log("Best price:", bestOut);
        console.log("Best pool:", bestPool);
        assertEq(bestOut, 0.1e18, "Best price should match mocked value");
        assertEq(bestPool, BAL_WETH_POOL, "Best pool should be BAL_WETH_POOL");
    }
}
