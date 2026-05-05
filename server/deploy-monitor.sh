#!/bin/bash
#
# 1SLiquidity Bot - Deployment Script
# Deploy updates from local machine to AWS server
#
# Usage: ./deploy-monitor.sh <server-ip> <ssh-key-path>
# Example: ./deploy-monitor.sh 54.123.456.789 ~/bot-key.pem
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

# Check arguments
if [ $# -lt 2 ]; then
    print_error "Usage: $0 <server-ip> <ssh-key-path>"
    echo "Example: $0 54.123.456.789 ~/bot-key.pem"
    exit 1
fi

SERVER_IP="$1"
SSH_KEY="$2"
SSH_USER="ubuntu"  # Default AWS user

# Verify SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key not found: $SSH_KEY"
    exit 1
fi

echo "========================================"
echo "🚀 Deploying 1SLiquidity Bot Updates"
echo "========================================"
echo "Server: $SSH_USER@$SERVER_IP"
echo "SSH Key: $SSH_KEY"
echo ""

# Test SSH connection
print_info "Testing SSH connection..."
if SSH_TEST_OUTPUT="$(ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "echo 'Connection successful'" 2>&1)"; then
    print_success "SSH connection successful"
else
    print_error "Cannot connect to server!"
    if [ -n "$SSH_TEST_OUTPUT" ]; then
        print_info "SSH error output:"
        echo "$SSH_TEST_OUTPUT"
    fi
    print_info "Make sure:"
    print_info "  1. Server IP is correct: $SERVER_IP"
    print_info "  2. SSH key has correct permissions: chmod 400 $SSH_KEY"
    print_info "  3. Security group allows SSH from your IP"
    exit 1
fi

# Determine script directory (project root = parent of server/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Option 1: Deploy from LOCAL (rsync this machine's code to server)
print_info "Syncing local code to server..."
rsync -avz --delete \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$PROJECT_ROOT/local-monitor/" \
  "$SSH_USER@$SERVER_IP:~/1SLiquidity/local-monitor/" \
  --exclude node_modules \
  --exclude dist \
  --exclude localData.json

rsync -avz \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$PROJECT_ROOT/server/" \
  "$SSH_USER@$SERVER_IP:~/1SLiquidity/server/" \
  --exclude .env

rsync -avz \
  -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
  "$PROJECT_ROOT/versions/deployment-addresses-mainnet-"*.json \
  "$SSH_USER@$SERVER_IP:~/1SLiquidity/versions/"

print_success "Code synced"

# Option 2: On server - install deps and build
print_info "Installing dependencies and building on server..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" << 'DEPLOY_SCRIPT'
set -e
cd ~/1SLiquidity/local-monitor
npm install
npm run build
echo ""
echo "✅ Build completed!"

# Optional deploy-complete Telegram notification (uses AWS Secrets Manager/env on server)
USE_AWS_SECRETS=true node - <<'NODE' || true
(async () => {
  try {
    const { getSecrets } = require("./dist/secrets.js");
    const cfg = require("./dist/config.js");
    const secrets = await getSecrets();
    if (!secrets.TELEGRAM_BOT_TOKEN || !secrets.TELEGRAM_CHAT_ID) {
      console.log("ℹ️ Telegram not configured for deploy notifications");
      return;
    }

    const text =
      "🚀 <b>Bot Redeploy Complete</b>\n\n" +
      `📌 <b>Version:</b> <code>${cfg.BOT_VERSION}</code>\n` +
      `🏗 <b>Core:</b> <code>${cfg.CONTRACT_ADDRESSES.core}</code>\n` +
      `🧱 <b>Deployment block:</b> <code>${cfg.DEPLOYMENT_BLOCK}</code>\n` +
      `🖥 <b>Host:</b> <code>${require("os").hostname()}</code>\n` +
      `⏰ ${new Date().toISOString()}`;

    const res = await fetch(`https://api.telegram.org/bot${secrets.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: secrets.TELEGRAM_CHAT_ID,
        text,
        parse_mode: "HTML",
      }),
    });

    if (res.ok) {
      console.log("✅ Deploy notification sent to Telegram");
    } else {
      const body = await res.text();
      console.log(`⚠️ Telegram deploy notify failed: ${res.status} ${body.slice(0, 200)}`);
    }
  } catch (err) {
    console.log(`⚠️ Telegram deploy notify skipped: ${err?.message || err}`);
  }
})();
NODE
DEPLOY_SCRIPT

print_success "Deployment completed successfully!"
echo ""
print_info "📊 View live logs:"
echo "   ssh -i $SSH_KEY $SSH_USER@$SERVER_IP 'tail -f ~/monitor-logs/\$(date +%Y-%m-%d).log'"
echo ""
print_info "🔍 Check cron status:"
echo "   ssh -i $SSH_KEY $SSH_USER@$SERVER_IP 'crontab -l'"
echo ""
print_info "💻 SSH into server:"
echo "   ssh -i $SSH_KEY $SSH_USER@$SERVER_IP"
echo ""

exit 0
