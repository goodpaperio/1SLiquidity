import fs from 'node:fs';
import path from 'node:path';
import { Wallet } from 'ethers';
import { botConfigSchema } from '../config/schema.js';
import { getBotsDir, getPackageRoot } from '../config/paths.js';
import { createBotConfigTemplate } from './botTemplate.js';
import { upsertEnvVar } from './envFile.js';

export interface GenerateBotOptions {
  botId: string;
  writeEnv?: boolean;
  force?: boolean;
  envFilePath?: string;
  /** Override bots directory (tests). */
  botsDir?: string;
}

export interface GenerateBotResult {
  botId: string;
  address: string;
  privateKey: string;
  privateKeyEnv: string;
  configPath: string;
  metaPath: string;
  envFileUpdated: boolean;
}

export function generateBot(options: GenerateBotOptions): GenerateBotResult {
  const botId = options.botId.toLowerCase();
  if (!/^[a-z][a-z0-9_-]*$/.test(botId)) {
    throw new Error(
      'Bot id must start with a letter and contain only lowercase letters, numbers, hyphens, underscores'
    );
  }

  const botsDir = options.botsDir ?? getBotsDir();
  const configPath = path.join(botsDir, `${botId}.json`);
  if (fs.existsSync(configPath) && !options.force) {
    throw new Error(
      `Bot already exists: ${configPath}. Use --force to overwrite.`
    );
  }

  const wallet = Wallet.createRandom();
  const config = createBotConfigTemplate(botId, wallet.address);
  const parsed = botConfigSchema.parse(config);

  fs.mkdirSync(botsDir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8');

  const metaPath = path.join(botsDir, `${botId}.wallet.meta.json`);
  fs.writeFileSync(
    metaPath,
    JSON.stringify(
      {
        address: wallet.address,
        createdAt: new Date().toISOString(),
      },
      null,
      2
    ) + '\n',
    'utf8'
  );

  let envFileUpdated = false;
  if (options.writeEnv) {
    const envPath =
      options.envFilePath ?? path.join(getPackageRoot(), '.env');
    upsertEnvVar(envPath, parsed.privateKeyEnv, wallet.privateKey);
    envFileUpdated = true;
  }

  return {
    botId,
    address: wallet.address,
    privateKey: wallet.privateKey,
    privateKeyEnv: parsed.privateKeyEnv,
    configPath,
    metaPath,
    envFileUpdated,
  };
}
