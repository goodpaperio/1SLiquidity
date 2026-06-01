#!/usr/bin/env bash
# SSH to the dedicated liquidity-bot EC2 (not local-monitor on 18.134.179.139).
#
# Usage:
#   npm run open-liquidity-bot-ssh
#   npm run open-liquidity-bot-ssh -- 'cd ~/1SLiquidity/liquidity-bot && ls -la'
#
# Env: LIQUIDITY_BOT_HOST, LIQUIDITY_BOT_SSH_KEY, SSH_USER

set -euo pipefail

SERVER_IP="${LIQUIDITY_BOT_HOST:-13.40.113.237}"
SSH_KEY="${LIQUIDITY_BOT_SSH_KEY:-$HOME/.ssh/liquidity-bot-alpha.pem}"
SSH_USER="${SSH_USER:-ubuntu}"
SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"

if [ ! -f "$SSH_KEY_EXPANDED" ]; then
  echo "SSH key not found: $SSH_KEY_EXPANDED" >&2
  echo "Set LIQUIDITY_BOT_SSH_KEY or place key at ~/.ssh/liquidity-bot-alpha.pem" >&2
  exit 1
fi

echo "→ liquidity-bot @ $SSH_USER@$SERVER_IP" >&2
exec ssh -i "$SSH_KEY_EXPANDED" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$@"
