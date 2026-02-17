#!/bin/bash
#
# 1SLiquidity Bot - Restart (re-enable cron)
# Run from your Mac to restart the bot on the server
#
# Usage: ./restart-bot.sh <server-ip> <ssh-key-path>
# Example: ./restart-bot.sh 18.134.179.139 ~/.ssh/1sliquidity.pem
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
echo "▶️  Restarting 1SLiquidity Bot"
echo "========================================"
echo "Server: $SSH_USER@$SERVER_IP"
echo ""

print_info "Re-enabling bot cron job..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_USER@$SERVER_IP" "crontab -l 2>/dev/null | sed 's|^# PAUSED \\(.*run-monitor.sh.*\\)|\\1|' | crontab - && echo 'Done.' && crontab -l"

print_success "Bot restarted. The 5-minute execution cron is active."
echo ""
print_info "Next run in at most 5 minutes."
print_info "View logs: ssh -i $SSH_KEY $SSH_USER@$SERVER_IP 'tail -f ~/monitor-logs/\$(date +%Y-%m-%d).log'"
echo ""
