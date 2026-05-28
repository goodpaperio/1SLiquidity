#!/usr/bin/env bash
#
# Pause liquidity-bot PM2 process on the dedicated EC2 host (from your laptop).
# Not the local-monitor cron — use bot:pause / bot:start for that.
#
# Usage: ./scripts/pause-liquidity-bot.sh [server-ip] [ssh-key-path] [bot-id]
# Env defaults: LIQUIDITY_BOT_HOST, LIQUIDITY_BOT_SSH_KEY, LIQUIDITY_BOT_ID
#
set -euo pipefail

SERVER_IP="${1:-${LIQUIDITY_BOT_HOST:-}}"
SSH_KEY="${2:-${LIQUIDITY_BOT_SSH_KEY:-}}"
BOT_ID="${3:-${LIQUIDITY_BOT_ID:-alpha}}"
SSH_USER="${SSH_USER:-ubuntu}"
REMOTE_ROOT="${REMOTE_ROOT:-~/1SLiquidity}"

if [[ -z "$SERVER_IP" || -z "$SSH_KEY" ]]; then
  echo "Usage: $0 <server-ip> <ssh-key-path> [bot-id]"
  echo "Or set LIQUIDITY_BOT_HOST and LIQUIDITY_BOT_SSH_KEY"
  echo "Example: $0 18.134.179.139 ~/.ssh/1sliquidity.pem alpha"
  exit 1
fi

if [[ ! -f "$SSH_KEY" ]]; then
  echo "ERROR: SSH key not found: $SSH_KEY"
  exit 1
fi

echo "==> Pausing liquidity-bot ($BOT_ID) on $SSH_USER@$SERVER_IP"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "bash -s" <<EOF
set -euo pipefail
cd $REMOTE_ROOT/liquidity-bot
if [[ -f ~/.nvm/nvm.sh ]]; then
  source ~/.nvm/nvm.sh
  nvm use 22 >/dev/null || true
fi
npm run stop -- --bot "$BOT_ID" || true
pm2 list | grep -E 'liquidity-bot|name' || true
EOF
echo "==> liquidity-bot-$BOT_ID stopped (PM2)"
