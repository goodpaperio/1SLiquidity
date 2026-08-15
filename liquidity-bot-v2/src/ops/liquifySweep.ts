import {
  Contract,
  MaxUint256,
  ZeroAddress,
  concat,
  getAddress,
  getBytes,
  toBeHex,
  type Provider,
  type Signer,
} from 'ethers';
import {
  BASE_TOKEN_ADDRESSES,
  type BaseTokenSymbol,
} from '../config/baseTokens.js';
import type { BotConfig } from '../config/schema.js';
import {
  ERC20_ABI,
  UNISWAP_V2_ROUTER,
  UNISWAP_V2_ROUTER_ABI,
} from '../chain/contracts.js';
import {
  LIQUIFIER_ABI,
  LIQUIFIER_V1,
  PERMIT2,
  PERMIT2_NONCE_ABI,
  UNISWAP_V3_QUOTER_V1,
  UNISWAP_V3_QUOTER_V1_ABI,
  type TokenInput,
} from '../chain/liquifier.js';
import { isDryRun } from '../chain/wallet.js';
import { buildSweepAllowlist } from './sweepAllowlist.js';

const MAX_INPUTS_PER_CALL = 50;
const V3_FEES = [3000, 500, 10000, 100] as const;
const WETH = BASE_TOKEN_ADDRESSES.WETH;

export interface LiquifySweepResult {
  dryRun: boolean;
  tokensAttempted: number;
  batches: number;
  txHashes: string[];
  skipped: string[];
  message: string;
}

function encodeV3Path(tokenIn: string, fee: number, tokenOut: string): string {
  return concat([
    getBytes(tokenIn),
    toBeHex(fee, 3),
    getBytes(tokenOut),
  ]);
}

async function quoteV3(
  provider: Provider,
  path: string,
  amountIn: bigint
): Promise<bigint | null> {
  if (path === '0x' || amountIn <= 0n) return null;
  const quoter = new Contract(
    UNISWAP_V3_QUOTER_V1,
    UNISWAP_V3_QUOTER_V1_ABI,
    provider
  );
  try {
    const out = await quoter.quoteExactInput.staticCall(path, amountIn);
    return BigInt(out.toString());
  } catch {
    return null;
  }
}

async function quoteV2(
  provider: Provider,
  path: string[],
  amountIn: bigint
): Promise<bigint | null> {
  if (path.length < 2 || amountIn <= 0n) return null;
  const router = new Contract(
    UNISWAP_V2_ROUTER,
    UNISWAP_V2_ROUTER_ABI,
    provider
  );
  try {
    const amounts = await router.getAmountsOut.staticCall(amountIn, path);
    return BigInt(amounts[amounts.length - 1].toString());
  } catch {
    return null;
  }
}

export async function buildRoute(
  provider: Provider,
  token: string,
  amount: bigint,
  outputToken: string
): Promise<{ input: TokenInput; quotedOut: bigint } | null> {
  let bestPath = '0x';
  let bestQuote = 0n;

  for (const fee of V3_FEES) {
    const direct = encodeV3Path(token, fee, outputToken);
    const q = await quoteV3(provider, direct, amount);
    if (q != null && q > bestQuote) {
      bestQuote = q;
      bestPath = direct;
    }
  }

  if (outputToken.toLowerCase() !== WETH.toLowerCase()) {
    for (const fee of V3_FEES) {
      const hop = concat([
        getBytes(token),
        toBeHex(fee, 3),
        getBytes(WETH),
        toBeHex(500, 3),
        getBytes(outputToken),
      ]);
      const q = await quoteV3(provider, hop, amount);
      if (q != null && q > bestQuote) {
        bestQuote = q;
        bestPath = hop;
      }
    }
  }

  const v2Hop =
    outputToken.toLowerCase() === WETH.toLowerCase()
      ? [token, WETH]
      : [token, WETH, outputToken];
  if (bestQuote === 0n) {
    const v2q = await quoteV2(provider, [token, outputToken], amount);
    if (v2q != null && v2q > 0n) {
      bestQuote = v2q;
      bestPath = '0x';
      return {
        input: { token, amount, v3Path: '0x', v2Path: [token, outputToken] },
        quotedOut: bestQuote,
      };
    }
    const v2hop = await quoteV2(provider, v2Hop, amount);
    if (v2hop != null && v2hop > 0n) {
      bestQuote = v2hop;
      return {
        input: { token, amount, v3Path: '0x', v2Path: v2Hop },
        quotedOut: bestQuote,
      };
    }
    return null;
  }

  const v2Fallback =
    outputToken.toLowerCase() === WETH.toLowerCase()
      ? [token, WETH]
      : [token, WETH, outputToken];

  // v3 route — always include v2 fallback path per LiquifierV1 integration guide.
  return {
    input: { token, amount, v3Path: bestPath, v2Path: v2Fallback },
    quotedOut: bestQuote,
  };
}

