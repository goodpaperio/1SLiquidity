/** PM2 process name for a bot id. */
export function pm2AppName(botId: string): string {
  return `liquidity-bot-${botId.toLowerCase()}`;
}

export interface Pm2StartOptions {
  packageRoot: string;
  botId: string;
  nodeInterpreter?: string;
}

/** argv for `pm2 start ecosystem.config.cjs --only <app>` */
export function buildPm2StartArgs(
  options: Pm2StartOptions
): { appName: string; args: string[]; env: Record<string, string> } {
  const appName = pm2AppName(options.botId);
  return {
    appName,
    args: [
      'start',
      'ecosystem.config.cjs',
      '--only',
      appName,
      '--update-env',
    ],
    env: {
      BOT_ID: options.botId.toLowerCase(),
    },
  };
}

export function buildPm2StopArgs(botId: string): string[] {
  return ['stop', pm2AppName(botId)];
}

export function buildPm2StatusArgs(botId?: string): string[] {
  if (botId) {
    return ['describe', pm2AppName(botId)];
  }
  return ['status'];
}
