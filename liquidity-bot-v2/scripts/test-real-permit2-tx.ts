import 'dotenv/config';
import { createRequire } from 'node:module';
import { Contract, JsonRpcProvider } from 'ethers';
import { loadBotConfig } from '../src/config/loadBot.js';
import { createBotWallet } from '../src/chain/wallet.js';
import { PERMIT2 } from '../src/chain/liquifier.js';
import {
  buildRoute,
  ensurePermit2Approval,
  getNextPermit2Nonce,
  primaryBaseOutput,
} from '../src/ops/liquifySweep.js';

const require = createRequire(import.meta.url);
const { SignatureTransfer } = require('@uniswap/permit2-sdk');

async function main(): Promise<void> {
  const provider = new JsonRpcProvider('http://127.0.0.1:8545', 1, {
    staticNetwork: true,
  });
  const bot = loadBotConfig('alpha');
  const wallet = createBotWallet(bot, provider);
  const TOKEN = process.argv[2] ?? '0xe53ec727dbdeb9e2d5456c3be40cff031ab40a55';
  const owner = await wallet.getAddress();
  const spender = bot.liquify.contract;
  const erc20 = new Contract(TOKEN, ['function balanceOf(address) view returns (uint256)'], provider);
  const amount = BigInt((await erc20.balanceOf(owner)).toString());
  if (amount === 0n) throw new Error('no balance');

  const outputToken = primaryBaseOutput(bot);
  const route = await buildRoute(provider, TOKEN, amount, outputToken);
  if (!route) throw new Error('no route');

  await ensurePermit2Approval(TOKEN, owner, wallet);
  const latest = await provider.getBlock('latest');
  const deadline = BigInt(latest!.timestamp + 1800);
  const nonce = await getNextPermit2Nonce(provider, owner);

  const permit = {
    permitted: [{ token: TOKEN, amount: amount.toString() }],
    spender,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
  };
  const { domain, types, values } = SignatureTransfer.getPermitData(permit, PERMIT2, 1);
  const sig = await wallet.signTypedData(domain, types, values);

  const abi = [
    'function permitBatchTransferFrom((tuple(address token,uint256 amount)[] permitted,address spender,uint256 nonce,uint256 deadline) permit,(address to,uint256 requestedAmount)[] transferDetails,address owner,bytes signature) external',
  ];
  const permit2 = new Contract(PERMIT2, abi, wallet);
  const tx = await permit2.permitBatchTransferFrom(
    {
      permitted: [{ token: TOKEN, amount }],
      spender,
      nonce,
      deadline,
    },
    [{ to: spender, requestedAmount: amount }],
    owner,
    sig
  );
  const rc = await tx.wait();
  console.log('permit2 tx mined', rc?.hash, 'status', rc?.status);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
