import { Contract, Interface, type Provider } from 'ethers';
import { bumpEthCalls, bumpMulticallChunks } from '../ops/cycleMetrics.js';

/** Canonical Multicall3 deployment on Ethereum mainnet and most EVM chains. */
export const MULTICALL3_ADDRESS =
  '0xcA11bde05977b3631167028862bE2a173976CA11';

export const MULTICALL3_ABI = [
  'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) payable returns (tuple(bool success, bytes returnData)[])',
] as const;

export interface Call3 {
  target: string;
  allowFailure: boolean;
  callData: string;
}

export interface Call3Result {
  success: boolean;
  returnData: string;
}

export interface MulticallClientOptions {
  address?: string;
  chunkSize?: number;
}

export class MulticallClient {
  private readonly contract: Contract;
  readonly chunkSize: number;

  constructor(
    provider: Provider,
    options: MulticallClientOptions = {}
  ) {
    const address = options.address ?? MULTICALL3_ADDRESS;
    this.chunkSize = options.chunkSize ?? 50;
    this.contract = new Contract(address, MULTICALL3_ABI, provider);
  }

  encodeCall(
    iface: Interface,
    fragment: string,
    args: readonly unknown[]
  ): string {
    return iface.encodeFunctionData(fragment, args);
  }

  decodeResult(
    iface: Interface,
    fragment: string,
    returnData: string
  ): unknown {
    if (!returnData || returnData === '0x') return null;
    return iface.decodeFunctionResult(fragment, returnData);
  }

  async aggregate3(calls: Call3[]): Promise<Call3Result[]> {
    if (calls.length === 0) return [];
    bumpEthCalls(1);
    bumpMulticallChunks(1);
    const raw = (await this.contract.aggregate3.staticCall(
      calls.map((c) => [c.target, c.allowFailure, c.callData])
    )) as Array<{ success: boolean; returnData: string }>;
    return raw.map((r) => ({
      success: r.success,
      returnData: r.returnData,
    }));
  }

  async aggregate3Chunked(
    calls: Call3[],
    chunkSize?: number
  ): Promise<Call3Result[]> {
    const size = chunkSize ?? this.chunkSize;
    const out: Call3Result[] = [];
    for (let i = 0; i < calls.length; i += size) {
      const chunk = calls.slice(i, i + size);
      out.push(...(await this.aggregate3(chunk)));
    }
    return out;
  }
}
