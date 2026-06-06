#!/usr/bin/env bash

set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <server-ip> <ssh-key-path> [bot-id] [branch]"
  echo "Example: $0 13.40.113.237 ~/.ssh/liquidity-bot-alpha.pem alpha main"
  exit 1
fi

SERVER_IP="$1"
SSH_KEY="$2"
BOT_ID="${3:-alpha}"
BRANCH="${4:-main}"
SSH_USER="${SSH_USER:-ubuntu}"
REMOTE_ROOT="${REMOTE_ROOT:-~/1SLiquidity}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "ERROR: SSH key not found: $SSH_KEY"
  exit 1
fi

echo "==> Testing SSH connectivity"
ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "echo connected"

echo "==> Redeploying liquidity bot on remote host"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "bash -s" <<EOF
set -euo pipefail
REMOTE_ROOT="$REMOTE_ROOT"

REMOTE_ROOT="\${REMOTE_ROOT:-\$HOME/1SLiquidity}"
REMOTE_ROOT="\${REMOTE_ROOT/#\~/\$HOME}"
cd "\$REMOTE_ROOT"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [[ -f ~/.nvm/nvm.sh ]]; then
  source ~/.nvm/nvm.sh
  nvm use 22 >/dev/null || true
fi

cd liquidity-bot
npm ci --include=optional
npm run build
npm run stop bot -- "$BOT_ID" || true
npm run start bot -- "$BOT_ID"
npm run status bot -- "$BOT_ID"
EOF

echo "==> Redeploy complete for bot '$BOT_ID' on $SERVER_IP"
