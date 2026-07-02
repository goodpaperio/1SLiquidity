import 'dotenv/config';
import { createRequire } from 'node:module';
import { Contract, JsonRpcProvider } from 'ethers';
import { loadBotConfig } from '../src/config/loadBot.js';
import { createBotWallet } from '../src/chain/wallet.js';
import { LIQUIFIER_ABI, PERMIT2 } from '../src/chain/liquifier.js';
import {
  buildRoute,
  ensurePermit2Approval,
  getNextPermit2Nonce,
  omitTokenList,
  primaryBaseOutput,
  signPermit2Batch,
} from '../src/ops/liquifySweep.js';

const require = createRequire(import.meta.url);
const { SignatureTransfer } = require('@uniswap/permit2-sdk');

async function main(): Promise<void> {
  const provider = new JsonRpcProvider('http://127.0.0.1:8545', 1, {
    staticNetwork: true,
  });
  const bot = loadBotConfig('alpha');
  const wallet = createBotWallet(bot, provider);
  const TOKEN = '0xe53ec727dbdeb9e2d5456c3be40cff031ab40a55';
  const owner = await wallet.getAddress();
  const spender = bot.liquify.contract;
  const erc20 = new Contract(TOKEN, ['function balanceOf(address) view returns (uint256)'], provider);
  const amount = BigInt((await erc20.balanceOf(owner)).toString());
  const outputToken = primaryBaseOutput(bot);
  const route = await buildRoute(provider, TOKEN, amount, outputToken);
  if (!route) throw new Error('no route');
  await ensurePermit2Approval(TOKEN, owner, wallet);

  const latest = await provider.getBlock('latest');
  const deadline = BigInt(latest!.timestamp + 1800);
  const nonce = await getNextPermit2Nonce(provider, owner);
  const inputs = [route.input];

  const ourSig = await signPermit2Batch(wallet, inputs, nonce, deadline, spender);
  const permit = {
    permitted: [{ token: TOKEN, amount: amount.toString() }],
    spender,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
  };
  const sdkData = SignatureTransfer.getPermitData(permit, PERMIT2, 1);
  const sdkSig = await wallet.signTypedData(sdkData.domain, sdkData.types, sdkData.values);

  const abi = [
    'function permitBatchTransferFrom((tuple(address token,uint256 amount)[] permitted,address spender,uint256 nonce,uint256 deadline) permit,(address to,uint256 requestedAmount)[] transferDetails,address owner,bytes signature) external',
  ];
  const permit2 = new Contract(PERMIT2, abi, provider);
  const permitStruct = {
    permitted: [{ token: TOKEN, amount }],
    spender,
    nonce,
    deadline,
  };
  const details = [{ to: spender, requestedAmount: amount }];

  await provider.send('anvil_impersonateAccount', [spender]);
  await provider.send('anvil_setBalance', [spender, '0x56BC75E2D63100000']);

  for (const [label, sig] of [
    ['ours', ourSig],
    ['sdk', sdkSig],
  ] as const) {
    try {
      await permit2.permitBatchTransferFrom.staticCall(
        permitStruct,
        details,
        owner,
        sig,
        { from: spender }
      );
      console.log(`permit2 OK caller=spender sig=${label}`);
    } catch (e) {
      const err = e as { shortMessage?: string };
      console.log(`permit2 FAIL caller=spender sig=${label}:`, err.shortMessage);
    }
  }

  const liquifier = new Contract(spender, LIQUIFIER_ABI, wallet);
  try {
    await liquifier.liquify.staticCall(
      inputs,
      outputToken,
      omitTokenList(bot),
      0n,
      nonce,
      deadline,
      ourSig
    );
    console.log('liquify OK');
  } catch (e) {
    const err = e as { shortMessage?: string };
    console.log('liquify FAIL:', err.shortMessage);
  }

  await provider.send('anvil_stopImpersonatingAccount', [spender]);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
