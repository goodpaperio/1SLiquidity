import fs from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';
import { botConfigSchema } from '../../src/config/schema.js';
import { BASE_TOKEN_ADDRESSES } from '../../src/config/baseTokens.js';
import { getBotHotPairsPath } from '../../src/config/paths.js';
import {
  filterAndCapHotPairs,
  hotPairsApiUrl,
  parseKeeperTopResponse,
  resolveHotPairsForBot,
  writeHotPairsCache,
} from '../../src/scan/hotPairs.js';
import { createBotConfigTemplate } from '../../src/ops/botTemplate.js';

const WETH = BASE_TOKEN_ADDRESSES.WETH;
const BOT_ID = 'v2-hot-test';

function fakeRows(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    tokenAAddress: `0x${(i + 1).toString(16).padStart(40, '0')}`,
    tokenASymbol: `tok${i}`,
    tokenBAddress: WETH,
    tokenBSymbol: 'WETH',
    slippageSavings: 1000 - i,
  }));
}

afterEach(() => {
  const p = getBotHotPairsPath(BOT_ID);
  if (fs.existsSync(p)) fs.unlinkSync(p);
});

describe('v2 hot pairs', () => {
  it('builds API URL with metric and limit', () => {
    expect(
      hotPairsApiUrl('https://keeper.example.com', 'slippageSavings', 10)
    ).toBe(
      'https://keeper.example.com/api/tokens/top?metric=slippageSavings&limit=10'
    );
  });

  it('hard-caps after base/exclude filters', () => {
    const rows = [
      ...fakeRows(15),
      {
        tokenAAddress: '0x1111111111111111111111111111111111111111',
        tokenASymbol: 'ldo',
        tokenBAddress: WETH,
        tokenBSymbol: 'WETH',
      },
    ];
    const pairs = filterAndCapHotPairs(rows, {
      baseTokens: ['WETH'],
      excludedTargets: ['ldo'],
      limit: 10,
    });
    expect(pairs).toHaveLength(10);
    expect(pairs.every((p) => p.baseSymbol === 'WETH')).toBe(true);
    expect(pairs.some((p) => p.targetName.toLowerCase() === 'ldo')).toBe(false);
  });

  it('parses keeper response shape', () => {
    const rows = parseKeeperTopResponse({
      success: true,
      data: fakeRows(2),
      total: 2,
      metric: 'slippageSavings',
      limit: 10,
    });
    expect(rows).toHaveLength(2);
  });

  it('writes cache from API and falls back without widening on failure', async () => {
    const bot = botConfigSchema.parse({
      ...createBotConfigTemplate(BOT_ID, '0x1111111111111111111111111111111111111111'),
      baseTokens: ['WETH'],
    });

    const ok = await resolveHotPairsForBot(bot, {
      apiBaseUrl: 'https://keeper.example.com',
      fetchJson: async () => ({ success: true, data: fakeRows(12) }),
    });
    expect(ok.source).toBe('api');
    expect(ok.pairs.length).toBeLessThanOrEqual(10);
    expect(fs.existsSync(getBotHotPairsPath(BOT_ID))).toBe(true);

    const fallback = await resolveHotPairsForBot(bot, {
      apiBaseUrl: 'https://keeper.example.com',
      fetchJson: async () => {
        throw new Error('down');
      },
    });
    expect(fallback.source).toBe('cache');
    expect(fallback.pairs.length).toBe(ok.pairs.length);
    expect(fallback.pairs.length).toBeLessThanOrEqual(10);
  });

  it('returns empty (not static universe) when API fails and no cache', async () => {
    const bot = botConfigSchema.parse({
      ...createBotConfigTemplate(BOT_ID, '0x1111111111111111111111111111111111111111'),
      baseTokens: ['WETH'],
    });
    const result = await resolveHotPairsForBot(bot, {
      apiBaseUrl: 'https://keeper.example.com',
      fetchJson: async () => {
        throw new Error('down');
      },
    });
    expect(result.source).toBe('empty');
    expect(result.pairs).toEqual([]);
    expect(result.skipReason).toBe('hot_pairs_unavailable');
  });

  it('schema defaults universeMode to hot_pairs', () => {
    const bot = botConfigSchema.parse(
      createBotConfigTemplate('tmpl', '0x1111111111111111111111111111111111111111')
    );
    expect(bot.scan.universeMode).toBe('hot_pairs');
    expect(bot.scan.hotPairsLimit).toBe(10);
    expect(bot.scan.selectionMode).toBe('price_vs_depth');
  });

  it('can seed cache via writeHotPairsCache for offline ops', () => {
    writeHotPairsCache(BOT_ID, {
      fetchedAt: new Date().toISOString(),
      metric: 'slippageSavings',
      source: 'api',
      pairs: fakeRows(3),
    });
    expect(fs.existsSync(getBotHotPairsPath(BOT_ID))).toBe(true);
  });
});
