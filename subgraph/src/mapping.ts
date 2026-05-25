import {
  TradeCreated,
  TradeStreamExecuted,
  TradeCancelled,
  TradeInstasettled,
  TradeCompleted,
  AttemptsIncremented,
  StreamFeesTaken,
  InstasettleFeeTaken,
  FeesClaimed,
  FeeRatesUpdated,
  BotAdded,
  BotRemoved,
  LowLevelError,
  DataError
} from '../generated/Core/Core'
import {
  DEXRouteAdded,
  DEXRouteRemoved,
  DEXRouterUpdated
} from '../generated/StreamDaemon/StreamDaemon'
import {
  Trade,
  TradeExecution,
  TradeCancellation,
  TradeInstasettlement,
  TradeCompletion,
  TradeAttempt,
  StreamFee,
  InstasettleFee,
  DEXRoute,
  DEXRouterUpdate,
  Bot,
  BotEvent,
  FeeClaim,
  FeeRateUpdate,
  LowLevelError as LowLevelErrorEntity,
  DataError as DataErrorEntity,
  PendingStreamFees
} from '../generated/schema'
import { BigInt, Bytes, ethereum, store } from '@graphprotocol/graph-ts'

const STATUS_OPEN = 'OPEN'
const STATUS_COMPLETED = 'COMPLETED'
const STATUS_INSTASETTLED = 'INSTASETTLED'
const STATUS_CANCELLED = 'CANCELLED'

function eventId(event: ethereum.Event): string {
  return event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
}

export function handleTradeCreated(event: TradeCreated): void {
  let tradeId = event.params.tradeId.toString()
  let trade = new Trade(tradeId)
  trade.tradeId = event.params.tradeId
  trade.user = event.params.user
  trade.tokenIn = event.params.tokenIn
  trade.tokenOut = event.params.tokenOut
  trade.amountIn = event.params.amountIn
  trade.amountRemaining = event.params.amountRemaining
  trade.minAmountOut = event.params.minAmountOut
  trade.isInstasettlable = event.params.isInstasettlable
  trade.instasettleBps = event.params.instasettleBps
  trade.lastSweetSpot = event.params.lastSweetSpot
  trade.usePriceBased = event.params.usePriceBased
  trade.onlyInstasettle = event.params.onlyInstasettle
  trade.attempts = 0
  trade.status = STATUS_OPEN
  trade.createdAt = event.block.timestamp
  trade.updatedAt = event.block.timestamp

  // The TradeCreated event carries the GROSS realisedAmountOut from the in-memory
  // updatedTrade returned by executeStream, BEFORE _applyStreamFees subtracted the
  // protocol/bot fees in placeTrade. On-chain storage at this point already holds
  // the NET value. PendingStreamFees accumulates the fees taken by the initial
  // stream (StreamFeesTaken fires before TradeCreated inside placeTrade).
  let pending = PendingStreamFees.load(tradeId)
  let priorFees = pending == null ? BigInt.fromI32(0) : pending.totalFees
  trade.realisedAmountOut = event.params.realisedAmountOut.minus(priorFees)
  trade.save()

  if (pending != null) {
    store.remove('PendingStreamFees', tradeId)
  }
}

export function handleTradeStreamExecuted(event: TradeStreamExecuted): void {
  let execution = new TradeExecution(eventId(event))
  execution.trade = event.params.tradeId.toString()
  execution.amountIn = event.params.amountIn
  execution.realisedAmountOut = event.params.realisedAmountOut
  execution.lastSweetSpot = event.params.lastSweetSpot
  execution.timestamp = event.block.timestamp
  execution.blockNumber = event.block.number
  execution.txHash = event.transaction.hash
  execution.save()

  // event.params.realisedAmountOut equals the in-memory storageTrade value right
  // after `storageTrade.realisedAmountOut += amountOut`, i.e. NET-so-far plus the
  // GROSS of this stream. handleStreamFeesTaken fires next and subtracts the
  // fees, leaving the entity at the on-chain NET value.
  // When this is the initial stream from placeTrade, the Trade entity does not
  // exist yet; handleTradeCreated runs last and seeds the NET value via the
  // PendingStreamFees helper.
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade != null) {
    trade.realisedAmountOut = event.params.realisedAmountOut
    trade.lastSweetSpot = event.params.lastSweetSpot
    trade.updatedAt = event.block.timestamp
    trade.save()
  }
}

