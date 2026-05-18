import { gql } from '@apollo/client'

export const GET_TRADES = gql`
  query MyQuery($first: Int = 10, $skip: Int = 0) {
    trades(
      first: $first
      orderBy: createdAt
      orderDirection: desc
      skip: $skip
    ) {
      amountIn
      amountRemaining
      createdAt
      updatedAt
      instasettleBps
      isInstasettlable
      lastSweetSpot
      minAmountOut
      tokenIn
      tokenOut
      tradeId
      user
      realisedAmountOut
      id
      onlyInstasettle
      usePriceBased
      attempts
      status
      executions(first: 50, orderBy: timestamp, orderDirection: desc) {
        amountIn
        id
        lastSweetSpot
        timestamp
        realisedAmountOut
      }
      cancellations {
        id
        timestamp
        isAutocancelled
      }
      instasettlements {
        id
        settler
        totalAmountIn
        totalAmountOut
        totalFees
        timestamp
      }
      completions {
        id
        timestamp
        finalRealisedAmountOut
      }
      attemptEvents {
        id
        attempts
        timestamp
      }
      streamFees {
        id
        bot
        token
        protocolFee
        botFee
        timestamp
      }
      instasettleFees {
        id
        settler
        token
        protocolFee
        timestamp
      }
    }
  }
`

export const GET_INSTASETTLE_TRADES = gql`
  query MyQuery($first: Int = 200, $skip: Int = 0) {
    trades(
      first: $first
      orderBy: createdAt
      orderDirection: desc
      skip: $skip
    ) {
      id
      isInstasettlable
      tokenIn
      tokenOut
      status
      instasettlements(first: 100) {
        id
      }
      cancellations(first: 100) {
        id
      }
    }
  }
`

export const GET_TRADE_BY_ID = gql`
  query GetTradeById($tradeId: String!) {
    trades(where: { tradeId: $tradeId }, first: 1) {
      amountIn
      amountRemaining
      createdAt
      updatedAt
      instasettleBps
      isInstasettlable
      lastSweetSpot
      minAmountOut
      tokenIn
      tokenOut
      tradeId
      user
      realisedAmountOut
      id
      onlyInstasettle
      usePriceBased
      attempts
      status
      executions(first: 50, orderBy: timestamp, orderDirection: desc) {
        amountIn
        id
        lastSweetSpot
        timestamp
        realisedAmountOut
      }
      cancellations {
        id
        timestamp
        isAutocancelled
      }
      instasettlements {
        id
        settler
        totalAmountIn
        totalAmountOut
        totalFees
        timestamp
      }
      completions {
        id
        timestamp
        finalRealisedAmountOut
      }
      attemptEvents {
        id
        attempts
        timestamp
      }
      streamFees {
        id
        bot
        token
        protocolFee
        botFee
        timestamp
      }
      instasettleFees {
        id
        settler
        token
        protocolFee
        timestamp
      }
    }
  }
`
