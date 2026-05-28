import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..'
);

describe('phase 0 — scaffold', () => {
  it('has package.json with verify scripts', () => {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> };
    expect(pkg.scripts['verify:0']).toBeDefined();
    expect(pkg.scripts['verify:a']).toBeDefined();
    expect(pkg.scripts.test).toContain('vitest');
    expect(pkg.scripts.build).toBe('tsc');
  });

  it('has tsconfig and vitest config', () => {
    expect(fs.existsSync(path.join(packageRoot, 'tsconfig.json'))).toBe(true);
    expect(fs.existsSync(path.join(packageRoot, 'vitest.config.ts'))).toBe(
      true
    );
  });

  it('has .env.example and bot template', () => {
    expect(fs.existsSync(path.join(packageRoot, '.env.example'))).toBe(true);
    expect(
      fs.existsSync(path.join(packageRoot, 'bots', 'alpha.example.json'))
    ).toBe(true);
  });

  it('gitignores secrets and ARCHITECTURE.md', () => {
    const gitignore = fs.readFileSync(
      path.join(packageRoot, '.gitignore'),
      'utf8'
    );
    expect(gitignore).toContain('ARCHITECTURE.md');
    expect(gitignore).toContain('.env');
  });

  it('src entry exists', () => {
    expect(fs.existsSync(path.join(packageRoot, 'src', 'index.ts'))).toBe(
      true
    );
  });
});
