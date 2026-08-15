#!/usr/bin/env tsx
import 'dotenv/config';
import {
  Contract,
  formatUnits,
  JsonRpcProvider,
  MaxUint256,
  Wallet,
  type Provider,
  type Signer,
} from 'ethers';
import { createProvider } from './src/chain/provider.js';
import { createBotWallet } from './src/chain/wallet.js';
import { ERC20_ABI } from './src/chain/contracts.js';
import { LIQUIFIER_ABI, PERMIT2, type TokenInput } from './src/chain/liquifier.js';
import { loadBotConfig } from './src/config/loadBot.js';
import { BASE_TOKEN_DECIMALS, baseTokenFromAddress } from './src/config/baseTokens.js';
import { buildSweepAllowlist } from './src/ops/sweepAllowlist.js';
import {
  buildRoute,
  ensurePermit2Approval,
  getNextPermit2Nonce,
  omitTokenList,
  primaryBaseOutput,
  signPermit2Batch,
} from './src/ops/liquifySweep.js';
import { prepareForkLiquifyEnvironment } from './src/ops/forkLiquifySetup.js';

interface CliOptions {
  botId: string;
  rpcUrl?: string;
  execute: boolean;
  slippageBps?: number;
  deadlineSeconds: number;
  tokenFilter: Set<string> | null;
  maxInputs?: number;
  walletOnly: boolean;
}

interface RoutedBalance {
  token: string;
  symbol: string;
  decimals: number;
  amount: bigint;
  quotedOut: bigint;
  input: TokenInput;
}

type PlannedInput = TokenInput & { __quotedOut: bigint };

interface WalletSnapshot {
  nativeEth: bigint;
  outputToken: bigint;
  inputs: Array<{
    token: string;
    symbol: string;
    decimals: number;
    balance: bigint;
  }>;
}

interface LiquifyRunResult {
  simulated: boolean;
  executed: boolean;
  txHash?: string;
  blockNumber?: number;
  gasUsed?: bigint;
  quotedOut: bigint;
  minTotalOut: bigint;
}

/** Known dust tokens currently held by the alpha bot wallet. */
const ALPHA_WALLET_TOKENS = [
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
  '0x0f5d2fb29fb7d3cfee444a200298f468908cc942', // MANA
  '0x95ad61b0a150d79219dcf64e1e6cc01f0b64c4ce', // SHIB
  '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
  '0xf57e7e7c23978c3caec3c3548e3d615c346e79ff', // IMX (per pair file)
  '0x57e114b691db790c35207b2e685d4a43181e6061', // ENA (per pair file)
  '0xa2cd3d43c775978a96bdbf12d733d5a1ed94fb18', // XCN
  '0xe53ec727dbdeb9e2d5456c3be40cff031ab40a55', // SUPER
  '0xbe9895146f7af43049ca1c1ae358b0541ea49704', // cbETH
  '0xe28b3b32b6c345a34ff64674606124dd5aceca30', // INJ
  '0x467bccd9d29f223bce8043b84e8c8b282827790f', // TEL
  '0xd1d2eb1b1e90b638588728b4130137d262c87cae', // GALA
] as const;

