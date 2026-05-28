#!/usr/bin/env node
import 'dotenv/config';
import { parseCliArgs, requireBotId } from './parse-args.js';
import { loadBotConfig } from '../config/loadBot.js';
import { createProvider } from '../chain/provider.js';
import { OpportunityCache } from '../scan/OpportunityCache.js';
import { DexQuoteService } from '../scan/DexQuoteService.js';
import { formatOpportunityLine } from '../scan/formatOpportunity.js';
import { QuoteScanner } from '../scan/QuoteScanner.js';
import { detectOpportunitiesForPair } from '../scan/opportunityDetector.js';
import { dedupeByPair, rankOpportunities } from '../scan/selectOpportunity.js';
import type { BotConfig } from '../config/schema.js';

async function main(): Promise<void> {
  const { positional, flags } = parseCliArgs(process.argv);
  const botId =
    typeof flags.bot === 'string'
      ? flags.bot.toLowerCase()
      : requireBotId(positional);

  const stepUsd =
    typeof flags.step === 'string' ? Number(flags.step) : 5;
  const maxUsd =
    typeof flags.max === 'string' ? Number(flags.max) : 100;
  const startUsd =
    typeof flags.start === 'string' ? Number(flags.start) : stepUsd;

  const bot = loadBotConfig(botId);
  const provider = createProvider();
  const maxPairs =
    typeof flags['max-pairs'] === 'string'
      ? Number(flags['max-pairs'])
      : undefined;

  console.log(
    `\n[nominal-sweep] bot=${botId} discover mode, WETH bases=[${bot.baseTokens.join(', ')}]`
  );
  console.log(
    `  spreadBand=${bot.scan.minSpreadBps}-${bot.scan.maxSpreadBps}bps  step=$${stepUsd}  start=$${startUsd}  max=$${maxUsd}`
  );
  console.log(
    '  Stops at first nominal with ≥1 opportunity (full RPC re-quote each step)\n'
  );

  const quoteService = new DexQuoteService(provider);
  const scanner = new QuoteScanner(provider, new OpportunityCache(), {
    discoverMode: true,
    maxPairsPerRun: Number.isFinite(maxPairs) ? maxPairs : undefined,
    pairDelayMs: 15,
  });

  for (let nominal = startUsd; nominal <= maxUsd; nominal += stepUsd) {
    const botAtNominal: BotConfig = {
      ...bot,
      trade: { ...bot.trade, nominalTradeUsd: nominal },
    };

    console.log(`--- nominalTradeUsd = $${nominal} ---`);
    const sweepStart = Date.now();
    const collected = await scanner.collectQuotes(botAtNominal);
    const allOpps = [];
    for (const snap of collected.snapshots) {
      allOpps.push(
        ...(await detectOpportunitiesForPair(
          snap.tradePair,
          snap.amountIn,
          snap.quotes,
          botAtNominal,
          quoteService
        ))
      );
    }
    const unique = dedupeByPair(allOpps);
    const sec = ((Date.now() - sweepStart) / 1000).toFixed(1);
    console.log(
      `  scanned ${collected.pairsScanned} pairs in ${sec}s → ${allOpps.length} hits (${unique.length} pairs)`
    );

    if (unique.length > 0) {
      console.log('\n  First opportunities at this size:');
      for (const o of rankOpportunities(unique).slice(0, 10)) {
        console.log(`    ${formatOpportunityLine(o)}`);
      }
      console.log(
        `\n[nominal-sweep] Stop: use nominalTradeUsd=${nominal} in bots/${botId}.json for live runs near this quote size.\n`
      );
      return;
    }
  }

  console.log(
    `\n[nominal-sweep] No opportunities from $${startUsd} to $${maxUsd} in $${stepUsd} steps.\n`
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
