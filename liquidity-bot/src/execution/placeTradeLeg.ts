import { AbiCoder, Contract, type Signer } from 'ethers';
import { CORE_ABI } from '../chain/contracts.js';
import { ensureAllowance } from '../chain/erc20.js';
import type { BotConfig } from '../config/schema.js';

const coder = AbiCoder.defaultAbiCoder();

export function encodePlaceTradeData(params: {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  amountOutMin: bigint;
  isInstasettlable: boolean;
  usePriceBased: boolean;
  instasettleBps: number;
  onlyInstasettle: boolean;
}): string {
  return coder.encode(
    [
      'address',
      'address',
      'uint256',
      'uint256',
      'bool',
      'bool',
      'uint256',
      'bool',
    ],
    [
      params.tokenIn,
      params.tokenOut,
      params.amountIn,
      params.amountOutMin,
      params.isInstasettlable,
      params.usePriceBased,
      params.instasettleBps,
      params.onlyInstasettle,
    ]
  );
}

/**
 * Leg 2: sell alt → base through Core / DecaStream (v2.2.1).
 */
export async function placeTradeOnCore(
  bot: BotConfig,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  amountOutMin: bigint,
  signer: Signer
): Promise<{ txHash: string }> {
  const owner = await signer.getAddress();
  await ensureAllowance(
    tokenIn,
    owner,
    bot.contracts.core,
    amountIn,
    signer
  );

  const tradeData = encodePlaceTradeData({
    tokenIn,
    tokenOut,
    amountIn,
    amountOutMin,
    isInstasettlable: bot.trade.isInstasettlable,
    usePriceBased: bot.trade.usePriceBased,
    instasettleBps: bot.trade.instasettleBps,
    onlyInstasettle: false,
  });

  const core = new Contract(bot.contracts.core, CORE_ABI, signer);
  const tx = await core.placeTrade(tradeData);
  const receipt = await tx.wait();
  return { txHash: receipt.hash };
}
