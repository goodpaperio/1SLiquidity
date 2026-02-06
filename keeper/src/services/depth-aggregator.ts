import { ethers } from 'ethers'
import { UniswapV2Service } from '../dex/uniswap-v2'
import { UniswapV3Service } from '../dex/uniswap-v3'
import { SushiSwapService } from '../dex/sushiswap'
import { DepthData, DepthConfig } from '../types/depth'

export class DepthAggregator {
  private uniswapV2: UniswapV2Service
  private uniswapV3: UniswapV3Service
  private sushiswap: SushiSwapService

  constructor(provider: ethers.Provider) {
    this.uniswapV2 = new UniswapV2Service(provider)
    this.uniswapV3 = new UniswapV3Service(provider)
    this.sushiswap = new SushiSwapService(provider)
  }

  // async getDepth(token0: string, token1: string, config: DepthConfig): Promise<DepthData[]> {
  //   const results: DepthData[] = [];

  //   // Get depth from all DEXs in parallel
  //   // const [uniswapV2Depth, uniswapV3Depths, sushiswapDepth] = await Promise.all([
  //   //   this.uniswapV2.getDepth(token0, token1, config),
  //   //   this.uniswapV3.getDepth(token0, token1, config),
  //   //   this.sushiswap.getDepth(token0, token1, config)
  //   // ]);
  //   const [uniswapV2Depth, sushiswapDepth] = await Promise.all([
  //     this.uniswapV2.getDepth(token0, token1, config),
  //     this.sushiswap.getDepth(token0, token1, config)
  //   ]);

  //   // Add non-null results
  //   if (uniswapV2Depth) results.push(uniswapV2Depth);
  //   // if (uniswapV3Depths) results.push(...uniswapV3Depths);
  //   if (sushiswapDepth) results.push(sushiswapDepth);

  //   return results;
  // }
}
