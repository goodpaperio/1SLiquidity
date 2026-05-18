/**
 * Work around npm optional-deps bug: ensure platform rollup native binary exists.
 * https://github.com/npm/cli/issues/4828
 */
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);
const require = createRequire(path.join(packageRoot, 'package.json'));

function targetPackage() {
  const { platform, arch } = process;
  if (platform === 'darwin' && arch === 'arm64') {
    return '@rollup/rollup-darwin-arm64';
  }
  if (platform === 'darwin' && arch === 'x64') {
    return '@rollup/rollup-darwin-x64';
  }
  if (platform === 'linux' && arch === 'x64') {
    return '@rollup/rollup-linux-x64-gnu';
  }
  return null;
}

const pkg = targetPackage();
if (!pkg) {
  process.exit(0);
}

try {
  require.resolve(pkg);
  process.exit(0);
} catch {
  console.warn(`[liquidity-bot] Missing ${pkg}, installing...`);
  execSync(`npm install ${pkg}@4.46.3 --no-save --force`, {
    stdio: 'inherit',
    cwd: packageRoot,
    env: { ...process.env, npm_config_optional: 'true' },
  });
}
