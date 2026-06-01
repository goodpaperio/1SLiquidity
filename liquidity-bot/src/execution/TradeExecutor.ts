import type { Provider, Signer } from 'ethers';
import { getBalance } from '../chain/erc20.js';
import { isDryRun } from '../chain/wallet.js';
import type { BotConfig } from '../config/schema.js';
import { DexQuoteService } from '../scan/DexQuoteService.js';
import type { PairCooldownStore } from '../scan/pairCooldown.js';
import type { TradeHistoryStore } from '../scan/tradeHistory.js';
import { formatPredictedWin } from '../scan/formatOpportunity.js';
import type { ScanOpportunity } from '../scan/types.js';
import { swapExactOnCandidateDex } from './directSwap.js';
import { placeTradeOnCore } from './placeTradeLeg.js';
import { applySlippageBps } from './slippage.js';

export interface ExecutionResult {
  dryRun: boolean;
  leg1TxHash?: string;
  leg2TxHash?: string;
  altAmountIn?: bigint;
  baseAmountOutMin?: bigint;
}

export class TradeExecutor {
  private readonly quotes: DexQuoteService;

  constructor(
    private readonly bot: BotConfig,
    private readonly provider: Provider,
    private readonly pairCooldown?: PairCooldownStore,
    private readonly tradeHistory?: TradeHistoryStore
  ) {
    this.quotes = new DexQuoteService(provider);
  }

  async execute(
    opportunity: ScanOpportunity,
    signer: Signer
  ): Promise<ExecutionResult> {
    if (opportunity.direction === 'reverse') {
      return this.executeReverse(opportunity, signer);
    }
    return this.executeForward(opportunity, signer);
  }

  private async executeForward(
    opportunity: ScanOpportunity,
    signer: Signer
  ): Promise<ExecutionResult> {
    const owner = await signer.getAddress();
    if (owner.toLowerCase() !== this.bot.address.toLowerCase()) {
      throw new Error(
        `Signer ${owner} does not match bot address ${this.bot.address}`
      );
    }

    const leg1MinOut = await this.freshLeg1MinOut(opportunity);

    console.log(
      `\n[execute] ${opportunity.baseSymbol}→${opportunity.targetName} forward ` +
        `coupled=${opportunity.roundTripBps}bps predictedWin=${formatPredictedWin(opportunity)} ` +
        `leg1@${opportunity.candidateDex} leg2sell@${opportunity.referenceSellDex} ` +
        `amountIn=${opportunity.amountIn} leg1MinOut=${leg1MinOut}`
    );

    if (isDryRun()) {
      return this.logForwardDryRun(opportunity, owner);
    }

    const altBefore = await getBalance(
      opportunity.tokenOut,
      owner,
      this.provider
    );

    const leg1 = await swapExactOnCandidateDex(
      opportunity.candidateDex,
      opportunity.tokenIn,
      opportunity.tokenOut,
      opportunity.amountIn,
      leg1MinOut,
      owner,
      signer
    );
    console.log(`[execute] leg1 confirmed ${leg1.txHash}`);

    const altAfter = await getBalance(
      opportunity.tokenOut,
      owner,
      this.provider
    );
    const altReceived = altAfter - altBefore;
    if (altReceived <= 0n) {
      throw new Error(
        `Leg1 produced no alt balance delta (before=${altBefore} after=${altAfter})`
      );
    }

    const refQuote = await this.quotes.quoteDex(
      opportunity.referenceSellDex,
      opportunity.tokenOut,
      opportunity.tokenIn,
      altReceived
    );
    if (!refQuote || refQuote.amountOut <= 0n) {
      throw new Error(
        `Cannot quote leg2 on sell DEX ${opportunity.referenceSellDex}`
      );
    }
    const leg2MinOut = applySlippageBps(
      refQuote.amountOut,
      this.bot.trade.decastreamAmountOutMinBufferBps
    );

    console.log(
      `[execute] leg2 placeTrade alt→base amountIn=${altReceived} minOut=${leg2MinOut}`
    );

    const leg2 = await placeTradeOnCore(
      this.bot,
      opportunity.tokenOut,
      opportunity.tokenIn,
      altReceived,
      leg2MinOut,
      signer
    );
    console.log(`[execute] leg2 confirmed ${leg2.txHash}`);

    this.recordLiveTrade(opportunity);

    return {
      dryRun: false,
      leg1TxHash: leg1.txHash,
      leg2TxHash: leg2.txHash,
      altAmountIn: altReceived,
      baseAmountOutMin: leg2MinOut,
    };
  }

