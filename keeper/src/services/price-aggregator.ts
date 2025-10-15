import { ethers } from 'ethers';
import { UniswapV2Service, UniswapV3Service, SushiSwapService, CurveService, BalancerService } from '../dex';
import { PriceResult } from '../types/price';
import { CONTRACT_ADDRESSES } from '../config/dex';
import { CurvePoolFilter, createCurvePoolFilter } from './curve-pool-filter';
import { BalancerPoolFilter, createBalancerPoolFilter } from './balancer-pool-filter';

export type DexType = 'uniswap-v2' | 'uniswap-v3-500' | 'uniswap-v3-3000' | 'uniswap-v3-10000' | 'sushiswap' | 'curve' | 'balancer';

export class PriceAggregator {
  private uniswapV2: UniswapV2Service;
  private uniswapV3_500: UniswapV3Service;
  private uniswapV3_3000: UniswapV3Service;
  private uniswapV3_10000: UniswapV3Service;
  private sushiswap: SushiSwapService;
  private curveServices: Map<string, CurveService>;
  private curvePoolFilter: CurvePoolFilter | null = null;
  private balancerServices: Map<string, BalancerService>;
  private balancerPoolFilter: BalancerPoolFilter | null = null;
  private provider: ethers.Provider;

  constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.uniswapV2 = new UniswapV2Service(provider);
    this.uniswapV3_500 = new UniswapV3Service(provider);
    this.uniswapV3_3000 = new UniswapV3Service(provider);
    this.uniswapV3_10000 = new UniswapV3Service(provider);
    this.sushiswap = new SushiSwapService(provider);
    this.curveServices = new Map();
    this.balancerServices = new Map();

