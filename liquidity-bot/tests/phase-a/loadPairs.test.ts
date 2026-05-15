import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  buildTradePairsForBot,
  loadPairsForBase,
} from '../../src/config/loadPairs.js';
import { loadBotConfig } from '../../src/config/loadBot.js';
import { getBotsDir, getPackageRoot } from '../../src/config/paths.js';
import {
  clearFixtureRepoRoot,
  getFixturesDir,
  useFixtureRepoRoot,
} from '../helpers/env.js';

describe('phase A — loadPairs', () => {
  const botsDir = getBotsDir();
  const botFixture = path.join(getFixturesDir(), 'bots', 'test-bot.json');
  const botTarget = path.join(botsDir, 'test-bot.json');
  const configFixtureDir = path.join(getFixturesDir(), 'config');

  beforeEach(() => {
    useFixtureRepoRoot();
    fs.mkdirSync(path.join(getFixturesDir(), 'config'), { recursive: true });
    fs.copyFileSync(
      path.join(configFixtureDir, 'usdc_pairs_mini.json'),
      path.join(getFixturesDir(), 'config', 'usdc_pairs_clean.json')
    );
    fs.mkdirSync(botsDir, { recursive: true });
    fs.copyFileSync(botFixture, botTarget);
  });

  afterEach(() => {
    clearFixtureRepoRoot();
    if (fs.existsSync(botTarget)) fs.unlinkSync(botTarget);
    const miniCopy = path.join(
      getFixturesDir(),
      'config',
      'usdc_pairs_clean.json'
    );
    if (fs.existsSync(miniCopy)) fs.unlinkSync(miniCopy);
  });

  it('loads pair file for a base', () => {
    const pairs = loadPairsForBase('USDC');
    expect(pairs.length).toBe(3);
    expect(pairs.some((p) => p.name === 'pepe')).toBe(true);
  });

  it('builds base→alt trade pairs, skipping base duplicates', () => {
    const bot = loadBotConfig('test-bot');
    const trades = buildTradePairsForBot(bot);
    const usdcPepe = trades.find(
      (t) => t.baseSymbol === 'USDC' && t.targetName === 'pepe'
    );
    expect(usdcPepe).toBeDefined();
    expect(usdcPepe!.tokenIn).toBe(usdcPepe!.baseAddress);
    expect(usdcPepe!.tokenOut).toBe(usdcPepe!.targetAddress);
    const usdcWeth = trades.find(
      (t) => t.baseSymbol === 'USDC' && t.targetName === 'weth'
    );
    expect(usdcWeth).toBeUndefined();
  });
});

describe('phase A — loadPairs (monorepo integration)', () => {
  it('loads real USDC pairs when REPO_ROOT is monorepo', () => {
    clearFixtureRepoRoot();
    const pairs = loadPairsForBase('USDC');
    expect(pairs.length).toBeGreaterThan(50);
  });
});
