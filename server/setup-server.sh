#!/bin/bash
#
# 1SLiquidity Bot - AWS Server Setup Script
# This script installs and configures everything needed to run the bot
# 
# Usage: bash setup-server.sh
#

set -e  # Exit on any error

echo "========================================"
echo "🚀 1SLiquidity Bot Server Setup"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${YELLOW}ℹ️  $1${NC}"; }

# Check if running as root (we don't want this)
if [ "$EUID" -eq 0 ]; then
    print_error "Please do not run this script as root or with sudo"
    print_info "Run as regular user: bash setup-server.sh"
    exit 1
fi

print_info "Starting setup process..."
echo ""

# ===== Step 1: Update System =====
print_info "Step 1/10: Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -y -qq
print_success "System updated"
echo ""

# ===== Step 2: Install Node.js 20 =====
print_info "Step 2/10: Installing Node.js 20..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_info "Node.js already installed: $NODE_VERSION"
else
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
    print_success "Node.js 20 installed"
fi
node --version
npm --version
echo ""

# ===== Step 3: Install Git =====
print_info "Step 3/10: Installing Git..."
if command -v git &> /dev/null; then
    print_info "Git already installed"
else
    sudo apt-get install -y git
    print_success "Git installed"
fi
git --version
echo ""

# ===== Step 4: Install Additional Tools =====
print_info "Step 4/10: Installing additional tools..."
sudo apt-get install -y curl wget unzip jq
print_success "Tools installed"
echo ""

# ===== Step 5: Clone Repository =====
print_info "Step 5/10: Cloning 1SLiquidity repository..."
cd ~
REPO_DIR="$HOME/1SLiquidity"

if [ -d "$REPO_DIR" ]; then
    print_info "Repository already exists, pulling latest..."
    cd "$REPO_DIR"
    git pull origin main
else
    print_info "Enter your GitHub repository URL (e.g., https://github.com/username/1SLiquidity):"
    read -r REPO_URL
    git clone "$REPO_URL" "$REPO_DIR"
    cd "$REPO_DIR"
fi
print_success "Repository ready"
echo ""

# ===== Step 6: Setup Local Monitor =====
print_info "Step 6/10: Setting up local monitor..."
cd "$REPO_DIR/local-monitor"

# Install dependencies
print_info "Installing npm dependencies..."
npm ci

# Build the monitor
print_info "Building monitor..."
npm run build

# Create localData.json if it doesn't exist
if [ ! -f "localData.json" ]; then
    echo '{"lastRun": 0, "outstandingTrades": [], "lastUpdated": 0}' > localData.json
    print_success "Created localData.json"
fi

print_success "Local monitor built successfully"
echo ""

# ===== Step 7: Setup Environment Variables =====
print_info "Step 7/10: Setting up environment variables..."
cd "$REPO_DIR/server"

if [ -f ".env" ]; then
    print_info ".env file already exists, skipping..."
else
    print_info "Creating .env file from template..."
    cp .env.example .env
    chmod 600 .env
    
    print_info ""
    print_info "⚠️  IMPORTANT: You need to edit the .env file with your credentials!"
    print_info "Run: nano $REPO_DIR/server/.env"
    print_info ""
    print_info "Required values:"
    print_info "  - RPC_HTTP_URL (your Infura/Alchemy URL)"
    print_info "  - PRIVATE_KEY (bot wallet private key)"
    print_info "  - TELEGRAM_BOT_TOKEN (from @BotFather)"
    print_info "  - TELEGRAM_CHAT_ID (from @userinfobot)"
    print_info ""
fi
print_success "Environment template created"
echo ""

# ===== Step 8: Create Log Directory =====
print_info "Step 8/10: Creating log directory..."
mkdir -p ~/monitor-logs
print_success "Log directory created: ~/monitor-logs"
echo ""

# ===== Step 9: Setup Cron Job =====
print_info "Step 9/10: Setting up cron job..."

# Make scripts executable
chmod +x "$REPO_DIR/server/run-monitor.sh"
chmod +x "$REPO_DIR/server/monitor-health.sh"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "run-monitor.sh"; then
    print_info "Cron job already exists"
else
    # Add cron job
    (crontab -l 2>/dev/null; echo "*/5 * * * * $REPO_DIR/server/run-monitor.sh") | crontab -
    print_success "Cron job added (runs every 5 minutes)"
fi

# Add health check cron (every hour)
if crontab -l 2>/dev/null | grep -q "monitor-health.sh"; then
    print_info "Health check cron already exists"
else
    (crontab -l 2>/dev/null; echo "0 * * * * $REPO_DIR/server/monitor-health.sh") | crontab -
    print_success "Health check cron added (runs hourly)"
fi

# Add daily summary (at midnight UTC)
if crontab -l 2>/dev/null | grep -q "daily-summary"; then
    print_info "Daily summary cron already exists"
else
    (crontab -l 2>/dev/null; echo "0 0 * * * $REPO_DIR/server/monitor-health.sh --daily-summary") | crontab -
    print_success "Daily summary cron added (runs at 00:00 UTC)"
fi

print_info "Current crontab:"
crontab -l
echo ""

# ===== Step 10: Setup Log Rotation =====
print_info "Step 10/10: Setting up log rotation..."
sudo tee /etc/logrotate.d/1sliquidity-monitor > /dev/null <<EOF
$HOME/monitor-logs/*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 $USER $USER
}
EOF
print_success "Log rotation configured"
echo ""

# ===== Setup Firewall =====
print_info "Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw --force enable
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    sudo ufw allow 22/tcp comment 'SSH'
    print_success "Firewall configured (SSH only)"
else
    print_info "UFW not available, skipping firewall setup"
fi
echo ""

# ===== Enable Automatic Security Updates =====
print_info "Enabling automatic security updates..."
sudo apt-get install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
print_success "Automatic security updates enabled"
echo ""

# ===== Final Summary =====
echo "========================================"
echo "🎉 Setup Complete!"
echo "========================================"
echo ""
print_success "Installation successful!"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Edit your environment file with credentials:"
echo "   nano $REPO_DIR/server/.env"
echo ""
echo "2. Test the monitor manually:"
echo "   $REPO_DIR/server/run-monitor.sh"
echo ""
echo "3. Check the logs:"
echo "   tail -f ~/monitor-logs/\$(date +%Y-%m-%d).log"
echo ""
echo "4. The bot will run automatically every 5 minutes"
echo ""
echo "📊 Monitoring:"
echo "   - Logs: ~/monitor-logs/"
echo "   - Cron jobs: crontab -l"
echo "   - Health checks: ~/monitor-logs/health-check.log"
echo ""
echo "🔧 Useful Commands:"
echo "   - View today's log: tail -f ~/monitor-logs/\$(date +%Y-%m-%d).log"
echo "   - Run manual test: $REPO_DIR/server/run-monitor.sh"
echo "   - Check health: $REPO_DIR/server/monitor-health.sh"
echo "   - Update code: cd $REPO_DIR && git pull && cd local-monitor && npm ci && npm run build"
echo ""
print_info "⚠️  Don't forget to edit the .env file before the first run!"
echo ""
