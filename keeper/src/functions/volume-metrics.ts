import { calculateSweetSpot, calculateSlippageSavings } from "./slippage-calculations";

export async function calculateVolumeMetrics(pair: any, volume: string) {

  // Convert volume to BigInt (assuming it's in normal units, not wei)
  const volumeInWei = BigInt(
    Math.floor(parseFloat(volume) * 10 ** pair.tokenADecimals)
  );

  // Get the best DEX reserves
  const dexPairs = [
    {
      dex: "uniswap-v2",
      reserveA: pair.reservesAUniswapV2,
      reserveB: pair.reservesBUniswapV2,
    },
    {
      dex: "sushiswap",
      reserveA: pair.reservesASushiswap,
      reserveB: pair.reservesBSushiswap,
    },
    {
      dex: "curve",
      reserveA: pair.reservesACurve,
      reserveB: pair.reservesBCurve,
    },
    {
      dex: "balancer",
      reserveA: pair.reservesABalancer,
      reserveB: pair.reservesBBalancer,
    },
    {
      dex: "uniswap-v3-500",
      reserveA: pair.reservesAUniswapV3_500,
      reserveB: pair.reservesBUniswapV3_500,
    },
    {
      dex: "uniswap-v3-3000",
      reserveA: pair.reservesAUniswapV3_3000,
      reserveB: pair.reservesBUniswapV3_3000,
    },
    {
      dex: "uniswap-v3-10000",
      reserveA: pair.reservesAUniswapV3_10000,
      reserveB: pair.reservesBUniswapV3_10000,
    },
  ].filter((p) => p.reserveA && p.reserveB);

  if (dexPairs.length === 0) {
    throw { statusCode: 404, message: "No liquidity found for this pair" };
  }

  // Calculate total liquidity for each DEX
  const dexWithLiquidity = dexPairs.map((p) => ({
    ...p,
    totalLiquidity:
      Number(p.reserveA!) / 10 ** pair.tokenADecimals +
      Number(p.reserveB!) / 10 ** pair.tokenBDecimals,
  }));

  // Find best DEX
  const bestDex = dexWithLiquidity.reduce((prev, curr) =>
    curr.totalLiquidity > prev.totalLiquidity ? curr : prev
  );

  // Calculate fee tier
  let feeTier = 3000;
  if (bestDex.dex.startsWith("uniswap-v3")) {
    feeTier = parseInt(bestDex.dex.split("-")[2]);
  } else if (
    bestDex.dex.startsWith("balancer-") ||
    bestDex.dex === "balancer"
  ) {
    feeTier = 0;
  } else if (bestDex.dex.startsWith("curve-") || bestDex.dex === "curve") {
    feeTier = 0;
  } else if (bestDex.dex === "uniswap-v2" || bestDex.dex === "sushiswap") {
    feeTier = 3000;
  }

  // Calculate sweet spot
  const sweetSpot = calculateSweetSpot(
    volumeInWei,
    BigInt(bestDex.reserveA!),
    BigInt(bestDex.reserveB!),
    pair.tokenADecimals,
    pair.tokenBDecimals
  );

  // Calculate slippage savings
  const {
    slippageSavings,
    percentageSavings,
    priceAccuracyNODECA,
    priceAccuracyDECA,
  } = await calculateSlippageSavings(
    volumeInWei,
    bestDex.dex,
    feeTier,
    BigInt(bestDex.reserveA!),
    BigInt(bestDex.reserveB!),
    pair.tokenADecimals,
    pair.tokenBDecimals,
    pair.tokenAAddress,
    pair.tokenBAddress,
    sweetSpot,
    pair.pairAddress || undefined
  );

  return {
    volume: parseFloat(volume),
    volumeInWei: volumeInWei.toString(),
    sweetSpot,
    bestDex: bestDex.dex,
    slippageSavings,
    percentageSavings,
    priceAccuracyNODECA,
    priceAccuracyDECA,
    tokenA: {
      address: pair.tokenAAddress,
      symbol: pair.tokenASymbol,
      decimals: pair.tokenADecimals,
    },
    tokenB: {
      address: pair.tokenBAddress,
      symbol: pair.tokenBSymbol,
      decimals: pair.tokenBDecimals,
    },
  };
}
