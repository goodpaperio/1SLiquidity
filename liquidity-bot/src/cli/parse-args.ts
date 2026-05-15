/** Parse `npm run <cmd> bot -- alpha --write-env` style argv. */
export function parseCliArgs(argv: string[]): {
  command: string | undefined;
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const args = argv.slice(2);
  let command: string | undefined;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  let i = 0;
  if (args[0] && !args[0].startsWith('-')) {
    command = args[0];
    i = 1;
  }
  if (args[i] === 'bot') {
    i += 1;
  }

  for (; i < args.length; i++) {
    const a = args[i];
    if (a === '--') continue;
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        flags[key] = next;
        i += 1;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }

  return { command, positional, flags };
}

export function requireBotId(positional: string[]): string {
  const id = positional[0];
  if (!id) {
    throw new Error('Bot id required. Example: npm run generate bot -- alpha');
  }
  return id.toLowerCase();
}
