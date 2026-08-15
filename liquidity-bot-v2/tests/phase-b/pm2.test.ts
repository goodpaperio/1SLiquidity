import { describe, expect, it } from 'vitest';
import {
  buildPm2StartArgs,
  buildPm2StopArgs,
  pm2AppName,
} from '../../src/ops/pm2.js';

describe('phase B — pm2 helpers', () => {
  it('names apps liquidity-bot-v2-<id>', () => {
    expect(pm2AppName('alpha')).toBe('liquidity-bot-v2-alpha');
  });

  it('builds pm2 start args for a bot', () => {
    const { appName, args, env } = buildPm2StartArgs({
      packageRoot: '/opt/lb',
      botId: 'alpha',
    });
    expect(appName).toBe('liquidity-bot-v2-alpha');
    expect(args).toContain('--only');
    expect(args).toContain('liquidity-bot-v2-alpha');
    expect(env.BOT_ID).toBe('alpha');
  });

  it('builds pm2 stop args', () => {
    expect(buildPm2StopArgs('beta')).toEqual(['stop', 'liquidity-bot-v2-beta']);
  });
});