export function handleTradeCancelled(event: TradeCancelled): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let cancellation = new TradeCancellation(eventId(event))
  cancellation.trade = trade.id
  cancellation.isAutocancelled = event.params.isAutocancelled
  cancellation.amountRemaining = event.params.amountRemaining
  cancellation.realisedAmountOut = event.params.realisedAmountOut
  cancellation.timestamp = event.block.timestamp
  cancellation.blockNumber = event.block.number
  cancellation.txHash = event.transaction.hash
  cancellation.save()

  trade.amountRemaining = event.params.amountRemaining
  trade.realisedAmountOut = event.params.realisedAmountOut
  trade.status = STATUS_CANCELLED
  trade.updatedAt = event.block.timestamp
  trade.save()
}

export function handleTradeInstasettled(event: TradeInstasettled): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let instasettlement = new TradeInstasettlement(eventId(event))
  instasettlement.trade = trade.id
  instasettlement.settler = event.params.settler
  instasettlement.totalAmountIn = event.params.totalAmountIn
  instasettlement.totalAmountOut = event.params.totalAmountOut
  instasettlement.totalFees = event.params.totalFees
  instasettlement.timestamp = event.block.timestamp
  instasettlement.blockNumber = event.block.number
  instasettlement.txHash = event.transaction.hash
  instasettlement.save()

  trade.amountRemaining = BigInt.fromI32(0)
  trade.realisedAmountOut = event.params.totalAmountOut
  trade.status = STATUS_INSTASETTLED
  trade.updatedAt = event.block.timestamp
  trade.save()
}

export function handleTradeCompleted(event: TradeCompleted): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let completion = new TradeCompletion(eventId(event))
  completion.trade = trade.id
  completion.finalRealisedAmountOut = event.params.finalRealisedAmountOut
  completion.timestamp = event.block.timestamp
  completion.blockNumber = event.block.number
  completion.txHash = event.transaction.hash
  completion.save()

  trade.realisedAmountOut = event.params.finalRealisedAmountOut
  trade.amountRemaining = BigInt.fromI32(0)
  trade.status = STATUS_COMPLETED
  trade.updatedAt = event.block.timestamp
  trade.save()
}

export function handleAttemptsIncremented(event: AttemptsIncremented): void {
  let attemptsValue = event.params.attempts

  let attempt = new TradeAttempt(eventId(event))
  attempt.trade = event.params.tradeId.toString()
  attempt.attempts = attemptsValue
  attempt.timestamp = event.block.timestamp
  attempt.blockNumber = event.block.number
  attempt.txHash = event.transaction.hash
  attempt.save()

  let trade = Trade.load(event.params.tradeId.toString())
  if (trade != null) {
    trade.attempts = attemptsValue
    trade.updatedAt = event.block.timestamp
    trade.save()
  }
}

export function handleStreamFeesTaken(event: StreamFeesTaken): void {
  let streamFee = new StreamFee(eventId(event))
  streamFee.trade = event.params.tradeId.toString()
  streamFee.bot = event.params.bot
  streamFee.token = event.params.token
  streamFee.protocolFee = event.params.protocolFee
  streamFee.botFee = event.params.botFee
  streamFee.timestamp = event.block.timestamp
  streamFee.blockNumber = event.block.number
  streamFee.txHash = event.transaction.hash
  streamFee.save()

  // Mirror the contract:
  //   trades[tradeId].realisedAmountOut -= (protocolFee + botFee)
  // so the subgraph's Trade.realisedAmountOut equals the on-chain (net) storage.
  let totalFee = event.params.protocolFee.plus(event.params.botFee)
  let tradeId = event.params.tradeId.toString()
  let trade = Trade.load(tradeId)
  if (trade != null) {
    trade.realisedAmountOut = trade.realisedAmountOut.minus(totalFee)
    trade.updatedAt = event.block.timestamp
    trade.save()
  } else {
    // placeTrade's initial stream emits StreamFeesTaken BEFORE TradeCreated.
    // Stash the fees so handleTradeCreated can subtract them from the gross
    // realisedAmountOut carried by the TradeCreated event.
    let pending = PendingStreamFees.load(tradeId)
    if (pending == null) {
      pending = new PendingStreamFees(tradeId)
      pending.totalFees = BigInt.fromI32(0)
    }
    pending.totalFees = pending.totalFees.plus(totalFee)
    pending.save()
  }
}

export function handleInstasettleFeeTaken(event: InstasettleFeeTaken): void {
  let instasettleFee = new InstasettleFee(eventId(event))
  instasettleFee.trade = event.params.tradeId.toString()
  instasettleFee.settler = event.params.settler
  instasettleFee.token = event.params.token
  instasettleFee.protocolFee = event.params.protocolFee
  instasettleFee.timestamp = event.block.timestamp
  instasettleFee.blockNumber = event.block.number
  instasettleFee.txHash = event.transaction.hash
  instasettleFee.save()
}

