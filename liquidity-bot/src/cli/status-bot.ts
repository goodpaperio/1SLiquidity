#!/usr/bin/env node
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';
import { buildPm2StatusArgs, pm2AppName } from '../ops/pm2.js';
import { runCommand } from '../ops/exec.js';
import { getPackageRoot } from '../config/paths.js';
import { readBotState } from '../runner/BotRunner.js';

async function main(): Promise<void> {
  const { positional } = parseCliArgs(process.argv);
  const botId = requireBotId(positional);
  const config = loadBotConfig(botId);

  console.log(`\nBot: ${botId}`);
  console.log(`  address:  ${config.address}`);
  console.log(`  enabled:  ${config.enabled}`);
  console.log(`  nominal:  $${config.trade.nominalTradeUsd}`);

  const state = readBotState(botId);
  if (state) {
    console.log(`  state:    ${state.status} @ ${state.lastUpdatedAt}`);
    if (state.note) console.log(`  note:     ${state.note}`);
  } else {
    console.log('  state:    (no state file yet)');
  }

  const envKey = config.privateKeyEnv;
  const hasKey = Boolean(process.env[envKey]?.trim());
  console.log(`  key env:  ${envKey} ${hasKey ? '✓ set' : '✗ missing'}`);

  const res = runCommand('pm2', buildPm2StatusArgs(botId), {
    cwd: getPackageRoot(),
  });
  console.log(`\nPM2 (${pm2AppName(botId)}):`);
  if (res.ok) {
    console.log(res.stdout || '(no output)');
  } else {
    console.log('  not running or pm2 unavailable');
  }
  console.log('');
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
