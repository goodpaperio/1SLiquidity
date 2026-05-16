import fs from 'node:fs';
import path from 'node:path';
import type { BotConfig } from '../config/schema.js';
import { getBotsDir } from '../config/paths.js';

export interface BotState {
  lastUpdatedAt: string;
  lastEthBalanceWei: string;
  status: 'idle' | 'running';
  note?: string;
}

export function getStatePath(botId: string): string {
  return path.join(getBotsDir(), `${botId}.state.json`);
}

export function readBotState(botId: string): BotState | null {
  const p = getStatePath(botId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8')) as BotState;
}

export function writeBotState(botId: string, state: BotState): void {
  fs.mkdirSync(getBotsDir(), { recursive: true });
  fs.writeFileSync(getStatePath(botId), JSON.stringify(state, null, 2) + '\n');
}

/**
 * Minimal runner loop for phase B (scanner wired in phase C).
 */
export class BotRunner {
  private stopped = false;

  constructor(
    private readonly config: BotConfig,
    private readonly intervalMs = 60_000
  ) {}

  stop(): void {
    this.stopped = true;
  }

  async run(): Promise<void> {
    const id = this.config.id;
    console.log(`[${id}] runner started (address ${this.config.address})`);
    console.log(
      `[${id}] scanner not active yet — phase C. Holding process for PM2.`
    );

    while (!this.stopped) {
      writeBotState(id, {
        lastUpdatedAt: new Date().toISOString(),
        lastEthBalanceWei: '0',
        status: 'running',
        note: 'phase-b-idle',
      });
      await sleep(this.intervalMs);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
