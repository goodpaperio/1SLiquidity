import { Interface, type TransactionReceipt } from 'ethers';

export const CORE_EVENT_ABI = [
  'event TradeCreated(uint256 indexed tradeId, address indexed user, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountRemaining, uint256 minAmountOut, uint256 realisedAmountOut, bool isInstasettlable, uint256 instasettleBps, uint256 lastSweetSpot, bool usePriceBased, bool onlyInstasettle)',
  'event TradeCompleted(uint256 indexed tradeId, uint256 finalRealisedAmountOut)',
] as const;

const iface = new Interface([...CORE_EVENT_ABI]);

export function parseTradeIdFromReceipt(
  receipt: TransactionReceipt,
  coreAddress: string
): number | undefined {
  const core = coreAddress.toLowerCase();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== core) continue;
    try {
      const parsed = iface.parseLog({
        topics: log.topics as string[],
        data: log.data,
      });
      if (parsed?.name === 'TradeCreated') {
        return Number(parsed.args.tradeId);
      }
    } catch {
      // not a TradeCreated log
    }
  }
  return undefined;
}

export interface TradeCompletedLog {
  tradeId: number;
  finalRealisedAmountOut: bigint;
  blockNumber: number;
  transactionHash: string;
}

export function parseTradeCompletedLogs(
  logs: Array<{
    address: string;
    topics: readonly string[];
    data: string;
    blockNumber: number;
    transactionHash: string;
  }>,
  coreAddress: string
): TradeCompletedLog[] {
  const core = coreAddress.toLowerCase();
  const out: TradeCompletedLog[] = [];
  for (const log of logs) {
    if (log.address.toLowerCase() !== core) continue;
    try {
      const parsed = iface.parseLog({
        topics: [...log.topics],
        data: log.data,
      });
      if (parsed?.name === 'TradeCompleted') {
        out.push({
          tradeId: Number(parsed.args.tradeId),
          finalRealisedAmountOut: BigInt(
            parsed.args.finalRealisedAmountOut.toString()
          ),
          blockNumber: log.blockNumber,
          transactionHash: log.transactionHash,
        });
      }
    } catch {
      // skip
    }
  }
  return out;
}
