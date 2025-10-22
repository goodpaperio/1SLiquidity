#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

// Your vetted token addresses (checksum format)
const VETTED_TOKENS = {
  "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
  "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48": "USDC",
  "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
  "0x2260fac5e5542a773aa44fbcfeDf7C193bc2c599": "WBTC",
  "0x6b175474e89094c44da98b954eedeac495271d0f": "DAI",
  "0xba100000625a3754423978a60c9317c58a424e3d": "BAL",
  "0xae7ab96520de3a18e5e111b5eaab095312d7fe84": "stETH",
  "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0": "wstETH",
  "0x514910771af9ca656af840dff83e8264ecf986ca": "LINK",
  "0x7fc66500c84a76ad7e9c93437bfc5ac33e2dda9": "AAVE",
  "0x1f9840a85d5af5bf1d1762f925bdaddc4201f984": "UNI",
  "0xd533a949740bb3306d119cc777fa900ba034cd52": "CRV",
  "0xc00e94cb662c3520282e6f5717214004a7f26888": "COMP",
  "0xae78736cd615f374d3085123a210448e74fc6393": "rETH",
  "0xbe9895146f7af43049ca1c1ae358b0541ea49704": "cbETH",
  "0x808507121b80c02388fad14726482e061b8da827": "PENDLE",
  "0xc18360217d8f7ab5e7c516566761ea12ce7f9d72": "ENS",
  "0xc944e90c64b2c07662a292be6244bdf05cda44a7": "GRT",
  "0x0f5d2fb29fb7d3cfe444a200298f468908cc942": "MANA",
  "0x3845badade8e6dff049820680d1f14bd3903a5d0": "SAND",
  "0x4d224452801aced8b2f0aebe155379bb5d594381": "APE",
  "0x45804880de22913dafe09f4980848ece6ecbaf78": "PAXG",
  "0xf57e7e7c23978c3caec3c3548e3d615c346e79ff": "IMX",
  "0x0000000000085d4780b73119b644ae5ecd22b376": "TUSD",
  "0x111111111117dc0aa78b770fa6a738034120c302": "1INCH",
  "0x6810e776880c02933d47db1b9fc05908e5386b96": "GNO",
};

// Convert lowercase address to checksum using proper EIP-55 algorithm
function toChecksumAddress(address) {
  const addr = address.slice(2).toLowerCase();
  const hash = require("crypto")
    .createHash("sha3-256")
    .update(addr)
    .digest("hex");
  let checksum = "0x";

  for (let i = 0; i < addr.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      checksum += addr[i].toUpperCase();
    } else {
      checksum += addr[i];
    }
  }

  return checksum;
}

// Check if pool contains only vetted tokens
function isVettedPool(tokens) {
  return tokens.every((token) => VETTED_TOKENS[token.toLowerCase()]);
}

// Get pool type from symbol
function getPoolType(symbol) {
  if (symbol.includes("B-") && symbol.includes("-")) {
    return "Weighted";
  } else if (symbol.includes("staBAL") || symbol.includes("Stable")) {
    return "Stable";
  } else if (symbol.includes("Linear")) {
    return "Linear";
  } else {
    return "Other";
  }
}

// Sort pools by priority
function sortPools(a, b) {
  // Prefer 2-token pools
  if (a.tokens.length !== b.tokens.length) {
    return a.tokens.length - b.tokens.length;
  }

  // Prefer Weighted pools
  const typeOrder = { Weighted: 1, Stable: 2, Linear: 3, Other: 4 };
  if (a.type !== b.type) {
    return typeOrder[a.type] - typeOrder[b.type];
  }

  // Prefer active pools
  if (a.isActive !== b.isActive) {
    return b.isActive - a.isActive;
  }

  return 0;
}

// Generate Solidity code for pool
function generatePoolCode(pool, tokenA, tokenB, symbolA, symbolB) {
  return `        pools.push(PoolInfo({
            pool: ${pool.poolAddress},
            tokenA: ${symbolA},
            tokenB: ${symbolB},
            name: "${symbolA}-${symbolB}",
            verified: true
        }));`;
}

