# Decastream Subgraph Setup Guide

This guide provides step-by-step instructions for setting up the complete development environment for the Decastream protocol, including smart contracts, local blockchain, and subgraph indexing.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Foundry](https://getfoundry.sh/) (Forge, Anvil, Cast)
- [Node.js](https://nodejs.org/) (v16 or higher)
- [Git](https://git-scm.com/)

## 1. Setup Local Development Environment

### 1.1 Start Local Blockchain (Anvil)

First, start a local Ethereum blockchain using Anvil, make sure to update that in the `subgraph.yaml`:

```bash
# From the project root directory
anvil --fork-url https://mainnet.infura.io/v3/YOUR_API_KEY
```

If forking from a specific block number:

```bash
# From the project root directory
anvil --fork-url https://mainnet.infura.io/v3/YOUR_API_KEY --fork-block-number 22771179
```

Keep this terminal running. The blockchain will be available at `http://localhost:8545`.

### 1.2 Start Graph Node Services

In a new terminal, start the Graph Node services using Docker Compose:

```bash
# From the project root directory
docker-compose up
```

This will start:
- **Graph Node**: `http://localhost:8000` (GraphQL endpoint)
- **Graph Node Admin**: `http://localhost:8020` (Admin API)
- **IPFS**: `http://localhost:5001`
- **PostgreSQL**: `localhost:5432`

Wait for all services to be healthy (check with `docker-compose ps`).

## 2. Deploy Smart Contracts

### 2.1 Deploy Contracts to Local Blockchain

```bash
# From the project root directory
forge script --via-ir script/Deploy.s.sol:DeployScript --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast -vvvv
```

This will deploy all contracts using the first unlocked wallet on avnil and output their addresses. **Save these addresses** as you'll need them for the next steps.

### 2.2 Extract Contract Addresses

After deployment, you'll see output like:
```
Core deployed at: 0x...
Router deployed at: 0x...
StreamDaemon deployed at: 0x...
Fees deployed at: 0x...
```

## 3. Configure Subgraph

### 3.1 Update Contract Addresses

Edit `subgraph.yaml` and replace the placeholder addresses with your deployed contract addresses:

```yaml
# Update these addresses in subgraph.yaml
dataSources:
  - kind: ethereum/contract
    name: Core
    source:
      address: "0x..." # Your deployed Core address
      startBlock: 0    # Start from block 0 for local development or specify the block you forked from
```

### 3.2 Update ABI Files

Ensure your ABI files in the `abis/` directory are up to date.

## 4. Build and Deploy Subgraph

### 4.1 Install Dependencies

```bash
# From the subgraph directory
npm install
```

### 4.2 Generate TypeScript Types

```bash
npm run codegen
```

### 4.3 Build Subgraph

```bash
npm run build
```

### 4.4 Create Subgraph (First Time Only)

```bash
npm run create-local
```

### 4.5 Deploy Subgraph

```bash
npm run deploy-local
```

## 5. Test Trade Placement

### 5.1 Run Trade Placement Script

```bash
# From the project root directory
forge script --via-ir script/processes/TradePlacement_Subgraph.s.sol:TradePlacement --rpc-url http://localhost:8545 --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80 --broadcast -vvvv
```

This script will:
1. Wrap ETH to WETH
2. Approve WETH spending
3. Place a trade (WETH → USDC)
4. Display balance changes

### 5.2 Verify Subgraph Indexing

Check if your subgraph is indexing the events:

```bash
# Query the GraphQL endpoint
curl -X POST \
  -H "Content-Type: application/json" \
  --data '{"query":"{trades(first: 5) {id owner tokenIn tokenOut amountIn}}"}' \
  http://localhost:8000/subgraphs/name/decastream
```

## 6. Useful Commands

### 6.1 Subgraph Management

```bash
# Remove subgraph
npm run remove-local

# Redeploy subgraph
npm run deploy-local

# Check subgraph status
curl http://localhost:8000/subgraphs/name/decastream
```

### 6.2 Docker Management

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v

# View logs
docker-compose logs -f graph-node

# Restart services
docker-compose restart
```

## 6. Development Workflow

1. **Start environment**: Anvil + Docker services
2. **Deploy contracts**: Use Forge script
3. **Update subgraph**: Addresses and ABIs
4. **Deploy subgraph**: Build and deploy
5. **Test**: Run trade placement script
6. **Verify**: Check GraphQL queries
7. **Iterate**: Make changes and repeat

## 9. Production Deployment to Graph Studio

For production deployment to The Graph Studio:

1. Get your deploy key from [The Graph Studio](https://thegraph.com/studio/)
2. Create the subgraph in Graph Studio (or it will be created on first deploy)
3. Update `subgraph-mainnet.yaml` with production contract addresses and start blocks
4. Build and authenticate:

```bash
cd subgraph

# Generate code
npm run codegen-mainnet

# Build subgraph
npm run build-mainnet

# Clear any cached credentials (if needed)
rm -f ~/.graph/access-token.json ~/.config/graph/access-token.json

# Authenticate with your deploy key
GRAPH_ACCESS_TOKEN="<YOUR_DEPLOY_KEY>" npx graph auth https://api.studio.thegraph.com/deploy/

# Deploy to mainnet
npm run deploy-mainnet
```

See `STUDIO_DEPLOYMENT_GUIDE.md` for detailed instructions.

## 10. Additional Resources

- [Graph Protocol Documentation](https://thegraph.com/docs/)
- [Foundry Book](https://book.getfoundry.sh/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Anvil Documentation](https://book.getfoundry.sh/anvil/) 