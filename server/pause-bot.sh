#!/bin/bash
#
# 1SLiquidity Bot - Pause (disable cron)
# Run from your Mac to pause the bot on the server
#
# Usage: ./pause-bot.sh <server-ip> <ssh-key-path>
# Example: ./pause-bot.sh 18.134.179.139 ~/.ssh/1sliquidity.pem
#

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

if [ $# -lt 2 ]; then
    print_error "Usage: $0 <server-ip> <ssh-key-path>"
    echo "Example: $0 18.134.179.139 ~/.ssh/1sliquidity.pem"
    exit 1
fi

SERVER_IP="$1"
SSH_KEY="$2"
SSH_USER="ubuntu"

if [ ! -f "$SSH_KEY" ]; then
    print_error "SSH key not found: $SSH_KEY"
    exit 1
fi

echo "========================================"
echo "⏸️  Pausing 1SLiquidity Bot"
echo "========================================"
echo "Server: $SSH_USER@$SERVER_IP"
echo ""

print_info "Disabling bot cron job..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "crontab -l 2>/dev/null | sed 's|^\\(\\*/5 .*run-monitor.sh\\)|# PAUSED \\1|' | crontab - && echo 'Done.' && crontab -l"

print_success "Bot paused. The 5-minute execution cron is disabled."
echo ""
print_info "Health checks (hourly/daily) are still active."
print_info "To resume: ./restart-bot.sh $SERVER_IP $SSH_KEY"
echo ""
