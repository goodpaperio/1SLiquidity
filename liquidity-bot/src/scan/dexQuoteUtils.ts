import type { StreamDexId } from './types.js';
import { V3_FEE_TIERS } from '../chain/contracts.js';

export const STREAM_DEX_IDS: StreamDexId[] = [
  'uniswap-v2',
  'uniswap-v3-100',
  'uniswap-v3-500',
  'uniswap-v3-3000',
  'uniswap-v3-10000',
  'sushiswap',
];

export function liquidityScoreFromReserves(
  reserveIn: bigint,
  reserveOut: bigint
): bigint {
  if (reserveIn <= 0n || reserveOut <= 0n) return 0n;
  return sqrtBigInt(reserveIn * reserveOut);
}

function sqrtBigInt(value: bigint): bigint {
  if (value <= 0n) return 0n;
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }
  return x;
}

export function v3DexId(fee: number): StreamDexId {
  return `uniswap-v3-${fee}` as StreamDexId;
}

export function feeTierFromDexId(dex: StreamDexId): number | null {
  if (!dex.startsWith('uniswap-v3-')) return null;
  return Number(dex.replace('uniswap-v3-', ''));
}

export function isV3FeeTier(fee: number): boolean {
  return (V3_FEE_TIERS as readonly number[]).includes(fee);
}
