import { ethers } from "ethers";
import { createProvider } from "../utils/provider";
import {
  CONTRACT_ABIS,
  CONTRACT_ADDRESSES,
  CURVE_POOL_METADATA,
  BALANCER_POOL_METADATA,
} from "../config/dex";

const provider = createProvider();

function calculateSlippageV4(
  volumeIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  if (volumeIn === 0n || reserveIn === 0n || reserveOut === 0n) {
    return 0;
  }

  // k = reserveIn * reserveOut
  const k = reserveIn * reserveOut;
  const denominator = reserveIn + volumeIn;
  if (denominator === 0n) {
    return 0;
  }

  // volumeOut = reserveOut - (k / (reserveIn + volumeIn))
  const volumeOut = reserveOut - k / denominator;

  // priceRatio = (volumeOut * reserveIn * 10000) / (volumeIn * reserveOut)
  // clamp negative slippage (better price) to 0
  const numerator = volumeOut * reserveIn * 10000n;
  const denom = volumeIn * reserveOut;
  if (denom === 0n) {
    return 0;
  }
  const priceRatio = Number(numerator / denom); // integer division, basis points
  if (priceRatio > 10000) {
    return 0;
  }
  return 10000 - priceRatio;
}

export function calculateSweetSpotV2(
  tradeVolume: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  // Mirror StreamDaemon _sweetSpotAlgo v4
  if (reserveIn === 0n || reserveOut === 0n) {
    return 4;
  }

  let sweetSpot = 1;
  let effectiveVolume = tradeVolume / BigInt(sweetSpot);
  let slippage = calculateSlippageV4(effectiveVolume, reserveIn, reserveOut);

  // Alpha testing behavior: minimum sweet spot of 4 if already within 10 bps
  if (slippage <= 10) {
    return 4;
  }

  let lastSweetSpot = sweetSpot;
  let lastSlippage = slippage;

  // Iteratively double sweet spot until slippage <= 10 bps or cap
  while (slippage > 10 && sweetSpot < 1000) {
    lastSweetSpot = sweetSpot;
    lastSlippage = slippage;

    sweetSpot = sweetSpot * 2;
    effectiveVolume = tradeVolume / BigInt(sweetSpot);
    if (effectiveVolume === 0n) {
      break;
    }
    slippage = calculateSlippageV4(effectiveVolume, reserveIn, reserveOut);
  }

  // Binary refinement if threshold crossed
  if (lastSlippage > 10 && slippage <= 10) {
    let low = lastSweetSpot;
    let high = sweetSpot;

    for (let i = 0; i < 5; i++) {
      const mid = Math.floor((low + high) / 2);
      const midVolume = tradeVolume / BigInt(mid);
      if (midVolume === 0n) {
        break;
      }
      const midSlippage = calculateSlippageV4(midVolume, reserveIn, reserveOut);
      if (midSlippage <= 10) {
        high = mid;
        sweetSpot = mid;
      } else {
        low = mid;
      }
    }
  }

  // Alpha testing constraints: clamp between 4 and 500
  if (sweetSpot <= 4) {
    sweetSpot = 4;
  }
  if (sweetSpot > 500) {
    sweetSpot = 500;
  }
  return sweetSpot;
}

