#!/bin/bash
#
# Build local-monitor and deploy to AWS server.
# Uses SERVER_IP and SSH_KEY from env, or defaults.
#
# Usage:
#   npm run redeploy-server
#   SERVER_IP=1.2.3.4 SSH_KEY=~/.ssh/my.pem npm run redeploy-server
#

set -e

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_IP="${SERVER_IP:-18.134.179.139}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/1sliquidity.pem}"

echo "========================================="
echo "🔄 Redeploy: build + deploy to AWS"
echo "========================================="
echo "Server: $SERVER_IP"
echo "SSH Key: $SSH_KEY"
echo ""

echo "📦 Building local-monitor..."
cd "$ROOT/local-monitor"

# Ensure local dev toolchain exists before build (typescript/tsc).
if [ ! -x "node_modules/.bin/tsc" ]; then
  echo "ℹ️  local-monitor TypeScript toolchain missing; running npm install..."
  npm install
fi

npm run build
echo ""

echo "🚀 Deploying to AWS..."
"$ROOT/server/deploy-monitor.sh" "$SERVER_IP" "$SSH_KEY"

echo ""
echo "✅ Redeploy completed."
