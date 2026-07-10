import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  formatHelpMessage,
  parseTelegramCommand,
  pollTelegramCommands,
} from '../../src/notify/telegramCommands.js';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('phase B — telegram /pull commands', () => {
  it('parses /pull and aliases with optional status arg', () => {
    expect(parseTelegramCommand('/pull')).toEqual({ cmd: '/pull', args: [] });
    expect(parseTelegramCommand('/pull status')).toEqual({
      cmd: '/pull',
      args: ['status'],
    });
    expect(parseTelegramCommand('/run-pull@MyBot')).toEqual({
      cmd: '/run-pull',
      args: [],
    });
    expect(parseTelegramCommand('/update')).toEqual({
      cmd: '/update',
      args: [],
    });
  });

  it('documents /pull in help', () => {
    const help = formatHelpMessage();
    expect(help).toContain('/pull');
    expect(help).toContain('/pull status');
  });

  it('routes /pull to handlers and ignores unauthorized chats', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tg-pull-'));
    const prev = process.env.BOTS_DIR;
    // telegram state uses getBotsDir — write into a temp bots dir via cwd package
    // Instead mock fetch and use a unique bot id under real bots dir that we clean up.
    const botId = `tg-pull-test-${Date.now()}`;
    const pull = vi.fn(async () => 'pull-started');
    const pullStatus = vi.fn(async () => 'pull-status-ok');
    const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      if (u.includes('getUpdates')) {
        return {
          json: async () => ({
            ok: true,
            result: [
              {
                update_id: 1,
                message: { chat: { id: 999 }, text: '/pull' },
              },
              {
                update_id: 2,
                message: { chat: { id: 42 }, text: '/pull' },
              },
              {
                update_id: 3,
                message: { chat: { id: 42 }, text: '/pull status' },
              },
            ],
          }),
        };
      }
      if (u.includes('sendMessage')) {
        return { json: async () => ({ ok: true }) };
      }
      throw new Error(`unexpected fetch ${u} ${init?.method}`);
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      await pollTelegramCommands('token', '42', botId, {
        liquify: async () => '',
        status: async () => '',
        pause: () => '',
        resume: () => '',
        help: () => '',
        pull,
        pullStatus,
      });
      expect(pull).toHaveBeenCalledTimes(1);
      expect(pullStatus).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllGlobals();
      const statePath = path.join(
        process.cwd(),
        'bots',
        `${botId}.telegram-state.json`
      );
      if (fs.existsSync(statePath)) fs.unlinkSync(statePath);
      void tmp;
      void prev;
    }
  });
});
