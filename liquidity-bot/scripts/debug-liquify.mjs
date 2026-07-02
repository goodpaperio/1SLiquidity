#!/usr/bin/env node
import 'dotenv/config';
import {
  Contract,
  JsonRpcProvider,
  Wallet,
  formatUnits,
} from 'ethers';
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

const RPC = process.env.FORK_RPC ?? 'http://127.0.0.1:8545';
const TOKEN = process.argv[2] ?? '0xbe9895146f7af43049ca1c1ae358b0541ea49704'; // cbETH

const provider = new JsonRpcProvider(RPC, 1, { staticNetwork: true });
const bot = loadBotConfig('alpha');
const wallet = createBotWallet(bot, provider);
const owner = await wallet.getAddress();
console.log('owner', owner, 'config', bot.address, 'match', owner.toLowerCase() === bot.address.toLowerCase());

const outputToken = primaryBaseOutput(bot);
const erc20 = new Contract(TOKEN, ['function balanceOf(address) view returns (uint256)'], provider);
const amount = BigInt((await erc20.balanceOf(owner)).toString());
console.log('token balance', amount.toString());

const route = await buildRoute(provider, TOKEN, amount, outputToken);
if (!route) throw new Error('no route');
console.log('quote', formatUnits(route.quotedOut, 18), 'WETH');
console.log('v3Path len', (route.input.v3Path.length - 2) / 2);
console.log('v2Path', route.input.v2Path);

await ensurePermit2Approval(TOKEN, owner, wallet);
const latest = await provider.getBlock('latest');
const deadline = BigInt(latest.timestamp + 1800);
const nonce = await getNextPermit2Nonce(provider, owner);
const inputs = [route.input];
const sig = await signPermit2Batch(wallet, inputs, nonce, deadline);
const omit = omitTokenList(bot);
const liquifier = new Contract(bot.liquify.contract, LIQUIFIER_ABI, wallet);

for (const minOut of [0n, route.quotedOut / 2n, (route.quotedOut * 97n) / 100n]) {
  try {
    await liquifier.liquify.staticCall(
      inputs, outputToken, omit, minOut, nonce, deadline, sig
    );
    console.log('staticCall OK minOut=', minOut.toString(), formatUnits(minOut, 18));
  } catch (e) {
    console.log('staticCall FAIL minOut=', minOut.toString(), e.shortMessage ?? e.message?.slice(0, 120));
  }
}

// Try broadcast on fork
try {
  const tx = await liquifier.liquify(
    inputs, outputToken, omit, 0n, nonce, deadline, sig
  );
  const r = await tx.wait();
  console.log('TX OK', r.hash, 'gas', r.gasUsed?.toString());
  const weth = new Contract(outputToken, ['function balanceOf(address) view returns (uint256)'], provider);
  console.log('WETH after', formatUnits(await weth.balanceOf(owner), 18));
  console.log('token after', (await erc20.balanceOf(owner)).toString());
} catch (e) {
  console.log('TX FAIL', e.shortMessage ?? e.message?.slice(0, 200));
}