    // Balancer and Curve services will be initialized dynamically when pool filters are set up
  }

  /**
   * Initialize Curve pool filter with metadata
   * Call this after loading CURVE_POOL_METADATA
   */
  initializeCurvePoolFilter(poolMetadata: Record<string, any>) {
    this.curvePoolFilter = createCurvePoolFilter(poolMetadata);

    // Initialize Curve services for all pools in metadata
    Object.keys(poolMetadata).forEach(poolAddress => {
      this.curveServices.set(poolAddress, new CurveService(this.provider, poolAddress, poolMetadata[poolAddress]));
    });

    console.log(`Initialized ${Object.keys(poolMetadata).length} Curve services`);
  }

  /**
   * Initialize Balancer pool filter with metadata
   * Call this after loading BALANCER_POOL_METADATA
   */
  initializeBalancerPoolFilter(poolMetadata: Record<string, any>) {
    this.balancerPoolFilter = createBalancerPoolFilter(poolMetadata);

    // Initialize Balancer services for all pools in metadata
    Object.keys(poolMetadata).forEach(poolAddress => {
      this.balancerServices.set(poolAddress, new BalancerService(this.provider, poolAddress, poolMetadata[poolAddress]));
    });

    console.log(`Initialized ${Object.keys(poolMetadata).length} Balancer services`);
  }

  // Helper method for fetching with retries
  private async fetchWithRetry(
    fetchFn: () => Promise<PriceResult | null>,
    name: string,
    maxRetries = 2,
    delay = 1000
  ): Promise<PriceResult | null> {
    let retries = 0;
    while (retries <= maxRetries) {
      try {
        return await fetchFn();
      } catch (error) {
        if (retries === maxRetries) {
          console.error(`Failed to fetch ${name} price after ${maxRetries} retries`);
          return null;
        }
        console.log(`Retrying ${name} price fetch (${retries + 1}/${maxRetries})...`);
        retries++;
        // Simple delay to avoid rate limits
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return null;
  }

  async getPriceFromDex(tokenA: string, tokenB: string, dex: DexType): Promise<PriceResult | null> {
    switch (dex) {
      case 'uniswap-v2':
        return await this.fetchWithRetry(
          () => this.uniswapV2.getPrice(tokenA, tokenB),
          'Uniswap V2'
        );
      case 'uniswap-v3-500':
        return await this.fetchWithRetry(
          () => this.uniswapV3_500.getPrice(tokenA, tokenB, 500),
          'Uniswap V3 (500)'
        );
      case 'uniswap-v3-3000':
        return await this.fetchWithRetry(
          () => this.uniswapV3_3000.getPrice(tokenA, tokenB, 3000),
          'Uniswap V3 (3000)'
        );
      case 'uniswap-v3-10000':
        return await this.fetchWithRetry(
          () => this.uniswapV3_10000.getPrice(tokenA, tokenB, 10000),
          'Uniswap V3 (10000)'
        );
      case 'sushiswap':
        return await this.fetchWithRetry(
          () => this.sushiswap.getPrice(tokenA, tokenB),
          'SushiSwap'
        );
      case 'curve':
        if (this.curvePoolFilter) {
          // Use smart filtering to find the best Curve pool
          const candidatePools = this.curvePoolFilter.findBestPools(tokenA, tokenB, 1);
          if (candidatePools.length === 0) {
            console.log(`No suitable Curve pools found for ${tokenA}/${tokenB}`);
            return null;
          }

          const bestPoolAddress = candidatePools[0];
          const curveService = this.curveServices.get(bestPoolAddress);
          if (!curveService) {
            console.log(`Curve service not found for pool ${bestPoolAddress}`);
            return null;
          }

          const price = await this.fetchWithRetry(
            () => curveService.getPrice(tokenA, tokenB),
            `Curve ${bestPoolAddress}`
          );

          if (price) {
            price.dex = `curve-${bestPoolAddress}`;
          }

          return price;
        } else {
          console.log('Curve pool filter not initialized - skipping Curve pools');
          return null;
        }
      case 'balancer':
        if (this.balancerPoolFilter) {
          // Use smart filtering to find the best Balancer pool
          const candidatePools = await this.balancerPoolFilter.findBestPools(tokenA, tokenB, 1);
          if (candidatePools.length === 0) {
            console.log(`No suitable Balancer pools found for ${tokenA}/${tokenB}`);
            return null;
          }

          const bestPoolAddress = candidatePools[0];
          const balancerService = this.balancerServices.get(bestPoolAddress);
          if (!balancerService) {
            console.log(`Balancer service not found for pool ${bestPoolAddress}`);
            return null;
          }

          const balancerResult = await this.fetchWithRetry(
            () => balancerService.getPrice(tokenA, tokenB),
            `Balancer ${bestPoolAddress}`
          );
          if (balancerResult) {
            return {
              dex: balancerResult.dex,
              price: balancerResult.price,
              timestamp: balancerResult.timestamp
            };
          }
          return null;
        } else {
          console.log('Balancer pool filter not initialized - skipping Balancer pools');
          return null;
        }
      default:
        throw new Error(`Unsupported DEX type: ${dex}`);
    }
  }

  async getAllPrices(tokenA: string, tokenB: string): Promise<PriceResult[]> {
    const results: PriceResult[] = [];

    // Fetch data sequentially instead of in parallel to avoid rate limits
    console.log('Fetching Uniswap V3 (500) price...');
    const uniswapV3_500Price = await this.getPriceFromDex(tokenA, tokenB, 'uniswap-v3-500');
    if (uniswapV3_500Price) results.push(uniswapV3_500Price);

    console.log('Fetching Uniswap V3 (3000) price...');
    const uniswapV3_3000Price = await this.getPriceFromDex(tokenA, tokenB, 'uniswap-v3-3000');
    if (uniswapV3_3000Price) results.push(uniswapV3_3000Price);

    console.log('Fetching Uniswap V3 (10000) price...');
    const uniswapV3_10000Price = await this.getPriceFromDex(tokenA, tokenB, 'uniswap-v3-10000');
    if (uniswapV3_10000Price) results.push(uniswapV3_10000Price);

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('Fetching Uniswap V2 price...');
    const uniswapV2Price = await this.getPriceFromDex(tokenA, tokenB, 'uniswap-v2');
    if (uniswapV2Price) results.push(uniswapV2Price);

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));

    console.log('Fetching SushiSwap price...');
    const sushiswapPrice = await this.getPriceFromDex(tokenA, tokenB, 'sushiswap');
    if (sushiswapPrice) results.push(sushiswapPrice);

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Try Curve pools for the token pair with smart filtering
    console.log('Fetching Curve prices...');
    if (this.curvePoolFilter) {
      // Use smart filtering to find relevant pools
      const candidatePools = this.curvePoolFilter.findBestPools(tokenA, tokenB, 5);
      console.log(`Found ${candidatePools.length} candidate Curve pools for ${tokenA}/${tokenB}`);

      for (const poolAddress of candidatePools) {
        const curveService = this.curveServices.get(poolAddress);
        if (!curveService) continue;

        try {
          const curvePrice = await this.fetchWithRetry(
            () => curveService.getPrice(tokenA, tokenB),
            `Curve ${poolAddress}`
          );
          if (curvePrice) {
            // Update the dex name to include pool address
            curvePrice.dex = `curve-${poolAddress}`;
            results.push(curvePrice);
          }
        } catch (error) {
          console.log(`Curve ${poolAddress} price fetch failed:`, error);
        }
      }
    } else {
      console.log('Curve pool filter not initialized - skipping Curve pools');
    }

    // Add short delay before making more calls to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Try Balancer pools for the token pair with smart filtering
    console.log('Fetching Balancer prices...');
    if (this.balancerPoolFilter) {
      // Use smart filtering to find relevant pools
      const candidatePools = await this.balancerPoolFilter.findBestPools(tokenA, tokenB, 5);
      console.log(`Found ${candidatePools.length} candidate Balancer pools for ${tokenA}/${tokenB}`);

      for (const poolAddress of candidatePools) {
        const balancerService = this.balancerServices.get(poolAddress);
        if (!balancerService) continue;

        try {
          const balancerResult = await this.fetchWithRetry(
            () => balancerService.getPrice(tokenA, tokenB),
            `Balancer ${poolAddress}`
          );
          if (balancerResult) {
            const balancerPrice = {
              dex: balancerResult.dex,
              price: balancerResult.price,
              timestamp: balancerResult.timestamp
            };
            results.push(balancerPrice);
          }
        } catch (error) {
          console.log(`Balancer ${poolAddress} price fetch failed:`, error);
        }
      }
    } else {
      console.log('Balancer pool filter not initialized - skipping Balancer pools');
    }

    return results;
  }
} 