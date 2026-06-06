import type { BotConfig } from '../config/schema.js';
import type { ScanOpportunity } from '../scan/types.js';
import {
  formatLeg1Alert,
  formatLeg2Alert,
  formatLeg2FailedAlert,
  formatTradeCompletedAlert,
} from './formatters.js';
import { TradeLedger } from './tradeLedger.js';
import { prefixBotMessage, sendTelegram } from './telegram.js';

export class TradeNotifier {
  private readonly ledger: TradeLedger;

  constructor(private readonly bot: BotConfig) {
    this.ledger = new TradeLedger(bot.id);
  }

  getLedger(): TradeLedger {
    return this.ledger;
  }

  async leg1Confirmed(
    opportunity: ScanOpportunity,
    amountIn: bigint,
    tokenLabel: string,
    txHash: string
  ): Promise<void> {
    const pair = `${opportunity.baseSymbol}→${opportunity.targetName}`;
    const body = formatLeg1Alert({
      pair,
      direction: opportunity.direction,
      dex: opportunity.candidateDex,
      amountIn,
      tokenLabel,
      txHash,
      roundTripBps: opportunity.roundTripBps,
    });
    await sendTelegram(prefixBotMessage(this.bot.id, body));
  }

  async leg2Confirmed(params: {
    opportunity: ScanOpportunity;
    tradeId: number;
    leg2AmountIn: bigint;
    leg2MinOut: bigint;
    leg1AmountIn: bigint;
    leg1TxHash: string;
    leg2TxHash: string;
    leg1TokenLabel: string;
    leg2TokenLabel: string;
    settlementToken: string;
  }): Promise<void> {
    const pair = `${params.opportunity.baseSymbol}→${params.opportunity.targetName}`;
    const body = formatLeg2Alert({
      pair,
      tradeId: params.tradeId,
      leg2TokenIn: params.leg2TokenLabel,
      leg2AmountIn: params.leg2AmountIn,
      leg2MinOut: params.leg2MinOut,
      settlementToken: params.settlementToken,
      txHash: params.leg2TxHash,
    });
    await sendTelegram(prefixBotMessage(this.bot.id, body));

    this.ledger.append({
      tradeId: params.tradeId,
      direction: params.opportunity.direction,
      pair,
      leg1TokenIn: params.leg1TokenLabel,
      leg1AmountIn: params.leg1AmountIn.toString(),
      leg2TokenIn: params.leg2TokenLabel,
      leg2AmountIn: params.leg2AmountIn.toString(),
      leg2MinOut: params.leg2MinOut.toString(),
      settlementToken: params.settlementToken,
      leg1TxHash: params.leg1TxHash,
      leg2TxHash: params.leg2TxHash,
      placedAt: new Date().toISOString(),
      status: 'open',
    });
  }

  async leg2Failed(
    opportunity: ScanOpportunity,
    leg1TxHash: string,
    error: string
  ): Promise<void> {
    const pair = `${opportunity.baseSymbol}→${opportunity.targetName}`;
    const body = formatLeg2FailedAlert({ pair, leg1TxHash, error });
    await sendTelegram(prefixBotMessage(this.bot.id, body));

    this.ledger.append({
      direction: opportunity.direction,
      pair,
      leg1TokenIn: opportunity.direction === 'forward' ? opportunity.baseSymbol : opportunity.targetName,
      leg1AmountIn: opportunity.amountIn.toString(),
      leg2TokenIn: '',
      leg2AmountIn: '0',
      leg2MinOut: '0',
      settlementToken: opportunity.baseSymbol,
      leg1TxHash,
      placedAt: new Date().toISOString(),
      status: 'leg2_failed',
      error,
    });
  }

  async tradeCompleted(params: {
    tradeId: number;
    pair: string;
    leg1AmountIn: bigint;
    settlementToken: string;
    finalOut: bigint;
    placedAt: string;
  }): Promise<void> {
    const pnl = params.finalOut - params.leg1AmountIn;
    const completedAt = new Date().toISOString();
    const body = formatTradeCompletedAlert({
      tradeId: params.tradeId,
      pair: params.pair,
      leg1AmountIn: params.leg1AmountIn,
      settlementToken: params.settlementToken,
      finalOut: params.finalOut,
      pnl,
      placedAt: params.placedAt,
      completedAt,
    });
    await sendTelegram(prefixBotMessage(this.bot.id, body));

    this.ledger.updateOpen(
      { tradeId: params.tradeId },
      {
        status: 'completed',
        finalSettlementOut: params.finalOut.toString(),
        pnlAmount: pnl.toString(),
        completedAt,
      }
    );
  }
}
