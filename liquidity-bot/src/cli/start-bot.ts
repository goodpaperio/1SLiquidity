#!/usr/bin/env node
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';
import { buildPm2StartArgs, pm2AppName } from '../ops/pm2.js';
import { runCommand } from '../ops/exec.js';
import { getPackageRoot } from '../config/paths.js';

async function main(): Promise<void> {
  const { positional } = parseCliArgs(process.argv);
  const botId = requireBotId(positional);
  const config = loadBotConfig(botId);

  if (!config.enabled) {
    console.warn(
      `[${botId}] enabled=false in bots/${botId}.json — starting anyway (set enabled:true when ready).`
    );
  }

  const packageRoot = getPackageRoot();
  const pm2 = buildPm2StartArgs({ packageRoot, botId });

  const buildRes = runCommand('npm', ['run', 'build'], { cwd: packageRoot });
  if (!buildRes.ok) {
    throw new Error(`build failed: ${buildRes.stderr || buildRes.stdout}`);
  }

  const res = runCommand('pm2', pm2.args, {
    cwd: packageRoot,
    env: { ...process.env, ...pm2.env },
  });

  if (!res.ok) {
    console.error(res.stderr || res.stdout);
    throw new Error(
      `pm2 start failed. Install pm2: npm i -g pm2. Or run: BOT_ID=${botId} node dist/index.js`
    );
  }

  console.log(`\n✅ Started ${pm2AppName(botId)}`);
  console.log(`   pm2 logs ${pm2AppName(botId)}`);
  console.log(`   npm run stop bot -- ${botId}\n`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
