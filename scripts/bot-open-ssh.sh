#!/usr/bin/env bash
# Open an SSH session to the bot EC2 instance (same defaults as redeploy-server.sh).
#
# Usage:
#   npm run bot:open-ssh
#   SERVER_IP=1.2.3.4 SSH_KEY=~/.ssh/key.pem npm run bot:open-ssh
#   npm run bot:open-ssh -- 'grep core ~/1SLiquidity/local-monitor/src/config.ts'
#
# Optional .env vars (if you source .env before npm, they apply): SERVER_IP, SSH_KEY, SSH_USER

set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [ -f "$ROOT/.env" ]; then
  set -a
  # shellcheck source=/dev/null
  . "$ROOT/.env"
  set +a
fi

SERVER_IP="${SERVER_IP:-18.134.179.139}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/1sliquidity.pem}"
SSH_USER="${SSH_USER:-ubuntu}"

SSH_KEY_EXPANDED="${SSH_KEY/#\~/$HOME}"

if [ ! -f "$SSH_KEY_EXPANDED" ]; then
  echo "SSH key not found: $SSH_KEY_EXPANDED" >&2
  echo "Set SSH_KEY or place your key at ~/.ssh/1sliquidity.pem" >&2
  exit 1
fi

exec ssh -i "$SSH_KEY_EXPANDED" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "$@"
