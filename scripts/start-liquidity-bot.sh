#!/usr/bin/env bash
#
# Start liquidity-bot PM2 process on the dedicated EC2 host (from your laptop).
# Not the local-monitor cron — use bot:start / bot:pause for that.
#
# Usage: ./scripts/start-liquidity-bot.sh [server-ip] [ssh-key-path] [bot-id]
# Env defaults: LIQUIDITY_BOT_HOST, LIQUIDITY_BOT_SSH_KEY, LIQUIDITY_BOT_ID
#
set -euo pipefail

SERVER_IP="${1:-${LIQUIDITY_BOT_HOST:-13.40.113.237}}"
SSH_KEY="${2:-${LIQUIDITY_BOT_SSH_KEY:-$HOME/.ssh/liquidity-bot-alpha.pem}}"
BOT_ID="${3:-${LIQUIDITY_BOT_ID:-alpha}}"
SSH_USER="${SSH_USER:-ubuntu}"
REMOTE_ROOT="${REMOTE_ROOT:-~/1SLiquidity}"

SSH_KEY="${SSH_KEY/#\~/$HOME}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "ERROR: SSH key not found: $SSH_KEY"
  exit 1
fi

echo "==> Starting liquidity-bot ($BOT_ID) on $SSH_USER@$SERVER_IP"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "bash -s" <<EOF
set -euo pipefail
cd $REMOTE_ROOT/liquidity-bot
if [[ -f ~/.nvm/nvm.sh ]]; then
  source ~/.nvm/nvm.sh
  nvm use 22 >/dev/null || true
fi
npm run build
npm run start bot -- "$BOT_ID"
npm run status bot -- "$BOT_ID"
EOF
echo "==> liquidity-bot-$BOT_ID started (PM2)"
