/**
 * Liquidity bot entry (runner expanded in phase B+).
 */
import 'dotenv/config';
import { listBotIds, loadEnabledBots } from './config/index.js';

function main(): void {
  const bots = listBotIds();
  const enabled = loadEnabledBots();
  console.log(
    `[liquidity-bot] package ready — ${bots.length} bot config(s), ${enabled.length} enabled`
  );
  if (enabled.length === 0) {
    console.log(
      'No enabled bots. Generate one: npm run generate bot -- alpha'
    );
  }
}

main();
