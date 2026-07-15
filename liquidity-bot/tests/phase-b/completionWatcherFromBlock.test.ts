import { describe, expect, it } from 'vitest';
import {
  getLogsMaxRange,
  resolveCompletionFromBlock,
} from '../../src/notify/completionWatcher.js';
import { loadCoreDeploymentBlock } from '../../src/config/deploymentManifest.js';
import { createBotConfigTemplate } from '../../src/ops/botTemplate.js';

describe('completionWatcher from-block floor', () => {
  it('never scans before Core deploymentBlock', () => {
    const from = resolveCompletionFromBlock({
      lastCompletedBlock: 0,
      deploymentBlock: 25093744,
      latestBlock: 26000000,
    });
    expect(from).toBe(25093744);
  });

  it('resumes after lastCompletedBlock when set', () => {
    const from = resolveCompletionFromBlock({
      lastCompletedBlock: 25094000,
      deploymentBlock: 25093744,
      latestBlock: 26000000,
    });
    expect(from).toBe(25094001);
  });

  it('floors resume below deploymentBlock up to deployment', () => {
    const from = resolveCompletionFromBlock({
      lastCompletedBlock: 100,
      deploymentBlock: 25093744,
      latestBlock: 26000000,
    });
    expect(from).toBe(25093744);
  });

  it('cold-starts near earliest open placement (with lookback), floored at deploy', () => {
    const latestBlock = 25_100_000;
    const tipTimestampSec = 1_700_000_000;
    // trade placed ~120 seconds before tip → ~10 blocks ago
    const placedAtMs = (tipTimestampSec - 120) * 1000;
    const from = resolveCompletionFromBlock({
      lastCompletedBlock: 0,
      deploymentBlock: 25093744,
      latestBlock,
      earliestOpenPlacedAtMs: placedAtMs,
      tipTimestampSec,
    });
    // approx = latest - 10, minus PLACEMENT_LOOKBACK_BLOCKS (2880)
    expect(from).toBe(latestBlock - 10 - 2880);
  });

  it('loads deploymentBlock from the bot manifest path', () => {
    const bot = createBotConfigTemplate(
      'testbot',
      '0x7e05230fc5aDfdF5f986909237e78F4979D0db69'
    );
    expect(loadCoreDeploymentBlock(bot)).toBe(25093744);
  });

  it('defaults eth_getLogs max range to Alchemy free-tier safe 10', () => {
    const prev = process.env.ETH_GETLOGS_MAX_RANGE;
    delete process.env.ETH_GETLOGS_MAX_RANGE;
    expect(getLogsMaxRange()).toBe(10);
    process.env.ETH_GETLOGS_MAX_RANGE = '2000';
    expect(getLogsMaxRange()).toBe(2000);
    if (prev === undefined) delete process.env.ETH_GETLOGS_MAX_RANGE;
    else process.env.ETH_GETLOGS_MAX_RANGE = prev;
  });
});
