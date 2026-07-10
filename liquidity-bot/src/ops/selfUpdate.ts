import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { getPackageRoot, getRepoRoot } from '../config/paths.js';

export const DEFAULT_PULL_COOLDOWN_MS = 5 * 60 * 1000;

export interface SelfUpdateOptions {
  botId: string;
  branch?: string;
  dryRun?: boolean;
  allowDirty?: boolean;
  /** When true (default), spawn detached and return immediately. */
  detached?: boolean;
}

export function selfUpdateScriptPath(): string {
  return path.join(getPackageRoot(), 'scripts', 'self-update.sh');
}

export function pullLockPath(botId: string): string {
  const safe = botId.toLowerCase().replace(/[^a-z0-9_-]/g, '');
  return path.join(
    process.env.TMPDIR ?? '/tmp',
    `liquidity-bot-pull-${safe}.lock`
  );
}

export function isPullInProgress(botId: string): boolean {
  const lock = pullLockPath(botId);
  if (!fs.existsSync(lock)) return false;
  try {
    const pid = Number(fs.readFileSync(lock, 'utf8').trim());
    if (!Number.isFinite(pid) || pid <= 0) return true;
    process.kill(pid, 0);
    return true;
  } catch {
    try {
      fs.unlinkSync(lock);
    } catch {
      /* ignore */
    }
    return false;
  }
}

export function canStartPull(opts: {
  lastPullAt?: string;
  cooldownMs?: number;
  now?: number;
}): { ok: true } | { ok: false; reason: string } {
  const cooldown = opts.cooldownMs ?? DEFAULT_PULL_COOLDOWN_MS;
  const now = opts.now ?? Date.now();
  if (!opts.lastPullAt) return { ok: true };
  const last = Date.parse(opts.lastPullAt);
  if (!Number.isFinite(last)) return { ok: true };
  const elapsed = now - last;
  if (elapsed < cooldown) {
    const waitSec = Math.ceil((cooldown - elapsed) / 1000);
    return {
      ok: false,
      reason: `Pull cooldown: wait ${waitSec}s before next /pull`,
    };
  }
  return { ok: true };
}

/** Local vs origin SHA summary (no network write). */
export function getPullStatus(branch = 'main'): {
  branch: string;
  localSha: string;
  remoteSha: string | null;
  behind: boolean;
  message: string;
} {
  const repoRoot = getRepoRoot();
  const localSha = gitShort(repoRoot, 'HEAD');
  let remoteSha: string | null = null;
  try {
    remoteSha = gitShort(repoRoot, `origin/${branch}`);
  } catch {
    remoteSha = null;
  }
  const behind = Boolean(remoteSha && remoteSha !== localSha);
  const message = remoteSha
    ? behind
      ? `local ${localSha} behind origin/${branch} ${remoteSha} — /pull to update`
      : `local ${localSha} matches origin/${branch}`
    : `local ${localSha} (origin/${branch} unknown — fetch first)`;
  return { branch, localSha, remoteSha, behind, message };
}

function gitShort(cwd: string, rev: string): string {
  const res = spawnSync('git', ['rev-parse', '--short', rev], {
    cwd,
    encoding: 'utf8',
  });
  if (res.status !== 0) {
    throw new Error(res.stderr?.trim() || `git rev-parse ${rev} failed`);
  }
  return res.stdout.trim();
}

/**
 * Start self-update. Detached mode is for Telegram (process will be restarted).
 * Foreground mode is for CLI `npm run pull`.
 */
export function startSelfUpdate(options: SelfUpdateOptions): {
  started: boolean;
  message: string;
} {
  const botId = options.botId.toLowerCase();
  if (isPullInProgress(botId)) {
    return {
      started: false,
      message: `Pull already in progress for bot=${botId}`,
    };
  }

  const script = selfUpdateScriptPath();
  if (!fs.existsSync(script)) {
    return {
      started: false,
      message: `Missing self-update script: ${script}`,
    };
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    BOT_ID: botId,
    PULL_BRANCH: options.branch ?? process.env.PULL_BRANCH ?? 'main',
    PULL_ALLOW_DIRTY: options.allowDirty
      ? '1'
      : (process.env.PULL_ALLOW_DIRTY ?? '0'),
    REPO_ROOT: process.env.REPO_ROOT ?? getRepoRoot(),
    DRY_RUN: options.dryRun ? '1' : '0',
  };

  const detached = options.detached !== false;

  if (detached) {
    const child = spawn('bash', [script], {
      detached: true,
      stdio: 'ignore',
      env,
      cwd: getPackageRoot(),
    });
    child.unref();
    return {
      started: true,
      message:
        `Pull started for bot=${botId} (branch=${env.PULL_BRANCH}). ` +
        `Bot will restart shortly; you'll get a Telegram ping when done.`,
    };
  }

  const res = spawnSync('bash', [script], {
    env,
    cwd: getPackageRoot(),
    encoding: 'utf8',
    stdio: 'inherit',
  });
  if (res.status !== 0) {
    return {
      started: false,
      message: `Pull failed (exit ${res.status ?? 'unknown'})`,
    };
  }
  return {
    started: true,
    message: `Pull finished for bot=${botId}`,
  };
}
