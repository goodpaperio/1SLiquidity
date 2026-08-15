import fs from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { getBotsDir } from '../../src/config/paths.js';
import { readBotState, writeBotState } from '../../src/runner/BotRunner.js';

describe('phase B — BotRunner state', () => {
  const botId = 'statetest';
  const statePath = path.join(getBotsDir(), `${botId}.state.json`);

  afterEach(() => {
    if (fs.existsSync(statePath)) {
      fs.unlinkSync(statePath);
    }
  });

  it('writes and reads state file', () => {
    writeBotState(botId, {
      lastUpdatedAt: '2026-01-01T00:00:00.000Z',
      lastEthBalanceWei: '0',
      status: 'running',
    });

    const read = readBotState(botId);
    expect(read?.status).toBe('running');
    expect(fs.existsSync(statePath)).toBe(true);
  });
});
