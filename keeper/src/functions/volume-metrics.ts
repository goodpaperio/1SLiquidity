import {
  calculateSweetSpotV2,
  calculateSlippageSavings,
} from "./slippage-calculations";
import { ReservesAggregator } from "../services/reserves-aggregator";
import { createProvider } from "../utils/provider";
import { CURVE_POOL_METADATA, BALANCER_POOL_METADATA } from "../config/dex";

// Define proper TypeScript interface for the pair parameter
interface LiquidityPair {
  id: number;
  timestamp: Date;
  tokenAAddress: string;
  tokenASymbol: string;
  tokenAName: string;
  tokenADecimals: number;
  tokenBAddress: string;
  tokenBSymbol: string;
  tokenBDecimals: number;
  marketCap: bigint | null;
  reservesAUniswapV2: string | null;
  reservesBUniswapV2: string | null;
  reservesASushiswap: string | null;
  reservesBSushiswap: string | null;
  reservesAUniswapV3_500: string | null;
  reservesBUniswapV3_500: string | null;
  reservesAUniswapV3_3000: string | null;
  reservesBUniswapV3_3000: string | null;
  reservesAUniswapV3_10000: string | null;
  reservesBUniswapV3_10000: string | null;
  reservesABalancer: string | null;
  reservesBBalancer: string | null;
  reservesACurve: string | null;
  reservesBCurve: string | null;
  reserveAtotaldepthWei: string | null;
  reserveAtotaldepth: number | null;
  reserveBtotaldepthWei: string | null;
  reserveBtotaldepth: number | null;
  slippageSavings: number | null;
  percentageSavings: number | null;
  highestLiquidityADex: string | null;
  priceAccuracyDECA: number | null;
  priceAccuracyNODECA: number | null;
  createdAt: Date;
  updatedAt: Date;
}

const provider = createProvider();
const reservesAggregator = new ReservesAggregator(provider);

// Initialize Curve and Balancer smart filtering
reservesAggregator.initializeCurvePoolFilter(CURVE_POOL_METADATA);
reservesAggregator.initializeBalancerPoolFilter(BALANCER_POOL_METADATA);

// Helper function to get reserves for a specific DEX
function getReservesForDex(
  pair: LiquidityPair,
  dexName: string
): { reserveA: string; reserveB: string } | null {
  const dexMap: {
    [key: string]: { reserveA: string | null; reserveB: string | null };
  } = {
    "uniswap-v2": {
      reserveA: pair.reservesAUniswapV2,
      reserveB: pair.reservesBUniswapV2,
    },
    sushiswap: {
      reserveA: pair.reservesASushiswap,
      reserveB: pair.reservesBSushiswap,
    },
    curve: {
      reserveA: pair.reservesACurve,
      reserveB: pair.reservesBCurve,
    },
    balancer: {
      reserveA: pair.reservesABalancer,
      reserveB: pair.reservesBBalancer,
    },
    "uniswap-v3-500": {
      reserveA: pair.reservesAUniswapV3_500,
      reserveB: pair.reservesBUniswapV3_500,
    },
    "uniswap-v3-3000": {
      reserveA: pair.reservesAUniswapV3_3000,
      reserveB: pair.reservesBUniswapV3_3000,
    },
    "uniswap-v3-10000": {
      reserveA: pair.reservesAUniswapV3_10000,
      reserveB: pair.reservesBUniswapV3_10000,
    },
  };

  const reserves = dexMap[dexName];
  if (!reserves || !reserves.reserveA || !reserves.reserveB) {
    return null;
  }

  return {
    reserveA: reserves.reserveA,
    reserveB: reserves.reserveB,
  };
}

export async function calculateVolumeMetrics(
  pair: LiquidityPair,
  volume: string
) {
  console.log("pair in volume metrics ====>", pair);

  // Validate that we have the highest liquidity DEX from database
  if (!pair.highestLiquidityADex) {
    throw {
      statusCode: 400,
      message: "Highest liquidity DEX not found in pair data",
    };
  }

  // Convert volume to BigInt (assuming it's in normal units, not wei)
  const volumeInWei = BigInt(
    Math.floor(parseFloat(volume) * 10 ** pair.tokenADecimals)
  );

  // Get reserves for the best DEX (from database)
  const bestDexName = pair.highestLiquidityADex;
  const bestDexReserves = getReservesForDex(pair, bestDexName);

  if (!bestDexReserves) {
    throw {
      statusCode: 404,
      message: `No reserves found for best DEX: ${bestDexName}`,
    };
  }

  console.log("Using best DEX from database:", bestDexName);
  console.log("Best DEX reserves:", bestDexReserves);

  // Calculate fee tier based on DEX type
  let feeTier = 3000;
  if (bestDexName.startsWith("uniswap-v3")) {
    feeTier = parseInt(bestDexName.split("-")[2]);
  } else if (
    bestDexName.startsWith("balancer-") ||
    bestDexName === "balancer"
  ) {
    feeTier = 0;
  } else if (bestDexName.startsWith("curve-") || bestDexName === "curve") {
    feeTier = 0;
  } else if (bestDexName === "uniswap-v2" || bestDexName === "sushiswap") {
    feeTier = 3000;
  }

  // Calculate sweet spot
  const sweetSpot = calculateSweetSpotV2(
    volumeInWei,
    BigInt(bestDexReserves.reserveA),
    BigInt(bestDexReserves.reserveB)
  );

  console.log("Sweet spot calculated:", sweetSpot);

  // Fetch pool address for Curve or Balancer if needed
  let poolAddress: string | undefined = undefined;

  if (bestDexName === "curve" || bestDexName.startsWith("curve-")) {
    console.log("Fetching Curve pool address...");
    try {
      const reserves = await reservesAggregator.getReservesFromDex(
        pair.tokenAAddress,
        pair.tokenBAddress,
        "curve" as any
      );
      poolAddress = reserves?.pairAddress;
      console.log("Curve pool address:", poolAddress);
    } catch (error) {
      console.warn("Failed to fetch Curve pool address:", error);
    }
  } else if (
    bestDexName === "balancer" ||
    bestDexName.startsWith("balancer-")
  ) {
    console.log("Fetching Balancer pool ID...");
    try {
      const reserves = await reservesAggregator.getReservesFromDex(
        pair.tokenAAddress,
        pair.tokenBAddress,
        "balancer" as any
      );
      poolAddress = reserves?.pairAddress;
      console.log("Balancer pool ID:", poolAddress);
    } catch (error) {
      console.warn("Failed to fetch Balancer pool ID:", error);
    }
  }

  // Calculate slippage savings
  const {
    slippageSavings,
    percentageSavings,
    priceAccuracyNODECA,
    priceAccuracyDECA,
  } = await calculateSlippageSavings(
    volumeInWei,
    bestDexName,
    feeTier,
    BigInt(bestDexReserves.reserveA),
    BigInt(bestDexReserves.reserveB),
    pair.tokenADecimals,
    pair.tokenBDecimals,
    pair.tokenAAddress,
    pair.tokenBAddress,
    sweetSpot,
    poolAddress
  );

  return {
    volume: parseFloat(volume),
    volumeInWei: volumeInWei.toString(),
    sweetSpot,
    bestDex: bestDexName,
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
