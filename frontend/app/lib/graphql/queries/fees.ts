import { gql } from '@apollo/client'

export const GET_FEE_RATE_UPDATES = gql`
  query GetFeeRateUpdates($first: Int = 10) {
    feeRateUpdates(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      streamProtocolFeeBps
      streamBotFeeBps
      instasettleProtocolFeeBps
      timestamp
      blockNumber
      txHash
    }
  }
`

export const GET_FEE_CLAIMS = gql`
  query GetFeeClaims($first: Int = 50) {
    feeClaims(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      recipient
      token
      amount
      isProtocol
      timestamp
      blockNumber
      txHash
    }
  }
`
