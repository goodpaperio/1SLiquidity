# Railway build context must be the MONOREPO ROOT,
# because liquidity-bot-v2 reads ../config and ../versions at runtime.
#
#   Build:  docker build -f liquidity-bot-v2/Dockerfile -t liquidity-bot-v2 .
#   Run:    docker run -e BOT_ID=yolo -e MAINNET_RPC_URL=... -e BOT_YOLO_KEY=... -e HOT_PAIRS_API_BASE_URL=... liquidity-bot-v2
FROM node:22-slim

WORKDIR /app/liquidity-bot-v2

# Install deps first (better layer caching). postinstall needs scripts/.
COPY liquidity-bot-v2/package.json liquidity-bot-v2/package-lock.json ./
COPY liquidity-bot-v2/scripts ./scripts
RUN npm ci --include=optional

# App source + sibling dirs the bot resolves via REPO_ROOT (default: /app)
COPY liquidity-bot-v2 ./
COPY config /app/config
COPY versions /app/versions

RUN npm run build

ENV NODE_ENV=production
# BOT_ID, MAINNET_RPC_URL, BOT_<ID>_KEY, DRY_RUN, HOT_PAIRS_API_BASE_URL are Railway variables.
CMD ["node", "dist/index.js"]
