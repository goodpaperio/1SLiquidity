'use client'

import {
  ApolloClient,
  InMemoryCache,
  createHttpLink,
  FieldMergeFunction,
} from '@apollo/client'

// Custom fetch function to force GET requests
const customFetch = (input: RequestInfo | URL, options: RequestInit = {}) => {
  const uri = input.toString()
  const query = options.body ? JSON.parse(options.body as string).query : ''
  const variables = options.body
    ? JSON.parse(options.body as string).variables
    : {}

  // Convert the query and variables to URL parameters
  const params = new URLSearchParams({
    query: query,
    variables: JSON.stringify(variables),
  })

  // Always use GET and append the query as URL parameters
  return fetch(`${uri}?${params.toString()}`, {
    ...options,
    method: 'GET',
    body: undefined, // Remove body for GET request
  })
}

// Create an http link for the GraphQL endpoint
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Configure cache options
const cache = new InMemoryCache({
  typePolicies: {
    Query: {
      fields: {
        globalStreams: {
          // Merge function for pagination if needed
          merge(existing = [], incoming) {
            return [...existing, ...incoming]
          },
        },
        trades: {
          // Merge function for pagination
          keyArgs: ['orderBy', 'orderDirection'],
          merge(existing = [], incoming, { args }) {
            // If we have an offset, we should merge the incoming data at that offset
            const merged = existing ? existing.slice(0) : []
            const offset = args?.skip ?? 0

            for (let i = 0; i < incoming.length; ++i) {
              merged[offset + i] = incoming[i]
            }

            return merged
          },
        },
      },
    },
    Trade: {
      // Use id as the key for Trade objects
      keyFields: ['id'],
      fields: {
        executions: {
          // Replace executions instead of merging
          merge(existing = [], incoming) {
            return incoming
          },
        },
      },
    },
  },
})

// Initialize Apollo Client
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache,
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'cache-first',
    },
  },
})
