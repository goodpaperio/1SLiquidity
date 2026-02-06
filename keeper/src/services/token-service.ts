import { ethers } from 'ethers';
import { TokenInfo } from '../types/token';
import { CONTRACT_ABIS } from '../config/dex';

export class TokenService {
  private static instance: TokenService;
  private tokenCache: Map<string, TokenInfo>;
  private provider: ethers.Provider;

  private constructor(provider: ethers.Provider) {
    this.provider = provider;
    this.tokenCache = new Map();
  }

  public static getInstance(provider: ethers.Provider): TokenService {
    if (!TokenService.instance) {
      TokenService.instance = new TokenService(provider);
    }
    return TokenService.instance;
  }

  public async getTokenInfo(address: string): Promise<TokenInfo> {
    if (this.tokenCache.has(address)) {
      return this.tokenCache.get(address)!;
    }

    const token = new ethers.Contract(
      address,
      CONTRACT_ABIS.UNISWAP_V2.ERC20,
      this.provider
    );

    const [decimals, symbol] = await Promise.all([
      token.decimals(),
      token.symbol()
    ]);
  
    const tokenInfo: TokenInfo = {
      address,
      decimals: Number(decimals),
      symbol
    };

    this.tokenCache.set(address, tokenInfo);
    return tokenInfo;
  }

  public clearCache(): void {
    this.tokenCache.clear();
  }
} 