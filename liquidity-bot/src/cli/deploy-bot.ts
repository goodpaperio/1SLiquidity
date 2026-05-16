#!/usr/bin/env node
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import {
  buildRemoteSetupScript,
  buildRsyncArgs,
  buildScpBotConfigArgs,
  loadDeployConfigFromEnv,
} from '../ops/deployBot.js';
import { runCommand } from '../ops/exec.js';

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId = requireBotId(positional);
  const dryRun = flags['dry-run'] === true || process.env.DRY_RUN === '1';

  const deploy = loadDeployConfigFromEnv();

  console.log(`\nDeploying bot "${botId}" → ${deploy.deployHost}:${deploy.deployPath}\n`);

  console.log('1) Sync monorepo (rsync)');
  const rsyncArgs = buildRsyncArgs(deploy, { dryRun });
  console.log(`   rsync ${rsyncArgs.join(' ')}`);
  if (!dryRun) {
    const res = runCommand('rsync', rsyncArgs);
    if (!res.ok) {
      console.error(res.stderr || res.stdout);
      throw new Error('rsync failed');
    }
  }

  console.log('\n2) Sync bot config (scp)');
  const scpArgs = buildScpBotConfigArgs(botId, deploy);
  console.log(`   scp ${scpArgs.join(' ')}`);
  if (!dryRun) {
    const res = runCommand('scp', scpArgs);
    if (!res.ok) {
      console.error(res.stderr || res.stdout);
      throw new Error('scp failed');
    }
  }

  const setup = buildRemoteSetupScript(deploy);
  console.log('\n3) Remote build (ssh)');
  console.log(`   ssh ${deploy.deployHost} ${setup}`);
  if (!dryRun) {
    const res = runCommand('ssh', [deploy.deployHost, setup]);
    if (!res.ok) {
      console.error(res.stderr || res.stdout);
      throw new Error('remote setup failed');
    }
  }

  console.log('\n⚠️  Copy BOT_*_KEY to server liquidity-bot/.env manually (never rsync .env).');
  console.log(`    ssh ${deploy.deployHost}`);
  console.log(`    cd ${deploy.deployPath}/liquidity-bot && npm run start bot -- ${botId}\n`);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
