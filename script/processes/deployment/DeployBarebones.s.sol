// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../../src/Core.sol";
import "../../../src/StreamDaemon.sol";
import "../../../src/Executor.sol";
import "../../../src/Registry.sol";
import "../../../src/adapters/UniswapV2Fetcher.sol";
import "../../../src/adapters/UniswapV3Fetcher.sol";
import "../../../src/adapters/SushiswapFetcher.sol";
import "../../../src/adapters/BalancerV2Fetcher.sol";
import "../../../src/adapters/BalancerV2PoolRegistry.sol";
import "../../../src/adapters/CurveMetaFetcher.sol";
import "../../../src/interfaces/dex/ICurveMetaRegistry.sol";

contract DeployBarebones is Script {
    // Core protocol contracts
    Core public core;
    StreamDaemon public streamDaemon;
    Executor public executor;
    Registry public registry;

    // DEX addresses on mainnet
    address constant UNISWAP_V2_FACTORY = 0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f;
    address constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;
    address constant UNISWAP_V2_QUOTER_V2 = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;

    address constant UNISWAP_V3_ROUTER = 0xE592427A0AEce92De3Edee1F18E0157C05861564;
    address constant UNISWAP_V3_FACTORY = 0x1F98431c8aD98523631AE4a59f267346ea31F984;
    address constant UNISWAP_V3_QUOTER_V2 = 0x61fFE014bA17989E743c5F6cB21bF9697530B21e;

    address constant SUSHISWAP_ROUTER = 0xd9e1cE17f2641f24aE83637ab66a2cca9C378B9F;
    address constant SUSHISWAP_FACTORY = 0xC0AEe478e3658e2610c5F7A4A2E1777cE9e4f2Ac;

    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;
    address constant CURVE_META_REGISTRY = 0xF98B45FA17DE75FB1aD0e7aFD971b0ca00e379fC;

    // Common token addresses for testing
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant BAL = 0xba100000625a3754423978a60c9317c58a424e3D;
    address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address constant stETH = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;
    address constant wstETH = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
    address constant LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
    address constant AAVE = 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9;
    address constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;
    address constant CRV = 0xD533a949740bb3306d119CC777fa900bA034cd52;
    address constant COMP = 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    address constant rETH = 0xae78736Cd615f374D3085123A210448E74Fc6393;
    address constant cbETH = 0xBe9895146f7AF43049ca1c1AE358B0541Ea49704;

    // UniswapV3 fee tiers
    uint24 constant FEE_500 = 500;    // 0.05%
    uint24 constant FEE_3000 = 3000;  // 0.3%
    uint24 constant FEE_10000 = 10000; // 1%

    // Balancer pool addresses
    address constant BAL_WETH_POOL = 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56;
    address constant USDC_WETH_POOL = 0x96646936b91d6B9D7D0c47C496AfBF3D6ec7B6f8;

    function run() external {
        // Use a default private key for dry runs if no account is specified
        uint256 deployerPrivateKey;
        try vm.envUint("PRIVATE_KEY") returns (uint256 pk) {
            deployerPrivateKey = pk;
        } catch {
            deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80; // Default anvil private key
        }
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying 1SLiquidity Protocol...");
        console.log("Deployer:", deployer);
        console.log("Deployer balance:", deployer.balance);
        console.log("Chain ID:", block.chainid);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy core protocol contracts
        console.log("Deploying Executor...");
        executor = new Executor();
        console.log("Executor deployed at:", address(executor));

        console.log("Deploying Registry...");
        registry = new Registry();
        console.log("Registry deployed at:", address(registry));

        // Deploy DEX fetchers
        console.log("Deploying UniswapV2Fetcher...");
        UniswapV2Fetcher uniswapV2Fetcher = new UniswapV2Fetcher(UNISWAP_V2_FACTORY);
        console.log("UniswapV2Fetcher deployed at:", address(uniswapV2Fetcher));

        console.log("Deploying UniswapV3Fetchers with different fee tiers...");
        UniswapV3Fetcher uniswapV3Fetcher500 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, FEE_500);
        console.log("UniswapV3Fetcher (0.05%) deployed at:", address(uniswapV3Fetcher500));

        UniswapV3Fetcher uniswapV3Fetcher3000 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, FEE_3000);
        console.log("UniswapV3Fetcher (0.3%) deployed at:", address(uniswapV3Fetcher3000));

        UniswapV3Fetcher uniswapV3Fetcher10000 = new UniswapV3Fetcher(UNISWAP_V3_FACTORY, FEE_10000);
        console.log("UniswapV3Fetcher (1%) deployed at:", address(uniswapV3Fetcher10000));

        console.log("Deploying SushiswapFetcher...");
        SushiswapFetcher sushiswapFetcher = new SushiswapFetcher(SUSHISWAP_FACTORY);
        console.log("SushiswapFetcher deployed at:", address(sushiswapFetcher));

        console.log("Deploying BalancerV2PoolRegistry...");
        BalancerV2PoolRegistry balancerRegistry = new BalancerV2PoolRegistry(deployer);
        console.log("BalancerV2PoolRegistry deployed at:", address(balancerRegistry));

        console.log("Deploying BalancerV2Fetcher...");
        BalancerV2Fetcher balancerFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(balancerRegistry));
        console.log("BalancerV2Fetcher deployed at:", address(balancerFetcher));

        console.log("Deploying CurveMetaFetcher...");
        CurveMetaFetcher curveFetcher = new CurveMetaFetcher(CURVE_META_REGISTRY);
        console.log("CurveMetaFetcher deployed at:", address(curveFetcher));

        // Note: Do not preload Balancer pools here. We'll run SetupBalancerV2Pools.s.sol after deployment.
        console.log("Skipping Balancer pool preloading in barebones deployment");

        // Create arrays for StreamDaemon
        address[] memory dexs = new address[](7);
        address[] memory routers = new address[](7);

        dexs[0] = address(uniswapV2Fetcher);
        dexs[1] = address(uniswapV3Fetcher500);
        dexs[2] = address(uniswapV3Fetcher3000);
        dexs[3] = address(uniswapV3Fetcher10000);
        dexs[4] = address(sushiswapFetcher);
        dexs[5] = address(balancerFetcher);
        dexs[6] = address(curveFetcher);

        routers[0] = UNISWAP_V2_ROUTER;
        routers[1] = UNISWAP_V3_ROUTER;
        routers[2] = UNISWAP_V3_ROUTER;
        routers[3] = UNISWAP_V3_ROUTER;
        routers[4] = SUSHISWAP_ROUTER;
        routers[5] = address(balancerFetcher);
        routers[6] = address(curveFetcher);

        console.log("Deploying StreamDaemon...");
        streamDaemon = new StreamDaemon(dexs, routers);
        console.log("StreamDaemon deployed at:", address(streamDaemon));

        console.log("Deploying Core...");
        core = new Core(address(registry), address(executor), address(streamDaemon));
        console.log("Core deployed at:", address(core));

        // Configure QuoterV2 for UniswapV3 fetchers
        console.log("Configuring QuoterV2 for UniswapV3 fetchers...");
        uniswapV3Fetcher500.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        uniswapV3Fetcher3000.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        uniswapV3Fetcher10000.setQuoterV2(UNISWAP_V3_QUOTER_V2);
        console.log("QuoterV2 configured for all UniswapV3 fetchers");

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== DEPLOYMENT SUMMARY ===");
        console.log("Core:", address(core));
        console.log("Registry:", address(registry));
        console.log("Executor:", address(executor));
        console.log("StreamDaemon:", address(streamDaemon));
        console.log("UniswapV2Fetcher:", address(uniswapV2Fetcher));
        console.log("UniswapV3Fetcher (0.05%):", address(uniswapV3Fetcher500));
        console.log("UniswapV3Fetcher (0.3%):", address(uniswapV3Fetcher3000));
        console.log("UniswapV3Fetcher (1%):", address(uniswapV3Fetcher10000));
        console.log("SushiswapFetcher:", address(sushiswapFetcher));
        console.log("BalancerV2PoolRegistry:", address(balancerRegistry));
        console.log("BalancerV2Fetcher:", address(balancerFetcher));
        console.log("CurveMetaFetcher:", address(curveFetcher));
        console.log("========================\n");

        console.log("Deployment completed successfully!");
    }

    // No Balancer pool preloading in this script
}