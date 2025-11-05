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
      }
      instasettlements {
        id
        settler
        totalAmountIn
        totalAmountOut
        totalFees
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
      instasettlements(first: 100) {
        id
      }
      cancellations(first: 100) {
        id
      }
    }
  }
`

// export const GET_TRADES = gql`
//   query MyQuery($first: Int = 10, $skip: Int = 0) {
//     trades(first: $first, orderBy: id, orderDirection: asc, skip: $skip) {
//       amountIn
//       amountRemaining
//       createdAt
//       instasettleBps
//       isInstasettlable
//       lastSweetSpot
//       minAmountOut
//       tokenIn
//       tokenOut
//       tradeId
//       user
//       realisedAmountOut
//       id
//       executions {
//         amountIn
//         id
//         lastSweetSpot
//         timestamp
//         realisedAmountOut
//       }
//       cancellations {
//         id
//         timestamp
//       }
//       settlements {
//         id
//         settler
//         totalAmountIn
//         totalAmountOut
//         totalFees
//         timestamp
//       }
//     }
//   }
// `