export async function getNextPermit2Nonce(
  provider: Provider,
  owner: string
): Promise<bigint> {
  const permit2 = new Contract(PERMIT2, PERMIT2_NONCE_ABI, provider);
  const bitmap = await permit2.nonceBitmap(owner, 0);
  const bm = BigInt(bitmap.toString());
  for (let i = 0n; i < 256n; i++) {
    if (((bm >> i) & 1n) === 0n) return i;
  }
  throw new Error('Permit2 nonce word 0 exhausted');
}

export async function signPermit2Batch(
  signer: Signer,
  inputs: TokenInput[],
  nonce: bigint,
  deadline: bigint,
  spender: string
): Promise<string> {
  const chainId = (await signer.provider!.getNetwork()).chainId;
  return signer.signTypedData(
    {
      name: 'Permit2',
      chainId,
      verifyingContract: PERMIT2,
    },
    {
      PermitBatchTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions[]' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
      TokenPermissions: [
        { name: 'token', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
    },
    {
      permitted: inputs.map((i) => ({
        token: getAddress(i.token),
        amount: i.amount,
      })),
      spender: getAddress(spender),
      nonce,
      deadline,
    }
  );
}

async function sendErc20Approve(
  erc20: Contract,
  spender: string,
  amount: bigint,
  signer: Signer
): Promise<void> {
  const from = await signer.getAddress();
  const nonce = await signer.provider!.getTransactionCount(from, 'latest');
  const tx = await erc20.approve(spender, amount, { nonce });
  await tx.wait();
}

export async function ensurePermit2Approval(
  token: string,
  owner: string,
  signer: Signer
): Promise<void> {
  const erc20 = new Contract(token, ERC20_ABI, signer);
  const allowance = await erc20.allowance(owner, PERMIT2);
  if (allowance >= MaxUint256 / 2n) return;
  // USDT-style tokens need reset-to-zero only when replacing a non-zero allowance.
  if (allowance > 0n) {
    try {
      await sendErc20Approve(erc20, PERMIT2, 0n, signer);
    } catch {
      /* reset not supported or unnecessary */
    }
  }
  await sendErc20Approve(erc20, PERMIT2, MaxUint256, signer);
}

export function omitTokenList(bot: BotConfig): string[] {
  const omit = new Set<string>([
    ZeroAddress,
    WETH,
    ...bot.baseTokens.map((b) => BASE_TOKEN_ADDRESSES[b as BaseTokenSymbol]),
  ]);
  return [...omit];
}

export function primaryBaseOutput(bot: BotConfig): string {
  const base = bot.baseTokens[0] ?? 'WETH';
  return BASE_TOKEN_ADDRESSES[base as BaseTokenSymbol];
}

export async function runLiquifySweep(
  bot: BotConfig,
  provider: Provider,
  signer: Signer,
  options: { slippageBps?: number; minDustUsd?: number } = {}
): Promise<LiquifySweepResult> {
  const slippageBps = options.slippageBps ?? bot.liquify.slippageBps;
  const owner = await signer.getAddress();
  const allowlist = buildSweepAllowlist(bot);
  const outputToken = primaryBaseOutput(bot);
  const skipped: string[] = [];
  const candidates: Array<{ token: string; amount: bigint }> = [];

  for (const token of allowlist) {
    const erc20 = new Contract(token, ERC20_ABI, provider);
    let balance: bigint;
    try {
      balance = BigInt((await erc20.balanceOf(owner)).toString());
    } catch {
      skipped.push(token);
      continue;
    }
    if (balance > 0n) {
      candidates.push({ token, amount: balance });
    }
  }

  if (candidates.length === 0) {
    return {
      dryRun: isDryRun(),
      tokensAttempted: 0,
      batches: 0,
      txHashes: [],
      skipped,
      message: 'No allowlisted dust tokens with balance.',
    };
  }

  const routed: Array<{ input: TokenInput; quotedOut: bigint }> = [];
  for (const c of candidates) {
    const route = await buildRoute(provider, c.token, c.amount, outputToken);
    if (!route) {
      skipped.push(c.token);
      continue;
    }
    routed.push(route);
  }

  if (routed.length === 0) {
    return {
      dryRun: isDryRun(),
      tokensAttempted: candidates.length,
      batches: 0,
      txHashes: [],
      skipped,
      message: 'No routable dust tokens (quotes failed).',
    };
  }

  if (isDryRun()) {
    const totalQuote = routed.reduce((s, r) => s + r.quotedOut, 0n);
    return {
      dryRun: true,
      tokensAttempted: routed.length,
      batches: Math.ceil(routed.length / MAX_INPUTS_PER_CALL),
      txHashes: [],
      skipped,
      message: `DRY_RUN would liquify ${routed.length} token(s) → ${outputToken}, quoted gross ≈ ${totalQuote.toString()}`,
    };
  }

  const txHashes: string[] = [];
  const batches = chunk(routed, MAX_INPUTS_PER_CALL);

  for (const batch of batches) {
    const inputs = batch.map((b) => b.input);
    let totalQuoted = batch.reduce((s, b) => s + b.quotedOut, 0n);
    const minTotalOut = (totalQuoted * BigInt(10_000 - slippageBps)) / 10_000n;

    for (const inp of inputs) {
      await ensurePermit2Approval(inp.token, owner, signer);
    }

    const latest = await provider.getBlock('latest');
    if (!latest) throw new Error('Failed to fetch latest block for liquify deadline');
    const nonce = await getNextPermit2Nonce(provider, owner);
    const deadline = BigInt(latest.timestamp + 30 * 60);
    const sig = await signPermit2Batch(signer, inputs, nonce, deadline, bot.liquify.contract);

    const liquifier = new Contract(LIQUIFIER_V1, LIQUIFIER_ABI, signer);
    const tx = await liquifier.liquify(
      inputs,
      outputToken,
      omitTokenList(bot),
      minTotalOut,
      nonce,
      deadline,
      sig
    );
    const receipt = await tx.wait();
    txHashes.push(receipt.hash);
  }

  return {
    dryRun: false,
    tokensAttempted: routed.length,
    batches: batches.length,
    txHashes,
    skipped,
    message: `Liquified ${routed.length} token(s) in ${batches.length} batch(es).`,
  };
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export function shouldRunDailySweep(
  dailySweepHourUtc: number,
  lastDustSweepDate: string | undefined,
  now: Date = new Date()
): boolean {
  const today = utcDateLabel(now);
  if (lastDustSweepDate === today) return false;
  // Only during the configured UTC hour (e.g. 11:00–11:59).
  return now.getUTCHours() === dailySweepHourUtc;
}

/** Milliseconds until the next occurrence of `hourUtc:00` UTC. */
export function msUntilNextSweepUtcHour(
  hourUtc: number,
  now: Date = new Date()
): number {
  const next = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      hourUtc,
      0,
      0,
      0
    )
  );
  if (now.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - now.getTime();
}

export function utcDateLabel(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}
