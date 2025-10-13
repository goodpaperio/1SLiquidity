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
      settlements {
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