function parseArgs(argv: string[]): CliOptions {
  const getValue = (name: string): string | undefined =>
    argv.find((arg) => arg.startsWith(`${name}=`))?.slice(name.length + 1);

  const botId = getValue('--bot') ?? process.env.BOT_ID ?? 'alpha';
  const rpcUrl = getValue('--rpc') ?? process.env.FORK_RPC_URL;
  const execute = argv.includes('--execute');
  const slippageRaw = getValue('--slippage-bps');
  const slippageBps = slippageRaw ? Number(slippageRaw) : undefined;
  if (slippageRaw && (!Number.isInteger(slippageBps) || slippageBps < 0 || slippageBps > 10_000)) {
    throw new Error('--slippage-bps must be an integer between 0 and 10000');
  }

  const deadlineRaw = getValue('--deadline-seconds') ?? '1800';
  const deadlineSeconds = Number(deadlineRaw);
  if (!Number.isInteger(deadlineSeconds) || deadlineSeconds <= 0) {
    throw new Error('--deadline-seconds must be a positive integer');
  }

  const maxInputsRaw = getValue('--max-inputs');
  const maxInputs = maxInputsRaw ? Number(maxInputsRaw) : undefined;
  if (maxInputsRaw && (!Number.isInteger(maxInputs) || maxInputs <= 0)) {
    throw new Error('--max-inputs must be a positive integer');
  }

  const tokenCsv = getValue('--tokens');
  const tokenFilter = tokenCsv
    ? new Set(
        tokenCsv
          .split(',')
          .map((token) => token.trim().toLowerCase())
          .filter(Boolean)
      )
    : null;

  return {
    botId,
    rpcUrl,
    execute,
    slippageBps,
    deadlineSeconds,
    tokenFilter,
    maxInputs,
    walletOnly: argv.includes('--wallet-only'),
  };
}

async function getTokenMeta(
  provider: Provider,
  token: string
): Promise<{ symbol: string; decimals: number }> {
  const erc20 = new Contract(token, ERC20_ABI, provider);
  let symbol = token.slice(0, 6);
  let decimals = 18;
  try {
    symbol = await erc20.symbol();
  } catch {
    /* keep fallback */
  }
  try {
    decimals = Number(await erc20.decimals());
  } catch {
    /* keep fallback */
  }
  return { symbol, decimals };
}

async function hasSufficientPermit2Approval(
  provider: Provider,
  owner: string,
  token: string
): Promise<boolean> {
  const erc20 = new Contract(token, ERC20_ABI, provider);
  const allowance = BigInt((await erc20.allowance(owner, PERMIT2)).toString());
  return allowance >= MaxUint256 / 2n;
}

