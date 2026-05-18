import { gql } from '@apollo/client'

export const GET_BOTS = gql`
  query GetBots($first: Int = 50) {
    bots(first: $first, orderBy: addedAt, orderDirection: desc) {
      id
      bot
      isWhitelisted
      addedAt
      removedAt
    }
  }
`

export const GET_BOT_EVENTS = gql`
  query GetBotEvents($first: Int = 50) {
    botEvents(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      bot
      action
      timestamp
      blockNumber
      txHash
    }
  }
`
