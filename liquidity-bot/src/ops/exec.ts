import { spawnSync } from 'node:child_process';

export interface RunCommandOptions {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  dryRun?: boolean;
}

export interface RunCommandResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  status: number | null;
}

export function runCommand(
  command: string,
  args: string[] = [],
  options: RunCommandOptions = {}
): RunCommandResult {
  if (options.dryRun) {
    const printable = [command, ...args].join(' ');
    console.log(`[dry-run] ${printable}`);
    return { ok: true, stdout: '', stderr: '', status: 0 };
  }

  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
    shell: false,
  });

  return {
    ok: result.status === 0,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    status: result.status,
  };
}
