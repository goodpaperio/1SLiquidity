import { ethers } from 'ethers'
import { PriceResult } from '../types/price'
import { CONTRACT_ADDRESSES, CONTRACT_ABIS, COMMON } from '../config/dex'
import { ReserveResult } from '../types/reserves'
import { DepthData, DepthConfig, DepthPoint } from '../types/depth'
import { DecimalUtils } from '../utils/decimals'
import { TokenService } from '../services/token-service'

export class UniswapV2Service {
  private router: ethers.Contract
  private factory: ethers.Contract
  private provider: ethers.Provider
  private tokenService: TokenService

  constructor(provider: ethers.Provider) {
    this.provider = provider
    this.tokenService = TokenService.getInstance(provider)
    this.router = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_V2.ROUTER,
      CONTRACT_ABIS.UNISWAP_V2.ROUTER,
      provider
    )
    this.factory = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_V2.FACTORY,
      CONTRACT_ABIS.UNISWAP_V2.FACTORY,
      provider
    )
  }

  //   // Helper method to convert Wei to normal value for price calculation
  private convertWeiToNormal(weiValue: bigint, decimals: number): number {
    const divisor = Math.pow(10, decimals)
    return Number(weiValue) / divisor
  }

  async getReserves(
    tokenA: string,
    tokenB: string
  ): Promise<ReserveResult | null> {
    try {
      const pairAddress = await this.factory.getPair(tokenA, tokenB)
      if (pairAddress === COMMON.ZERO_ADDRESS) {
        return null
      }

      const pair = new ethers.Contract(
        pairAddress,
        CONTRACT_ABIS.UNISWAP_V2.PAIR,
        this.provider
      )
      const [reserve0, reserve1] = await pair.getReserves()
      const token0 = await pair.token0()

      const isToken0First = tokenA.toLowerCase() === token0.toLowerCase()
      const token0Reserve = isToken0First ? reserve0 : reserve1
      const token1Reserve = isToken0First ? reserve1 : reserve0

      // const normalizedToken0Reserve = this.normalizeTo18Decimals(token0Reserve, decimals.token0)
      // const normalizedToken1Reserve = this.normalizeTo18Decimals(token1Reserve, decimals.token1)

      const [token0Info, token1Info] = await Promise.all([
        this.tokenService.getTokenInfo(tokenA),
        this.tokenService.getTokenInfo(tokenB),
      ])

      // Calculate price: reservesTokenB / reservesTokenA (in normalized values)
      const reservesTokenAinEth = this.convertWeiToNormal(
        BigInt(token0Reserve.toString()),
        token0Info.decimals
      )
      const reservesTokenBinEth = this.convertWeiToNormal(
        BigInt(token1Reserve.toString()),
        token1Info.decimals
      )
      const price = reservesTokenBinEth / reservesTokenAinEth

      console.log('Uniswap V2 reserves:', {
        token0: token0Reserve.toString(),
        token1: token1Reserve.toString(),
        price: price,
      })

      return {
        dex: 'uniswap-v2',
        pairAddress,
        reserves: {
          token0: token0Reserve.toString(),
          token1: token1Reserve.toString(),
        },
        price: price,
        timestamp: Date.now(),
      } as ReserveResult
    } catch (error) {
      console.error('Error fetching Uniswap V2 reserves:', error)
      return null
    }
  }

  async getPrice(tokenA: string, tokenB: string): Promise<PriceResult | null> {
    try {
      const pairAddress = await this.factory.getPair(tokenA, tokenB)
      if (pairAddress === COMMON.ZERO_ADDRESS) {
        return null
      }

      const [token0Info, token1Info] = await Promise.all([
        this.tokenService.getTokenInfo(tokenA),
        this.tokenService.getTokenInfo(tokenB),
      ])

      const amountIn = DecimalUtils.normalizeAmount('1', token0Info.decimals)
      const amounts = await this.router.getAmountsOut(amountIn, [
        tokenA,
        tokenB,
      ])
      const price = DecimalUtils.calculatePrice(
        amounts[0],
        amounts[1],
        token0Info.decimals,
        token1Info.decimals
      )

      return {
        dex: 'uniswap-v2',
        price,
        timestamp: Date.now(),
      }
    } catch (error) {
      console.error('Uniswap V2 price fetch failed:', error)
      return null
    }
  }

  // async getDepth(token0: string, token1: string, config: DepthConfig): Promise<DepthData | null> {
  //   try {
  //     const pairAddress = await this.factory.getPair(token0, token1);
  //     if (pairAddress === COMMON.ZERO_ADDRESS) {
  //       return null;
  //     }

  //     const [token0Info, token1Info] = await Promise.all([
  //       this.tokenService.getTokenInfo(token0),
  //       this.tokenService.getTokenInfo(token1)
  //     ]);

  //     const pair = new ethers.Contract(pairAddress, CONTRACT_ABIS.UNISWAP_V2.PAIR, this.provider);
  //     const [reserves, token0Address] = await Promise.all([
  //       pair.getReserves(),
  //       pair.token0()
  //     ]);

  //     const isToken0First = token0.toLowerCase() === token0Address.toLowerCase();
  //     const reserve0 = isToken0First ? reserves.reserve0 : reserves.reserve1;
  //     const reserve1 = isToken0First ? reserves.reserve1 : reserves.reserve0;

  //     const currentPrice = Number(DecimalUtils.calculatePrice(
  //       reserve0,
  //       reserve1,
  //       token0Info.decimals,
  //       token1Info.decimals
  //     ));

  //     const depthPoints: DepthPoint[] = [];

  //     for (const interval of config.priceIntervals) {
  //       const priceUp = currentPrice * (1 + interval);
  //       const priceDown = currentPrice * (1 - interval);

  //       const amountUp = this.calculateAmountAtPrice(
  //         reserve0,
  //         reserve1,
  //         priceUp,
  //         token0Info.decimals,
  //         token1Info.decimals
  //       );
  //       const amountDown = this.calculateAmountAtPrice(
  //         reserve0,
  //         reserve1,
  //         priceDown,
  //         token0Info.decimals,
  //         token1Info.decimals
  //       );

  //       depthPoints.push(
  //         { price: priceUp.toString(), amount: amountUp },
  //         { price: priceDown.toString(), amount: amountDown }
  //       );
  //     }

  //     return {
  //       token0,
  //       token1,
  //       dex: 'uniswap-v2',
  //       timestamp: Math.floor(Date.now() / 1000),
  //       depthPoints: depthPoints.slice(0, config.maxDepthPoints)
  //     };
  //   } catch (error) {
  //     console.error('Error fetching Uniswap V2 depth:', error);
  //     return null;
  //   }
  // }

  // private calculateAmountAtPrice(
  //   reserve0: bigint,
  //   reserve1: bigint,
  //   targetPrice: number,
  //   decimals0: number,
  //   decimals1: number
  // ): string {
  //   // Using constant product formula: x * y = k
  //   const k = reserve0 * reserve1;
  //   const normalizedReserve0 = Number(DecimalUtils.formatAmount(reserve0, decimals0));
  //   const newReserve1 = DecimalUtils.normalizeAmount(
  //     (normalizedReserve0 * targetPrice).toString(),
  //     decimals1
  //   );
  //   const newReserve0 = k / newReserve1;
  //   return DecimalUtils.formatAmount(newReserve0, decimals0);
  // }
}