async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`${label} timed out after ${ms}ms`)),
          ms
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function collectRoutedBalances(
  provider: Provider,
  owner: string,
  outputToken: string,
  allowlist: string[]
): Promise<{ routed: RoutedBalance[]; skipped: string[] }> {
  const routed: RoutedBalance[] = [];
  const skipped: string[] = [];
  const total = allowlist.length;
  let withBalance = 0;

  console.log(`scanning ${total} allowlisted tokens for balances + routes...`);

  for (let i = 0; i < allowlist.length; i++) {
    const token = allowlist[i]!;
    const progress = `[${i + 1}/${total}]`;

    if (i === 0 || (i + 1) % 10 === 0 || i + 1 === total) {
      console.log(`${progress} checked ${i + 1}, balances found ${withBalance}, routable ${routed.length}`);
    }

    const erc20 = new Contract(token, ERC20_ABI, provider);
    let amount: bigint;
    try {
      amount = BigInt(
        (await withTimeout(
          erc20.balanceOf(owner),
          15_000,
          `balanceOf(${token})`
        )).toString()
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      skipped.push(`${token}: balanceOf failed (${reason})`);
      continue;
    }
    if (amount <= 0n) continue;

    withBalance += 1;
    console.log(`${progress} balance ${token} = ${amount.toString()} — quoting...`);

    let route: Awaited<ReturnType<typeof buildRoute>>;
    try {
      route = await withTimeout(
        buildRoute(provider, token, amount, outputToken),
        10_000,
        `buildRoute(${token})`
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      skipped.push(`${token}: route failed (${reason})`);
      continue;
    }

    if (!route) {
      skipped.push(`${token}: no route`);
      continue;
    }

    const { symbol, decimals } = await getTokenMeta(provider, token);
    routed.push({
      token,
      symbol,
      decimals,
      amount,
      quotedOut: route.quotedOut,
      input: route.input,
    });
    console.log(
      `${progress} routable ${symbol} => ${formatUnits(route.quotedOut, 18)} WETH`
    );
  }

  routed.sort((a, b) => (a.quotedOut === b.quotedOut ? 0 : a.quotedOut > b.quotedOut ? -1 : 1));
  console.log(
    `scan complete: ${withBalance} with balance, ${routed.length} routable, ${skipped.length} skipped`
  );
  return { routed, skipped };
}

function isLocalForkRpc(rpcUrl: string | undefined): boolean {
  if (!rpcUrl) return false;
  try {
    const host = new URL(rpcUrl).hostname;
    return host === '127.0.0.1' || host === 'localhost' || host === '0.0.0.0';
  } catch {
    return false;
  }
}

const FORK_FUND_WEI = 1000n * 10n ** 18n;

/** Set native ETH on a local fork (anvil / hardhat). Verifies balance actually changed. */
async function setForkBalance(
  provider: JsonRpcProvider,
  address: string,
  wei: bigint
): Promise<void> {
  const hex = `0x${wei.toString(16)}`;
  const before = await provider.getBalance(address);
  const methods = ['anvil_setBalance', 'hardhat_setBalance'] as const;
  let lastError: string | undefined;

  for (const method of methods) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await provider.send(method, [address, hex]);
        await new Promise((r) => setTimeout(r, 50 * (attempt + 1)));
        const after = await provider.getBalance(address);
        if (after >= wei / 2n || after > before + 10n ** 17n) return;
        lastError = `${method} returned ok but balance is ${after}`;
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }
  }

  // Fallback: transfer from Anvil's default funded account.
  try {
    const rich = new Wallet(
      '0xac0974bec39a17e36ba4a6b4d55bf438e4ab885aaee9ad0aaee9ad0aaee9ad0aaee9ad0',
      provider
    );
    const tx = await rich.sendTransaction({ to: address, value: wei });
    await tx.wait();
    const after = await provider.getBalance(address);
    if (after >= wei / 2n || after > before + 10n ** 17n) return;
    lastError = `anvil rich-account transfer left balance ${after}`;
  } catch (err) {
    lastError = err instanceof Error ? err.message : String(err);
  }

  throw new Error(
    `Could not fund fork wallet ${address} — tried ${methods.join(', ')} and rich-account transfer. ${lastError ?? ''}`
  );
}

async function ensureForkFunding(
  provider: JsonRpcProvider,
  address: string,
  rpcUrl: string | undefined
): Promise<void> {
  if (!isLocalForkRpc(rpcUrl)) return;
  const before = await provider.getBalance(address);
  if (before >= 10n ** 18n) {
    console.log(`fork wallet ETH: ${formatUnits(before, 18)} (sufficient for gas)`);
    return;
  }
  console.log(`fork wallet ETH: ${formatUnits(before, 18)} — funding for gas...`);
  await setForkBalance(provider, address, FORK_FUND_WEI);
  const after = await provider.getBalance(address);
  console.log(`funded fork wallet ${address} → ${formatUnits(after, 18)} ETH`);
}

function describePath(input: TokenInput): string {
  if (input.v3Path !== '0x') return `v3:${input.v3Path}`;
  if (input.v2Path.length) return `v2:${input.v2Path.join(' -> ')}`;
  return 'none';
}

async function snapshotWallet(
  provider: Provider,
  owner: string,
  outputToken: string,
  chosen: RoutedBalance[]
): Promise<WalletSnapshot> {
  const outputErc20 = new Contract(outputToken, ERC20_ABI, provider);
  const inputs: WalletSnapshot['inputs'] = [];
  for (const row of chosen) {
    const erc20 = new Contract(row.token, ERC20_ABI, provider);
    inputs.push({
      token: row.token,
      symbol: row.symbol,
      decimals: row.decimals,
      balance: BigInt((await erc20.balanceOf(owner)).toString()),
    });
  }
  return {
    nativeEth: await provider.getBalance(owner),
    outputToken: BigInt((await outputErc20.balanceOf(owner)).toString()),
    inputs,
  };
}


