import {
  TradeCreated,
  TradeStreamExecuted,
  TradeCancelled,
  TradeSettled,
  StreamFeesTaken,
  InstasettleFeeTaken,
  FeesClaimed,
  FeeRatesUpdated,
  LowLevelError,
  DataError
} from '../generated/Core/Core'
import {
  DEXRouteAdded,
  DEXRouteRemoved
} from '../generated/StreamDaemon/StreamDaemon'
import {
  Trade,
  TradeExecution,
  TradeCancellation,
  TradeSettlement,
  StreamFee,
  InstasettleFee,
  DEXRoute,
  FeeClaim,
  FeeRateUpdate,
  LowLevelError as LowLevelErrorEntity,
  DataError as DataErrorEntity
} from '../generated/schema'
import { BigInt, Bytes } from '@graphprotocol/graph-ts'

export function handleTradeCreated(event: TradeCreated): void {
  let trade = new Trade(event.params.tradeId.toString())
  trade.tradeId = event.params.tradeId
  trade.user = event.params.user
  trade.tokenIn = event.params.tokenIn
  trade.tokenOut = event.params.tokenOut
  trade.amountIn = event.params.amountIn
  trade.amountRemaining = event.params.amountRemaining
  trade.minAmountOut = event.params.minAmountOut
  trade.realisedAmountOut = event.params.realisedAmountOut
  trade.isInstasettlable = event.params.isInstasettlable
  trade.instasettleBps = event.params.instasettleBps
  trade.lastSweetSpot = event.params.lastSweetSpot
  trade.usePriceBased = event.params.usePriceBased
  trade.onlyInstasettle = event.params.onlyInstasettle
  trade.createdAt = event.block.timestamp
  trade.save()
}

export function handleTradeStreamExecuted(event: TradeStreamExecuted): void {
  // let trade = Trade.load(event.params.tradeId.toString())
  // if (trade == null) return

  let execution = new TradeExecution(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  execution.trade = event.params.tradeId.toString()
  execution.amountIn = event.params.amountIn
  execution.realisedAmountOut = event.params.realisedAmountOut
  execution.lastSweetSpot = event.params.lastSweetSpot
  execution.timestamp = event.block.timestamp
  execution.save()

  // Update trade state
  // trade.amountRemaining = trade.amountRemaining.minus(event.params.amountIn)
  // trade.realisedAmountOut = trade.realisedAmountOut.plus(event.params.realisedAmountOut)
  // trade.lastSweetSpot = event.params.lastSweetSpot
  // trade.save()
}

export function handleTradeCancelled(event: TradeCancelled): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let cancellation = new TradeCancellation(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  cancellation.trade = trade.id
  cancellation.isAutocancelled = event.params.isAutocancelled
  cancellation.amountRemaining = event.params.amountRemaining
  cancellation.realisedAmountOut = event.params.realisedAmountOut
  cancellation.timestamp = event.block.timestamp
  cancellation.save()

  // Update trade state
  trade.amountRemaining = event.params.amountRemaining
  trade.realisedAmountOut = event.params.realisedAmountOut
  trade.save()
}

export function handleTradeSettled(event: TradeSettled): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let settlement = new TradeSettlement(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  settlement.trade = trade.id
  settlement.settler = event.params.settler
  settlement.totalAmountIn = event.params.totalAmountIn
  settlement.totalAmountOut = event.params.totalAmountOut
  settlement.totalFees = event.params.totalFees
  settlement.timestamp = event.block.timestamp
  settlement.save()

  // Update trade state
  trade.amountRemaining = BigInt.fromI32(0)
  trade.realisedAmountOut = event.params.totalAmountOut
  trade.save()
}

// InstaSettleConfigured handler removed - event no longer exists

export function handleStreamFeesTaken(event: StreamFeesTaken): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let streamFee = new StreamFee(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  streamFee.trade = trade.id
  streamFee.bot = event.params.bot
  streamFee.token = event.params.token
  streamFee.protocolFee = event.params.protocolFee
  streamFee.botFee = event.params.botFee
  streamFee.timestamp = event.block.timestamp
  streamFee.save()
}

export function handleInstasettleFeeTaken(event: InstasettleFeeTaken): void {
  let trade = Trade.load(event.params.tradeId.toString())
  if (trade == null) return

  let instasettleFee = new InstasettleFee(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  instasettleFee.trade = trade.id
  instasettleFee.settler = event.params.settler
  instasettleFee.token = event.params.token
  instasettleFee.protocolFee = event.params.protocolFee
  instasettleFee.timestamp = event.block.timestamp
  instasettleFee.save()
}

export function handleDEXRouteAdded(event: DEXRouteAdded): void {
  let dexRoute = new DEXRoute(event.params.dex.toHexString())
  dexRoute.dex = event.params.dex
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

export function handleFeesClaimed(event: FeesClaimed): void {
  let feeClaim = new FeeClaim(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  feeClaim.recipient = event.params.recipient
  feeClaim.token = event.params.token
  feeClaim.amount = event.params.amount
  feeClaim.isProtocol = event.params.isProtocol
  feeClaim.timestamp = event.block.timestamp
  feeClaim.save()
}

export function handleFeeRatesUpdated(event: FeeRatesUpdated): void {
  let feeRateUpdate = new FeeRateUpdate(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  feeRateUpdate.streamProtocolFeeBps = event.params.streamProtocolFeeBps
  feeRateUpdate.streamBotFeeBps = event.params.streamBotFeeBps
  feeRateUpdate.instasettleProtocolFeeBps = event.params.instasettleProtocolFeeBps
  feeRateUpdate.timestamp = event.block.timestamp
  feeRateUpdate.save()
}

export function handleLowLevelError(event: LowLevelError): void {
  let lowLevelError = new LowLevelErrorEntity(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  lowLevelError.error = event.params.error
  lowLevelError.timestamp = event.block.timestamp
  lowLevelError.save()
}

export function handleDataError(event: DataError): void {
  let dataError = new DataErrorEntity(event.transaction.hash.toHexString() + '-' + event.logIndex.toString())
  dataError.error = event.params.error
  dataError.timestamp = event.block.timestamp
  dataError.save()
} 