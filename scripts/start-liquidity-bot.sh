#!/usr/bin/env bash
#
# Turn liquidity-bot ON on the dedicated EC2 host (from your laptop).
#
# Does everything needed for a live PM2 loop:
#   git pull → enabled:true → preflight .env → build → pm2 start → pm2 save
#
# Usage: ./scripts/start-liquidity-bot.sh [server-ip] [ssh-key-path] [bot-id]
#   npm run liquidity-bot:on
#   npm run start-liquidity-bot
#
# Not the local-monitor cron — use bot:start / bot:pause for 18.134.179.139.
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/liquidity-bot-remote.sh
source "$SCRIPT_DIR/lib/liquidity-bot-remote.sh"

liquidity_bot_resolve_args "$@"
liquidity_bot_require_key

echo "==> Turning ON liquidity-bot ($BOT_ID) @ $SSH_USER@$SERVER_IP"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "bash -s" <<EOF
set -euo pipefail
BOT_ID="$BOT_ID"
BRANCH="$LIQUIDITY_BOT_BRANCH"
REMOTE_ROOT="$REMOTE_ROOT"

REMOTE_ROOT="\${REMOTE_ROOT:-\$HOME/1SLiquidity}"
REMOTE_ROOT="\${REMOTE_ROOT/#\~/\$HOME}"
if [[ ! -d "\$REMOTE_ROOT" ]]; then
  echo "ERROR: repo not found at \$REMOTE_ROOT (clone to ~/1SLiquidity on the server)" >&2
  exit 1
fi

if [[ -f ~/.nvm/nvm.sh ]]; then
  source ~/.nvm/nvm.sh
  nvm use 22 >/dev/null || true
fi

cd "\$REMOTE_ROOT"
echo "→ git pull origin \$BRANCH"
git fetch origin
git checkout "\$BRANCH"
git pull --ff-only origin "\$BRANCH"

cd liquidity-bot
BOT_JSON="bots/\${BOT_ID}.json"
if [[ ! -f "\$BOT_JSON" ]]; then
  echo "ERROR: missing \$BOT_JSON" >&2
  exit 1
fi

if [[ ! -f .env ]]; then
  echo "ERROR: missing liquidity-bot/.env (RPC, BOT_\${BOT_ID^^}_KEY, DRY_RUN)" >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a && source .env && set +a

if [[ "\${DRY_RUN:-1}" == "1" ]]; then
  echo "WARN: DRY_RUN=1 — bot will scan but not send txs. Set DRY_RUN=0 for live."
fi

KEY_VAR="BOT_\$(echo "\$BOT_ID" | tr '[:lower:]' '[:upper:]')_KEY"
if [[ -z "\${!KEY_VAR:-}" ]]; then
  echo "ERROR: \$KEY_VAR not set in liquidity-bot/.env" >&2
  exit 1
fi

echo "→ enabled:true in \$BOT_JSON"
node -e "
const fs = require('fs');
const p = process.argv[1];
const j = JSON.parse(fs.readFileSync(p, 'utf8'));
j.enabled = true;
fs.writeFileSync(p, JSON.stringify(j, null, 2) + '\n');
" "\$BOT_JSON"

echo "→ npm ci + build"
npm ci --include=optional
npm run build

echo "→ pm2 start"
npm run stop bot -- "\$BOT_ID" 2>/dev/null || true
npm run start bot -- "\$BOT_ID"
pm2 save

echo ""
npm run status bot -- "\$BOT_ID"
echo ""
echo "→ recent logs (check for 'runner started', not 'enabled=false')"
sleep 2
pm2 logs "liquidity-bot-\${BOT_ID}" --lines 15 --nostream 2>/dev/null || true
EOF

echo ""
echo "✅ liquidity-bot-$BOT_ID is ON (enabled:true, PM2 running)"
echo "   logs:  npm run open-liquidity-bot-ssh -- 'pm2 logs liquidity-bot-$BOT_ID'"
echo "   off:   npm run liquidity-bot:off"