export function handleFeesClaimed(event: FeesClaimed): void {
  let feeClaim = new FeeClaim(eventId(event))
  feeClaim.recipient = event.params.recipient
  feeClaim.token = event.params.token
  feeClaim.amount = event.params.amount
  feeClaim.isProtocol = event.params.isProtocol
  feeClaim.timestamp = event.block.timestamp
  feeClaim.blockNumber = event.block.number
  feeClaim.txHash = event.transaction.hash
  feeClaim.save()
}

export function handleFeeRatesUpdated(event: FeeRatesUpdated): void {
  let feeRateUpdate = new FeeRateUpdate(eventId(event))
  feeRateUpdate.streamProtocolFeeBps = event.params.streamProtocolFeeBps
  feeRateUpdate.streamBotFeeBps = event.params.streamBotFeeBps
  feeRateUpdate.instasettleProtocolFeeBps = event.params.instasettleProtocolFeeBps
  feeRateUpdate.timestamp = event.block.timestamp
  feeRateUpdate.blockNumber = event.block.number
  feeRateUpdate.txHash = event.transaction.hash
  feeRateUpdate.save()
}

export function handleBotAdded(event: BotAdded): void {
  let botId = event.params.bot.toHexString()
  let bot = Bot.load(botId)
  if (bot == null) {
    bot = new Bot(botId)
    bot.bot = event.params.bot
  }
  bot.isWhitelisted = true
  bot.addedAt = event.block.timestamp
  bot.removedAt = null
  bot.save()

  let botEvent = new BotEvent(eventId(event))
  botEvent.bot = event.params.bot
  botEvent.action = 'ADDED'
  botEvent.timestamp = event.block.timestamp
  botEvent.blockNumber = event.block.number
  botEvent.txHash = event.transaction.hash
  botEvent.save()
}

export function handleBotRemoved(event: BotRemoved): void {
  let botId = event.params.bot.toHexString()
  let bot = Bot.load(botId)
  if (bot == null) {
    bot = new Bot(botId)
    bot.bot = event.params.bot
  }
  bot.isWhitelisted = false
  bot.removedAt = event.block.timestamp
  bot.save()

  let botEvent = new BotEvent(eventId(event))
  botEvent.bot = event.params.bot
  botEvent.action = 'REMOVED'
  botEvent.timestamp = event.block.timestamp
  botEvent.blockNumber = event.block.number
  botEvent.txHash = event.transaction.hash
  botEvent.save()
}

export function handleDEXRouteAdded(event: DEXRouteAdded): void {
  let id = event.params.dex.toHexString()
  let dexRoute = DEXRoute.load(id)
  if (dexRoute == null) {
    dexRoute = new DEXRoute(id)
    dexRoute.dex = event.params.dex
  }
  dexRoute.isActive = true
  dexRoute.addedAt = event.block.timestamp
  dexRoute.removedAt = null
  dexRoute.save()
}

export function handleDEXRouteRemoved(event: DEXRouteRemoved): void {
  let dexRoute = DEXRoute.load(event.params.dex.toHexString())
  if (dexRoute == null) return

  dexRoute.isActive = false
  dexRoute.removedAt = event.block.timestamp
  dexRoute.save()
}

export function handleDEXRouterUpdated(event: DEXRouterUpdated): void {
  let id = event.params.dex.toHexString()
  let dexRoute = DEXRoute.load(id)
  if (dexRoute == null) {
    dexRoute = new DEXRoute(id)
    dexRoute.dex = event.params.dex
    dexRoute.isActive = true
    dexRoute.addedAt = event.block.timestamp
  }
  dexRoute.router = event.params.router
  dexRoute.routerUpdatedAt = event.block.timestamp
  dexRoute.save()

  let update = new DEXRouterUpdate(eventId(event))
  update.dex = event.params.dex
  update.router = event.params.router
  update.timestamp = event.block.timestamp
  update.blockNumber = event.block.number
  update.txHash = event.transaction.hash
  update.save()
}

export function handleLowLevelError(event: LowLevelError): void {
  let lowLevelError = new LowLevelErrorEntity(eventId(event))
  lowLevelError.error = event.params.error
  lowLevelError.timestamp = event.block.timestamp
  lowLevelError.blockNumber = event.block.number
  lowLevelError.txHash = event.transaction.hash
  lowLevelError.save()
}

export function handleDataError(event: DataError): void {
  let dataError = new DataErrorEntity(eventId(event))
  dataError.error = event.params.error
  dataError.timestamp = event.block.timestamp
  dataError.blockNumber = event.block.number
  dataError.txHash = event.transaction.hash
  dataError.save()
}
