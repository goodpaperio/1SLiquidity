import 'dotenv/config';
import { Contract, JsonRpcProvider, TypedDataEncoder, verifyTypedData } from 'ethers';
import { loadBotConfig } from '../src/config/loadBot.js';
import { createBotWallet } from '../src/chain/wallet.js';
import { PERMIT2 } from '../src/chain/liquifier.js';
import { buildRoute, getNextPermit2Nonce, primaryBaseOutput, signPermit2Batch } from '../src/ops/liquifySweep.js';

async function main() {
  const provider = new JsonRpcProvider('http://127.0.0.1:8545', 1, { staticNetwork: true });
  const bot = loadBotConfig('alpha');
  const wallet = createBotWallet(bot, provider);
  const TOKEN = '0xbe9895146f7af43049ca1c1ae358b0541ea49704';
  const outputToken = primaryBaseOutput(bot);
  const erc20 = new Contract(TOKEN, ['function balanceOf(address) view returns (uint256)'], provider);
  const owner = await wallet.getAddress();
  const amount = BigInt((await erc20.balanceOf(owner)).toString());
  const route = await buildRoute(provider, TOKEN, amount, outputToken);
  const latest = await provider.getBlock('latest');
  const deadline = BigInt(latest.timestamp + 1800);
  const nonce = await getNextPermit2Nonce(provider, owner);
  const inputs = [route!.input];
  const sig = await signPermit2Batch(wallet, inputs, nonce, deadline);

  const domain = { name: 'Permit2', chainId: 1n, verifyingContract: PERMIT2 };
  const types = {
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
  const value = {
    permitted: inputs.map((i) => ({ token: i.token, amount: i.amount })),
    spender: bot.liquify.contract,
    nonce,
    deadline,
  };
  const recovered = verifyTypedData(domain, types, value, sig);
  console.log('recovered', recovered, 'owner', owner, 'match', recovered.toLowerCase() === owner.toLowerCase());

  const PERMIT2_ABI = [
    'function permitTransferFrom((tuple(address token,uint256 amount)[] permitted,address spender,uint256 nonce,uint256 deadline) permit, (address to,uint256 requestedAmount)[] transferDetails, address owner, bytes signature) external',
  ];
  const permit2 = new Contract(PERMIT2, PERMIT2_ABI, wallet);
  try {
    await permit2.permitTransferFrom.staticCall(
      { permitted: value.permitted, spender: value.spender, nonce: value.nonce, deadline: value.deadline },
      [{ to: bot.liquify.contract, requestedAmount: amount }],
      owner,
      sig
    );
    console.log('permitTransferFrom OK');
  } catch (e: unknown) {
    const err = e as { shortMessage?: string; message?: string };
    console.log('permitTransferFrom FAIL', err.shortMessage ?? err.message?.slice(0, 200));
  }
}

main();
