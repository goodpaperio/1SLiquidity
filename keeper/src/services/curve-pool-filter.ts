import { ethers } from 'ethers';

export interface CurvePoolMetadata {
  name: string;
  isMeta: boolean;
  tokens: string[];
  underlyingTokens: string[];
  A: string;
  fee: string;
  adminFee: string;
}

export interface CurvePoolInfo {
  poolAddress: string;
  poolName: string;
  isMeta: boolean;
  lpToken: string;
  tokens: string[];
  underlyingTokens: string[];
  A: string;
  fee: string;
  adminFee: string;
}

export class CurvePoolFilter {
  private poolMetadata: Map<string, CurvePoolMetadata>;

  constructor(poolMetadata: Map<string, CurvePoolMetadata>) {
    this.poolMetadata = poolMetadata;
  }

  /**
   * Find all pools that contain both tokens
   */
  findPoolsWithTokens(tokenA: string, tokenB: string): string[] {
    const candidatePools: string[] = [];

    for (const [poolAddress, metadata] of this.poolMetadata) {
      const hasTokenA = this.hasToken(metadata, tokenA);
      const hasTokenB = this.hasToken(metadata, tokenB);

      if (hasTokenA && hasTokenB) {
        candidatePools.push(poolAddress);
      }
    }

    return candidatePools;
  }

  /**
   * Find pools where one token is in the pool and the other is in underlying tokens
   * This handles metapool scenarios
   */
  findMetapoolPools(tokenA: string, tokenB: string): string[] {
    const candidatePools: string[] = [];

    for (const [poolAddress, metadata] of this.poolMetadata) {
      if (!metadata.isMeta) continue;

      const hasTokenA = this.hasToken(metadata, tokenA);
      const hasTokenB = this.hasToken(metadata, tokenB);
      const hasUnderlyingTokenA = this.hasUnderlyingToken(metadata, tokenA);
      const hasUnderlyingTokenB = this.hasUnderlyingToken(metadata, tokenB);

      // Case 1: tokenA in pool, tokenB in underlying
      if (hasTokenA && hasUnderlyingTokenB) {
        candidatePools.push(poolAddress);
      }
      // Case 2: tokenB in pool, tokenA in underlying
      else if (hasTokenB && hasUnderlyingTokenA) {
        candidatePools.push(poolAddress);
      }
    }

    return candidatePools;
  }

  /**
   * Find the best pools for a token pair using smart filtering
   */
  findBestPools(tokenA: string, tokenB: string, maxPools: number = 5): string[] {
    // First, try to find pools with both tokens directly
    const directPools = this.findPoolsWithTokens(tokenA, tokenB);
    
    if (directPools.length > 0) {
      // Sort by liquidity (using A parameter as proxy for pool size)
      const sortedPools = directPools.sort((a, b) => {
        const metadataA = this.poolMetadata.get(a);
        const metadataB = this.poolMetadata.get(b);
        
        if (!metadataA || !metadataB) return 0;
        
        // Higher A parameter usually means more stable/liquid pool
        return parseInt(metadataB.A) - parseInt(metadataA.A);
      });
      
      return sortedPools.slice(0, maxPools);
    }

    // If no direct pools, try metapool scenarios
    const metapoolPools = this.findMetapoolPools(tokenA, tokenB);
    
    if (metapoolPools.length > 0) {
      // Sort by A parameter
      const sortedPools = metapoolPools.sort((a, b) => {
        const metadataA = this.poolMetadata.get(a);
        const metadataB = this.poolMetadata.get(b);
        
        if (!metadataA || !metadataB) return 0;
        
        return parseInt(metadataB.A) - parseInt(metadataA.A);
      });
      
      return sortedPools.slice(0, maxPools);
    }

    return [];
  }

  /**
   * Check if a token exists in the pool's tokens
   */
  private hasToken(metadata: CurvePoolMetadata, token: string): boolean {
    return metadata.tokens.some(t => t.toLowerCase() === token.toLowerCase());
  }

  /**
   * Check if a token exists in the pool's underlying tokens
   */
  private hasUnderlyingToken(metadata: CurvePoolMetadata, token: string): boolean {
    return metadata.underlyingTokens.some(t => t.toLowerCase() === token.toLowerCase());
  }

  /**
   * Get pool metadata by address
   */
  getPoolMetadata(poolAddress: string): CurvePoolMetadata | undefined {
    return this.poolMetadata.get(poolAddress);
  }

  /**
   * Get all available pools
   */
  getAllPools(): string[] {
    return Array.from(this.poolMetadata.keys());
  }

  /**
   * Get pools by token count
   */
  getPoolsByTokenCount(minTokens: number, maxTokens: number): string[] {
    const pools: string[] = [];

    for (const [poolAddress, metadata] of this.poolMetadata) {
      if (metadata.tokens.length >= minTokens && metadata.tokens.length <= maxTokens) {
        pools.push(poolAddress);
      }
    }

    return pools;
  }

  /**
   * Get meta pools only
   */
  getMetaPools(): string[] {
    const pools: string[] = [];

    for (const [poolAddress, metadata] of this.poolMetadata) {
      if (metadata.isMeta) {
        pools.push(poolAddress);
      }
    }

    return pools;
  }

  /**
   * Get regular pools only
   */
  getRegularPools(): string[] {
    const pools: string[] = [];

    for (const [poolAddress, metadata] of this.poolMetadata) {
      if (!metadata.isMeta) {
        pools.push(poolAddress);
      }
    }

    return pools;
  }
}

/**
 * Create a CurvePoolFilter instance from pool metadata
 */
export function createCurvePoolFilter(poolMetadata: Record<string, CurvePoolMetadata>): CurvePoolFilter {
  const metadataMap = new Map<string, CurvePoolMetadata>();
  
  for (const [address, metadata] of Object.entries(poolMetadata)) {
    metadataMap.set(address, metadata);
  }
  
  return new CurvePoolFilter(metadataMap);
}
