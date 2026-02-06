# 1SLiquidity Keeper Service

Serverless service for fetching DEX data (prices, reserves) for the 1SLiquidity protocol.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
Create a `.env` file with:
```
RPC_URL=your_rpc_url
CHAIN_ID=chain_id
```

## Development

Run the service locally:
```bash
npm run dev
```

The service will be available at:
- http://localhost:3000/dev/reserves?tokenA=0x...&tokenB=0x...
- http://localhost:3000/dev/prices?tokenA=0x...&tokenB=0x...
- http://localhost:3000/dev/price?token=0x...

## Testing

Run tests:
```bash
npm test
```

## Deployment

Deploy to development:
```bash
npm run deploy:dev
```

Deploy to production:
```bash
npm run deploy:prod
```

## API Endpoints

### Get Reserves
```
GET /reserves?tokenA=0x...&tokenB=0x...
```

Response:
```json
[
  {
    "dex": "uniswap-v2",
    "pairAddress": "0x...",
    "reserves": {
      "token0": "1000000",
      "token1": "100"
    }
  },
  {
    "dex": "uniswap-v3-3000",
    "pairAddress": "0x...",
    "reserves": {
      "token0": "500000",
      "token1": "0"
    }
  }
]
```

### Get Prices
```
GET /prices?tokenA=0x...&tokenB=0x...
```

Response:
```json
[
  {
    "dex": "uniswap-v2",
    "pairAddress": "0x...",
    "price": "0.0001"
  },
  {
    "dex": "uniswap-v3-3000",
    "pairAddress": "0x...",
    "price": "0.0002"
  }
]
```

### Get Token Price
```
GET /price?token=0x...
```

Response:
```json
{
  "price": "0.0001",
  "dex": "uniswap-v2",
  "pairAddress": "0x..."
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- 400: Bad Request - Invalid parameters
- 404: Not Found - Token pair not found
- 500: Internal Server Error - Server-side issues

Error response format:
```json
{
  "error": "Error message description"
}
``` 