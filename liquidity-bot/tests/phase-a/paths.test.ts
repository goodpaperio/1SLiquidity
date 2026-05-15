import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getPackageRoot,
  getRepoRoot,
  getBotConfigPath,
} from '../../src/config/paths.js';
import {
  clearFixtureRepoRoot,
  useFixtureRepoRoot,
} from '../helpers/env.js';

describe('phase A — paths', () => {
  afterEach(() => {
    clearFixtureRepoRoot();
  });

  it('resolves package root', () => {
    expect(getPackageRoot()).toContain('liquidity-bot');
  });

  it('defaults repo root to parent of package', () => {
    clearFixtureRepoRoot();
    const repo = getRepoRoot();
    expect(repo).toContain('1SLiquidity');
    expect(path.basename(path.dirname(getPackageRoot()))).toBe('1SLiquidity');
  });

  it('respects REPO_ROOT env', () => {
    useFixtureRepoRoot();
    expect(getRepoRoot()).toContain('tests/fixtures');
  });

  it('builds bot config path', () => {
    expect(getBotConfigPath('alpha')).toMatch(/bots\/alpha\.json$/);
  });
});
