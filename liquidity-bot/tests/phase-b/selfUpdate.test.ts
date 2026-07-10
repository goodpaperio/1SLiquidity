import { describe, expect, it } from 'vitest';
import {
  canStartPull,
  DEFAULT_PULL_COOLDOWN_MS,
  selfUpdateScriptPath,
} from '../../src/ops/selfUpdate.js';
import fs from 'node:fs';

describe('phase B — selfUpdate helpers', () => {
  it('exposes self-update script path', () => {
    expect(fs.existsSync(selfUpdateScriptPath())).toBe(true);
  });

  it('allows pull when never pulled', () => {
    expect(canStartPull({})).toEqual({ ok: true });
  });

  it('enforces cooldown after recent pull', () => {
    const now = Date.parse('2026-07-10T12:00:00.000Z');
    const lastPullAt = new Date(now - 60_000).toISOString();
    const result = canStartPull({
      lastPullAt,
      now,
      cooldownMs: DEFAULT_PULL_COOLDOWN_MS,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toMatch(/cooldown/i);
    }
  });

  it('allows pull after cooldown elapsed', () => {
    const now = Date.parse('2026-07-10T12:00:00.000Z');
    const lastPullAt = new Date(now - DEFAULT_PULL_COOLDOWN_MS - 1).toISOString();
    expect(canStartPull({ lastPullAt, now })).toEqual({ ok: true });
  });
});
