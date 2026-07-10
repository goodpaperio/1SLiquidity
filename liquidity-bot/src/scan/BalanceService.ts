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
    const map = await this.getTokenBalances(holder, [tokenAddress]);
    return map.get(tokenAddress.toLowerCase()) ?? 0n;
  }

  /** Batch balanceOf for many tokens in one aggregate3 (or sequential fallback). */
  async getTokenBalances(
    holder: string,
    tokenAddresses: readonly string[]
  ): Promise<Map<string, bigint>> {
    const out = new Map<string, bigint>();
    if (tokenAddresses.length === 0) return out;

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const addr of tokenAddresses) {
      const lower = addr.toLowerCase();
      if (seen.has(lower)) continue;
      seen.add(lower);
      unique.push(addr);
    }

    if (this.useMulticall) {
      try {
        const results = await this.multicall.aggregate3Chunked(
          unique.map((tokenAddress) => ({
            target: tokenAddress,
            allowFailure: true,
            callData: this.multicall.encodeCall(erc20If(), 'balanceOf', [
              holder,
            ]),
          }))
        );
        unique.forEach((tokenAddress, index) => {
          const decoded = this.multicall.decodeResult(
            erc20If(),
            'balanceOf',
            results[index]?.returnData ?? '0x'
          ) as [bigint] | null;
          out.set(
            tokenAddress.toLowerCase(),
            decoded ? BigInt(decoded[0].toString()) : 0n
          );
        });
        return out;
      } catch {
        // fall through
      }
    }

    await Promise.all(
      unique.map(async (tokenAddress) => {
        const erc20 = new Contract(tokenAddress, ERC20_ABI, this.provider);
        const bal = await erc20.balanceOf(holder);
        out.set(tokenAddress.toLowerCase(), BigInt(bal.toString()));
      })
    );
    return out;
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
