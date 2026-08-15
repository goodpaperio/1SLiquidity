import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { readFileSync } from 'node:fs';
import type { JsonRpcProvider } from 'ethers';
import { PERMIT2 } from '../chain/liquifier.js';

const LIQUIFIER_PROXY = '0xce9f5d7D17C92Ba1bBCe770FfddE8C92Ed5Baf95';
const IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

function isLocalForkRpc(rpcUrl: string | undefined): boolean {
  if (!rpcUrl) return false;
  return /127\.0\.0\.1|localhost|:8545\b/.test(rpcUrl);
}

async function isAnvil(provider: JsonRpcProvider): Promise<boolean> {
  try {
    await provider.send('anvil_impersonateAccount', [
      '0x0000000000000000000000000000000000000001',
    ]);
    await provider.send('anvil_stopImpersonatingAccount', [
      '0x0000000000000000000000000000000000000001',
    ]);
    return true;
  } catch {
    return false;
  }
}

function mockPermit2Bytecode(): string {
  const splitterRoot = process.env.SPLITTER_CONTRACTS_DIR ?? path.join(process.env.HOME ?? '', 'code/splittter/contracts');
  const artifact = path.join(splitterRoot, 'out/MockPermit2.sol/MockPermit2.json');
  const json = JSON.parse(readFileSync(artifact, 'utf8')) as {
    deployedBytecode: { object: string };
  };
  return json.deployedBytecode.object;
}

async function readImplementation(provider: JsonRpcProvider): Promise<string> {
  const raw = await provider.getStorage(LIQUIFIER_PROXY, IMPLEMENTATION_SLOT);
  return ('0x' + raw.slice(-40)).toLowerCase();
}

/** Upgrade Liquifier proxy to the Permit2-spender fix on a local Anvil fork. */
export async function ensureForkLiquifierUpgrade(
  provider: JsonRpcProvider,
  rpcUrl: string | undefined
): Promise<void> {
  if (!isLocalForkRpc(rpcUrl)) return;
  if (!(await isAnvil(provider))) return;

  const impl = await readImplementation(provider);
  // Re-upgrade when the proxy still points at a pre-fix implementation (no spender in Permit2 struct).
  const BROKEN_IMPLS = new Set([
    '0x4c6030492946e70f4721fc6e3d9e6614192ad9e4', // original mainnet
    '0xf5aeb89442f4e5af6565572a4a35253a0fa44fe9', // upgraded without spender fix
  ].map((a) => a.toLowerCase()));
  if (!BROKEN_IMPLS.has(impl.toLowerCase())) {
    console.log(`fork: Liquifier implementation looks fixed (${impl})`);
    return;
  }

  console.log('fork: upgrading LiquifierV1 proxy to Permit2-spender fix...');
  const script = path.join(process.cwd(), 'scripts/upgrade-liquifier-fork.sh');
  execFileSync(script, [rpcUrl ?? 'http://127.0.0.1:8545'], { stdio: 'inherit' });
}

/** Replace canonical Permit2 with a fork stub that pulls via existing ERC20 approvals. */
export async function ensureForkPermit2Mock(
  provider: JsonRpcProvider,
  rpcUrl: string | undefined
): Promise<void> {
  if (!isLocalForkRpc(rpcUrl)) return;
  if (!(await isAnvil(provider))) return;

  const impl = await readImplementation(provider);
  const BROKEN_IMPLS = new Set([
    '0x4c6030492946e70f4721fc6e3d9e6614192ad9e4',
    '0xf5aeb89442f4e5af6565572a4a35253a0fa44fe9',
  ].map((a) => a.toLowerCase()));
  if (!BROKEN_IMPLS.has(impl.toLowerCase())) {
    console.log(`fork: Liquifier already fixed (${impl}) — using real Permit2`);
    return;
  }

  const bytecode = mockPermit2Bytecode();
  const existing = await provider.getCode(PERMIT2);
  if (existing.toLowerCase() === bytecode.toLowerCase()) {
    console.log('fork: Permit2 mock already installed');
    return;
  }

  await provider.send('anvil_setCode', [PERMIT2, bytecode]);
  console.log('fork: installed Permit2 mock (signature verification skipped on fork)');
}

export async function prepareForkLiquifyEnvironment(
  provider: JsonRpcProvider,
  rpcUrl: string | undefined
): Promise<void> {
  if (!isLocalForkRpc(rpcUrl)) return;
  if (!(await isAnvil(provider))) return;
  await ensureForkLiquifierUpgrade(provider, rpcUrl);
  await ensureForkPermit2Mock(provider, rpcUrl);
}
