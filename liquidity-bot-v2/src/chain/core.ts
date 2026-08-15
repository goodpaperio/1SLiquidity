import {
  Contract,
  AbiCoder,
  keccak256,
  type Provider,
  type Signer,
} from 'ethers';
import type { BotConfig } from '../config/schema.js';

/** Minimal Core ABI for trade cancel / inspection / settlement. */
export const CORE_TRADE_ABI = [
  'function lastTradeId() view returns (uint256)',
  'function getTrade(uint256 tradeId) view returns (tuple(address owner, uint8 attempts, address tokenIn, address tokenOut, uint256 amountIn, uint256 amountRemaining, uint256 targetAmountOut, uint256 realisedAmountOut, uint256 tradeId, uint256 instasettleBps, uint256 lastSweetSpot, bool isInstasettlable, bool usePriceBased, bool onlyInstasettle))',
  'function getPairIdTradeIds(bytes32 pairId) view returns (uint256[])',
  'function executeTrades(bytes32 pairId)',
  'function cancelTrade(uint256 tradeId) returns (bool)',
] as const;

export interface CoreTradeView {
  owner: string;
  attempts: number;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountRemaining: bigint;
  targetAmountOut: bigint;
  realisedAmountOut: bigint;
  tradeId: bigint;
  instasettleBps: bigint;
  lastSweetSpot: bigint;
  isInstasettlable: boolean;
  usePriceBased: boolean;
  onlyInstasettle: boolean;
}

/** Matches Core: keccak256(abi.encode(tokenIn, tokenOut)). */
export function pairIdFromTokens(tokenIn: string, tokenOut: string): string {
  return keccak256(
    AbiCoder.defaultAbiCoder().encode(
      ['address', 'address'],
      [tokenIn, tokenOut]
    )
  );
}

export function getCoreContract(
  bot: BotConfig,
  runner: Provider | Signer
): Contract {
  return new Contract(bot.contracts.core, CORE_TRADE_ABI, runner);
}

function parseTrade(raw: unknown): CoreTradeView {
  const t = raw as CoreTradeView;
  return {
    owner: t.owner,
    attempts: Number(t.attempts),
    tokenIn: t.tokenIn,
    tokenOut: t.tokenOut,
    amountIn: BigInt(t.amountIn.toString()),
    amountRemaining: BigInt(t.amountRemaining.toString()),
    targetAmountOut: BigInt(t.targetAmountOut.toString()),
    realisedAmountOut: BigInt(t.realisedAmountOut.toString()),
    tradeId: BigInt(t.tradeId.toString()),
    instasettleBps: BigInt(t.instasettleBps.toString()),
    lastSweetSpot: BigInt(t.lastSweetSpot.toString()),
    isInstasettlable: t.isInstasettlable,
    usePriceBased: t.usePriceBased,
    onlyInstasettle: t.onlyInstasettle,
  };
}

export async function fetchTrade(
  core: Contract,
  tradeId: bigint | number
): Promise<CoreTradeView | null> {
  try {
    const raw = await core.getTrade(tradeId);
    const trade = parseTrade(raw);
    if (trade.owner === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return trade;
  } catch {
    return null;
  }
}

/** Trades still queued on Core for this owner (amountRemaining > 0). */
export async function listOutstandingTradesForOwner(
  core: Contract,
  owner: string
): Promise<CoreTradeView[]> {
  const lastId = BigInt((await core.lastTradeId()).toString());
  const ownerLower = owner.toLowerCase();
  const out: CoreTradeView[] = [];

  // Newest trades first — typical open trade is near lastTradeId.
  for (let id = lastId - 1n; id >= 0n; id--) {
    const trade = await fetchTrade(core, id);
    if (
      trade &&
      trade.owner.toLowerCase() === ownerLower &&
      trade.amountRemaining > 0n
    ) {
      out.push(trade);
    }
  }
  return out;
}

export async function cancelTradeOnCore(
  core: Contract,
  tradeId: bigint | number
): Promise<{ txHash: string }> {
  const tx = await core.cancelTrade(tradeId);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}

const EXECUTE_TRADES_GAS_FLOOR = 800_000n;

/** Stream/settle open trades for a Core pair queue (same as local-monitor). */
export async function executeTradesOnCore(
  core: Contract,
  pairId: string
): Promise<{ txHash: string }> {
  const runner = core.runner;
  if (!runner || !('provider' in runner) || !('sendTransaction' in runner)) {
    throw new Error('executeTradesOnCore requires a signer-connected Core contract');
  }
  const signer = runner as Signer;
  const feeData = await signer.provider!.getFeeData();

  let gasLimitEst: bigint;
  try {
    gasLimitEst = BigInt((await core.executeTrades.estimateGas(pairId)).toString());
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`executeTrades estimateGas failed: ${reason}`);
  }

  let gasLimit = gasLimitEst + gasLimitEst / 2n;
  if (gasLimit < EXECUTE_TRADES_GAS_FLOOR) {
    gasLimit = EXECUTE_TRADES_GAS_FLOOR;
  }

  const maxFeePerGas =
    feeData.maxFeePerGas ?? feeData.gasPrice ?? 50_000_000_000n;
  const maxPriorityFeePerGas =
    feeData.maxPriorityFeePerGas ?? maxFeePerGas / 2n;

  const tx = await core.executeTrades(pairId, {
    gasLimit,
    maxFeePerGas,
    maxPriorityFeePerGas,
  });
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}
