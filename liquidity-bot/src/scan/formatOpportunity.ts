import { formatUnits } from 'ethers';
import { BASE_TOKEN_DECIMALS } from '../config/baseTokens.js';
import type { ScanOpportunity } from './types.js';

export function formatPredictedWin(opp: ScanOpportunity): string {
  const dec = BASE_TOKEN_DECIMALS[opp.baseSymbol];
  const sign = opp.predictedWinWei >= 0n ? '+' : '';
  return `${sign}${formatUnits(opp.predictedWinWei, dec)} ${opp.baseSymbol}`;
}

export function formatOpportunityLine(opp: ScanOpportunity): string {
  const dir = opp.direction === 'reverse' ? 'rev' : 'fwd';
  return (
    `${opp.baseSymbol}→${opp.targetName.padEnd(12)} ` +
    `${dir}  ` +
    `rt=${String(opp.roundTripBps).padStart(5)} bps  ` +
    `win=${formatPredictedWin(opp)}  ` +
    `leg1@${opp.candidateDex}  deca@${opp.direction === 'reverse' ? opp.deepBuyDex : opp.referenceSellDex}`
  );
}
