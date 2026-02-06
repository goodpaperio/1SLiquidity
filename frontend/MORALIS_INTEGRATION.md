# Moralis API Integration for Wallet Tokens

This document explains how the Moralis API has been integrated into the 1SLiquidity frontend to fetch wallet token balances.

## Overview

The integration allows the application to:

- Fetch all tokens owned by a connected wallet address
- Display token balances and values in USD
- Calculate the total wallet balance
- Show token price changes (increase/decrease)
- Cache API responses using React Query to optimize performance

## Setup Instructions

1. **Install Dependencies**

   ```bash
   npm install moralis @moralisweb3/next @tanstack/react-query --legacy-peer-deps
   ```

2. **Set up Environment Variables**

   Create or update your `.env.local` file with your Moralis API key:

   ```
   NEXT_PUBLIC_MORALIS_API_KEY=your_moralis_api_key_here
   ```

   You can obtain a Moralis API key by signing up at [admin.moralis.io](https://admin.moralis.io).

3. **Set up React Query Provider**

   Ensure your application is wrapped with the React Query provider in your main layout or entry point:

   ```tsx
   // app/layout.tsx or similar
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

   const queryClient = new QueryClient()

   export default function RootLayout({ children }) {
     return (
       <QueryClientProvider client={queryClient}>
         {children}
       </QueryClientProvider>
     )
   }
   ```

## Implementation Details

### Files Created/Modified

1. **`app/lib/moralis.ts`**

   - Core utilities for interacting with Moralis API
   - Functions to fetch wallet tokens and calculate balances
   - Chain mapping to convert string identifiers (like 'eth') to Moralis EvmChain objects

2. **`app/lib/hooks/useWalletTokens.tsx`**

   - React hook that uses React Query for fetching and caching token data
   - Handles loading states, error handling, and data formatting
   - Implements caching with configurable stale and cache times

3. **`app/components/sidebar/walletDetailsSidebar.tsx`**
   - Updated to use the React Query enhanced hook for displaying tokens
   - Shows total balance and token details
   - Provides a manual refresh button for updating token data

### How It Works

1. **Initialization**
   - Moralis is initialized with your API key when needed
2. **Chain Selection**
   - We use Moralis EvmChain objects for chain identification
   - Supported chains include: 'eth', 'bsc', 'polygon', 'avalanche', 'fantom', 'cronos', 'arbitrum'
   - Users can switch between chains using the dropdown in the interface
3. **Token Fetching with React Query**
   - When a wallet is connected, the `useWalletTokens` hook fetches all tokens for that address
   - React Query caches the results to minimize API calls and improve performance
   - The cache is refreshed automatically based on configured stale time (1 minute by default)
   - Manual refresh is available via the UI
4. **Price Data**
   - For each token, we fetch the current USD price
   - We handle tokens with insufficient liquidity by setting their price to 0
   - Price change data is used to show increase/decrease indicators
5. **UI Integration**
   - Token balances are displayed in the wallet sidebar
   - Total wallet value is calculated and shown
   - Each token displays its value and price change status
   - Loading and refreshing states are clearly indicated to the user

## React Query Configuration

The implementation uses the following React Query settings:

- **Query Keys**: `['wallet-tokens', address, chain]` - Unique key for each wallet address and chain
- **Stale Time**: 1 minute - After this time, data is considered stale and will be refetched on the next component mount
- **Cache Time**: 5 minutes - How long the data remains in the cache after components unmount
- **Retry**: 2 attempts - Failed requests will be retried twice before giving up
- **Refetch on Window Focus**: Disabled - Data won't automatically refresh when the user returns to the tab

These settings can be adjusted in the `useWalletTokens.tsx` file to suit your application's needs.

## Handling Tokens with Insufficient Liquidity

Many tokens, especially on newer or less liquid chains, may not have enough liquidity for Moralis to calculate a price. When this happens:

1. The token will still be displayed in the wallet list
2. Its price will be set to 0, so it won't contribute to the total wallet balance
3. The error "Insufficient liquidity in pools to calculate the price" is suppressed in the console
4. The token will still show its balance (quantity) correctly

This approach ensures that users can see all their tokens, even if some don't have reliable price data.

## Usage

To use the React Query enhanced Moralis hook:

```tsx
import { useWalletTokens } from '@/app/lib/hooks/useWalletTokens'
import { calculateWalletBalance } from '@/app/lib/moralis'

const YourComponent = () => {
  const { address } = useWalletAddress() // Your wallet address hook

  const { tokens, rawTokens, isLoading, error, refetch, isFetching } =
    useWalletTokens(
      address,
      'eth' // Chain identifier - see supported chains in CHAIN_MAPPING
    )

  // Calculate total balance
  const totalBalance = calculateWalletBalance(rawTokens)

  // Manual refresh function
  const handleRefresh = async () => {
    await refetch()
  }

  // Render your component with the token data
  return (
    <div>
      <button onClick={handleRefresh} disabled={isLoading || isFetching}>
        Refresh {isFetching && '(refreshing...)'}
      </button>

      {isLoading ? (
        <p>Loading tokens...</p>
      ) : isFetching ? (
        <p>Refreshing tokens...</p>
      ) : error ? (
        <p>Error: {error.message}</p>
      ) : (
        <>
          <p>Total Balance: ${totalBalance.toFixed(2)}</p>
          <ul>
            {tokens.map((token) => (
              <li key={token.symbol}>
                {token.name}: {token.value}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
```

## Supported Chains

The integration supports the following blockchains:

| Chain Identifier | Blockchain          |
| ---------------- | ------------------- |
| 'eth'            | Ethereum            |
| 'ethereum'       | Ethereum            |
| 'bsc'            | Binance Smart Chain |
| 'polygon'        | Polygon             |
| 'avalanche'      | Avalanche           |
| 'fantom'         | Fantom              |
| 'cronos'         | Cronos              |
| 'arbitrum'       | Arbitrum            |

## Additional Information

- The React Query cache helps stay within Moralis API rate limits
- For multi-chain applications, each chain+address combination has its own cache entry
- The cache time (5 minutes) and stale time (1 minute) are configurable in the `useWalletTokens.tsx` file
- Not all tokens will have price data due to liquidity limitations, especially on smaller chains
- The manual refresh button is useful when users make transactions and want to see updated balances
