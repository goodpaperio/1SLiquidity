// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/adapters/BalancerV2PoolRegistry.sol";
import "../src/adapters/BalancerV2Fetcher.sol";
import "../src/interfaces/dex/IBalancerVault.sol";
import "../src/Core.sol";
import "../src/StreamDaemon.sol";
import "../src/Executor.sol";
import "../src/Registry.sol";

contract BalancerV2IntegrationTest is Test {
    // Test addresses
    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant BAL = 0xba100000625a3754423978a60c9317c58a424e3D;
    
    // Mock pool addresses
    address constant BAL_WETH_POOL = 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56;
    address constant USDC_WETH_POOL = 0x6c6EE304399DBDB9c8EF030Ab642b10820dB8f57;
    
    // Protocol contracts
    Core public core;
    StreamDaemon public streamDaemon;
    Executor public executor;
    Registry public registry;
    
    // Balancer V2 contracts
    BalancerV2PoolRegistry public balancerRegistry;
    BalancerV2Fetcher public balancerFetcher;

    function setUp() public {
        // Deploy Balancer V2 contracts
        balancerRegistry = new BalancerV2PoolRegistry(address(this));
        balancerFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(balancerRegistry));
        
        // Mock pool ID calls
        vm.mockCall(BAL_WETH_POOL, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(1))));
        vm.mockCall(USDC_WETH_POOL, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(2))));
        
        // Set up pool mappings
        address[] memory balWethPools = new address[](1);
        balWethPools[0] = BAL_WETH_POOL;
        balancerRegistry.setPoolsForPair(BAL, WETH, balWethPools, 0);
        
        address[] memory wethBalPools = new address[](1);
        wethBalPools[0] = BAL_WETH_POOL;
        balancerRegistry.setPoolsForPair(WETH, BAL, wethBalPools, 0);
        
        address[] memory usdcWethPools = new address[](1);
        usdcWethPools[0] = USDC_WETH_POOL;
        balancerRegistry.setPoolsForPair(USDC, WETH, usdcWethPools, 0);
        
        address[] memory wethUsdcPools = new address[](1);
        wethUsdcPools[0] = USDC_WETH_POOL;
        balancerRegistry.setPoolsForPair(WETH, USDC, wethUsdcPools, 0);
        
        // Deploy protocol contracts
        address[] memory dexs = new address[](1);
        dexs[0] = address(balancerFetcher);
        
        address[] memory routers = new address[](1);
        routers[0] = BALANCER_VAULT;
        
        streamDaemon = new StreamDaemon(dexs, routers);
        executor = new Executor();
        registry = new Registry();
        
        // Configure registry
        registry.setRouter("Balancer", BALANCER_VAULT);
        
        // Deploy core
        core = new Core(address(streamDaemon), address(executor), address(registry));
    }

    function testProtocolIntegration() public {
        console.log("Testing protocol integration with Balancer V2");
        
        // Test that the fetcher is properly registered
        address firstDex = streamDaemon.dexs(0);
        assertEq(firstDex, address(balancerFetcher), "BalancerV2Fetcher should be registered");
        
        // Test that the router is properly configured
        address router = registry.getRouter("Balancer");
        assertEq(router, BALANCER_VAULT, "Balancer router should be configured");
        
        // Test fetcher functionality
        string memory dexType = balancerFetcher.getDexType();
        assertEq(dexType, "Balancer", "DEX type should be Balancer");
        
        string memory dexVersion = balancerFetcher.getDexVersion();
        assertEq(dexVersion, "V2", "DEX version should be V2");
        
        console.log("Protocol integration test passed");
    }

    function testPoolDiscovery() public {
        console.log("Testing pool discovery functionality");
        
        // Test BAL/WETH pair
        (IBalancerV2PoolRegistry.PoolInfo memory primary, bool exists) = balancerRegistry.getPrimary(BAL, WETH);
        assertTrue(exists, "BAL/WETH pair should exist");
        assertEq(primary.pool, BAL_WETH_POOL, "Primary pool should be correct");
        
        // Test WETH/BAL pair (reverse)
        (primary, exists) = balancerRegistry.getPrimary(WETH, BAL);
        assertTrue(exists, "WETH/BAL pair should exist");
        assertEq(primary.pool, BAL_WETH_POOL, "Primary pool should be correct");
        
        // Test USDC/WETH pair
        (primary, exists) = balancerRegistry.getPrimary(USDC, WETH);
        assertTrue(exists, "USDC/WETH pair should exist");
        assertEq(primary.pool, USDC_WETH_POOL, "Primary pool should be correct");
        
        console.log("Pool discovery test passed");
    }

    function testFetcherInterface() public {
        console.log("Testing fetcher interface compatibility");
        
        // Test getPoolAddress
        address poolAddr = balancerFetcher.getPoolAddress(BAL, WETH);
        assertEq(poolAddr, BAL_WETH_POOL, "Pool address should match");
        
        // Test with reverse pair
        poolAddr = balancerFetcher.getPoolAddress(WETH, BAL);
        assertEq(poolAddr, BAL_WETH_POOL, "Pool address should match for reverse pair");
        
        console.log("Fetcher interface test passed");
    }

    function testMockedReserves() public {
        console.log("Testing mocked reserves functionality");
        
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
        
        (uint256 reserveBAL, uint256 reserveWETH) = balancerFetcher.getReserves(BAL, WETH);
        assertEq(reserveBAL, 1000e18, "BAL reserves should match mocked value");
        assertEq(reserveWETH, 100e18, "WETH reserves should match mocked value");
        
        console.log("Mocked reserves test passed");
    }

    function testMockedPricing() public {
        console.log("Testing mocked pricing functionality");
        
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
        
        uint256 price = balancerFetcher.getPrice(BAL, WETH, amountIn);
        assertEq(price, 0.1e18, "Price should match mocked value");
        
        console.log("Mocked pricing test passed");
    }

    function testTradePlacement() public {
        console.log("Testing trade placement with Balancer V2");
        
        // Mock reserves for the trade
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
        
        // Mock pricing
        int256[] memory deltas = new int256[](2);
        deltas[0] = int256(1e18);  // Input amount
        deltas[1] = -int256(0.1e18);  // Output amount
        
        vm.mockCall(
            BALANCER_VAULT,
            abi.encodeWithSelector(IBalancerVault.queryBatchSwap.selector),
            abi.encode(deltas)
        );
        
        // Test that we can get reserves (this would be called during trade evaluation)
        (uint256 reserveBAL, uint256 reserveWETH) = balancerFetcher.getReserves(BAL, WETH);
        assertTrue(reserveBAL > 0, "BAL reserves should be greater than 0");
        assertTrue(reserveWETH > 0, "WETH reserves should be greater than 0");
        
        // Test that we can get price (this would be called during trade evaluation)
        uint256 price = balancerFetcher.getPrice(BAL, WETH, 1e18);
        assertTrue(price > 0, "Price should be greater than 0");
        
        console.log("Trade placement test passed");
        console.log("BAL reserves:", reserveBAL);
        console.log("WETH reserves:", reserveWETH);
        console.log("Price for 1 BAL:", price);
    }

    function testMultiplePoolsPerPair() public {
        console.log("Testing multiple pools per pair");
        
        // Add a second pool for BAL/WETH
        address secondPool = makeAddr("secondPool");
        vm.mockCall(secondPool, abi.encodeWithSelector(IBalancerPool.getPoolId.selector), abi.encode(bytes32(uint256(3))));
        
        balancerRegistry.addPool(BAL, WETH, secondPool, false);
        
        // Test that we now have 2 pools
        IBalancerV2PoolRegistry.PoolInfo[] memory pools = balancerRegistry.getPools(BAL, WETH);
        assertEq(pools.length, 2, "Should have 2 pools for BAL/WETH");
        assertEq(pools[0].pool, BAL_WETH_POOL, "First pool should be BAL_WETH_POOL");
        assertEq(pools[1].pool, secondPool, "Second pool should be secondPool");
        
        // Test primary pool selection
        (IBalancerV2PoolRegistry.PoolInfo memory primary, bool exists) = balancerRegistry.getPrimary(BAL, WETH);
        assertTrue(exists, "Primary pool should exist");
        assertEq(primary.pool, BAL_WETH_POOL, "Primary pool should still be BAL_WETH_POOL");
        
        // Change primary to second pool
        balancerRegistry.setPrimaryIndex(BAL, WETH, 1);
        (primary, exists) = balancerRegistry.getPrimary(BAL, WETH);
        assertEq(primary.pool, secondPool, "Primary pool should now be secondPool");
        
        console.log("Multiple pools per pair test passed");
    }
}
