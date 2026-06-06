#!/usr/bin/env bash
#
# Turn liquidity-bot OFF on the dedicated EC2 host (from your laptop).
#
#   pm2 stop → enabled:false → pm2 save
#
# Usage: ./scripts/pause-liquidity-bot.sh [server-ip] [ssh-key-path] [bot-id]
#   npm run liquidity-bot:off
#   npm run pause-liquidity-bot
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/liquidity-bot-remote.sh
source "$SCRIPT_DIR/lib/liquidity-bot-remote.sh"

liquidity_bot_resolve_args "$@"
liquidity_bot_require_key

echo "==> Turning OFF liquidity-bot ($BOT_ID) @ $SSH_USER@$SERVER_IP"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "bash -s" <<EOF
set -euo pipefail
BOT_ID="$BOT_ID"
REMOTE_ROOT="$REMOTE_ROOT"

REMOTE_ROOT="\${REMOTE_ROOT:-\$HOME/1SLiquidity}"
REMOTE_ROOT="\${REMOTE_ROOT/#\~/\$HOME}"

if [[ -f ~/.nvm/nvm.sh ]]; then
  source ~/.nvm/nvm.sh
  nvm use 22 >/dev/null || true
fi

cd "\$REMOTE_ROOT/liquidity-bot"
BOT_JSON="bots/\${BOT_ID}.json"

echo "→ pm2 stop"
npm run stop bot -- "\$BOT_ID" 2>/dev/null || true

if [[ -f "\$BOT_JSON" ]]; then
  echo "→ enabled:false in \$BOT_JSON"
  node -e "
const fs = require('fs');
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.enabled = false;
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
" "\$BOT_JSON"
fi

pm2 save 2>/dev/null || true
pm2 list | grep -E 'liquidity-bot|name' || pm2 list || true
EOF

echo ""
echo "✅ liquidity-bot-$BOT_ID is OFF (enabled:false, PM2 stopped)"
echo "   on:    npm run liquidity-bot:on"
