import 'dotenv/config';
import { Contract, JsonRpcProvider, Interface, AbiCoder } from 'ethers';
import { loadBotConfig } from '../src/config/loadBot.js';
import { createBotWallet } from '../src/chain/wallet.js';
import { LIQUIFIER_ABI } from '../src/chain/liquifier.js';
import {
  buildRoute,
  ensurePermit2Approval,
  getNextPermit2Nonce,
  primaryBaseOutput,
  signPermit2Batch,
} from '../src/ops/liquifySweep.js';

async function main() {
  const rpc = 'http://127.0.0.1:8545';
  const provider = new JsonRpcProvider(rpc, 1, { staticNetwork: true });
  const bot = loadBotConfig('alpha');
  const wallet = createBotWallet(bot, provider);
  const TOKEN = process.argv[2] ?? '0xbe9895146f7af43049ca1c1ae358b0541ea49704';
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
  const sig = await signPermit2Batch(wallet, inputs, nonce, deadline);
  const liquifier = new Contract(bot.liquify.contract, LIQUIFIER_ABI, wallet);
  const iface = new Interface(LIQUIFIER_ABI as unknown as string[]);
  const data = iface.encodeFunctionData('liquify', [
    inputs,
    outputToken,
    [], // empty omit like web app
    0n,
    nonce,
    deadline,
    sig,
  ]);

  for (const omitLabel of ['empty', 'full'] as const) {
    const omit =
      omitLabel === 'empty'
        ? []
        : (await import('../src/ops/liquifySweep.js')).omitTokenList(bot);
    const callData = iface.encodeFunctionData('liquify', [
      inputs,
      outputToken,
      omit,
      0n,
      nonce,
      deadline,
      sig,
    ]);
    try {
      await provider.call({ from: owner, to: bot.liquify.contract, data: callData });
      console.log('OK omit=', omitLabel);
    } catch (e: unknown) {
      const err = e as { data?: string; message?: string };
      console.log('FAIL omit=', omitLabel, err.data?.slice(0, 66) ?? err.message?.slice(0, 120));
    }
  }

  const trace = await provider.send('debug_traceCall', [
    { from: owner, to: bot.liquify.contract, data },
    'latest',
    { tracer: 'callTracer' },
  ]);
  console.log(JSON.stringify(trace, null, 2).slice(0, 4000));
}

main();