function printSettlementReport(
  before: WalletSnapshot,
  after: WalletSnapshot,
  result: LiquifyRunResult,
  outputLabel: string,
  outputDecimals: number,
  chosen: RoutedBalance[]
): void {
  const outDelta = after.outputToken - before.outputToken;
  console.log('\n── LIQUIFY SETTLEMENT ──');
  if (result.executed && result.txHash) {
    console.log(`status: mined on fork`);
    console.log(`tx:     ${result.txHash}`);
    if (result.blockNumber != null) {
      console.log(`block:  ${result.blockNumber}`);
    }
    if (result.gasUsed != null) {
      console.log(`gas:    ${result.gasUsed.toString()}`);
    }
  } else {
    console.log(`status: simulation only (no on-chain balance changes)`);
  }

  console.log(
    `${outputLabel} received: ${formatUnits(outDelta, outputDecimals)} ${outputLabel}` +
      ` (wallet ${formatUnits(before.outputToken, outputDecimals)} → ${formatUnits(after.outputToken, outputDecimals)})`
  );
  console.log(
    `quoted gross: ${formatUnits(result.quotedOut, outputDecimals)} ${outputLabel} | ` +
      `min required: ${formatUnits(result.minTotalOut, outputDecimals)} ${outputLabel}`
  );
  if (result.executed) {
    const ok = outDelta >= result.minTotalOut;
    console.log(
      ok
        ? `slippage check: passed (received ≥ minTotalOut)`
        : `slippage check: FAILED (received ${formatUnits(outDelta, outputDecimals)} < min ${formatUnits(result.minTotalOut, outputDecimals)})`
    );
  }

  console.log('\nPer-token input balances:');
  let swept = 0;
  let partial = 0;
  let unchanged = 0;
  for (const row of chosen) {
    const b = before.inputs.find((x) => x.token.toLowerCase() === row.token.toLowerCase());
    const a = after.inputs.find((x) => x.token.toLowerCase() === row.token.toLowerCase());
    if (!b || !a) continue;

    const consumed = b.balance - a.balance;
    let status: string;
    if (a.balance === 0n && b.balance > 0n) {
      status = 'swept';
      swept += 1;
    } else if (consumed > 0n && a.balance > 0n) {
      status = 'partial';
      partial += 1;
    } else if (consumed === 0n && b.balance > 0n) {
      status = 'unchanged';
      unchanged += 1;
    } else {
      status = 'empty';
    }

    const quoted = formatUnits(row.quotedOut, outputDecimals);
    console.log(
      `  ${row.symbol.padEnd(6)} ${formatUnits(b.balance, row.decimals).padStart(14)} → ${formatUnits(a.balance, row.decimals).padEnd(14)}` +
        ` [${status}]  (quoted ≈ ${quoted} ${outputLabel})`
    );
  }

  console.log(
    `\nSummary: ${swept} fully swept, ${partial} partial, ${unchanged} unchanged (of ${chosen.length} inputs)`
  );
  if (result.executed && swept === 0 && unchanged === chosen.length && chosen.length > 0) {
    console.log(
      `⚠ No input balances changed despite a mined tx — check Liquifier deployment on this fork/RPC.`
    );
  }
  if (result.executed) {
    console.log(
      `Note: this ran on a local mainnet fork — mainnet wallet balances are unchanged until you broadcast on mainnet.`
    );
  }
}

async function assertLiquifierDeployed(
  provider: Provider,
  liquifierAddress: string
): Promise<void> {
  const code = await provider.getCode(liquifierAddress);
  if (code.length <= 2) {
    throw new Error(
      `Liquifier has no bytecode at ${liquifierAddress} on this RPC.\n` +
        `Your fork is likely pinned to a block before LiquifierV1 was deployed, or anvil is not forking mainnet.\n` +
        `Restart with a fresh mainnet fork, e.g. from repo root:\n` +
        `  npm run anvil:fork\n` +
        `Then re-run liquify:fork against http://127.0.0.1:8545.`
    );
  }
}

