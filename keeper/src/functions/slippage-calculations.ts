import { ethers } from 'ethers'
import { createProvider } from '../utils/provider'
import {
  CONTRACT_ABIS,
  CONTRACT_ADDRESSES,
  CURVE_POOL_METADATA,
  BALANCER_POOL_METADATA,
} from '../config/dex'

const provider = createProvider()

export function calculateSweetSpot(
  tradeVolume: bigint,
  reserveA: bigint,
  reserveB: bigint,
  decimalsA: number,
  decimalsB: number
): number {
  // Sweet spot formula: N = sqrt(alpha * V^2)
  // where:
  // N = number of streams
  // V = trade volume
  // alpha = reserveA/reserveB^2 (or reserveB/reserveA^2 depending on the magnitude of the reserves)

  console.log('==========Calculating Sweet Spot==========')

  // Convert all values to ETH format (not wei)
  const scaledReserveA = Number(reserveA) / 10 ** decimalsA
  const scaledReserveB = Number(reserveB) / 10 ** decimalsB
  const scaledVolume = Number(tradeVolume) / 10 ** decimalsA

  console.log('scaledReserveA', scaledReserveA)
  console.log('scaledReserveB', scaledReserveB)
  console.log('tradeVolume', scaledVolume)

  // Calculate alpha based on which reserve is larger
  const alpha =
    scaledReserveA > scaledReserveB
      ? scaledReserveA / (scaledReserveB * scaledReserveB)
      : scaledReserveB / (scaledReserveA * scaledReserveA)
  console.log('alpha', alpha)

  // Calculate V^2 using ETH format values
  const volumeSquared = scaledVolume * scaledVolume
  console.log('volumeSquared', volumeSquared)

  let streamCount = 0

  // Check if reserve ratio is less than 0.001
  const reserveRatio = (scaledReserveB / scaledReserveA) * 100
  console.log('reserveRatio', reserveRatio)

  // TODO: review reserve ratio selection logic later

  if (reserveRatio < 0.001) {
    // Calculate N = sqrt(alpha * V^2)
    streamCount = Math.sqrt(alpha * volumeSquared)
    console.log('Reserve ratio less than 0.001, streamCount = ', streamCount)
  } else {
    // Calculate N = sqrt(V^2 / Rin)
    streamCount = Math.sqrt(volumeSquared / scaledReserveA)
    console.log('Reserve ratio greater than 0.001, streamCount = ', streamCount)
  }

  // If pool depth < 0.2%, set streamCount to 4
  let poolDepth = scaledVolume / scaledReserveA
  console.log('poolDepth%', poolDepth)
  if (poolDepth < 0.2) {
    console.log('Pool depth less than 0.2%, streamCount = 4')
    streamCount = 4
  }

  console.log('streamCount', streamCount)

  // Round to nearest integer and ensure minimum value of 4
  return Math.max(4, Math.round(streamCount))
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
  slippageSavings: number
  percentageSavings: number
  priceAccuracyNODECA: number
  priceAccuracyDECA: number
}> {
  try {
    console.log('==========Calculating Slippage Savings==========')
    console.log('tradeVolume', tradeVolume)
    console.log('dex', dex)
    console.log('feeTier', feeTier)
    console.log('reserveA', reserveA)
    console.log('reserveB', reserveB)
    console.log('decimalsA', decimalsA)
    console.log('decimalsB', decimalsB)
    console.log('tokenIn', tokenIn)
    console.log('tokenOut', tokenOut)
    console.log('sweetSpot', sweetSpot)
    console.log('========================================')

    const scaledTradeVolume = Number(tradeVolume) / 10 ** decimalsA
    const scaledReserveA = Number(reserveA) / 10 ** decimalsA
    const scaledReserveB = Number(reserveB) / 10 ** decimalsB

    console.log('scaledTradeVolume', scaledTradeVolume)
    console.log('scaledReserveA', scaledReserveA)
    console.log('scaledReserveB', scaledReserveB)

    const observedPrice = scaledReserveB / scaledReserveA
    console.log('observedPrice', observedPrice)

    if (dex === 'uniswap-v2') {
      const router = new ethers.Contract(
        CONTRACT_ADDRESSES.UNISWAP_V2.ROUTER,
        CONTRACT_ABIS.UNISWAP_V2.ROUTER,
        provider
      )

      // Get quote for full amount (tokenOutNODECA)
      const amountOut = await router.getAmountOut(
        tradeVolume,
        reserveA,
        reserveB
      )
      const amountOutInETH = Number(amountOut) / 10 ** decimalsB

      console.log('amountOut =====>', amountOut)
      console.log('amountOutInETH (tokenOutNODECA) =====>', amountOutInETH)

      console.log(
        'tradeVolume / sweetSpot =====>',
        tradeVolume / BigInt(sweetSpot)
      )

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotAmountOut = await router.getAmountOut(
        tradeVolume / BigInt(sweetSpot),
        reserveA,
        reserveB
      )
      const sweetSpotAmountOutInETH =
        Number(sweetSpotAmountOut) / 10 ** decimalsB
      // Scale up the sweet spot quote (tokenOutDECA)
      const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot

      console.log('sweetSpotAmountOut =====>', sweetSpotAmountOut)
      console.log('sweetSpotAmountOutInETH =====>', sweetSpotAmountOutInETH)
      console.log(
        'scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>',
        scaledSweetSpotAmountOutInETH
      )

      const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH

      let raw = amountOutInETH / scaledSweetSpotAmountOutInETH
      let percentageSavings = (1 - raw) * 100
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
      percentageSavings = Number(percentageSavings.toFixed(3))

      console.log('slippageSavings =====>', slippageSavings)
      console.log('percentageSavings =====>', percentageSavings)

      // Get effective price (NODECA): tokenOutNODECA / LiqT
      const realisedPriceNODECA = amountOutInETH / scaledTradeVolume
      console.log('realisedPriceNODECA =====>', realisedPriceNODECA)

      // Get effective price (DECA): tokenOutDECA / LiqT
      const realisedPriceDECA =
        scaledSweetSpotAmountOutInETH / scaledTradeVolume
      console.log('realisedPriceDECA =====>', realisedPriceDECA)

      const priceAccuracyNODECA = realisedPriceNODECA / observedPrice
      const priceAccuracyDECA = realisedPriceDECA / observedPrice

      console.log('priceAccuracyNODECA =====>', priceAccuracyNODECA)
      console.log('priceAccuracyDECA =====>', priceAccuracyDECA)

      return {
        slippageSavings,
        percentageSavings,
        priceAccuracyNODECA,
        priceAccuracyDECA,
      }
    }

    if (dex === 'sushiswap') {
      const router = new ethers.Contract(
        CONTRACT_ADDRESSES.SUSHISWAP.ROUTER,
        CONTRACT_ABIS.SUSHISWAP.ROUTER,
        provider
      )

      // Get quote for full amount (tokenOutNODECA)
      const amountOut = await router.getAmountOut(
        tradeVolume,
        reserveA,
        reserveB
      )
      const amountOutInETH = Number(amountOut) / 10 ** decimalsB

      console.log('amountOut =====>', amountOut)
      console.log('amountOutInETH (tokenOutNODECA) =====>', amountOutInETH)

      console.log(
        'tradeVolume / sweetSpot =====>',
        tradeVolume / BigInt(sweetSpot)
      )

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotAmountOut = await router.getAmountOut(
        tradeVolume / BigInt(sweetSpot),
        reserveA,
        reserveB
      )
      const sweetSpotAmountOutInETH =
        Number(sweetSpotAmountOut) / 10 ** decimalsB
      // Scale up the sweet spot quote (tokenOutDECA)
      const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot

      console.log('sweetSpotAmountOut =====>', sweetSpotAmountOut)
      console.log('sweetSpotAmountOutInETH =====>', sweetSpotAmountOutInETH)
      console.log(
        'scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>',
        scaledSweetSpotAmountOutInETH
      )

      const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH

      let raw = amountOutInETH / scaledSweetSpotAmountOutInETH
      let percentageSavings = (1 - raw) * 100
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
      percentageSavings = Number(percentageSavings.toFixed(3))

      console.log('slippageSavings =====>', slippageSavings)
      console.log('percentageSavings =====>', percentageSavings)

      // Get effective price (NODECA)
      const realisedPriceNODECA = amountOutInETH / scaledTradeVolume
      console.log('realisedPriceNODECA =====>', realisedPriceNODECA)

      // Get effective price (DECA)
      const realisedPriceDECA =
        scaledSweetSpotAmountOutInETH / scaledTradeVolume
      console.log('realisedPriceDECA =====>', realisedPriceDECA)

      const priceAccuracyNODECA = realisedPriceNODECA / observedPrice
      const priceAccuracyDECA = realisedPriceDECA / observedPrice

      console.log('priceAccuracyNODECA =====>', priceAccuracyNODECA)
      console.log('priceAccuracyDECA =====>', priceAccuracyDECA)

      return {
        slippageSavings,
        percentageSavings,
        priceAccuracyNODECA,
        priceAccuracyDECA,
      }
    }

    if (dex.startsWith('uniswap-v3')) {
      const quoter = new ethers.Contract(
        CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        CONTRACT_ABIS.UNISWAP_V3.QUOTER,
        provider
      )

      // Get quote for full amount (tokenOutNODECA)
      const data = quoter.interface.encodeFunctionData(
        'quoteExactInputSingle',
        [tokenIn, tokenOut, feeTier, tradeVolume, 0]
      )

      const result = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data,
      })

      const amountOut = quoter.interface.decodeFunctionResult(
        'quoteExactInputSingle',
        result
      )[0]
      const amountOutInETH = Number(amountOut) / 10 ** decimalsB

      console.log('amountOut =====>', amountOut)
      console.log('amountOutInETH (tokenOutNODECA) =====>', amountOutInETH)

      console.log(
        'tradeVolume / sweetSpot =====>',
        tradeVolume / BigInt(sweetSpot)
      )

      // Get quote for (tradeVolume / sweetSpot)
      const sweetSpotData = quoter.interface.encodeFunctionData(
        'quoteExactInputSingle',
        [tokenIn, tokenOut, feeTier, tradeVolume / BigInt(sweetSpot), 0]
      )

      const sweetSpotResult = await provider.call({
        to: CONTRACT_ADDRESSES.UNISWAP_V3.QUOTER,
        data: sweetSpotData,
      })

      const sweetSpotAmountOut = quoter.interface.decodeFunctionResult(
        'quoteExactInputSingle',
        sweetSpotResult
      )[0]
      const sweetSpotAmountOutInETH =
        Number(sweetSpotAmountOut) / 10 ** decimalsB
      const scaledSweetSpotAmountOutInETH = sweetSpotAmountOutInETH * sweetSpot

      console.log('sweetSpotAmountOut =====>', sweetSpotAmountOut)
      console.log('sweetSpotAmountOutInETH =====>', sweetSpotAmountOutInETH)
      console.log(
        'scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>',
        scaledSweetSpotAmountOutInETH
      )

      const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH

      let raw = amountOutInETH / scaledSweetSpotAmountOutInETH
      let percentageSavings = (1 - raw) * 100
      percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
      percentageSavings = Number(percentageSavings.toFixed(3))

      console.log('slippageSavings =====>', slippageSavings)
      console.log('percentageSavings =====>', percentageSavings)

      // Get effective price (NODECA)
      const realisedPriceNODECA = amountOutInETH / scaledTradeVolume
      console.log('realisedPriceNODECA =====>', realisedPriceNODECA)

      // Get effective price (DECA)
      const realisedPriceDECA =
        scaledSweetSpotAmountOutInETH / scaledTradeVolume
      console.log('realisedPriceDECA =====>', realisedPriceDECA)

      const priceAccuracyNODECA = realisedPriceNODECA / observedPrice
      const priceAccuracyDECA = realisedPriceDECA / observedPrice

      console.log('priceAccuracyNODECA =====>', priceAccuracyNODECA)
      console.log('priceAccuracyDECA =====>', priceAccuracyDECA)

      return {
        slippageSavings,
        percentageSavings,
        priceAccuracyNODECA,
        priceAccuracyDECA,
      }
    }

    if (dex.startsWith('balancer-') || dex === 'balancer') {
      try {
        const vault = new ethers.Contract(
          CONTRACT_ADDRESSES.BALANCER.VAULT,
          CONTRACT_ABIS.BALANCER.VAULT,
          provider
        )

        // Helper to build swap query
        async function getQuote(amountIn: bigint) {
          if (!pairAddress) {
            throw new Error('Pool ID is required for Balancer swaps')
          }

          console.log('BALANCER PAIR ADDRESS', pairAddress)

          // Get pool metadata
          const poolMetadata = (BALANCER_POOL_METADATA as any)[pairAddress]
          if (!poolMetadata) {
            throw new Error(
              `No metadata found for Balancer pool ${pairAddress}`
            )
          }

          // Use metadata for token indices (no blockchain calls needed)
          const tokens = poolMetadata.tokens.map((t: string) => t.toLowerCase())

          // Find token indices in the pool using metadata
          const tokenInIndex = tokens.findIndex(
            (token: string) => token === tokenIn.toLowerCase()
          )
          const tokenOutIndex = tokens.findIndex(
            (token: string) => token === tokenOut.toLowerCase()
          )

          if (tokenInIndex === -1 || tokenOutIndex === -1) {
            throw new Error(
              `Tokens not found in Balancer pool: ${tokenIn}, ${tokenOut}`
            )
          }

          console.log('Token indices:', { tokenInIndex, tokenOutIndex, tokens })

          const swaps = [
            {
              poolId: pairAddress, // This is now the actual poolId from Balancer
              assetInIndex: tokenInIndex,
              assetOutIndex: tokenOutIndex,
              amount: amountIn.toString(),
              userData: '0x',
            },
          ]

          const assets = [tokenIn, tokenOut]

          const funds = {
            sender: ethers.ZeroAddress,
            fromInternalBalance: false,
            recipient: ethers.ZeroAddress,
            toInternalBalance: false,
          }

          // Encode the function call data
          const data = vault.interface.encodeFunctionData(
            'queryBatchSwap',
            [0, swaps, assets, funds] // 0 = GIVEN_IN
          )

          // Use provider.call() instead of direct contract call
          const result = await provider.call({
            to: CONTRACT_ADDRESSES.BALANCER.VAULT,
            data,
          })

          // Decode the result
          const deltas = vault.interface.decodeFunctionResult(
            'queryBatchSwap',
            result
          )[0]

          // deltas[0] = +amountIn, deltas[1] = -amountOut
          return BigInt(deltas[1]) * BigInt(-1)
        }

        // Get quote for full amount (tokenOutNODECA)
        const amountOut = await getQuote(tradeVolume)
        const amountOutInETH = Number(amountOut) / 10 ** decimalsB

        console.log('amountOut =====>', amountOut)
        console.log('amountOutInETH (tokenOutNODECA) =====>', amountOutInETH)

        console.log(
          'tradeVolume / sweetSpot =====>',
          tradeVolume / BigInt(sweetSpot)
        )

        // Get quote for (tradeVolume / sweetSpot)
        const sweetSpotAmountOut = await getQuote(
          tradeVolume / BigInt(sweetSpot)
        )
        const sweetSpotAmountOutInETH =
          Number(sweetSpotAmountOut) / 10 ** decimalsB
        // Scale up the sweet spot quote (tokenOutDECA)
        const scaledSweetSpotAmountOutInETH =
          sweetSpotAmountOutInETH * sweetSpot

        console.log('sweetSpotAmountOut =====>', sweetSpotAmountOut)
        console.log('sweetSpotAmountOutInETH =====>', sweetSpotAmountOutInETH)
        console.log(
          'scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>',
          scaledSweetSpotAmountOutInETH
        )

        const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH

        let raw = amountOutInETH / scaledSweetSpotAmountOutInETH
        let percentageSavings = (1 - raw) * 100
        percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
        percentageSavings = Number(percentageSavings.toFixed(3))

        console.log('slippageSavings =====>', slippageSavings)
        console.log('percentageSavings =====>', percentageSavings)

        // Get effective price (NODECA): tokenOutNODECA / LiqT
        const realisedPriceNODECA = amountOutInETH / scaledTradeVolume
        console.log('realisedPriceNODECA =====>', realisedPriceNODECA)

        // Get effective price (DECA): tokenOutDECA / LiqT
        const realisedPriceDECA =
          scaledSweetSpotAmountOutInETH / scaledTradeVolume
        console.log('realisedPriceDECA =====>', realisedPriceDECA)

        const priceAccuracyNODECA = realisedPriceNODECA / observedPrice
        const priceAccuracyDECA = realisedPriceDECA / observedPrice

        console.log('priceAccuracyNODECA =====>', priceAccuracyNODECA)
        console.log('priceAccuracyDECA =====>', priceAccuracyDECA)

        return {
          slippageSavings,
          percentageSavings,
          priceAccuracyNODECA,
          priceAccuracyDECA,
        }
      } catch (error) {
        console.error('Error in Balancer calculation:', error)
        return {
          slippageSavings: 0,
          percentageSavings: 0,
          priceAccuracyNODECA: 0,
          priceAccuracyDECA: 0,
        }
      }
    }

    if (dex.startsWith('curve-') || dex === 'curve') {
      console.log('Calculating slippage for Curve pool...')

      try {
        if (!pairAddress) {
          throw new Error('Pool address is required for Curve swaps')
        }

        console.log('CURVE POOL ADDRESS', pairAddress)

        // Get pool metadata
        const poolMetadata = (CURVE_POOL_METADATA as any)[pairAddress]
        if (!poolMetadata) {
          throw new Error(`No metadata found for Curve pool ${pairAddress}`)
        }

        // Create Curve pool contract instance
        const poolContract = new ethers.Contract(
          pairAddress,
          CONTRACT_ABIS.CURVE.POOL,
          provider
        )

        // Helper to get quote from Curve pool
        async function getCurveQuote(amountIn: bigint) {
          // Use metadata for token indices (no blockchain calls needed)
          const coins = poolMetadata.tokens.map((t: string) => t.toLowerCase())
          const isMeta = poolMetadata.isMeta

          // Find token indices in the pool using metadata
          const tokenInIndex = coins.findIndex(
            (coin: string) => coin === tokenIn.toLowerCase()
          )
          const tokenOutIndex = coins.findIndex(
            (coin: string) => coin === tokenOut.toLowerCase()
          )

          if (tokenInIndex === -1 || tokenOutIndex === -1) {
            throw new Error(
              `Tokens not found in Curve pool: ${tokenIn}, ${tokenOut}`
            )
          }

          console.log('Curve token indices:', { tokenInIndex, tokenOutIndex })
          console.log('Curve is meta pool:', isMeta)

          // Use appropriate function based on pool type
          let amountOut: bigint
          try {
            if (isMeta) {
              // For meta pools, try get_dy_underlying first, fallback to get_dy
              try {
                amountOut = await poolContract.get_dy_underlying(
                  tokenInIndex,
                  tokenOutIndex,
                  amountIn
                )
              } catch (error) {
                console.log('get_dy_underlying failed, trying get_dy:', error)
                amountOut = await poolContract.get_dy(
                  tokenInIndex,
                  tokenOutIndex,
                  amountIn
                )
              }
            } else {
              // For regular pools, use get_dy
              amountOut = await poolContract.get_dy(
                tokenInIndex,
                tokenOutIndex,
                amountIn
              )
            }
          } catch (error) {
            console.error('Error getting Curve quote:', error)
            throw new Error(`Failed to get quote from Curve pool: ${error}`)
          }

          return amountOut
        }

        // Get quote for full amount (tokenOutNODECA)
        const amountOut = await getCurveQuote(tradeVolume)
        const amountOutInETH = Number(amountOut) / 10 ** decimalsB

        console.log('amountOut =====>', amountOut)
        console.log('amountOutInETH (tokenOutNODECA) =====>', amountOutInETH)

        console.log(
          'tradeVolume / sweetSpot =====>',
          tradeVolume / BigInt(sweetSpot)
        )

        // Get quote for (tradeVolume / sweetSpot)
        const sweetSpotAmountOut = await getCurveQuote(
          tradeVolume / BigInt(sweetSpot)
        )
        const sweetSpotAmountOutInETH =
          Number(sweetSpotAmountOut) / 10 ** decimalsB
        // Scale up the sweet spot quote (tokenOutDECA)
        const scaledSweetSpotAmountOutInETH =
          sweetSpotAmountOutInETH * sweetSpot

        console.log('sweetSpotAmountOut =====>', sweetSpotAmountOut)
        console.log('sweetSpotAmountOutInETH =====>', sweetSpotAmountOutInETH)
        console.log(
          'scaledSweetSpotAmountOutInETH (tokenOutDECA) =====>',
          scaledSweetSpotAmountOutInETH
        )

        const slippageSavings = scaledSweetSpotAmountOutInETH - amountOutInETH

        let raw = amountOutInETH / scaledSweetSpotAmountOutInETH
        let percentageSavings = (1 - raw) * 100
        percentageSavings = Math.max(0, Math.min(percentageSavings, 100))
        percentageSavings = Number(percentageSavings.toFixed(3))

        console.log('slippageSavings =====>', slippageSavings)
        console.log('percentageSavings =====>', percentageSavings)

        // Get effective price (NODECA): tokenOutNODECA / LiqT
        const realisedPriceNODECA = amountOutInETH / scaledTradeVolume
        console.log('realisedPriceNODECA =====>', realisedPriceNODECA)

        // Get effective price (DECA): tokenOutDECA / LiqT
        const realisedPriceDECA =
          scaledSweetSpotAmountOutInETH / scaledTradeVolume
        console.log('realisedPriceDECA =====>', realisedPriceDECA)

        const priceAccuracyNODECA = realisedPriceNODECA / observedPrice
        const priceAccuracyDECA = realisedPriceDECA / observedPrice

        console.log('priceAccuracyNODECA =====>', priceAccuracyNODECA)
        console.log('priceAccuracyDECA =====>', priceAccuracyDECA)

        return {
          slippageSavings,
          percentageSavings,
          priceAccuracyNODECA,
          priceAccuracyDECA,
        }
      } catch (error) {
        console.error('Error in Curve calculation:', error)
        return {
          slippageSavings: 0,
          percentageSavings: 0,
          priceAccuracyNODECA: 0,
          priceAccuracyDECA: 0,
        }
      }
    }

    console.log(`Slippage calculation not implemented for DEX: ${dex}`)
    return {
      slippageSavings: 0,
      percentageSavings: 0,
      priceAccuracyNODECA: 0,
      priceAccuracyDECA: 0,
    }
  } catch (error) {
    console.error('Error calculating slippage savings:', error)
    return {
      slippageSavings: 0,
      percentageSavings: 0,
      priceAccuracyNODECA: 0,
      priceAccuracyDECA: 0,
    }
  }
}
