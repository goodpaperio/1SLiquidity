import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { parseEnvFile, upsertEnvVar } from '../../src/ops/envFile.js';

describe('phase B — envFile', () => {
  let tmpDir: string;

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('parses and upserts env keys', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lb-env-'));
    const envPath = path.join(tmpDir, '.env');
    fs.writeFileSync(envPath, 'FOO=bar\n# comment\n', 'utf8');
    upsertEnvVar(envPath, 'BOT_ALPHA_KEY', '0xabc');
    const map = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
    expect(map.get('FOO')).toBe('bar');
    expect(map.get('BOT_ALPHA_KEY')).toBe('0xabc');
  });
});
