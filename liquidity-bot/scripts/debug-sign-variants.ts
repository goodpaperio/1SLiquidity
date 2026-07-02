import 'dotenv/config';
import { Contract, JsonRpcProvider, getAddress, toBeHex } from 'ethers';
import { loadBotConfig } from '../src/config/loadBot.js';
import { createBotWallet } from '../src/chain/wallet.js';
import { LIQUIFIER_ABI, PERMIT2 } from '../src/chain/liquifier.js';
import {
  buildRoute,
  ensurePermit2Approval,
  getNextPermit2Nonce,
  omitTokenList,
  primaryBaseOutput,
} from '../src/ops/liquifySweep.js';

async function trySign(
  label: string,
  domain: object,
  types: object,
  value: object,
  wallet: ReturnType<typeof createBotWallet>,
  inputs: object[],
  outputToken: string,
  omit: string[],
  liquifier: Contract,
  permitNonce: bigint,
  deadline: bigint
): Promise<boolean> {
  const sig = await wallet.signTypedData(domain, types, value);
  try {
    await liquifier.liquify.staticCall(
      inputs,
      outputToken,
      omit,
      0n,
      permitNonce,
      deadline,
      sig
    );
    console.log('SUCCESS', label);
    return true;
  } catch (e: unknown) {
    const err = e as { shortMessage?: string };
    console.log('FAIL', label, err.shortMessage?.slice(0, 100));
    return false;
  }
}

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
  if (!route) throw new Error('no route');
  await ensurePermit2Approval(TOKEN, owner, wallet);
  const inputs = [route.input];
  const latest = await provider.getBlock('latest');
  const deadline = BigInt(latest!.timestamp + 1800);
  const permitNonce = await getNextPermit2Nonce(provider, owner);
  const omit = omitTokenList(bot);
  const liquifier = new Contract(bot.liquify.contract, LIQUIFIER_ABI, wallet);
  const permitted = inputs.map((i) => ({ token: i.token, amount: i.amount }));
  const domain = { name: 'Permit2', chainId: 1n, verifyingContract: PERMIT2 };
  const tokenPerms = [
    { name: 'token', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ];

  await trySign(
    'A standard spender=liquifier',
    domain,
    {
      PermitBatchTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions[]' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
      TokenPermissions: tokenPerms,
    },
    { permitted, spender: bot.liquify.contract, nonce: permitNonce, deadline },
    wallet,
    inputs,
    outputToken,
    omit,
    liquifier,
    permitNonce,
    deadline
  );

  await trySign(
    'B no spender in EIP712 type',
    domain,
    {
      PermitBatchTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions[]' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
      TokenPermissions: tokenPerms,
    },
    { permitted, nonce: permitNonce, deadline },
    wallet,
    inputs,
    outputToken,
    omit,
    liquifier,
    permitNonce,
    deadline
  );

  const misSpender = getAddress(toBeHex(permitNonce, 20));
  await trySign(
    'C spender=addr(nonce) nonce=deadline',
    domain,
    {
      PermitBatchTransferFrom: [
        { name: 'permitted', type: 'TokenPermissions[]' },
        { name: 'spender', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
      ],
      TokenPermissions: tokenPerms,
    },
    { permitted, spender: misSpender, nonce: deadline, deadline: 0n },
    wallet,
    inputs,
    outputToken,
    omit,
    liquifier,
    permitNonce,
    deadline
  );
}

main();
