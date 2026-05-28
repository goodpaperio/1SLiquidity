import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { botConfigSchema } from '../../src/config/schema.js';
import { generateBot } from '../../src/ops/generateBot.js';
import { parseEnvFile } from '../../src/ops/envFile.js';

describe('phase B — generateBot', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('creates bot config, wallet meta, and optional env key', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lb-gen-'));
    const botsDir = path.join(tmpDir, 'bots');
    const envPath = path.join(tmpDir, '.env');

    const result = generateBot({
      botId: 'phasebtest',
      writeEnv: true,
      envFilePath: envPath,
      botsDir,
    });

    expect(result.address).toMatch(/^0x[a-fA-F0-9]{40}$/);
    expect(result.privateKey).toMatch(/^0x[a-fA-F0-9]{64}$/);
    expect(fs.existsSync(result.configPath)).toBe(true);
    expect(fs.existsSync(result.metaPath)).toBe(true);

    const meta = JSON.parse(fs.readFileSync(result.metaPath, 'utf8')) as {
      address: string;
      createdAt: string;
    };
    expect(meta.address).toBe(result.address);
    expect(meta).not.toHaveProperty('privateKey');

    const config = botConfigSchema.parse(
      JSON.parse(fs.readFileSync(result.configPath, 'utf8'))
    );
    expect(config.id).toBe('phasebtest');
    expect(config.enabled).toBe(false);
    expect(config.privateKeyEnv).toBe('BOT_PHASEBTEST_KEY');

    const env = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
    expect(env.get('BOT_PHASEBTEST_KEY')).toBe(result.privateKey);
  });

  it('refuses overwrite without force', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lb-gen2-'));
    const botsDir = path.join(tmpDir, 'bots');
    generateBot({ botId: 'dup', botsDir });
    expect(() => generateBot({ botId: 'dup', botsDir })).toThrow(/already exists/i);
    expect(() =>
      generateBot({ botId: 'dup', botsDir, force: true })
    ).not.toThrow();
  });
});
