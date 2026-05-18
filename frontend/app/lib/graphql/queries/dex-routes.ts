import { gql } from '@apollo/client'

export const GET_DEX_ROUTES = gql`
  query GetDexRoutes($first: Int = 50) {
    dexRoutes(first: $first, orderBy: addedAt, orderDirection: desc) {
      id
      dex
      router
      isActive
      addedAt
      removedAt
      routerUpdatedAt
    }
  }
`

export const GET_DEX_ROUTER_UPDATES = gql`
  query GetDexRouterUpdates($first: Int = 50) {
    dexRouterUpdates(first: $first, orderBy: timestamp, orderDirection: desc) {
      id
      dex
      router
      timestamp
      blockNumber
      txHash
    }
  }
`
