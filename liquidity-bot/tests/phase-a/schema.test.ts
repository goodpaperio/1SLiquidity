import { describe, expect, it } from 'vitest';
import { botConfigSchema } from '../../src/config/schema.js';
import fs from 'node:fs';
import path from 'node:path';
import { getFixturesDir } from '../helpers/env.js';

describe('phase A — bot schema', () => {
  it('accepts valid fixture bot config', () => {
    const raw = JSON.parse(
      fs.readFileSync(
        path.join(getFixturesDir(), 'bots', 'test-bot.json'),
        'utf8'
      )
    );
    const result = botConfigSchema.safeParse(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe('test-bot');
      expect(result.data.baseTokens).toContain('USDC');
    }
  });

  it('rejects invalid address', () => {
    const result = botConfigSchema.safeParse({
      id: 'bad',
      enabled: true,
      address: 'not-an-address',
      privateKeyEnv: 'BOT_BAD_KEY',
      baseTokens: ['WETH'],
      scan: {
        intervalMs: 180000,
        minSpreadBps: 300,
        maxSpreadBps: 2500,
        minLiquidityRatio: 2,
        maxSellReserveUsageBps: 1500,
      },
      trade: {
        nominalTradeUsd: 50,
        balanceUsagePct: 45,
        maxOpenTrades: 1,
        decastreamAmountOutMinBufferBps: 160,
        directSwapSlippageBps: 50,
        pairCooldownMs: 1_800_000,
        usePriceBased: false,
        isInstasettlable: false,
        instasettleBps: 100,
      },
      gas: {
        minEthWei: '1',
        targetEthWei: '2',
        refuelDex: 'uniswap-v3-3000',
      },
      contracts: {
        core: '0xD0B6DaD2Dc5dad47bEB7C3D7Dd7980a20CD6a710',
        deploymentManifest: '../versions/x.json',
      },
    });
    expect(result.success).toBe(false);
  });
});
