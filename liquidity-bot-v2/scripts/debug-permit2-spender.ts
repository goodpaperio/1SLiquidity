import 'dotenv/config';
import { createRequire } from 'node:module';
import { Contract, JsonRpcProvider, Interface } from 'ethers';
import { loadBotConfig } from '../src/config/loadBot.js';
import { createBotWallet } from '../src/chain/wallet.js';
import { LIQUIFIER_ABI, PERMIT2 } from '../src/chain/liquifier.js';
import {
  buildRoute,
  ensurePermit2Approval,
  getNextPermit2Nonce,
  primaryBaseOutput,
} from '../src/ops/liquifySweep.js';

const require = createRequire(import.meta.url);
const { SignatureTransfer } = require('@uniswap/permit2-sdk');

async function main() {
  const rpc = 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpc, 1, { staticNetwork: true });
  const bot = loadBotConfig('alpha');
  const wallet = createBotWallet(bot, provider);
  const TOKEN = process.argv[2] ?? '0xe53ec727dbdeb9e2d5456c3be40cff031ab40a55'; // SUPER
  const outputToken = primaryBaseOutput(bot);
  const owner = await wallet.getAddress();
  const liquifierAddr = bot.liquify.contract;
  const erc20 = new Contract(TOKEN, ['function balanceOf(address) view returns (uint256)'], provider);
  const amount = BigInt((await erc20.balanceOf(owner)).toString());
  const route = await buildRoute(provider, TOKEN, amount, outputToken);
  if (!route) throw new Error('no route');
  await ensurePermit2Approval(TOKEN, owner, wallet);
  const inputs = [route.input];
  const latest = await provider.getBlock('latest');
  const deadline = BigInt(latest!.timestamp + 1800);
  const nonce = await getNextPermit2Nonce(provider, owner);

  const permit = {
    permitted: [{ token: TOKEN, amount: amount.toString() }],
    spender: liquifierAddr,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
  };
  const sdkData = SignatureTransfer.getPermitData(permit, PERMIT2, 1);
  const sig = await wallet.signTypedData(sdkData.domain, sdkData.types, sdkData.values);

  const permit2Iface = new Interface([
    'function permitBatchTransferFrom((tuple(address token,uint256 amount)[] permitted,address spender,uint256 nonce,uint256 deadline) permit, (address to,uint256 requestedAmount)[] transferDetails, address owner, bytes signature) external',
  ]);
  const p2Data = permit2Iface.encodeFunctionData('permitBatchTransferFrom', [
    {
      permitted: [{ token: TOKEN, amount }],
      spender: liquifierAddr,
      nonce,
      deadline,
    },
    [{ to: liquifierAddr, requestedAmount: amount }],
    owner,
    sig,
  ]);

  await provider.send('anvil_impersonateAccount', [liquifierAddr]);
  await provider.send('anvil_setBalance', [liquifierAddr, '0x56BC75E2D63100000']);
  try {
    await provider.call({ from: liquifierAddr, to: PERMIT2, data: p2Data });
    console.log('permitBatchTransferFrom OK when msg.sender=liquifier');
  } catch (e: unknown) {
    const err = e as { shortMessage?: string; data?: string };
    console.log('permitBatchTransferFrom FAIL', err.shortMessage, err.data);
  } finally {
    await provider.send('anvil_stopImpersonatingAccount', [liquifierAddr]);
  }

  const liquifier = new Contract(liquifierAddr, LIQUIFIER_ABI, wallet);
  try {
    await liquifier.liquify.staticCall(inputs, outputToken, [], 0n, nonce, deadline, sig);
    console.log('liquify OK');
  } catch (e: unknown) {
    const err = e as { shortMessage?: string };
    console.log('liquify FAIL', err.shortMessage);
  }
}

main();
