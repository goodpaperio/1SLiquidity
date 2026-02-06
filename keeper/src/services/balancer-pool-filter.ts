import { ethers } from 'ethers';
import { CONTRACT_ABIS, COMMON } from '../config/dex';
import { createProvider } from '../utils/provider';

const provider = createProvider();

interface PoolMetadata {
  poolId: string; // Pool ID from v2 subgraph
  symbol: string;
  name: string;
  tokens: string[];
  tokenDecimals: number[];
  tokenNames: string[];
  tokenSymbols: string[];
  isActive: boolean;
}

export class BalancerPoolFilter {
  private poolMetadata: Map<string, PoolMetadata>; // Map poolAddress to its metadata

  constructor(pools: Record<string, any>) {
    this.poolMetadata = new Map();
    Object.entries(pools).forEach(([address, metadata]) => {
      this.poolMetadata.set(address, {
        poolId: metadata.poolId || '',
        symbol: metadata.symbol || 'Unknown',
        name: metadata.name || 'Unknown Pool',
        tokens: metadata.tokens.map((t: string) => t.toLowerCase()),
        tokenDecimals: metadata.tokenDecimals || [],
        tokenNames: metadata.tokenNames || [],
        tokenSymbols: metadata.tokenSymbols || [],
        isActive: metadata.isActive !== false
      });
    });
  }

  /**
   * Find the best Balancer pools for a token pair
   * @param tokenA First token address
   * @param tokenB Second token address
   * @param limit Maximum number of pools to return
   * @returns Array of pool addresses sorted by preference
   */
  async findBestPools(tokenA: string, tokenB: string, limit: number = 5): Promise<string[]> {
    const candidatePools: { poolAddress: string; metadata: PoolMetadata }[] = [];
    const tokenALower = tokenA.toLowerCase();
    const tokenBLower = tokenB.toLowerCase();

    // Find pools that contain both tokens
    for (const poolAddress of this.poolMetadata.keys()) {
      const metadata = this.poolMetadata.get(poolAddress);
      if (!metadata || !metadata.isActive) continue;

      const hasTokenA = metadata.tokens.includes(tokenALower);
      const hasTokenB = metadata.tokens.includes(tokenBLower);

      if (hasTokenA && hasTokenB) {
        candidatePools.push({ poolAddress, metadata });
      }
    }

    if (candidatePools.length === 0) {
      console.log(`No Balancer pools found containing both ${tokenA} and ${tokenB}`);
      return [];
    }

    // Sort pools by preference criteria
    return candidatePools
      .sort((a, b) => {
        // 1. Prefer pools with fewer tokens (more focused)
        const tokenCountDiff = a.metadata.tokens.length - b.metadata.tokens.length;
        if (tokenCountDiff !== 0) return tokenCountDiff;

        // 2. Prefer pools with more balanced token distribution
        const balanceA = this.calculateTokenBalance(a.metadata.tokens, a.metadata.tokenDecimals);
        const balanceB = this.calculateTokenBalance(b.metadata.tokens, b.metadata.tokenDecimals);
        if (balanceA > balanceB) return -1;
        if (balanceA < balanceB) return 1;

        // 3. Prefer pools with more descriptive names (likely more established)
        const nameScoreA = this.calculateNameScore(a.metadata.name, a.metadata.symbol);
        const nameScoreB = this.calculateNameScore(b.metadata.name, b.metadata.symbol);
        if (nameScoreA > nameScoreB) return -1;
        if (nameScoreA < nameScoreB) return 1;

        return 0;
      })
      .slice(0, limit)
      .map(p => p.poolAddress);
  }

  /**
   * Calculate token balance score for a pool
   * @param tokens Array of token addresses
   * @param tokenDecimals Array of token decimals
   * @returns Balance score (higher is better)
   */
  private calculateTokenBalance(tokens: string[], tokenDecimals: number[]): number {
    if (tokens.length < 2) return 0;
    
    // For 2-token pools, prefer pools with similar decimal places (more balanced)
    if (tokens.length === 2) {
      const decimalsDiff = Math.abs(tokenDecimals[0] - tokenDecimals[1]);
      return 1 - (decimalsDiff / 18); // Normalize by max possible difference
    }
    
    // For multi-token pools, prefer pools with more diverse token types
    const uniqueDecimals = new Set(tokenDecimals).size;
    return uniqueDecimals / tokens.length; // Higher score for more diversity
  }

  /**
   * Calculate name score for a pool (more descriptive names are better)
   * @param name Pool name
   * @param symbol Pool symbol
   * @returns Name score (higher is better)
   */
  private calculateNameScore(name: string, symbol: string): number {
    let score = 0;
    
    // Longer names are generally more descriptive
    score += name.length / 100;
    score += symbol.length / 50;
    
    // Bonus for common token symbols in the name
    const commonTokens = ['USDC', 'USDT', 'WETH', 'WBTC', 'DAI', 'BAL'];
    commonTokens.forEach(token => {
      if (name.toUpperCase().includes(token) || symbol.toUpperCase().includes(token)) {
        score += 0.1;
      }
    });
    
    // Bonus for "Balancer" in the name (official pools)
    if (name.toLowerCase().includes('balancer')) {
      score += 0.2;
    }
    
    return score;
  }

  /**
   * Get pool metadata by address
   * @param poolAddress Pool address
   * @returns Pool metadata or null
   */
  getPoolMetadata(poolAddress: string): PoolMetadata | null {
    return this.poolMetadata.get(poolAddress.toLowerCase()) || null;
  }

  /**
   * Get pool ID by address
   * @param poolAddress Pool address
   * @returns Pool ID or null
   */
  getPoolId(poolAddress: string): string | null {
    const metadata = this.getPoolMetadata(poolAddress);
    return metadata?.poolId || null;
  }

  /**
   * Get all pool addresses
   * @returns Array of all pool addresses
   */
  getAllPoolAddresses(): string[] {
    return Array.from(this.poolMetadata.keys());
  }

  /**
   * Get pools by token count
   * @param tokenCount Number of tokens in the pool
   * @returns Array of pool addresses with the specified token count
   */
  getPoolsByTokenCount(tokenCount: number): string[] {
    return Array.from(this.poolMetadata.entries())
      .filter(([_, metadata]) => metadata.tokens.length === tokenCount)
      .map(([address, _]) => address);
  }

  /**
   * Get pools containing a specific token
   * @param tokenAddress Token address to search for
   * @returns Array of pool addresses containing the token
   */
  getPoolsWithToken(tokenAddress: string): string[] {
    const tokenLower = tokenAddress.toLowerCase();
    return Array.from(this.poolMetadata.entries())
      .filter(([_, metadata]) => metadata.tokens.includes(tokenLower))
      .map(([address, _]) => address);
  }

  /**
   * Get pool count
   * @returns Total number of pools
   */
  getPoolCount(): number {
    return this.poolMetadata.size;
  }
}

/**
 * Create a Balancer pool filter instance
 * @param poolMetadata Pool metadata object
 * @returns BalancerPoolFilter instance
 */
export function createBalancerPoolFilter(poolMetadata: Record<string, any>): BalancerPoolFilter {
  return new BalancerPoolFilter(poolMetadata);
}
