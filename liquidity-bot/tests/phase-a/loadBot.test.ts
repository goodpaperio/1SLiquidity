import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getBotsDir,
  getPackageRoot,
} from '../../src/config/paths.js';
import {
  loadBotConfig,
  privateKeyEnvForBotId,
} from '../../src/config/loadBot.js';

describe('phase A — loadBot', () => {
  const botsDir = getBotsDir();
  const fixturePath = path.join(
    getPackageRoot(),
    'tests/fixtures/bots/test-bot.json'
  );
  const targetPath = path.join(botsDir, 'test-bot.json');

  beforeEach(() => {
    fs.mkdirSync(botsDir, { recursive: true });
    fs.copyFileSync(fixturePath, targetPath);
  });

  afterEach(() => {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
  });

  it('loads bot config from bots/<id>.json', () => {
    const bot = loadBotConfig('test-bot');
    expect(bot.id).toBe('test-bot');
    expect(bot.scan.minSpreadBps).toBe(1000);
    expect(bot.trade.nominalTradeUsd).toBe(50);
  });

  it('throws when bot missing', () => {
    expect(() => loadBotConfig('nonexistent-bot-xyz')).toThrow(
      /not found/i
    );
  });

  it('derives private key env name', () => {
    expect(privateKeyEnvForBotId('alpha')).toBe('BOT_ALPHA_KEY');
    expect(privateKeyEnvForBotId('my-bot')).toBe('BOT_MY_BOT_KEY');
  });
});
