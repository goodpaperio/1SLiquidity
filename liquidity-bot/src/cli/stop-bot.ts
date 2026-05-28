#!/usr/bin/env node
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { buildPm2StopArgs, pm2AppName } from '../ops/pm2.js';
import { runCommand } from '../ops/exec.js';
import { getPackageRoot } from '../config/paths.js';

async function main(): Promise<void> {
  const { positional } = parseCliArgs(process.argv);
  const botId = requireBotId(positional);

  const res = runCommand('pm2', buildPm2StopArgs(botId), {
    cwd: getPackageRoot(),
  });

  if (!res.ok) {
    console.error(res.stderr || res.stdout);
    throw new Error(`pm2 stop failed for ${pm2AppName(botId)}`);
  }

  console.log(`\n✅ Stopped ${pm2AppName(botId)}\n`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
