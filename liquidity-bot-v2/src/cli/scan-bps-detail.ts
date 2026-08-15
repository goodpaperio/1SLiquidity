#!/usr/bin/env node
import 'dotenv/config';
import { loadBotConfig } from '../config/loadBot.js';
import { createProvider } from '../chain/provider.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import { DexQuoteService } from '../scan/DexQuoteService.js';
import { formatOpportunityLine } from '../scan/formatOpportunity.js';
import { QuoteScanner } from '../scan/QuoteScanner.js';
import { collectQuoteSnapshots } from '../scan/collectQuotes.js';
import { detectOpportunitiesForPair } from '../scan/opportunityDetector.js';
import type { BotConfig } from '../config/schema.js';

const THRESHOLDS = [1000, 900, 800, 700, 600, 500, 400, 300, 200, 100];

async function main(): Promise<void> {
  const provider = createProvider();
  const bot = loadBotConfig('alpha');
  const quoteService = new DexQuoteService(provider);
  const scanner = new QuoteScanner(provider, new OpportunityCache(), {
    discoverMode: true,
    pairDelayMs: 15,
  });

  console.error('Collecting quotes (234 pairs, ~8 min)...\n');
  const collected = await collectQuoteSnapshots(scanner, bot, {
    discoverMode: true,
  });

  for (const bps of THRESHOLDS) {
    const botAtBps: BotConfig = {
      ...bot,
      scan: { ...bot.scan, minSpreadBps: bps },
    };
    const lines: string[] = [];
    for (const snap of collected.snapshots) {
      const opps = await detectOpportunitiesForPair(
        snap.tradePair,
        snap.amountIn,
        snap.quotes,
        botAtBps,
        quoteService
      );
      for (const o of opps) {
        lines.push(`  ${formatOpportunityLine(o)}`);
      }
    }
    console.log(`\n=== ${bps} bps (${lines.length} signals) ===`);
    if (lines.length === 0) console.log('  (none)');
    else for (const l of lines) console.log(l);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
