
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../../src/adapters/BalancerV2PoolRegistry.sol";
import "../../src/adapters/BalancerV2Fetcher.sol";
import "../../src/interfaces/dex/IBalancerVault.sol";
import "../../src/Registry.sol";

contract SetupBalancerV2Pools is Script {
    address constant BALANCER_VAULT = 0xBA12222222228d8Ba445958a75a0704d566BF2C8;

    // Token addresses (checksum format)
    address constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address constant WBTC = 0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599;
    address constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address constant BAL = 0xba100000625a3754423978a60c9317c58a424e3D;
    address constant stETH = 0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84;
    address constant wstETH = 0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0;
    address constant LINK = 0x514910771AF9Ca656af840dff83E8264EcF986CA;
    address constant AAVE = 0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9;
    address constant UNI = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;
    address constant CRV = 0xD533a949740bb3306d119CC777fa900bA034cd52;
    address constant COMP = 0xc00e94Cb662C3520282E6f5717214004A7f26888;
    address constant rETH = 0xae78736Cd615f374D3085123A210448E74Fc6393;
    address constant cbETH = 0xBe9895146f7AF43049ca1c1AE358B0541Ea49704;
    address constant PENDLE = 0x808507121B80c02388fAd14726482e061B8da827;
    address constant ENS = 0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72;
    address constant GRT = 0xc944E90C64B2c07662A292be6244BDf05Cda44a7;
    address constant MANA = 0x0F5D2fB29fb7d3CFeE444a200298f468908cC942;
    address constant SAND = 0x3845badAde8e6dFF049820680d1F14bD3903a5d0;
    address constant APE = 0x4d224452801ACEd8B2F0aebE155379bb5D594381;
    address constant PAXG = 0x45804880De22913dAFE09f4980848ECE6EcbAf78;
    address constant IMX = 0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF;
    address constant TUSD = 0x0000000000085d4780B73119b644AE5ecd22b376;
    address constant ONEINCH = 0x111111111117dC0aa78b770fA6A738034120C302;
    address constant GNO = 0x6810e776880C02933D47DB1b9fc05908e5386b96;

    struct PoolInfo {
        address pool;
        address tokenA; 
        address tokenB;
        string name;
        bool verified;
    }

    function run() external {
        vm.startBroadcast();
        address deployer = msg.sender;

        // Use existing BalancerV2PoolRegistry from v1.0.3 deployment
        // Deployed at: 0xDDbBF78B2bf532D1637551a0186B26fBc9bfB5b1
        BalancerV2PoolRegistry balancerRegistry = BalancerV2PoolRegistry(0xDDbBF78B2bf532D1637551a0186B26fBc9bfB5b1);
        console.log("Using existing BalancerV2PoolRegistry at:", address(balancerRegistry));

        // Use existing BalancerV2Fetcher from v1.0.3 deployment
        // Deployed at: 0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6
        BalancerV2Fetcher balancerFetcher = BalancerV2Fetcher(0xF9abe8A26EcF289b7e16Ccf88D67252DdA2215A6);
        console.log("Using existing BalancerV2Fetcher at:", address(balancerFetcher));

        // Ensure deployer is keeper (should already be set, but safe to call again)
        balancerRegistry.setKeeper(deployer, true);
        console.log("Deployer set as keeper");
        
        // Initialize pools (all pools)
        initializePools(balancerRegistry, 0, 69);

        // Update your main Registry.sol to include the new BalancerV2Fetcher
        // This assumes your main Registry.sol has an `addDexFetcher` or similar function
        // Replace `YOUR_REGISTRY_ADDRESS` with the actual address of your main Registry contract
        // IRegistry mainRegistry = IRegistry(YOUR_REGISTRY_ADDRESS);
        // mainRegistry.addDexFetcher("BalancerV2", address(balancerFetcher));
        // console.log("BalancerV2Fetcher added to main Registry.");

        vm.stopBroadcast();
    }

    // Batched deployment functions - deploy fresh registry and add pools in batches
    // Batch 1: Deploys fresh registry + fetcher + adds pools 0-22
    function runBatch1() external {
        vm.startBroadcast();
        address deployer = msg.sender;
        
        // Deploy fresh contracts
        BalancerV2PoolRegistry balancerRegistry = new BalancerV2PoolRegistry(address(0));
        console.log("BalancerV2PoolRegistry deployed at:", address(balancerRegistry));
        
        BalancerV2Fetcher balancerFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(balancerRegistry));
        console.log("BalancerV2Fetcher deployed at:", address(balancerFetcher));
        
        // Set deployer as keeper
        balancerRegistry.setKeeper(deployer, true);
        console.log("Deployer set as keeper");
        console.log("=== SAVE THIS REGISTRY ADDRESS FOR BATCHES 2 & 3 ===");
        console.log("Registry:", address(balancerRegistry));
        
        console.log("Batch 1: Pools 0-22");
        initializePools(balancerRegistry, 0, 23);
        vm.stopBroadcast();
    }
    
    // Batch 2 & 3: IMPORTANT - Update REGISTRY_ADDRESS constant below after Batch 1 completes!
    // You'll see the address printed when Batch 1 completes
    address constant REGISTRY_ADDRESS = address(0); // UPDATE THIS after Batch 1!
    
    function runBatch2() external {
        vm.startBroadcast();
        require(REGISTRY_ADDRESS != address(0), "Must set REGISTRY_ADDRESS after Batch 1 completes!");
        
        BalancerV2PoolRegistry balancerRegistry = BalancerV2PoolRegistry(REGISTRY_ADDRESS);
        console.log("Using BalancerV2PoolRegistry at:", address(balancerRegistry));
        
        console.log("Batch 2: Pools 23-45");
        initializePools(balancerRegistry, 23, 23);
        vm.stopBroadcast();
    }
    
    function runBatch3() external {
        vm.startBroadcast();
        require(REGISTRY_ADDRESS != address(0), "Must set REGISTRY_ADDRESS after Batch 1 completes!");
        
        BalancerV2PoolRegistry balancerRegistry = BalancerV2PoolRegistry(REGISTRY_ADDRESS);
        console.log("Using BalancerV2PoolRegistry at:", address(balancerRegistry));
        
        console.log("Batch 3: Pools 46-68");
        initializePools(balancerRegistry, 46, 23);
        vm.stopBroadcast();
    }

    // Test function: Add a single pool (USDC-WETH) for debugging
    function addSinglePool() external {
        vm.startBroadcast();
        address deployer = msg.sender;
        
        // Use existing BalancerV2PoolRegistry from v1.0.3 deployment
        BalancerV2PoolRegistry balancerRegistry = BalancerV2PoolRegistry(0xDDbBF78B2bf532D1637551a0186B26fBc9bfB5b1);
        console.log("Using existing BalancerV2PoolRegistry at:", address(balancerRegistry));
        
        // Ensure deployer is keeper
        balancerRegistry.setKeeper(deployer, true);
        console.log("Deployer set as keeper");
        
        // Add single pool: USDC-WETH
        console.log("Adding single pool: USDC-WETH");
        balancerRegistry.addPool(USDC, WETH, 0x96646936b91d6B9D7D0c47C496AfBF3D6ec7B6f8, true);
        console.log("Pool added successfully!");
        
        vm.stopBroadcast();
    }

    // Batch functions: Add pools in batches of 3
    // Each batch adds 3 pools (6 addPool calls total: 3 pools x 2 directions)
    
    function addBatch1() external { addPoolBatch(0, 3); }
    function addBatch2() external { addPoolBatch(3, 3); }
    function addBatch3() external { addPoolBatch(6, 3); }
    function addBatch4() external { addPoolBatch(9, 3); }
    function addBatch5() external { addPoolBatch(12, 3); }
    function addBatch6() external { addPoolBatch(15, 3); }
    function addBatch7() external { addPoolBatch(18, 3); }
    function addBatch8() external { addPoolBatch(21, 3); }
    function addBatch9() external { addPoolBatch(24, 3); }
    function addBatch10() external { addPoolBatch(27, 3); }
    function addBatch11() external { addPoolBatch(30, 3); }
    function addBatch12() external { addPoolBatch(33, 3); }
    function addBatch13() external { addPoolBatch(36, 3); }
    function addBatch14() external { addPoolBatch(39, 3); }
    function addBatch15() external { addPoolBatch(42, 3); }
    function addBatch16() external { addPoolBatch(45, 3); }
    function addBatch17() external { addPoolBatch(48, 3); }
    function addBatch18() external { addPoolBatch(51, 3); }
    function addBatch19() external { addPoolBatch(54, 3); }
    function addBatch20() external { addPoolBatch(57, 3); }
    function addBatch21() external { addPoolBatch(60, 3); }
    function addBatch22() external { addPoolBatch(63, 3); }
    function addBatch23() external { addPoolBatch(66, 3); } // Last batch: 66, 67, 68 (3 pools)
    
    // Internal function to add a batch of pools
    function addPoolBatch(uint256 startIndex, uint256 count) internal {
        vm.startBroadcast();
        address deployer = msg.sender;
        
        // Use existing BalancerV2PoolRegistry from v1.0.3 deployment
        BalancerV2PoolRegistry balancerRegistry = BalancerV2PoolRegistry(0xDDbBF78B2bf532D1637551a0186B26fBc9bfB5b1);
        console.log("Using existing BalancerV2PoolRegistry at:", address(balancerRegistry));
        
        // Ensure deployer is keeper (safe to call multiple times)
        balancerRegistry.setKeeper(deployer, true);
        
        // Initialize pools in this batch
        initializePools(balancerRegistry, startIndex, count);
        
        vm.stopBroadcast();
    }

    function initializePools(BalancerV2PoolRegistry _registry, uint256 startIndex, uint256 count) internal {
        require(startIndex + count <= 69, "Invalid batch range");
        console.log("Initializing Balancer V2 pools batch:", startIndex, "to", startIndex + count - 1);

        PoolInfo[] memory pools = new PoolInfo[](69);

        // 0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[0] = PoolInfo({
            pool: 0x96646936b91d6B9D7D0c47C496AfBF3D6ec7B6f8,
            tokenA: USDC,
            tokenB: WETH,
            name: "USDC-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48
        pools[1] = PoolInfo({
            pool: 0x96646936b91d6B9D7D0c47C496AfBF3D6ec7B6f8,
            tokenA: WETH,
            tokenB: USDC,
            name: "WETH-USDC",
            verified: true
        });
        // 0x6B175474e89094c44da98B954EEdeaC495271D0f-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[2] = PoolInfo({
            pool: 0x0b09deA16768f0799065C475bE02919503cB2a35,
            tokenA: DAI,
            tokenB: WETH,
            name: "DAI-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0x6B175474e89094c44da98B954EEdeaC495271D0f
        pools[3] = PoolInfo({
            pool: 0x0b09deA16768f0799065C475bE02919503cB2a35,
            tokenA: WETH,
            tokenB: DAI,
            name: "WETH-DAI",
            verified: true
        });
        // 0x6B175474e89094c44da98B954EEdeaC495271D0f-0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48
        pools[4] = PoolInfo({
            pool: 0xa69ad41BBD9303f2c165d19b5564325Da72c7224,
            tokenA: DAI,
            tokenB: USDC,
            name: "DAI-USDC",
            verified: true
        });
        // 0x6B175474e89094c44da98B954EEdeaC495271D0f-0xdaC17f958D2eE523A2206206994597c13D831ec7
        pools[5] = PoolInfo({
            pool: 0x4d7880b18373fD916bBe63227509a187A41F8b62,
            tokenA: DAI,
            tokenB: USDT,
            name: "DAI-USDT",
            verified: true
        });
        // 0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48-0xdaC17f958D2eE523A2206206994597c13D831ec7
        pools[6] = PoolInfo({
            pool: 0x9f383F91C89CBd649c700C2BF69c2a828af299Aa,
            tokenA: USDC,
            tokenB: USDT,
            name: "USDC-USDT",
            verified: true
        });
        // 0xbA100000625a3754423978a60C9317C58a424e3d-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[7] = PoolInfo({
            pool: 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56,
            tokenA: BAL,
            tokenB: WETH,
            name: "BAL-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0xbA100000625a3754423978a60C9317C58a424e3d
        pools[8] = PoolInfo({
            pool: 0x5c6Ee304399DBdB9C8Ef030aB642B10820DB8F56,
            tokenA: WETH,
            tokenB: BAL,
            name: "WETH-BAL",
            verified: true
        });
        // 0x6810e776880C02933d47dB1B9Fc05908E5386b96-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[9] = PoolInfo({
            pool: 0xF4C0DD9B82DA36C07605df83c8a416F11724d88b,
            tokenA: GNO,
            tokenB: WETH,
            name: "GNO-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0x6810e776880C02933d47dB1B9Fc05908E5386b96
        pools[10] = PoolInfo({
            pool: 0xF4C0DD9B82DA36C07605df83c8a416F11724d88b,
            tokenA: WETH,
            tokenB: GNO,
            name: "WETH-GNO",
            verified: true
        });
        // 0xae78736Cd615f374d3085123a210448e74Fc6393-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[11] = PoolInfo({
            pool: 0x1E19CF2D73a72Ef1332C882F20534B6519Be0276,
            tokenA: rETH,
            tokenB: WETH,
            name: "rETH-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0xae78736Cd615f374d3085123a210448e74Fc6393
        pools[12] = PoolInfo({
            pool: 0x1E19CF2D73a72Ef1332C882F20534B6519Be0276,
            tokenA: WETH,
            tokenB: rETH,
            name: "WETH-rETH",
            verified: true
        });
        // 0x808507121B80C02388Fad14726482e061B8Da827-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[13] = PoolInfo({
            pool: 0xFD1Cf6FD41F229Ca86ada0584c63C49C3d66BbC9,
            tokenA: PENDLE,
            tokenB: WETH,
            name: "PENDLE-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0x808507121B80C02388Fad14726482e061B8Da827
        pools[14] = PoolInfo({
            pool: 0xFD1Cf6FD41F229Ca86ada0584c63C49C3d66BbC9,
            tokenA: WETH,
            tokenB: PENDLE,
            name: "WETH-PENDLE",
            verified: true
        });
        // 0x7f39c581F595b53C5CB19bd0B3F8dA6c935E2Ca0-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[15] = PoolInfo({
            pool: 0x32296969Ef14EB0c6d29669C550D4a0449130230,
            tokenA: wstETH,
            tokenB: WETH,
            name: "wstETH-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0x7f39c581F595b53C5CB19bd0B3F8dA6c935E2Ca0
        pools[16] = PoolInfo({
            pool: 0x32296969Ef14EB0c6d29669C550D4a0449130230,
            tokenA: WETH,
            tokenB: wstETH,
            name: "WETH-wstETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0xdaC17f958D2eE523A2206206994597c13D831ec7
        pools[17] = PoolInfo({
            pool: 0x3e5FA9518eA95c3E533EB377C001702A9AaCAA32,
            tokenA: WETH,
            tokenB: USDT,
            name: "WETH-USDT",
            verified: true
        });
        // 0xdaC17f958D2eE523A2206206994597c13D831ec7-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[18] = PoolInfo({
            pool: 0x3e5FA9518eA95c3E533EB377C001702A9AaCAA32,
            tokenA: USDT,
            tokenB: WETH,
            name: "USDT-WETH",
            verified: true
        });
        // 0x514910771Af9ca656Af840dff83E8264ECf986CA-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[19] = PoolInfo({
            pool: 0xE99481DC77691d8E2456E5f3F61C1810adFC1503,
            tokenA: LINK,
            tokenB: WETH,
            name: "LINK-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0x514910771Af9ca656Af840dff83E8264ECf986CA
        pools[20] = PoolInfo({
            pool: 0xE99481DC77691d8E2456E5f3F61C1810adFC1503,
            tokenA: WETH,
            tokenB: LINK,
            name: "WETH-LINK",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0xc18360217d8F7Ab5E7C516566761EA12cE7f9D72
        pools[21] = PoolInfo({
            pool: 0xefDC9246E0c4280fb1c138e1093a95Ab88959CF8,
            tokenA: WETH,
            tokenB: ENS,
            name: "WETH-ENS",
            verified: true
        });
        // 0xc18360217d8F7Ab5E7C516566761EA12cE7f9D72-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[22] = PoolInfo({
            pool: 0xefDC9246E0c4280fb1c138e1093a95Ab88959CF8,
            tokenA: ENS,
            tokenB: WETH,
            name: "ENS-WETH",
            verified: true
        });
        // 0xc00E94cB662c3520282E6f5717214004a7F26888-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[23] = PoolInfo({
            pool: 0xEFAa1604e82e1B3AF8430b90192c1B9e8197e377,
            tokenA: COMP,
            tokenB: WETH,
            name: "COMP-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0xc00E94cB662c3520282E6f5717214004a7F26888
        pools[24] = PoolInfo({
            pool: 0xEFAa1604e82e1B3AF8430b90192c1B9e8197e377,
            tokenA: WETH,
            tokenB: COMP,
            name: "WETH-COMP",
            verified: true
        });
        // 0x7f39c581F595b53C5CB19bd0B3F8dA6c935E2Ca0-0xBE9895146F7af43049cA1C1aE358B0541Ea49704
        pools[25] = PoolInfo({
            pool: 0x9c6d47Ff73e0F5E51BE5FD53236e3F595C5793F2,
            tokenA: wstETH,
            tokenB: cbETH,
            name: "wstETH-cbETH",
            verified: true
        });
        // 0xBE9895146F7af43049cA1C1aE358B0541Ea49704-0x7f39c581F595b53C5CB19bd0B3F8dA6c935E2Ca0
        pools[26] = PoolInfo({
            pool: 0x9c6d47Ff73e0F5E51BE5FD53236e3F595C5793F2,
            tokenA: cbETH,
            tokenB: wstETH,
            name: "cbETH-wstETH",
            verified: true
        });
        // 0x7f39c581F595b53C5CB19bd0B3F8dA6c935E2Ca0-0xc00E94cB662c3520282E6f5717214004a7F26888
        pools[27] = PoolInfo({
            pool: 0x87a867f5D240a782d43D90b6B06DEa470F3f8F22,
            tokenA: wstETH,
            tokenB: COMP,
            name: "wstETH-COMP",
            verified: true
        });
        // 0xc00E94cB662c3520282E6f5717214004a7F26888-0x7f39c581F595b53C5CB19bd0B3F8dA6c935E2Ca0
        pools[28] = PoolInfo({
            pool: 0x87a867f5D240a782d43D90b6B06DEa470F3f8F22,
            tokenA: COMP,
            tokenB: wstETH,
            name: "COMP-wstETH",
            verified: true
        });
        // 0x1F9840A85D5aF5BF1d1762F925bDADDC4201F984-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[29] = PoolInfo({
            pool: 0x5Aa90c7362ea46b3cbFBD7F01EA5Ca69C98Fef1c,
            tokenA: UNI,
            tokenB: WETH,
            name: "UNI-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0x1F9840A85D5aF5BF1d1762F925bDADDC4201F984
        pools[30] = PoolInfo({
            pool: 0x5Aa90c7362ea46b3cbFBD7F01EA5Ca69C98Fef1c,
            tokenA: WETH,
            tokenB: UNI,
            name: "WETH-UNI",
            verified: true
        });
        // 0x6B175474e89094c44da98B954EEdeaC495271D0f-0xbA100000625a3754423978a60C9317C58a424e3d
        pools[31] = PoolInfo({
            pool: 0x4626d81b3a1711bEb79f4CEcFf2413886d461677,
            tokenA: DAI,
            tokenB: BAL,
            name: "DAI-BAL",
            verified: true
        });
        // 0xbA100000625a3754423978a60C9317C58a424e3d-0x6B175474e89094c44da98B954EEdeaC495271D0f
        pools[32] = PoolInfo({
            pool: 0x4626d81b3a1711bEb79f4CEcFf2413886d461677,
            tokenA: BAL,
            tokenB: DAI,
            name: "BAL-DAI",
            verified: true
        });
        // 0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48-0xbA100000625a3754423978a60C9317C58a424e3d
        pools[33] = PoolInfo({
            pool: 0x9c08C7a7a89cfD671c79eacdc6F07c1996277eD5,
            tokenA: USDC,
            tokenB: BAL,
            name: "USDC-BAL",
            verified: true
        });
        // 0xbA100000625a3754423978a60C9317C58a424e3d-0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48
        pools[34] = PoolInfo({
            pool: 0x9c08C7a7a89cfD671c79eacdc6F07c1996277eD5,
            tokenA: BAL,
            tokenB: USDC,
            name: "BAL-USDC",
            verified: true
        });
        // 0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48-0xC944e90C64B2C07662A292be6244bdF05cDa44A7
        pools[35] = PoolInfo({
            pool: 0x14462305D211C12A736986F4E8216E28c5EA7Ab4,
            tokenA: USDC,
            tokenB: GRT,
            name: "USDC-GRT",
            verified: true
        });
        // 0xC944e90C64B2C07662A292be6244bdF05cDa44A7-0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48
        pools[36] = PoolInfo({
            pool: 0x14462305D211C12A736986F4E8216E28c5EA7Ab4,
            tokenA: GRT,
            tokenB: USDC,
            name: "GRT-USDC",
            verified: true
        });
        // 0xdaC17f958D2eE523A2206206994597c13D831ec7-0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48
        pools[37] = PoolInfo({
            pool: 0x9f383F91C89CBd649c700C2BF69c2a828af299Aa,
            tokenA: USDT,
            tokenB: USDC,
            name: "USDT-USDC",
            verified: true
        });
        // 0x45804880De22913DaFe09F4980848eCE6ecBAF78-0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48
        pools[38] = PoolInfo({
            pool: 0x4aA462D59361fC0115B3aB7E447627534a8642ae,
            tokenA: PAXG,
            tokenB: USDC,
            name: "PAXG-USDC",
            verified: true
        });
        // 0x45804880De22913DaFe09F4980848eCE6ecBAF78-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[39] = PoolInfo({
            pool: 0x614b5038611729ed49e0dED154d8A5d3AF9D1D9E,
            tokenA: PAXG,
            tokenB: WETH,
            name: "PAXG-WETH",
            verified: true
        });
        // 0xdaC17f958D2eE523A2206206994597c13D831ec7-0x6B175474e89094c44da98B954EEdeaC495271D0f
        pools[40] = PoolInfo({
            pool: 0x4d7880b18373fD916bBe63227509a187A41F8b62,
            tokenA: USDT,
            tokenB: DAI,
            name: "USDT-DAI",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0xC944e90C64B2C07662A292be6244bdF05cDa44A7
        pools[41] = PoolInfo({
            pool: 0x89EA4363Bd541d27d9811E4Df1209dAa73154472,
            tokenA: WETH,
            tokenB: GRT,
            name: "WETH-GRT",
            verified: true
        });
        // 0xC944e90C64B2C07662A292be6244bdF05cDa44A7-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[42] = PoolInfo({
            pool: 0x89EA4363Bd541d27d9811E4Df1209dAa73154472,
            tokenA: GRT,
            tokenB: WETH,
            name: "GRT-WETH",
            verified: true
        });
        // 0x514910771Af9ca656Af840dff83E8264ECf986CA-0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48
        pools[43] = PoolInfo({
            pool: 0x02DCa886B5Af3b6400254D9909Af9FB4B320794E,
            tokenA: LINK,
            tokenB: USDC,
            name: "LINK-USDC",
            verified: true
        });
        // 0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48-0x514910771Af9ca656Af840dff83E8264ECf986CA
        pools[44] = PoolInfo({
            pool: 0x02DCa886B5Af3b6400254D9909Af9FB4B320794E,
            tokenA: USDC,
            tokenB: LINK,
            name: "USDC-LINK",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0xD533a949740BB3306D119Cc777Fa900BA034CD52
        pools[45] = PoolInfo({
            pool: 0x813E6A5f31C95F7c5f9982B1FDc6C69610bEab4A,
            tokenA: WETH,
            tokenB: CRV,
            name: "WETH-CRV",
            verified: true
        });
        // 0xD533a949740BB3306D119Cc777Fa900BA034CD52-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[46] = PoolInfo({
            pool: 0x813E6A5f31C95F7c5f9982B1FDc6C69610bEab4A,
            tokenA: CRV,
            tokenB: WETH,
            name: "CRV-WETH",
            verified: true
        });
        // 0x1F9840A85D5aF5BF1d1762F925bDADDC4201F984-0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48
        pools[47] = PoolInfo({
            pool: 0xa0cF2478a7a9FaDd53ce24665399Aa80C7eb5075,
            tokenA: UNI,
            tokenB: USDC,
            name: "UNI-USDC",
            verified: true
        });
        // 0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48-0x1F9840A85D5aF5BF1d1762F925bDADDC4201F984
        pools[48] = PoolInfo({
            pool: 0xa0cF2478a7a9FaDd53ce24665399Aa80C7eb5075,
            tokenA: USDC,
            tokenB: UNI,
            name: "USDC-UNI",
            verified: true
        });
        // 0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48-0x6B175474e89094c44da98B954EEdeaC495271D0f
        pools[49] = PoolInfo({
            pool: 0xa69ad41BBD9303f2c165d19b5564325Da72c7224,
            tokenA: USDC,
            tokenB: DAI,
            name: "USDC-DAI",
            verified: true
        });
        // 0x514910771Af9ca656Af840dff83E8264ECf986CA-0xc00E94cB662c3520282E6f5717214004a7F26888
        pools[50] = PoolInfo({
            pool: 0x6E13fB316613e6B73dbF83a74f4aa08154abd533,
            tokenA: LINK,
            tokenB: COMP,
            name: "LINK-COMP",
            verified: true
        });
        // 0xc00E94cB662c3520282E6f5717214004a7F26888-0x514910771Af9ca656Af840dff83E8264ECf986CA
        pools[51] = PoolInfo({
            pool: 0x6E13fB316613e6B73dbF83a74f4aa08154abd533,
            tokenA: COMP,
            tokenB: LINK,
            name: "COMP-LINK",
            verified: true
        });
        // 0x6810e776880C02933d47dB1B9Fc05908E5386b96-0xbA100000625a3754423978a60C9317C58a424e3d
        pools[52] = PoolInfo({
            pool: 0x36128D5436d2d70cab39C9AF9CcE146C38554ff0,
            tokenA: GNO,
            tokenB: BAL,
            name: "GNO-BAL",
            verified: true
        });
        // 0xbA100000625a3754423978a60C9317C58a424e3d-0x6810e776880C02933d47dB1B9Fc05908E5386b96
        pools[53] = PoolInfo({
            pool: 0x36128D5436d2d70cab39C9AF9CcE146C38554ff0,
            tokenA: BAL,
            tokenB: GNO,
            name: "BAL-GNO",
            verified: true
        });
        // 0x4D224452801aCeD8B2f0aebe155379Bb5d594381-0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2
        pools[54] = PoolInfo({
            pool: 0xeD9eEe3A0a98d84CE6Bb33Ac8BdDaeD1b5302F02,
            tokenA: APE,
            tokenB: WETH,
            name: "APE-WETH",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0x4D224452801aCeD8B2f0aebe155379Bb5d594381
        pools[55] = PoolInfo({
            pool: 0xeD9eEe3A0a98d84CE6Bb33Ac8BdDaeD1b5302F02,
            tokenA: WETH,
            tokenB: APE,
            name: "WETH-APE",
            verified: true
        });
        // 0xc02aaA39B223Fe8D0A0E5C4f27EAd9083C756cc2-0x45804880De22913DaFe09F4980848eCE6ecBAF78
        pools[56] = PoolInfo({
            pool: 0x614b5038611729ed49e0dED154d8A5d3AF9D1D9E,
            tokenA: WETH,
            tokenB: PAXG,
            name: "WETH-PAXG",
            verified: true
        });
        // 0x45804880De22913DaFe09F4980848eCE6ecBAF78-0x6B175474e89094c44da98B954EEdeaC495271D0f
        pools[57] = PoolInfo({
            pool: 0xF7f310684A7A2dB2aD6Ad4032d61E763f99Bf272,
            tokenA: PAXG,
            tokenB: DAI,
            name: "PAXG-DAI",
            verified: true
        });
        // 0x6B175474e89094c44da98B954EEdeaC495271D0f-0x45804880De22913DaFe09F4980848eCE6ecBAF78
        pools[58] = PoolInfo({
            pool: 0xF7f310684A7A2dB2aD6Ad4032d61E763f99Bf272,
            tokenA: DAI,
            tokenB: PAXG,
            name: "DAI-PAXG",
            verified: true
        });
        // 0x7f39c581F595b53C5CB19bd0B3F8dA6c935E2Ca0-0xae78736Cd615f374d3085123a210448e74Fc6393
        pools[59] = PoolInfo({
            pool: 0xBB5820734d6d1623c1a8b39c848BcFB1417bAc19,
            tokenA: wstETH,
            tokenB: rETH,
            name: "wstETH-rETH",
            verified: true
        });
        // 0xae78736Cd615f374d3085123a210448e74Fc6393-0x7f39c581F595b53C5CB19bd0B3F8dA6c935E2Ca0
        pools[60] = PoolInfo({
            pool: 0xBB5820734d6d1623c1a8b39c848BcFB1417bAc19,
            tokenA: rETH,
            tokenB: wstETH,
            name: "rETH-wstETH",
            verified: true
        });
        // 0x4D224452801aCeD8B2f0aebe155379Bb5d594381-0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48
        pools[61] = PoolInfo({
            pool: 0xB1b908BF850b75d20cbCE5F4A3f8D8082F64BB2C,
            tokenA: APE,
            tokenB: USDC,
            name: "APE-USDC",
            verified: true
        });
        // 0xA0B86991c6218B36c1d19D4A2E9eb0ce3606Eb48-0x4D224452801aCeD8B2f0aebe155379Bb5d594381
        pools[62] = PoolInfo({
            pool: 0xB1b908BF850b75d20cbCE5F4A3f8D8082F64BB2C,
            tokenA: USDC,
            tokenB: APE,
            name: "USDC-APE",
            verified: true
        });
        // 0x1F9840A85D5aF5BF1d1762F925bDADDC4201F984-0xbA100000625a3754423978a60C9317C58a424e3d
        pools[63] = PoolInfo({
            pool: 0x733BD33Dd0604028f31AacA029C6cc14BdA8a367,
            tokenA: UNI,
            tokenB: BAL,
            name: "UNI-BAL",
            verified: true
        });
        // 0xbA100000625a3754423978a60C9317C58a424e3d-0x1F9840A85D5aF5BF1d1762F925bDADDC4201F984
        pools[64] = PoolInfo({
            pool: 0x733BD33Dd0604028f31AacA029C6cc14BdA8a367,
            tokenA: BAL,
            tokenB: UNI,
            name: "BAL-UNI",
            verified: true
        });
        // 0xc18360217d8F7Ab5E7C516566761EA12cE7f9D72-0xdaC17f958D2eE523A2206206994597c13D831ec7
        pools[65] = PoolInfo({
            pool: 0x2DD73658B2351da4c8fee8AF2135B007db37B362,
            tokenA: ENS,
            tokenB: USDT,
            name: "ENS-USDT",
            verified: true
        });
        // 0xdaC17f958D2eE523A2206206994597c13D831ec7-0xc18360217d8F7Ab5E7C516566761EA12cE7f9D72
        pools[66] = PoolInfo({
            pool: 0x2DD73658B2351da4c8fee8AF2135B007db37B362,
            tokenA: USDT,
            tokenB: ENS,
            name: "USDT-ENS",
            verified: true
        });
        // 0xbA100000625a3754423978a60C9317C58a424e3d-0xdaC17f958D2eE523A2206206994597c13D831ec7
        pools[67] = PoolInfo({
            pool: 0x0Ce45bA1C33e0741957881e05DAFf3b1e2954A9B,
            tokenA: BAL,
            tokenB: USDT,
            name: "BAL-USDT",
            verified: true
        });
        // 0xdaC17f958D2eE523A2206206994597c13D831ec7-0xbA100000625a3754423978a60C9317C58a424e3d
        pools[68] = PoolInfo({
            pool: 0x0Ce45bA1C33e0741957881e05DAFf3b1e2954A9B,
            tokenA: USDT,
            tokenB: BAL,
            name: "USDT-BAL",
            verified: true
        });

        for (uint256 i = startIndex; i < startIndex + count; i++) {
            PoolInfo memory p = pools[i];
            _registry.addPool(p.tokenA, p.tokenB, p.pool, p.verified);
            _registry.addPool(p.tokenB, p.tokenA, p.pool, p.verified); // Add in reverse direction
            console.log("Added pool:", p.name, "Address:", p.pool);
        }
        console.log("Balancer V2 pools batch initialized:", startIndex, "to", startIndex + count - 1);
    }
}