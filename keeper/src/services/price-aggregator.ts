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
          // Use smart filtering to find candidate Curve pools
          const candidatePools = this.curvePoolFilter.findBestPools(tokenA, tokenB, 5);
          if (candidatePools.length === 0) {
            console.log(`No suitable Curve pools found for ${tokenA}/${tokenB}`);
            return null;
          }

          // Evaluate all candidate pools to find the best one
          let bestPrice: PriceResult | null = null;
          let bestPriceValue = 0;
          let bestPoolAddress = '';

          for (const poolAddress of candidatePools) {
            const curveService = this.curveServices.get(poolAddress);
            if (!curveService) {
              console.log(`Curve service not found for pool ${poolAddress}`);
              continue;
            }

            const price = await this.fetchWithRetry(
              () => curveService.getPrice(tokenA, tokenB),
              `Curve ${poolAddress}`
            );

            if (price && parseFloat(price.price) > bestPriceValue) {
              bestPrice = price;
              bestPriceValue = parseFloat(price.price);
              bestPoolAddress = poolAddress;
            }
          }

          if (bestPrice) {
            bestPrice.dex = `curve-${bestPoolAddress}`;
            console.log(`Selected best Curve pool ${bestPoolAddress} with price: ${bestPriceValue}`);
          }

          return bestPrice;
        } else {
          console.log('Curve pool filter not initialized - skipping Curve pools');
          return null;
        }
      case 'balancer':
        if (this.balancerPoolFilter) {
          // Use smart filtering to find candidate Balancer pools
          const candidatePools = await this.balancerPoolFilter.findBestPools(tokenA, tokenB, 5);
          if (candidatePools.length === 0) {
            console.log(`No suitable Balancer pools found for ${tokenA}/${tokenB}`);
            return null;
          }

          // Evaluate all candidate pools to find the best one
          let bestPrice: PriceResult | null = null;
          let bestPriceValue = 0;
          let bestPoolAddress = '';

          for (const poolAddress of candidatePools) {
            const balancerService = this.balancerServices.get(poolAddress);
            if (!balancerService) {
              console.log(`Balancer service not found for pool ${poolAddress}`);
              continue;
            }

            const balancerResult = await this.fetchWithRetry(
              () => balancerService.getPrice(tokenA, tokenB),
              `Balancer ${poolAddress}`
            );
            if (balancerResult && parseFloat(balancerResult.price) > bestPriceValue) {
              bestPrice = {
                dex: balancerResult.dex,
                price: balancerResult.price,
                timestamp: balancerResult.timestamp
              };
              bestPriceValue = parseFloat(balancerResult.price);
              bestPoolAddress = poolAddress;
            }
          }

          if (bestPrice) {
            bestPrice.dex = `balancer-${bestPoolAddress}`;
            console.log(`Selected best Balancer pool ${bestPoolAddress} with price: ${bestPriceValue}`);
          }

          return bestPrice;
        } else {
          console.log('Balancer pool filter not initialized - skipping Balancer pools');
          return null;
        }
      default:
        throw new Error(`Unsupported DEX type: ${dex}`);
    }
  }

  async getAllPrices(tokenA: string, tokenB: string): Promise<{
    allPrices: PriceResult[];
    otherCurvePools: PriceResult[];
    otherBalancerPools: PriceResult[];
  }> {
    const results: PriceResult[] = [];
    const curveResults: PriceResult[] = [];
    const balancerResults: PriceResult[] = [];

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
            curveResults.push(curvePrice);
          }
        } catch (error) {
          console.log(`Curve ${poolAddress} price fetch failed:`, error);
        }
      }

      // Find the best Curve pool and add it to main results
      if (curveResults.length > 0) {
        const bestCurvePool = curveResults.reduce((prev, current) => {
          return parseFloat(current.price) > parseFloat(prev.price) ? current : prev;
        });
        results.push(bestCurvePool);
        console.log(`Selected best Curve pool: ${bestCurvePool.dex} with price: ${bestCurvePool.price}`);
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
            balancerResults.push(balancerPrice);
          }
        } catch (error) {
          console.log(`Balancer ${poolAddress} price fetch failed:`, error);
        }
      }

      // Find the best Balancer pool and add it to main results
      if (balancerResults.length > 0) {
        const bestBalancerPool = balancerResults.reduce((prev, current) => {
          return parseFloat(current.price) > parseFloat(prev.price) ? current : prev;
        });
        results.push(bestBalancerPool);
        console.log(`Selected best Balancer pool: ${bestBalancerPool.dex} with price: ${bestBalancerPool.price}`);
      }
    } else {
      console.log('Balancer pool filter not initialized - skipping Balancer pools');
    }

    // Sort all prices by price value in descending order (highest first)
    const sortedResults = results.sort((a, b) => {
      const priceA = parseFloat(a.price);
      const priceB = parseFloat(b.price);
      if (priceB > priceA) return 1;
      if (priceB < priceA) return -1;
      return 0;
    });

    // Sort other Curve pools by price in descending order
    const sortedOtherCurvePools = curveResults
      .filter((r) => !results.some(main => main.dex === r.dex))
      .sort((a, b) => {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        if (priceB > priceA) return 1;
        if (priceB < priceA) return -1;
        return 0;
      });

    // Sort other Balancer pools by price in descending order
    const sortedOtherBalancerPools = balancerResults
      .filter((r) => !results.some(main => main.dex === r.dex))
      .sort((a, b) => {
        const priceA = parseFloat(a.price);
        const priceB = parseFloat(b.price);
        if (priceB > priceA) return 1;
        if (priceB < priceA) return -1;
        return 0;
      });

    console.log('All prices sorted by value (highest first):', sortedResults.map(p => ({
      dex: p.dex,
      price: p.price
    })));
    console.log('Other Curve pools sorted by price:', sortedOtherCurvePools.map(p => ({
      dex: p.dex,
      price: p.price
    })));
    console.log('Other Balancer pools sorted by price:', sortedOtherBalancerPools.map(p => ({
      dex: p.dex,
      price: p.price
    })));

    return {
      allPrices: sortedResults,
      otherCurvePools: sortedOtherCurvePools,
      otherBalancerPools: sortedOtherBalancerPools,
    };
  }
} 