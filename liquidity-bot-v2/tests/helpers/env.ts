import path from 'node:path';
import { fileURLToPath } from 'node:url';

const testsDir = path.dirname(fileURLToPath(import.meta.url));

export function getFixturesDir(): string {
  return path.join(testsDir, '..', 'fixtures');
}

/** Point REPO_ROOT at tests/fixtures for isolated pair-file tests. */
export function useFixtureRepoRoot(): void {
  process.env.REPO_ROOT = path.join(getFixturesDir());
}

export function clearFixtureRepoRoot(): void {
  delete process.env.REPO_ROOT;
}
