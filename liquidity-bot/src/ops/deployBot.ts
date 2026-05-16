import { getRepoRoot } from '../config/paths.js';
import { getBotConfigPath } from '../config/paths.js';

export interface DeployConfig {
  deployHost: string;
  deployPath: string;
  deployUser?: string;
}

export function loadDeployConfigFromEnv(): DeployConfig {
  const deployHost = process.env.DEPLOY_HOST?.trim();
  const deployPath = process.env.DEPLOY_PATH?.trim();
  if (!deployHost || !deployPath) {
    throw new Error(
      'Set DEPLOY_HOST and DEPLOY_PATH in liquidity-bot/.env (e.g. DEPLOY_HOST=ubuntu@ec2.example.com, DEPLOY_PATH=/opt/1sliquidity)'
    );
  }
  return {
    deployHost,
    deployPath,
    deployUser: process.env.DEPLOY_USER?.trim(),
  };
}

export function buildRsyncArgs(
  config: DeployConfig,
  options: { dryRun?: boolean } = {}
): string[] {
  const repoRoot = getRepoRoot();
  const remote = `${config.deployHost}:${config.deployPath}/`;
  const args = ['-avz', '--delete'];
  if (options.dryRun) args.push('--dry-run');

  const excludes = [
    'node_modules',
    '.env',
    'ARCHITECTURE.md',
    'data',
    '.run',
    'dist',
    'bots/*.state.json',
    'bots/*.wallet.meta.json',
  ];

  const excludeArgs = excludes.flatMap((e) => ['--exclude', e]);

  return [...args, ...excludeArgs, `${repoRoot}/`, remote];
}

export function buildRemoteSetupCommands(config: DeployConfig): string[] {
  const lb = `${config.deployPath}/liquidity-bot`;
  return [
    `cd ${lb} && npm ci`,
    `cd ${lb} && npm run build`,
  ];
}

export function buildRemoteSetupScript(config: DeployConfig): string {
  return buildRemoteSetupCommands(config).join(' && ');
}

export function buildScpBotConfigArgs(
  botId: string,
  config: DeployConfig
): string[] {
  const local = getBotConfigPath(botId);
  const remote = `${config.deployHost}:${config.deployPath}/liquidity-bot/bots/${botId}.json`;
  return [local, remote];
}

export function buildSshCommand(
  config: DeployConfig,
  remoteCommand: string
): string {
  return `ssh ${config.deployHost} ${JSON.stringify(remoteCommand)}`;
}
