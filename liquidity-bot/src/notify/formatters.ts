import { formatEther } from 'ethers';

const ETHERSCAN_TX = 'https://etherscan.io/tx/';

import { readPriceHints } from '../ops/priceCache.js';

function ethUsd(): number {
  const cached = readPriceHints();
  if (!cached) return 0;
  return cached.ethUsd;
}

function usdHint(ethWei: bigint): string {
  const eth = Number(formatEther(ethWei));
  const usd = eth * ethUsd();
  if (!Number.isFinite(usd)) return '';
  return ` (~$${usd.toFixed(2)})`;
}

function txLink(hash: string): string {
  return `<a href="${ETHERSCAN_TX}${hash}">${hash.slice(0, 10)}…</a>`;
}

function formatTokenAmount(amount: bigint, token: string): string {
  if (token === 'WETH' || token === 'ETH') {
    return `${formatEther(amount)} ${token}`;
  }
  return `${amount.toString()} ${token}`;
}

function signedDelta(amount: bigint, token: string): string {
  const sign = amount >= 0n ? '+' : '−';
  const abs = amount < 0n ? -amount : amount;
  const usd =
    token === 'WETH' || token === 'ETH'
      ? usdHint(abs)
      : '';
  return `${sign}${formatTokenAmount(abs, token)}${usd}`;
}

export function formatLeg1Alert(params: {
  pair: string;
  direction: 'forward' | 'reverse';
  dex: string;
  amountIn: bigint;
  tokenLabel: string;
  txHash: string;
  roundTripBps?: number;
}): string {
  const dir = params.direction === 'forward' ? 'base→alt' : 'alt→base';
  const bps =
    params.roundTripBps != null ? `\ncoupled: ${params.roundTripBps} bps` : '';
  return (
    `🟢 <b>Leg1</b> ${params.pair} (${dir})\n` +
    `DEX: ${params.dex}\n` +
    `in: ${params.amountIn.toString()} ${params.tokenLabel}${bps}\n` +
    `tx: ${txLink(params.txHash)}`
  );
}

export function formatLeg2Alert(params: {
  roundTripPair: string;
  leg2Pair: string;
  tradeId: number;
  leg2TokenIn: string;
  leg2AmountIn: bigint;
  leg2MinOut: bigint;
  settlementToken: string;
  txHash: string;
}): string {
  return (
    `🔵 <b>Leg2</b> Core placeTrade #${params.tradeId}\n` +
    `round-trip: ${params.roundTripPair}\n` +
    `sell on Core: ${params.leg2Pair}\n` +
    `in: ${params.leg2AmountIn.toString()} ${params.leg2TokenIn}\n` +
    `min out: ${params.leg2MinOut.toString()} ${params.settlementToken}\n` +
    `tx: ${txLink(params.txHash)}`
  );
}

export function formatLeg2FailedAlert(params: {
  pair: string;
  leg1TxHash: string;
  error: string;
}): string {
  return (
    `🔴 <b>Leg2 failed</b> (leg1 already on-chain)\n` +
    `pair: ${params.pair}\n` +
    `leg1: ${txLink(params.leg1TxHash)}\n` +
    `error: ${escapeHtml(params.error)}`
  );
}

export function formatTradeCompletedAlert(params: {
  tradeId: number;
  pair: string;
  leg1AmountIn: bigint;
  settlementToken: string;
  finalOut: bigint;
  pnl: bigint;
  placedAt: string;
  completedAt: string;
}): string {
  const placed = new Date(params.placedAt).toISOString().slice(0, 16).replace('T', ' ');
  const done = new Date(params.completedAt).toISOString().slice(0, 16).replace('T', ' ');
  return (
    `✅ <b>Trade completed</b> #${params.tradeId}\n` +
    `pair: ${params.pair}\n` +
    `in: ${params.leg1AmountIn.toString()} ${params.settlementToken}\n` +
    `out: ${params.finalOut.toString()} ${params.settlementToken}\n` +
    `P/L: ${signedDelta(params.pnl, params.settlementToken)}\n` +
    `placed: ${placed} UTC → settled: ${done} UTC`
  );
}

export function formatDailySummary(params: {
  botId: string;
  dayLabel: string;
  placed: number;
  completed: number;
  open: number;
  leg2Failed: number;
  volumeWei: bigint;
  pnlWei: bigint;
  pairs: string[];
}): string {
  const pairList =
    params.pairs.length > 0 ? params.pairs.join(', ') : '(none)';
  return (
    `📊 <b>Daily summary</b> ${params.dayLabel}\n` +
    `trades placed: ${params.placed} (${params.completed} completed, ${params.open} open, ${params.leg2Failed} leg2 failed)\n` +
    `volume (leg1 base/alt in): ${formatEther(params.volumeWei)} ETH-equiv${usdHint(params.volumeWei)}\n` +
    `pairs: ${pairList}\n` +
    `total P/L (WETH legs): ${signedDelta(params.pnlWei, 'WETH')}`
  );
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
