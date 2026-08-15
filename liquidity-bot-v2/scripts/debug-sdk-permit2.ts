import 'dotenv/config';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { SignatureTransfer } = require('@uniswap/permit2-sdk');
import { Contract, JsonRpcProvider, TypedDataEncoder } from 'ethers';
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

async function main() {
  const provider = new JsonRpcProvider('http://127.0.0.1:8545', 1, { staticNetwork: true });
  const bot = loadBotConfig('alpha');
  const wallet = createBotWallet(bot, provider);
  const TOKEN = process.argv[2] ?? '0xe53ec727dbdeb9e2d5456c3be40cff031ab40a55';
  const outputToken = primaryBaseOutput(bot);
  const owner = await wallet.getAddress();
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
    permitted: inputs.map((i) => ({ token: i.token, amount: i.amount.toString() })),
    spender: bot.liquify.contract,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
  };
  const sdkData = SignatureTransfer.getPermitData(permit, PERMIT2, 1);
  const sdkHash = SignatureTransfer.hash(permit, PERMIT2, 1);
  console.log('sdk hash', sdkHash);

  const ourSig = await signPermit2Batch(wallet, inputs, nonce, deadline, bot.liquify.contract);
  const ourDomain = { name: 'Permit2', chainId: 1n, verifyingContract: PERMIT2 };
  const ourTypes = {
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
  };
  const ourValue = {
    permitted: inputs.map((i) => ({ token: i.token, amount: i.amount })),
    spender: bot.liquify.contract,
    nonce,
    deadline,
  };
  const ourHash = TypedDataEncoder.hash(ourDomain, ourTypes, ourValue);
  console.log('our hash', ourHash, 'match', ourHash === sdkHash);

  const sdkSig = await wallet.signTypedData(sdkData.domain, sdkData.types, sdkData.values);
  console.log('sdk sig', sdkSig.slice(0, 20));

  const PERMIT2_ABI = [
    'function permitBatchTransferFrom((tuple(address token,uint256 amount)[] permitted,address spender,uint256 nonce,uint256 deadline) permit, (address to,uint256 requestedAmount)[] transferDetails, address owner, bytes signature) external',
  ];
  const permit2 = new Contract(PERMIT2, PERMIT2_ABI, wallet);
  try {
    await permit2.permitBatchTransferFrom.staticCall(
      {
        permitted: inputs.map((i) => ({ token: i.token, amount: i.amount })),
        spender: bot.liquify.contract,
        nonce,
        deadline,
      },
      [{ to: bot.liquify.contract, requestedAmount: amount }],
      owner,
      sdkSig
    );
    console.log('permitBatchTransferFrom OK with SDK sig');
  } catch (e: unknown) {
    const err = e as { shortMessage?: string; data?: string };
    console.log('permitBatchTransferFrom FAIL', err.shortMessage, err.data?.slice(0, 66));
  }

  const liquifier = new Contract(bot.liquify.contract, LIQUIFIER_ABI, wallet);
  try {
    await liquifier.liquify.staticCall(
      inputs,
      outputToken,
      omitTokenList(bot),
      0n,
      nonce,
      deadline,
      sdkSig
    );
    console.log('liquify staticCall OK with SDK sig');
  } catch (e: unknown) {
    const err = e as { shortMessage?: string };
    console.log('liquify FAIL', err.shortMessage);
  }
}

main();
