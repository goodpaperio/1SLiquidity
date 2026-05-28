import { Contract, type Provider } from 'ethers';
import { ERC20_ABI } from '../chain/contracts.js';

export class TokenRegistry {
  private readonly decimalsCache = new Map<string, number>();

  constructor(private readonly provider: Provider) {}

  async getDecimals(token: string): Promise<number> {
    const key = token.toLowerCase();
    const cached = this.decimalsCache.get(key);
    if (cached !== undefined) return cached;
    const erc20 = new Contract(token, ERC20_ABI, this.provider);
    const decimals = Number(await erc20.decimals());
    this.decimalsCache.set(key, decimals);
    return decimals;
  }
}