  private async executeReverse(
    opportunity: ScanOpportunity,
    signer: Signer
  ): Promise<ExecutionResult> {
    const owner = await signer.getAddress();
    if (owner.toLowerCase() !== this.bot.address.toLowerCase()) {
      throw new Error(
        `Signer ${owner} does not match bot address ${this.bot.address}`
      );
    }

    const leg1MinOut = await this.freshLeg1MinOut(opportunity);

    console.log(
      `\n[execute] ${opportunity.baseSymbol}→${opportunity.targetName} reverse ` +
        `coupled=${opportunity.roundTripBps}bps predictedWin=${formatPredictedWin(opportunity)} ` +
        `leg1@${opportunity.candidateDex} alt→base leg2@${opportunity.deepBuyDex} base→alt ` +
        `altIn=${opportunity.amountIn} leg1MinBaseOut=${leg1MinOut}`
    );

    if (isDryRun()) {
      const baseBal = await getBalance(
        opportunity.tokenIn,
        owner,
        this.provider
      );
      const buyQuote = await this.quotes.quoteDex(
        opportunity.deepBuyDex,
        opportunity.tokenOut,
        opportunity.tokenIn,
        leg1MinOut
      );
      const leg2Min = buyQuote
        ? applySlippageBps(
            buyQuote.amountOut,
            this.bot.trade.decastreamAmountOutMinBufferBps
          )
        : 0n;
      console.log(
        `[execute] DRY_RUN=1 — would leg1 swap alt→base ` +
          `amountIn≈${opportunity.amountIn} minBaseOut=${leg1MinOut}; ` +
          `leg2 placeTrade base→alt minAltOut=${leg2Min} (base bal ${baseBal})`
      );
      return { dryRun: true };
    }

    const baseBefore = await getBalance(
      opportunity.tokenOut,
      owner,
      this.provider
    );

    const leg1 = await swapExactOnCandidateDex(
      opportunity.candidateDex,
      opportunity.tokenIn,
      opportunity.tokenOut,
      opportunity.amountIn,
      leg1MinOut,
      owner,
      signer
    );
    console.log(`[execute] leg1 confirmed ${leg1.txHash}`);

    const baseAfter = await getBalance(
      opportunity.tokenOut,
      owner,
      this.provider
    );
    const baseReceived = baseAfter - baseBefore;
    if (baseReceived <= 0n) {
      throw new Error(
        `Leg1 produced no base delta (before=${baseBefore} after=${baseAfter})`
      );
    }

    const buyQuote = await this.quotes.quoteDex(
      opportunity.deepBuyDex,
      opportunity.tokenOut,
      opportunity.tokenIn,
      baseReceived
    );
    if (!buyQuote || buyQuote.amountOut <= 0n) {
      throw new Error(`Cannot quote leg2 on ${opportunity.deepBuyDex}`);
    }
    const leg2MinOut = applySlippageBps(
      buyQuote.amountOut,
      this.bot.trade.decastreamAmountOutMinBufferBps
    );

    console.log(
      `[execute] leg2 placeTrade base→alt amountIn=${baseReceived} minAltOut=${leg2MinOut}`
    );

    const leg2 = await placeTradeOnCore(
      this.bot,
      opportunity.tokenOut,
      opportunity.tokenIn,
      baseReceived,
      leg2MinOut,
      signer
    );
    console.log(`[execute] leg2 confirmed ${leg2.txHash}`);

    this.recordLiveTrade(opportunity);

    return {
      dryRun: false,
      leg1TxHash: leg1.txHash,
      leg2TxHash: leg2.txHash,
      baseAmountOutMin: leg2MinOut,
    };
  }

  private async logForwardDryRun(
    opportunity: ScanOpportunity,
    owner: string
  ): Promise<ExecutionResult> {
    const altBal = await getBalance(
      opportunity.tokenOut,
      owner,
      this.provider
    );
    const refQuote = await this.quotes.quoteDex(
      opportunity.referenceSellDex,
      opportunity.tokenOut,
      opportunity.tokenIn,
      opportunity.amountOutCandidate
    );
    const leg2Min = refQuote
      ? applySlippageBps(
          refQuote.amountOut,
          this.bot.trade.decastreamAmountOutMinBufferBps
        )
      : applySlippageBps(
          opportunity.amountIn,
          this.bot.trade.decastreamAmountOutMinBufferBps
        );
    console.log(
      `[execute] DRY_RUN=1 — would leg1 base→alt; leg2 placeTrade alt→base ` +
        `amountIn≈${opportunity.amountOutCandidate} minOut=${leg2Min} ` +
        `(current alt balance ${altBal})`
    );
    return { dryRun: true };
  }

  /** Re-quote leg-1 on the chosen DEX immediately before submit. */
  private async freshLeg1MinOut(
    opportunity: ScanOpportunity
  ): Promise<bigint> {
    const stale = applySlippageBps(
      opportunity.amountOutCandidate,
      this.bot.trade.directSwapSlippageBps
    );
    const fresh = await this.quotes.quoteDex(
      opportunity.candidateDex,
      opportunity.tokenIn,
      opportunity.tokenOut,
      opportunity.amountIn
    );
    if (!fresh || fresh.amountOut <= 0n) {
      console.warn(
        `[execute] leg1 fresh quote failed; using scan amountOutCandidate`
      );
      return stale;
    }
    const minOut = applySlippageBps(
      fresh.amountOut,
      this.bot.trade.directSwapSlippageBps
    );
    if (minOut !== stale) {
      console.log(
        `[execute] leg1 fresh quote ${fresh.amountOut} minOut=${minOut} (scan min was ${stale})`
      );
    }
    return minOut;
  }

  private recordLiveTrade(opportunity: ScanOpportunity): void {
    this.pairCooldown?.recordTrade(opportunity.pairKey);
    this.tradeHistory?.recordLiveTrade(
      opportunity.pairKey,
      opportunity.direction,
      opportunity.targetName,
      opportunity.tokenIn,
      opportunity.tokenOut
    );
  }
}
