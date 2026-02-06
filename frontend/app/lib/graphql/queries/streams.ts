import { gql } from '@apollo/client'

export const GET_GLOBAL_STREAMS = gql`
  query GetGlobalStreams {
    globalStreams {
      scheduled {
        id
        sender
        recipient
        tokenAddress
        amount
        startTime
        endTime
        status
        tokenSymbol
        tokenDecimals
        streamedAmount
        remainingAmount
      }
      ongoing {
        id
        sender
        recipient
        tokenAddress
        amount
        startTime
        endTime
        status
        tokenSymbol
        tokenDecimals
        streamedAmount
        remainingAmount
      }
      total {
        scheduled
        ongoing
        scheduledValue
        ongoingValue
      }
    }
  }
`
