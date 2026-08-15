import { describe, expect, it } from 'vitest';
import {
  buildRsyncArgs,
  buildRemoteSetupScript,
  buildScpBotConfigArgs,
} from '../../src/ops/deployBot.js';

describe('phase B — deployBot', () => {
  const config = {
    deployHost: 'ubuntu@ec2.example.com',
    deployPath: '/opt/1sliquidity',
  };

  it('builds rsync args excluding secrets', () => {
    const args = buildRsyncArgs(config);
    expect(args[0]).toBe('-avz');
    expect(args).toContain('--exclude');
    expect(args.some((a) => a.includes('.env'))).toBe(true);
    expect(args[args.length - 1]).toBe(
      'ubuntu@ec2.example.com:/opt/1sliquidity/'
    );
    expect(args.some((a) => String(a).includes('node_modules'))).toBe(true);
  });

  it('builds remote npm ci + build', () => {
    const script = buildRemoteSetupScript(config);
    expect(script).toContain('/opt/1sliquidity/liquidity-bot');
    expect(script).toContain('npm ci');
    expect(script).toContain('npm run build');
  });

  it('builds scp args for bot config', () => {
    const args = buildScpBotConfigArgs('alpha', config);
    expect(args[1]).toContain('bots/alpha.json');
  });
});
