import { Contract, type Signer } from 'ethers';
import {
  SUSHISWAP_ROUTER,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_ABI,
  UNISWAP_V3_SWAP_ROUTER,
  UNISWAP_V3_SWAP_ROUTER_ABI,
} from '../chain/contracts.js';
import { ensureAllowance } from '../chain/erc20.js';
import {
  TX_SEND_TIMEOUT_MS,
  TX_WAIT_TIMEOUT_MS,
  waitForTx,
  withTimeout,
} from '../chain/txTimeout.js';
import { feeTierFromDexId } from '../scan/dexQuoteUtils.js';
import type { StreamDexId } from '../scan/types.js';

const SWAP_DEADLINE_SEC = 20 * 60;

function routerForDex(dex: StreamDexId): string {
  if (dex === 'sushiswap') return SUSHISWAP_ROUTER;
  if (dex === 'uniswap-v2') return UNISWAP_V2_ROUTER;
  if (dex.startsWith('uniswap-v3-')) return UNISWAP_V3_SWAP_ROUTER;
  throw new Error(`No router for DEX ${dex}`);
}

/**
 * Leg 1: direct router swap base → alt on the candidate (thin) pool.
 */
export async function swapExactOnCandidateDex(
  dex: StreamDexId,
  tokenIn: string,
  tokenOut: string,
  amountIn: bigint,
  amountOutMin: bigint,
  recipient: string,
  signer: Signer
): Promise<{ txHash: string }> {
  const routerAddress = routerForDex(dex);
  const owner = await signer.getAddress();
  await ensureAllowance(
    tokenIn,
    owner,
    routerAddress,
    amountIn,
    signer
  );

  const deadline = BigInt(Math.floor(Date.now() / 1000) + SWAP_DEADLINE_SEC);

  if (dex === 'uniswap-v2' || dex === 'sushiswap') {
    const router = new Contract(
      routerAddress,
      UNISWAP_V2_ROUTER_ABI,
      signer
    );
    const tx = await withTimeout(
      router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenIn, tokenOut],
        recipient,
        deadline
      ),
      TX_SEND_TIMEOUT_MS,
      `swapExactTokensForTokens(${dex})`
    );
    const receipt = await waitForTx<{ hash: string }>(tx, TX_WAIT_TIMEOUT_MS);
    return { txHash: receipt.hash };
  }

  const fee = feeTierFromDexId(dex);
  if (fee === null) {
    throw new Error(`Invalid V3 DEX id: ${dex}`);
  }

  const router = new Contract(
    UNISWAP_V3_SWAP_ROUTER,
    UNISWAP_V3_SWAP_ROUTER_ABI,
    signer
  );
  const tx = await withTimeout(
    router.exactInputSingle({
      tokenIn,
      tokenOut,
      fee,
      recipient,
      deadline,
      amountIn,
      amountOutMinimum: amountOutMin,
      sqrtPriceLimitX96: 0,
    }),
    TX_SEND_TIMEOUT_MS,
    `exactInputSingle(${dex})`
  );
  const receipt = await waitForTx<{ hash: string }>(tx, TX_WAIT_TIMEOUT_MS);
  return { txHash: receipt.hash };
}
