import { Contract, type Provider } from 'ethers';
import {
  BASE_TOKEN_ADDRESSES,
  type BaseTokenSymbol,
} from '../config/baseTokens.js';
import { ERC20_ABI } from '../chain/contracts.js';

export type BaseBalances = Partial<Record<BaseTokenSymbol, bigint>>;

export class BalanceService {
  constructor(private readonly provider: Provider) {}

  async getTokenBalance(holder: string, tokenAddress: string): Promise<bigint> {
    const erc20 = new Contract(tokenAddress, ERC20_ABI, this.provider);
    return erc20.balanceOf(holder);
  }

  async getBaseBalances(
    holder: string,
    bases: BaseTokenSymbol[]
  ): Promise<BaseBalances> {
    const out: BaseBalances = {};
    await Promise.all(
      bases.map(async (sym) => {
        const token = BASE_TOKEN_ADDRESSES[sym];
        const erc20 = new Contract(token, ERC20_ABI, this.provider);
        out[sym] = await erc20.balanceOf(holder);
      })
    );
    return out;
  }
}