// Main function
function main() {
  console.log("=== Balancer Pools Parser ===\n");

  // Read the balancer pools data
  const poolsPath = path.join(__dirname, "../keeper/data/balancer-pools.json");

  if (!fs.existsSync(poolsPath)) {
    console.error(
      "Error: balancer-pools.json not found. Run: cd keeper && npm run balancer:fetch"
    );
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(poolsPath, "utf8"));
  console.log(`Found ${data.totalPools} total pools\n`);

  // Filter pools with vetted tokens
  const vettedPools = data.pools.filter((pool) => {
    return (
      pool.isActive &&
      pool.tokens.length >= 2 &&
      pool.tokens.length <= 3 && // Focus on 2-3 token pools
      isVettedPool(pool.tokens)
    );
  });

  console.log(`Found ${vettedPools.length} pools with vetted tokens\n`);

  // Process pools and group by token pairs
  const poolMap = new Map();

  vettedPools.forEach((pool) => {
    const tokens = pool.tokens.map((t) => toChecksumAddress(t));
    const symbols = pool.tokens.map((t) => VETTED_TOKENS[t.toLowerCase()]);
    const type = getPoolType(pool.symbol);

    const poolInfo = {
      poolId: pool.poolId,
      poolAddress: toChecksumAddress(pool.poolAddress),
      tokens,
      symbols,
      type,
      isActive: pool.isActive,
      symbol: pool.symbol,
      name: pool.name,
    };

    // For 2-token pools, create both directions
    if (tokens.length === 2) {
      const [tokenA, tokenB] = tokens;
      const [symbolA, symbolB] = symbols;

      const key1 = `${tokenA}-${tokenB}`;
      const key2 = `${tokenB}-${tokenA}`;

      if (!poolMap.has(key1)) poolMap.set(key1, []);
      if (!poolMap.has(key2)) poolMap.set(key2, []);

      poolMap.get(key1).push({ ...poolInfo, tokenA, tokenB, symbolA, symbolB });
      poolMap.get(key2).push({
        ...poolInfo,
        tokenA: tokenB,
        tokenB: tokenA,
        symbolA: symbolB,
        symbolB: symbolA,
      });
    }

    // For 3-token pools, create all pairwise combinations
    if (tokens.length === 3) {
      const [tokenA, tokenB, tokenC] = tokens;
      const [symbolA, symbolB, symbolC] = symbols;

      const pairs = [
        [tokenA, tokenB, symbolA, symbolB],
        [tokenA, tokenC, symbolA, symbolC],
        [tokenB, tokenC, symbolB, symbolC],
      ];

      pairs.forEach(([t1, t2, s1, s2]) => {
        const key = `${t1}-${t2}`;
        if (!poolMap.has(key)) poolMap.set(key, []);
        poolMap.get(key).push({
          ...poolInfo,
          tokenA: t1,
          tokenB: t2,
          symbolA: s1,
          symbolB: s2,
        });
      });
    }
  });

  // Sort pools by priority
  poolMap.forEach((pools) => {
    pools.sort(sortPools);
  });

  // Generate the setup script
  const setupScript = generateSetupScript(poolMap);

  // Write the setup script
  const outputPath = path.join(
    __dirname,
    "../script/processes/SetupBalancerV2Pools.s.sol"
  );
  fs.writeFileSync(outputPath, setupScript);

  console.log(
    `Generated SetupBalancerV2Pools.s.sol with ${poolMap.size} token pairs`
  );
  console.log(`Output written to: ${outputPath}\n`);

  // Print summary
  console.log("=== SUMMARY ===");
  console.log(`Total pools found: ${vettedPools.length}`);
  console.log(`Token pairs covered: ${poolMap.size}`);
  console.log(
    `Weighted pools: ${
      vettedPools.filter((p) => getPoolType(p.symbol) === "Weighted").length
    }`
  );
  console.log(
    `Stable pools: ${
      vettedPools.filter((p) => getPoolType(p.symbol) === "Stable").length
    }`
  );
  console.log(
    `Linear pools: ${
      vettedPools.filter((p) => getPoolType(p.symbol) === "Linear").length
    }`
  );

  // Show some examples
  console.log("\n=== EXAMPLE POOLS ===");
  let count = 0;
  for (const [pair, pools] of poolMap) {
    if (count >= 10) break;
    const primary = pools[0];
    console.log(`${pair}: ${primary.poolAddress} (${primary.type})`);
    count++;
  }
}

// Generate the complete setup script
function generateSetupScript(poolMap) {
  const pools = Array.from(poolMap.entries()).map(([pair, poolList]) => {
    const primary = poolList[0];
    return {
      pair,
      primary,
      all: poolList,
    };
  });

  return `// SPDX-License-Identifier: MIT
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
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);

        // Deploy BalancerV2PoolRegistry
        BalancerV2PoolRegistry balancerRegistry = new BalancerV2PoolRegistry(msg.sender);
        console.log("BalancerV2PoolRegistry deployed at:", address(balancerRegistry));

        // Deploy BalancerV2Fetcher
        BalancerV2Fetcher balancerFetcher = new BalancerV2Fetcher(BALANCER_VAULT, address(balancerRegistry));
        console.log("BalancerV2Fetcher deployed at:", address(balancerFetcher));

        // Initialize pools in the registry
        initializePools(balancerRegistry);

        // Update your main Registry.sol to include the new BalancerV2Fetcher
        // This assumes your main Registry.sol has an \`addDexFetcher\` or similar function
        // Replace \`YOUR_REGISTRY_ADDRESS\` with the actual address of your main Registry contract
        // IRegistry mainRegistry = IRegistry(YOUR_REGISTRY_ADDRESS);
        // mainRegistry.addDexFetcher("BalancerV2", address(balancerFetcher));
        // console.log("BalancerV2Fetcher added to main Registry.");

        vm.stopBroadcast();
    }

    function initializePools(BalancerV2PoolRegistry _registry) internal {
        console.log("Initializing Balancer V2 pools in the registry...");

        PoolInfo[] memory pools = new PoolInfo[](${pools.length});

${pools
  .map(
    (p, i) => `        // ${p.pair}
        pools[${i}] = PoolInfo({
            pool: ${p.primary.poolAddress},
            tokenA: ${p.primary.symbolA},
            tokenB: ${p.primary.symbolB},
            name: "${p.primary.symbolA}-${p.primary.symbolB}",
            verified: true
        });`
  )
  .join("\n")}

        for (uint256 i = 0; i < pools.length; i++) {
            PoolInfo memory p = pools[i];
            _registry.addPool(p.tokenA, p.tokenB, p.pool, p.verified);
            _registry.addPool(p.tokenB, p.tokenA, p.pool, p.verified); // Add in reverse direction
            console.log("Added pool:", p.name, "Address:", p.pool);
        }
        console.log("Balancer V2 pools initialized.");
    }
}`;
}

// Run the parser
if (require.main === module) {
  main();
}

module.exports = { main, toChecksumAddress, isVettedPool, getPoolType };
