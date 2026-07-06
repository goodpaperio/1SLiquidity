import { Contract, Interface, type Provider } from 'ethers';
import {
  BASE_TOKEN_ADDRESSES,
  type BaseTokenSymbol,
} from '../config/baseTokens.js';
import { ERC20_ABI } from '../chain/contracts.js';
import { MulticallClient } from '../chain/multicall3.js';

export type BaseBalances = Partial<Record<BaseTokenSymbol, bigint>>;

let erc20Iface: Interface | undefined;

function erc20If(): Interface {
  return (erc20Iface ??= new Interface(ERC20_ABI));
}

export interface BalanceServiceOptions {
  multicall?: MulticallClient;
  useMulticall?: boolean;
}

export class BalanceService {
  private readonly multicall: MulticallClient;
  private readonly useMulticall: boolean;

  constructor(
    private readonly provider: Provider,
    options: BalanceServiceOptions = {}
  ) {
    this.multicall =
      options.multicall ?? new MulticallClient(provider);
    this.useMulticall = options.useMulticall ?? true;
  }

  async getTokenBalance(holder: string, tokenAddress: string): Promise<bigint> {
    if (this.useMulticall) {
      try {
        const results = await this.multicall.aggregate3([
          {
            target: tokenAddress,
            allowFailure: true,
            callData: this.multicall.encodeCall(erc20If(), 'balanceOf', [
              holder,
            ]),
          },
        ]);
        const decoded = this.multicall.decodeResult(
          erc20If(),
          'balanceOf',
          results[0]?.returnData ?? '0x'
        ) as [bigint] | null;
        if (decoded) return BigInt(decoded[0].toString());
      } catch {
        // fall through
      }
    }

    const erc20 = new Contract(tokenAddress, ERC20_ABI, this.provider);
    return erc20.balanceOf(holder);
  }

  async getBaseBalances(
    holder: string,
    bases: BaseTokenSymbol[]
  ): Promise<BaseBalances> {
    if (bases.length === 0) return {};

    if (this.useMulticall) {
      try {
        const calls = bases.map((sym) => ({
          target: BASE_TOKEN_ADDRESSES[sym],
          allowFailure: true,
          callData: this.multicall.encodeCall(erc20If(), 'balanceOf', [
            holder,
          ]),
        }));
        const results = await this.multicall.aggregate3(calls);
        const out: BaseBalances = {};
        bases.forEach((sym, index) => {
          const decoded = this.multicall.decodeResult(
            erc20If(),
            'balanceOf',
            results[index]?.returnData ?? '0x'
          ) as [bigint] | null;
          out[sym] = decoded ? BigInt(decoded[0].toString()) : 0n;
        });
        return out;
      } catch {
        // fall through to sequential reads
      }
    }

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