async function simulateOrExecute(
  provider: JsonRpcProvider,
  signer: Signer,
  inputs: PlannedInput[],
  outputToken: string,
  slippageBps: number,
  deadlineSeconds: number,
  botId: string,
  execute: boolean,
  rpcUrl: string | undefined
): Promise<LiquifyRunResult> {
  const bot = loadBotConfig(botId);
  const owner = await signer.getAddress();
  await assertLiquifierDeployed(provider, bot.liquify.contract);
  if (execute) {
    await ensureForkFunding(provider, owner, rpcUrl);
  }
  const latest = await provider.getBlock('latest');
  if (!latest) throw new Error('Failed to fetch latest block');

  const quotedOut = inputs.reduce((sum, input) => sum + input.__quotedOut, 0n);
  const minTotalOut = (quotedOut * BigInt(10_000 - slippageBps)) / 10_000n;
  const deadline = BigInt(latest.timestamp + deadlineSeconds);
  const nonce = await getNextPermit2Nonce(provider, owner);
  const payloadInputs: TokenInput[] = inputs.map((input) => ({
    token: input.token,
    amount: input.amount,
    v3Path: input.v3Path,
    v2Path: input.v2Path,
  }));

  for (const input of payloadInputs) {
    const approved = await hasSufficientPermit2Approval(provider, owner, input.token);
    if (approved) continue;
    if (!execute) {
      throw new Error(
        `Permit2 approval missing for ${input.token}. Re-run on the fork with --execute to auto-approve.`
      );
    }
    console.log(`approving Permit2 for ${input.token}...`);
    await ensurePermit2Approval(input.token, owner, signer);
  }

  console.log('signing Permit2 batch (EIP-712, no on-chain tx)...');
  const sig = await signPermit2Batch(signer, payloadInputs, nonce, deadline, bot.liquify.contract);
  const liquifier = new Contract(bot.liquify.contract, LIQUIFIER_ABI, signer);
  const omitTokens = omitTokenList(bot);

  console.log(`latest block: ${latest.number} @ ${new Date(latest.timestamp * 1000).toISOString()}`);
  console.log(`deadline: ${deadline.toString()} (${new Date(Number(deadline) * 1000).toISOString()})`);
  console.log(`permit nonce: ${nonce.toString()}`);
  console.log(`quoted total out: ${formatUnits(quotedOut, 18)}`);
  console.log(`min total out: ${formatUnits(minTotalOut, 18)}`);

  console.log(`permit signature: ${sig.slice(0, 18)}… (${sig.length} chars)`);

  await liquifier.liquify.staticCall(
    payloadInputs,
    outputToken,
    omitTokens,
    minTotalOut,
    nonce,
    deadline,
    sig
  );

  const gas = await liquifier.liquify.estimateGas(
    payloadInputs,
    outputToken,
    omitTokens,
    minTotalOut,
    nonce,
    deadline,
    sig
  );
  console.log(`estimateGas: ${gas.toString()}`);

  if (!execute) {
    return {
      simulated: true,
      executed: false,
      quotedOut,
      minTotalOut,
    };
  }

  const tx = await liquifier.liquify(
    payloadInputs,
    outputToken,
    omitTokens,
    minTotalOut,
    nonce,
    deadline,
    sig
  );
  console.log(`broadcast tx: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`mined in block ${receipt?.blockNumber ?? 'unknown'}`);

  return {
    simulated: true,
    executed: true,
    txHash: receipt?.hash ?? tx.hash,
    blockNumber: receipt?.blockNumber,
    gasUsed: receipt?.gasUsed != null ? BigInt(receipt.gasUsed) : undefined,
    quotedOut,
    minTotalOut,
  };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const bot = loadBotConfig(options.botId);
  const provider = createProvider(options.rpcUrl);
  await prepareForkLiquifyEnvironment(provider, options.rpcUrl);
  const wallet = createBotWallet(bot, provider);
  const owner = await wallet.getAddress();
  if (options.execute) {
    await ensureForkFunding(provider, owner, options.rpcUrl);
  }
  const outputToken = primaryBaseOutput(bot);
  const outputBase = baseTokenFromAddress(outputToken);
  const outputDecimals = outputBase ? BASE_TOKEN_DECIMALS[outputBase] : 18;

  const allowlist = buildSweepAllowlist(bot);
  let filteredAllowlist = options.tokenFilter
    ? [...allowlist].filter((token) => options.tokenFilter!.has(token.toLowerCase()))
    : [...allowlist];

  if (options.walletOnly) {
    const allowed = new Set(filteredAllowlist.map((t) => t.toLowerCase()));
    filteredAllowlist = ALPHA_WALLET_TOKENS.filter((token) =>
      allowed.has(token.toLowerCase())
    );
    console.log(`wallet-only mode: scanning ${filteredAllowlist.length} known holdings`);
  }

  console.log(`bot: ${bot.id}`);
  console.log(`owner: ${owner}`);
  console.log(`rpc: ${(options.rpcUrl ?? process.env.FORK_RPC_URL ?? process.env.MAINNET_RPC_URL ?? '').slice(0, 80)}`);
  console.log(`output token: ${outputToken}`);
  console.log(`allowlist size: ${filteredAllowlist.length}`);

  const { routed, skipped } = await collectRoutedBalances(
    provider,
    owner,
    outputToken,
    filteredAllowlist
  );

  if (!routed.length) {
    console.log('No routed balances found.');
    if (skipped.length) {
      console.log('Skipped:');
      for (const item of skipped) console.log(`  - ${item}`);
    }
    return;
  }

  const chosen = options.maxInputs ? routed.slice(0, options.maxInputs) : routed;
  const quotedOut = chosen.reduce((sum, item) => sum + item.quotedOut, 0n);
  console.log(`routable inputs: ${routed.length}`);
  if (options.maxInputs && routed.length > chosen.length) {
    console.log(`capped to top ${chosen.length} by --max-inputs=${options.maxInputs}`);
  }
  console.log(`chosen inputs: ${chosen.length}`);
  for (const item of chosen) {
    console.log(
      `  - ${item.symbol} ${formatUnits(item.amount, item.decimals)} => quote ${formatUnits(item.quotedOut, outputDecimals)} via ${describePath(item.input)}`
    );
  }
  console.log(`quoted total: ${formatUnits(quotedOut, outputDecimals)}`);

  const inputs = chosen.map((item) =>
    Object.assign({}, item.input, { __quotedOut: item.quotedOut })
  ) as PlannedInput[];

  const outputLabel = outputBase ?? 'WETH';
  const beforeSnapshot = await snapshotWallet(provider, owner, outputToken, chosen);

  try {
    const result = await simulateOrExecute(
      provider,
      wallet,
      inputs,
      outputToken,
      options.slippageBps ?? bot.liquify.slippageBps,
      options.deadlineSeconds,
      bot.id,
      options.execute,
      options.rpcUrl
    );
    const afterSnapshot = await snapshotWallet(provider, owner, outputToken, chosen);
    printSettlementReport(
      beforeSnapshot,
      afterSnapshot,
      result,
      outputLabel,
      outputDecimals,
      chosen
    );
    console.log(
      options.execute ? '\nBroadcast completed.' : '\nSimulation passed (re-run with --execute to sweep on fork).'
    );
  } catch (error) {
    console.error('Liquify simulation failed:');
    console.error(error instanceof Error ? error.message : error);
    if (skipped.length) {
      console.error('Skipped tokens:');
      for (const item of skipped) console.error(`  - ${item}`);
    }
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.stack ?? error.message : error);
  process.exit(1);
});