export async function calculateSlippageSavings(
  tradeVolume: bigint,
  dex: string,
  feeTier: number,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number,
  tokenIn: string,
  tokenOut: string,
  sweetSpot: number,
  pairAddress?: string
): Promise<{
  slippageSavings: number;
  percentageSavings: number;
  priceAccuracyNODECA: number;
  priceAccuracyDECA: number;
}> {
  try {
    console.log("==========Calculating Slippage Savings==========");
    console.log("tradeVolume", tradeVolume);
    console.log("dex", dex);
    console.log("feeTier", feeTier);
    console.log("reserveA", reserveA);
    console.log("reserveB", reserveB);
    console.log("decimalsA", decimalsA);
    console.log("decimalsB", decimalsB);
    console.log("tokenIn", tokenIn);
    console.log("tokenOut", tokenOut);
    console.log("sweetSpot", sweetSpot);
    console.log("========================================");

    const scaledTradeVolume = Number(tradeVolume) / 10 ** decimalsA;
    const scaledReserveA = Number(reserveA) / 10 ** decimalsA;
    const scaledReserveB = Number(reserveB) / 10 ** decimalsB;

    console.log("scaledTradeVolume", scaledTradeVolume);
    console.log("scaledReserveA", scaledReserveA);
    console.log("scaledReserveB", scaledReserveB);

    const observedPrice = scaledReserveB / scaledReserveA;
    console.log("observedPrice", observedPrice);

    if (dex === "uniswap-v2") {
      const router = new ethers.Contract(
        CONTRACT_ADDRESSES.UNISWAP_V2.ROUTER,
        CONTRACT_ABIS.UNISWAP_V2.ROUTER,
        provider
      );

      // Get quote for full amount (tokenOutNODECA)
      const amountOut = await router.getAmountOut(
        tradeVolume,
        reserveA,
        reserveB
      );
      const amountOutInETH = Number(amountOut) / 10 ** decimalsB;

      console.log("amountOut =====>", amountOut);
      console.log("amountOutInETH (tokenOutNODECA) =====>", amountOutInETH);

      console.log(
        "tradeVolume / sweetSpot =====>",
        tradeVolume / BigInt(sweetSpot)
      );

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotAmountOut = await router.getAmountOut(
        tradeVolume / BigInt(sweetSpot),
        reserveA,
        reserveB
      );
      const sweetSpotAmountOutInETH =
        Number(sweetSpotAmountOut) / 10 ** decimalsB;
      // Scale up the sweet spot quote (tokenOutDECA)
      const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot;

      console.log("sweetSpotAmountOut =====>", sweetSpotAmountOut);
      console.log("sweetSpotAmountOutInETH =====>", sweetSpotAmountOutInETH);
      console.log(
        "scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>",
        scaledSweetSpotAmountOutInETH
      );

      const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH;

      let raw = amountOutInETH / scaledSweetSpotAmountOutInETH;
      let percentageSavings = (1 - raw) * 100;
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100));
      percentageSavings = Number(percentageSavings.toFixed(3));

      console.log("slippageSavings =====>", slippageSavings);
      console.log("percentageSavings =====>", percentageSavings);

      // Get effective price (NODECA): tokenOutNODECA / LiqT
      const realisedPriceNODECA = amountOutInETH / scaledTradeVolume;
      console.log("realisedPriceNODECA =====>", realisedPriceNODECA);

      // Get effective price (DECA): tokenOutDECA / LiqT
      const realisedPriceDECA =
        scaledSweetSpotAmountOutInETH / scaledTradeVolume;
      console.log("realisedPriceDECA =====>", realisedPriceDECA);

      const priceAccuracyNODECA = realisedPriceNODECA / observedPrice;
      const priceAccuracyDECA = realisedPriceDECA / observedPrice;

      console.log("priceAccuracyNODECA =====>", priceAccuracyNODECA);
      console.log("priceAccuracyDECA =====>", priceAccuracyDECA);

      return {
        slippageSavings,
        percentageSavings,
        priceAccuracyNODECA,
        priceAccuracyDECA,
      };
    }

    if (dex === "sushiswap") {
      const router = new ethers.Contract(
        CONTRACT_ADDRESSES.SUSHISWAP.ROUTER,
        CONTRACT_ABIS.SUSHISWAP.ROUTER,
        provider
      );

      // Get quote for full amount (tokenOutNODECA)
      const amountOut = await router.getAmountOut(
        tradeVolume,
        reserveA,
        reserveB
      );
      const amountOutInETH = Number(amountOut) / 10 ** decimalsB;

      console.log("amountOut =====>", amountOut);
      console.log("amountOutInETH (tokenOutNODECA) =====>", amountOutInETH);

      console.log(
        "tradeVolume / sweetSpot =====>",
        tradeVolume / BigInt(sweetSpot)
      );

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotAmountOut = await router.getAmountOut(
        tradeVolume / BigInt(sweetSpot),
        reserveA,
        reserveB
      );
      const sweetSpotAmountOutInETH =
        Number(sweetSpotAmountOut) / 10 ** decimalsB;
      // Scale up the sweet spot quote (tokenOutDECA)
      const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot;

      console.log("sweetSpotAmountOut =====>", sweetSpotAmountOut);
      console.log("sweetSpotAmountOutInETH =====>", sweetSpotAmountOutInETH);
      console.log(
        "scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>",
        scaledSweetSpotAmountOutInETH
      );

      const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH;

      let raw = amountOutInETH / scaledSweetSpotAmountOutInETH;
      let percentageSavings = (1 - raw) * 100;
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100));
      percentageSavings = Number(percentageSavings.toFixed(3));

      console.log("slippageSavings =====>", slippageSavings);
      console.log("percentageSavings =====>", percentageSavings);

      // Get effective price (NODECA)
      const realisedPriceNODECA = amountOutInETH / scaledTradeVolume;
      console.log("realisedPriceNODECA =====>", realisedPriceNODECA);

      // Get effective price (DECA)
      const realisedPriceDECA =
        scaledSweetSpotAmountOutInETH / scaledTradeVolume;
      console.log("realisedPriceDECA =====>", realisedPriceDECA);

      const priceAccuracyNODECA = realisedPriceNODECA / observedPrice;
      const priceAccuracyDECA = realisedPriceDECA / observedPrice;

      console.log("priceAccuracyNODECA =====>", priceAccuracyNODECA);
      console.log("priceAccuracyDECA =====>", priceAccuracyDECA);

      return {
        slippageSavings,
        percentageSavings,
        priceAccuracyNODECA,
        priceAccuracyDECA,
      };
    }

    if (dex.startsWith("uniswap-v3")) {
      const quoter = new ethers.Contract(
        CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        CONTRACT_ABIS.UNISWAP_V3.QUOTER,
        provider
      );

      // Get quote for full amount (tokenOutNODECA)
      const data = quoter.interface.encodeFunctionData(
        "quoteExactInputSingle",
        [tokenIn, tokenOut, feeTier, tradeVolume, 0]
      );

      const result = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data,
      });

      const amountOut = quoter.interface.decodeFunctionResult(
        "quoteExactInputSingle",
        result
      )[0];
      const amountOutInETH = Number(amountOut) / 10 ** decimalsB;

      console.log("amountOut =====>", amountOut);
      console.log("amountOutInETH (tokenOutNODECA) =====>", amountOutInETH);

      console.log(
        "tradeVolume / sweetSpot =====>",
        tradeVolume / BigInt(sweetSpot)
      );

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotData = quoter.interface.encodeFunctionData(
        "quoteExactInputSingle",
        [tokenIn, tokenOut, feeTier, tradeVolume / BigInt(sweetSpot), 0]
      );

      const sweetSpotResult = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data: sweetSpotData,
      });

      const sweetSpotAmountOut = quoter.interface.decodeFunctionResult(
        "quoteExactInputSingle",
        sweetSpotResult
      )[0];
      const sweetSpotAmountOutInETH =
        Number(sweetSpotAmountOut) / 10 ** decimalsB;
      const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot;

      console.log("sweetSpotAmountOut =====>", sweetSpotAmountOut);
      console.log("sweetSpotAmountOutInETH =====>", sweetSpotAmountOutInETH);
      console.log(
        "scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>",
        scaledSweetSpotAmountOutInETH
      );

      const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH;

      let raw = amountOutInETH / scaledSweetSpotAmountOutInETH;
      let percentageSavings = (1 - raw) * 100;
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100));
      percentageSavings = Number(percentageSavings.toFixed(3));

      console.log("slippageSavings =====>", slippageSavings);
      console.log("percentageSavings =====>", percentageSavings);

      // Get effective price (NODECA)
      const realisedPriceNODECA = amountOutInETH / scaledTradeVolume;
      console.log("realisedPriceNODECA =====>", realisedPriceNODECA);

      // Get effective price (DECA)
      const realisedPriceDECA =
        scaledSweetSpotAmountOutInETH / scaledTradeVolume;
      console.log("realisedPriceDECA =====>", realisedPriceDECA);

      const priceAccuracyNODECA = realisedPriceNODECA / observedPrice;
      const priceAccuracyDECA = realisedPriceDECA / observedPrice;

      console.log("priceAccuracyNODECA =====>", priceAccuracyNODECA);
      console.log("priceAccuracyDECA =====>", priceAccuracyDECA);

      return {
        slippageSavings,
        percentageSavings,
        priceAccuracyNODECA,
        priceAccuracyDECA,
      };
    }

    if (dex.startsWith("balancer-") || dex === "balancer") {
      try {
        const vault = new ethers.Contract(
          CONTRACT_ADDRESSES.BALANCER.VAULT,
          CONTRACT_ABIS.BALANCER.VAULT,
          provider
        );

        // Helper to build swap query
        async function getQuote(amountIn: bigint) {
          if (!pairAddress) {
            throw new Error("Pool ID is required for Balancer swaps");
          }

          console.log("BALANCER PAIR ADDRESS", pairAddress);

          // Get pool metadata
          const poolMetadata = (BALANCER_POOL_METADATA as any)[pairAddress];
          if (!poolMetadata) {
            throw new Error(
              `No metadata found for Balancer pool ${pairAddress}`
            );
          }

          // Use metadata for token indices (no blockchain calls needed)
          const tokens = poolMetadata.tokens.map((t: string) =>
            t.toLowerCase()
          );

          // Find token indices in the pool using metadata
          const tokenInIndex = tokens.findIndex(
            (token: string) => token === tokenIn.toLowerCase()
          );
          const tokenOutIndex = tokens.findIndex(
            (token: string) => token === tokenOut.toLowerCase()
          );

          if (tokenInIndex === -1 || tokenOutIndex === -1) {
            throw new Error(
              `Tokens not found in Balancer pool: ${tokenIn}, ${tokenOut}`
            );
          }

          console.log("Token indices:", {
            tokenInIndex,
            tokenOutIndex,
            tokens,
          });

          const swaps = [
            {
              poolId: pairAddress, // This is now the actual poolId from Balancer
              assetInIndex: tokenInIndex,
              assetOutIndex: tokenOutIndex,
              amount: amountIn.toString(),
              userData: "0x",
            },
          ];

          const assets = [tokenIn, tokenOut];

          const funds = {
            sender: ethers.ZeroAddress,
            fromInternalBalance: false,
            recipient: ethers.ZeroAddress,
            toInternalBalance: false,
          };

          // Encode the function call data
          const data = vault.interface.encodeFunctionData(
            "queryBatchSwap",
            [0, swaps, assets, funds] // 0 = GIVEN_IN
          );

          // Use provider.call() instead of direct contract call
          const result = await provider.call({
            to: CONTRACT_ADDRESSES.BALANCER.VAULT,
            data,
          });

          // Decode the result
          const deltas = vault.interface.decodeFunctionResult(
            "queryBatchSwap",
            result
          )[0];

          // deltas[0] = +amountIn, deltas[1] = -amountOut
          return BigInt(deltas[1]) * BigInt(-1);
        }

        // Get quote for full amount (tokenOutNODECA)
        const amountOut = await getQuote(tradeVolume);
        const amountOutInETH = Number(amountOut) / 10 ** decimalsB;

        console.log("amountOut =====>", amountOut);
        console.log("amountOutInETH (tokenOutNODECA) =====>", amountOutInETH);

        console.log(
          "tradeVolume / sweetSpot =====>",
          tradeVolume / BigInt(sweetSpot)
        );

        // Get quote for (tradeVolume / sweetSpot)
        const sweetSpotAmountOut = await getQuote(
          tradeVolume / BigInt(sweetSpot)
        );
        const sweetSpotAmountOutInETH =
          Number(sweetSpotAmountOut) / 10 ** decimalsB;
        // Scale up the sweet spot quote (tokenOutDECA)
        const scaledSweetSpotAmountOutInETH =
          sweetSpotAmountOutInETH * sweetSpot;

        console.log("sweetSpotAmountOut =====>", sweetSpotAmountOut);
        console.log("sweetSpotAmountOutInETH =====>", sweetSpotAmountOutInETH);
        console.log(
          "scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>",
          scaledSweetSpotAmountOutInETH
        );

        const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH;

        let raw = amountOutInETH / scaledSweetSpotAmountOutInETH;
        let percentageSavings = (1 - raw) * 100;
        percentageSavings = Math.max(0, Math.min(percentageSavings, 100));
        percentageSavings = Number(percentageSavings.toFixed(3));

        console.log("slippageSavings =====>", slippageSavings);
        console.log("percentageSavings =====>", percentageSavings);

        // Get effective price (NODECA): tokenOutNODECA / LiqT
        const realisedPriceNODECA = amountOutInETH / scaledTradeVolume;
        console.log("realisedPriceNODECA =====>", realisedPriceNODECA);

        // Get effective price (DECA): tokenOutDECA / LiqT
        const realisedPriceDECA =
          scaledSweetSpotAmountOutInETH / scaledTradeVolume;
        console.log("realisedPriceDECA =====>", realisedPriceDECA);

        const priceAccuracyNODECA = realisedPriceNODECA / observedPrice;
        const priceAccuracyDECA = realisedPriceDECA / observedPrice;

        console.log("priceAccuracyNODECA =====>", priceAccuracyNODECA);
        console.log("priceAccuracyDECA =====>", priceAccuracyDECA);

        return {
          slippageSavings,
          percentageSavings,
          priceAccuracyNODECA,
          priceAccuracyDECA,
        };
      } catch (error) {
        console.error("Error in Balancer calculation:", error);
        return {
          slippageSavings: 0,
          percentageSavings: 0,
          priceAccuracyNODECA: 0,
          priceAccuracyDECA: 0,
        };
      }
    }

    if (dex.startsWith("curve-") || dex === "curve") {
      console.log("Calculating slippage for Curve pool...");

      try {
        if (!pairAddress) {
          throw new Error("Pool address is required for Curve swaps");
        }

        console.log("CURVE POOL ADDRESS", pairAddress);

        // Get pool metadata
        const poolMetadata = (CURVE_POOL_METADATA as any)[pairAddress];
        if (!poolMetadata) {
          throw new Error(`No metadata found for Curve pool ${pairAddress}`);
        }

        // Create Curve pool contract instance
        const poolContract = new ethers.Contract(
          pairAddress,
          CONTRACT_ABIS.CURVE.POOL,
          provider
        );

        // Helper to get quote from Curve pool
        async function getCurveQuote(amountIn: bigint) {
          // Use metadata for token indices (no blockchain calls needed)
          const coins = poolMetadata.tokens.map((t: string) => t.toLowerCase());
          const isMeta = poolMetadata.isMeta;

          // Find token indices in the pool using metadata
          const tokenInIndex = coins.findIndex(
            (coin: string) => coin === tokenIn.toLowerCase()
          );
          const tokenOutIndex = coins.findIndex(
            (coin: string) => coin === tokenOut.toLowerCase()
          );

          if (tokenInIndex === -1 || tokenOutIndex === -1) {
            throw new Error(
              `Tokens not found in Curve pool: ${tokenIn}, ${tokenOut}`
            );
          }

          console.log("Curve token indices:", { tokenInIndex, tokenOutIndex });
          console.log("Curve is meta pool:", isMeta);

          // Use appropriate function based on pool type
          let amountOut: bigint;
          try {
            if (isMeta) {
              // For meta pools, try get_dy_underlying first, fallback to get_dy
              try {
                amountOut = await poolContract.get_dy_underlying(
                  tokenInIndex,
                  tokenOutIndex,
                  amountIn
                );
              } catch (error) {
                console.log("get_dy_underlying failed, trying get_dy:", error);
                amountOut = await poolContract.get_dy(
                  tokenInIndex,
                  tokenOutIndex,
                  amountIn
                );
              }
            } else {
              // For regular pools, use get_dy
              amountOut = await poolContract.get_dy(
                tokenInIndex,
                tokenOutIndex,
                amountIn
              );
            }
          } catch (error) {
            console.error("Error getting Curve quote:", error);
            throw new Error(`Failed to get quote from Curve pool: ${error}`);
          }

          return amountOut;
        }

        // Recalculate observed price using Curve pool with 1 token as base
        const oneTokenAmount = BigInt(10 ** decimalsA); // 1 token in wei
        const observedPriceQuote = await getCurveQuote(oneTokenAmount);
        const observedPrice = Number(observedPriceQuote) / 10 ** decimalsB;
        console.log("Curve observed price =====>", observedPrice);

        // Get quote for full amount (tokenOutNODECA)
        const amountOut = await getCurveQuote(tradeVolume);
        const amountOutInETH = Number(amountOut) / 10 ** decimalsB;

        console.log("amountOut =====>", amountOut);
        console.log("amountOutInETH (tokenOutNODECA) =====>", amountOutInETH);

        console.log(
          "tradeVolume / sweetSpot =====>",
          tradeVolume / BigInt(sweetSpot)
        );

        // Get quote for (tradeVolume / sweetSpot)
        const sweetSpotAmountOut = await getCurveQuote(
          tradeVolume / BigInt(sweetSpot)
        );
        const sweetSpotAmountOutInETH =
          Number(sweetSpotAmountOut) / 10 ** decimalsB;
        // Scale up the sweet spot quote (tokenOutDECA)
        const scaledSweetSpotAmountOutInETH =
          sweetSpotAmountOutInETH * sweetSpot;

        console.log("sweetSpotAmountOut =====>", sweetSpotAmountOut);
        console.log("sweetSpotAmountOutInETH =====>", sweetSpotAmountOutInETH);
        console.log(
          "scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>",
          scaledSweetSpotAmountOutInETH
        );

        const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH;

        let raw = amountOutInETH / scaledSweetSpotAmountOutInETH;
        let percentageSavings = (1 - raw) * 100;
        percentageSavings = Math.max(0, Math.min(percentageSavings, 100));
        percentageSavings = Number(percentageSavings.toFixed(3));

        console.log("slippageSavings =====>", slippageSavings);
        console.log("percentageSavings =====>", percentageSavings);

        // Get effective price (NODECA): tokenOutNODECA / LiqT
        const realisedPriceNODECA = amountOutInETH / scaledTradeVolume;
        console.log("realisedPriceNODECA =====>", realisedPriceNODECA);

        // Get effective price (DECA): tokenOutDECA / LiqT
        const realisedPriceDECA =
          scaledSweetSpotAmountOutInETH / scaledTradeVolume;
        console.log("realisedPriceDECA =====>", realisedPriceDECA);

        const priceAccuracyNODECA = realisedPriceNODECA / observedPrice;
        const priceAccuracyDECA = realisedPriceDECA / observedPrice;

        console.log("priceAccuracyNODECA =====>", priceAccuracyNODECA);
        console.log("priceAccuracyDECA =====>", priceAccuracyDECA);

        return {
          slippageSavings,
          percentageSavings,
          priceAccuracyNODECA,
          priceAccuracyDECA,
        };
      } catch (error) {
        console.error("Error in Curve calculation:", error);
        return {
          slippageSavings: 0,
          percentageSavings: 0,
          priceAccuracyNODECA: 0,
          priceAccuracyDECA: 0,
        };
      }
    }

    console.log(`Slippage calculation not implemented for DEX: ${dex}`);
    return {
      slippageSavings: 0,
      percentageSavings: 0,
      priceAccuracyNODECA: 0,
      priceAccuracyDECA: 0,
    };
  } catch (error) {
    console.error("Error calculating slippage savings:", error);
    return {
      slippageSavings: 0,
      percentageSavings: 0,
      priceAccuracyNODECA: 0,
      priceAccuracyDECA: 0,
    };
  }
}
