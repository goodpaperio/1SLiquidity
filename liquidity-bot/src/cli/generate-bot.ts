#!/usr/bin/env node
import 'dotenv/config';
import path from 'node:path';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { generateBot } from '../ops/generateBot.js';
import { getPackageRoot } from '../config/paths.js';

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId = requireBotId(positional);
  const writeEnv = flags['write-env'] === true;
  const force = flags.force === true;

  const result = generateBot({
    botId,
    writeEnv,
    force,
    envFilePath: path.join(getPackageRoot(), '.env'),
  });

  console.log('\n✅ Bot generated\n');
  console.log(`  id:       ${result.botId}`);
  console.log(`  address:  ${result.address}`);
  console.log(`  config:   ${result.configPath}`);
  console.log(`  meta:     ${result.metaPath}`);
  console.log(`  env var:  ${result.privateKeyEnv}`);

  if (result.envFileUpdated) {
    console.log(`\n  Private key written to liquidity-bot/.env (${result.privateKeyEnv})`);
    console.log('  Run: chmod 600 .env');
  } else {
    console.log('\n  Add to liquidity-bot/.env (back up securely):');
    console.log(`  ${result.privateKeyEnv}=${result.privateKey}`);
  }

  console.log('\n  Next: fund the address with base tokens + ETH, then:');
  console.log(`    npm run deploy bot -- ${botId}`);
  console.log(`    npm run start bot -- ${botId}\n`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
