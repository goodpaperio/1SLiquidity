# Railway build context must be the MONOREPO ROOT (decastream/),
# because liquidity-bot reads ../config and ../versions at runtime.
#
#   Build:  docker build -f liquidity-bot/Dockerfile -t liquidity-bot .
#   Run:    docker run -e BOT_ID=yolo -e MAINNET_RPC_URL=... -e BOT_YOLO_KEY=... liquidity-bot
FROM node:22-slim

WORKDIR /app/liquidity-bot

# Install deps first (better layer caching). postinstall needs scripts/.
COPY liquidity-bot/package.json liquidity-bot/package-lock.json ./
COPY liquidity-bot/scripts ./scripts
RUN npm ci --include=optional

# App source + sibling dirs the bot resolves via REPO_ROOT (default: /app)
COPY liquidity-bot ./
COPY config /app/config
COPY versions /app/versions

RUN npm run build

ENV NODE_ENV=production
# BOT_ID, MAINNET_RPC_URL, BOT_<ID>_KEY, DRY_RUN are provided as Railway variables.
CMD ["node", "dist/index.js"]
