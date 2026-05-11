#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PAIR_FILES = [
  ["USDC", "config/usdc_pairs_clean.json", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"],
  ["USDT", "config/usdt_pairs_clean.json", "0xdac17f958d2ee523a2206206994597c13d831ec7"],
  ["WETH", "config/weth_pairs_clean.json", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"],
  ["WBTC", "config/wbtc_pairs_clean.json", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599"],
  ["DAI", "config/dai_pairs_clean.json", "0x6b175474e89094c44da98b954eedeac495271d0f"],
];
const EXCLUDED_POOLS = new Set([
  // Observed to fail reserve/quote validation with current BalancerV2Fetcher logic.
  "0x915fad67992aa1d309fe188ea02e18ecf6c2048d",
  "0x0371c272fdd28ac13c434f1ef6b8b52ea3e6d844",
  "0x3e63080d20122c67f5d810eef738cbfe6f84dcee",
  "0xfaeb6a8b5f15af77673666e51a44f6b9b6ca5da2",
  "0x7f0c39e7728f65efe87752b26591006c49d1c200",
]);

function readJson(relPath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relPath), "utf8"));
}

function pairKey(a, b) {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x < y ? `${x}-${y}` : `${y}-${x}`;
}

function chooseBestPool(candidates) {
  if (candidates.length === 0) return null;
  const twoToken = candidates.filter((c) => c.tokens.length === 2);
  const eligible = twoToken.length > 0 ? twoToken : [];
  if (eligible.length === 0) return null;
  eligible.sort((a, b) => {
    return a.poolAddress.localeCompare(b.poolAddress);
  });
  return eligible[0];
}

function main() {
  const balancerPools = readJson("keeper/data/balancer-pools.json");
  const activePools = balancerPools.pools.filter(
    (p) =>
      p.isActive
      && Array.isArray(p.tokens)
      && p.tokens.length >= 2
      && !EXCLUDED_POOLS.has((p.poolAddress || "").toLowerCase())
  );

  const poolsByPair = new Map();
  for (const pool of activePools) {
    for (let i = 0; i < pool.tokens.length; i++) {
      for (let j = i + 1; j < pool.tokens.length; j++) {
        const t0 = pool.tokens[i].toLowerCase();
        const t1 = pool.tokens[j].toLowerCase();
        const key = pairKey(t0, t1);
        if (!poolsByPair.has(key)) poolsByPair.set(key, []);
        poolsByPair.get(key).push(pool);
      }
    }
  }

  const universe = [];
  const seen = new Set();
  for (const [baseSymbol, filePath, baseAddr] of PAIR_FILES) {
    const data = readJson(filePath);
    for (const p of data.pairs) {
      const quote = p.address.toLowerCase();
      if (quote === "0x0000000000000000000000000000000000000000" || quote === baseAddr) continue;
      const directed = `${baseAddr}-${quote}`;
      if (seen.has(directed)) continue;
      seen.add(directed);
      universe.push({
        baseSymbol,
        quoteName: p.name || quote,
        tokenA: baseAddr,
        tokenB: quote,
      });
    }
  }

  const candidates = [];
  const missing = [];

  for (const pair of universe) {
    const key = pairKey(pair.tokenA, pair.tokenB);
    const matches = poolsByPair.get(key) || [];
    const selected = chooseBestPool(matches);
    if (!selected) {
      missing.push(pair);
      continue;
    }

    candidates.push({
      baseSymbol: pair.baseSymbol,
      quoteName: pair.quoteName,
      tokenA: pair.tokenA,
      tokenB: pair.tokenB,
      pool: selected.poolAddress.toLowerCase(),
      poolId: selected.poolId.toLowerCase(),
      poolName: selected.name,
      poolSymbol: selected.symbol,
      tokensInPool: selected.tokens.length,
    });
  }

  const output = {
    generatedAt: new Date().toISOString(),
    source: "keeper/data/balancer-pools.json",
    universeCount: universe.length,
    totalCount: candidates.length,
    missingCount: missing.length,
    candidates,
    missing,
  };

  const outPath = path.join(ROOT, "docs", "balancer-seed-candidates.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`Generated ${output.totalCount} candidate seeds (${output.missingCount} missing).`);
  console.log(`Wrote: ${outPath}`);
}

main();
