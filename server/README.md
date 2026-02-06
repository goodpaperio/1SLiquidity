# 1SLiquidity Self-Hosted Bot Server

Complete guide for deploying the 1SLiquidity local-monitor bot on a self-hosted AWS EC2 instance with reliable cron scheduling.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [AWS EC2 Setup](#aws-ec2-setup)
- [Telegram Bot Setup](#telegram-bot-setup)
- [Server Installation](#server-installation)
- [Deployment & Updates](#deployment--updates)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

**Problem**: GitHub Actions cron jobs are unreliable (running 25-120 minutes apart instead of every 5 minutes)

**Solution**: Self-hosted AWS EC2 instance with real system cron for precise 5-minute intervals

**Benefits**:
- ✅ **Reliable timing**: Exact 5-minute intervals (vs 25-120 min on GitHub)
- ✅ **Lower gas costs**: Curve removed = ~70% gas savings
- ✅ **Real-time logs**: SSH access for live monitoring
- ✅ **Telegram alerts**: Instant notifications to @immaxkent
- ✅ **Cost-effective**: ~$0.89/month (Year 1 AWS Free Tier) or $8.39/month after

---

## 📦 Prerequisites

Before starting, you'll need:

1. **AWS Account** (you have this ✅)
2. **GitHub Repository** access to `1SLiquidity`
3. **Telegram Account** (for alerts to @immaxkent)
4. **SSH Client** (Terminal on Mac, built-in ✅)
5. **15-30 minutes** for initial setup

---

## ☁️ AWS EC2 Setup

### Step 1: Launch EC2 Instance

1. **Login to AWS Console**: https://console.aws.amazon.com/ec2
2. **Click "Launch Instance"**
3. **Configure instance**:

```yaml
Name: 1SLiquidity-Bot
Application and OS Images: Ubuntu Server 22.04 LTS (HVM), SSD Volume Type
Architecture: 64-bit (x86)
Instance type: t3.micro (1 vCPU, 1 GiB RAM) - FREE TIER ELIGIBLE
Key pair: Create new key pair
  - Name: 1sliquidity-bot-key
  - Type: RSA
  - Format: .pem
  - DOWNLOAD and save to ~/Downloads/1sliquidity-bot-key.pem
```

4. **Network Settings**:
   - Click "Edit"
   - Security group name: `1sliquidity-bot-sg`
   - **Add rule**: SSH (port 22) from "My IP" only
   - ⚠️ Important: Restrict SSH to your IP for security!

5. **Configure Storage**:
   - 8 GiB gp3 (default is fine)

6. **Click "Launch Instance"**

7. **Note down**:
   - ✅ Public IPv4 address (e.g., `54.123.456.789`)
   - ✅ SSH key location: `~/Downloads/1sliquidity-bot-key.pem`

### Step 2: Secure SSH Key

```bash
# Move key to ~/.ssh/ directory
mkdir -p ~/.ssh
mv ~/Downloads/1sliquidity-bot-key.pem ~/.ssh/

# Set correct permissions (required!)
chmod 400 ~/.ssh/1sliquidity-bot-key.pem
```

### Step 3: Test SSH Connection

```bash
# Replace YOUR_IP with your EC2 public IP
ssh -i ~/.ssh/1sliquidity-bot-key.pem ubuntu@YOUR_IP
```

If successful, you'll see the Ubuntu welcome message! 🎉

---

## 🤖 Telegram Bot Setup

### Create Bot (5 minutes)

1. **Open Telegram** and search for `@BotFather`
2. **Send**: `/newbot`
3. **Follow prompts**:
   - Bot name: `1SLiquidity Alert Bot` (or any name)
   - Username: `sliquidity_alerts_bot` (must end with `_bot`)
4. **Copy the bot token**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
   - ⚠️ Save this - you'll need it in `.env` file!

### Get Your Chat ID

1. **Search for** `@userinfobot` in Telegram
2. **Start the chat** (click Start)
3. **Copy your ID**: `987654321`
   - ⚠️ Save this - you'll need it in `.env` file!

### Start Chat with Your Bot

1. **Find your bot** in Telegram (search for the username)
2. **Click "Start"** or send any message
3. **This activates the bot** to send you messages!

### Test Alert (Optional)

```bash
# Test the bot works
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=Test message from 1SLiquidity Bot"
```

You should receive a message! ✅

---

## 🚀 Server Installation

### Step 1: SSH into Server

```bash
ssh -i ~/.ssh/1sliquidity-bot-key.pem ubuntu@YOUR_EC2_IP
```

### Step 2: Download and Run Setup Script

```bash
# Download setup script
curl -o setup-server.sh https://raw.githubusercontent.com/YOUR_USERNAME/1SLiquidity/main/server/setup-server.sh

# Make executable
chmod +x setup-server.sh

# Run setup
./setup-server.sh
```

The script will:
- ✅ Update system packages
- ✅ Install Node.js 20
- ✅ Install Git
- ✅ Clone your repository
- ✅ Install npm dependencies
- ✅ Build the monitor
- ✅ Setup cron jobs (every 5 minutes)
- ✅ Configure log rotation
- ✅ Setup firewall
- ✅ Enable automatic security updates

### Step 3: Configure Environment Variables

The setup script creates a template `.env` file. Now edit it:

```bash
nano ~/1SLiquidity/server/.env
```

**Fill in your values**:

```bash
# RPC Configuration
RPC_HTTP_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
CHAIN_ID=1

# Wallet Configuration
PRIVATE_KEY=0xYOUR_BOT_PRIVATE_KEY

# Contract Addresses (v1.0.5)
CORE_CONTRACT=0x66be9da4d7312d48c855be1fc4c1e979b6e94cc2
REGISTRY_CONTRACT=0x5EAee88B493de2D646a8C29Bb5b09a79c5322dF4
EXECUTOR_CONTRACT=0xA03762EFF4f98cDA57DeA0a8eB62ab872C832878
STREAM_DAEMON_CONTRACT=0xd35f101Db2EA11693c09851389494d9E297de95C

# Telegram Bot (from setup above)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=987654321

# Alert Settings
ALERT_ON_SUCCESS=false
ALERT_ON_FAILURE=true
ALERT_DAILY_SUMMARY=true
ALERT_LOW_BALANCE_THRESHOLD=0.005

# Monitoring
LOG_RETENTION_DAYS=7
HEALTH_CHECK_INTERVAL=60
```

**Save and exit**: `Ctrl+X`, then `Y`, then `Enter`

**Secure the file**:
```bash
chmod 600 ~/1SLiquidity/server/.env
```

### Step 4: Test Manual Run

```bash
# Test the monitor runs successfully
~/1SLiquidity/server/run-monitor.sh
```

Check the output - if successful, you should see:
- ✅ Historical analysis completed
- ✅ Trade execution completed
- ✅ Final analysis completed

### Step 5: Verify Cron Setup

```bash
# Check cron jobs are installed
crontab -l
```

You should see:
```bash
*/5 * * * * /home/ubuntu/1SLiquidity/server/run-monitor.sh
0 * * * * /home/ubuntu/1SLiquidity/server/monitor-health.sh
0 0 * * * /home/ubuntu/1SLiquidity/server/monitor-health.sh --daily-summary
```

### Step 6: Monitor First Cron Run

```bash
# Watch logs in real-time
tail -f ~/monitor-logs/$(date +%Y-%m-%d).log
```

Wait 5 minutes - you should see the bot run automatically! 🎉

---

## 🔄 Deployment & Updates

### Deploy Code Updates from Your Local Machine

When you push changes to GitHub and want to update the server:

```bash
# From your local machine (Mac)
cd /Users/zuludykes/code/1SLiquidity/server
./deploy-monitor.sh YOUR_EC2_IP ~/.ssh/1sliquidity-bot-key.pem
```

This will:
1. SSH into the server
2. Pull latest code from GitHub
3. Rebuild the monitor
4. Next cron run uses updated code

### Manual Update (from server)

```bash
# SSH into server
ssh -i ~/.ssh/1sliquidity-bot-key.pem ubuntu@YOUR_EC2_IP

# Pull latest code
cd ~/1SLiquidity
git pull origin main

# Rebuild monitor
cd ~/1SLiquidity/local-monitor
npm ci
npm run build

# Next cron run will use updated code automatically
```

---

## 📊 Monitoring & Maintenance

### View Live Logs

```bash
# SSH into server
ssh -i ~/.ssh/1sliquidity-bot-key.pem ubuntu@YOUR_EC2_IP

# View today's log (live updates)
tail -f ~/monitor-logs/$(date +%Y-%m-%d).log

# View last 50 lines
tail -50 ~/monitor-logs/$(date +%Y-%m-%d).log

# Search for errors
grep "ERROR" ~/monitor-logs/*.log

# Search for successful executions
grep "Successful" ~/monitor-logs/*.log
```

### Check Bot Health

```bash
# Run health check manually
~/1SLiquidity/server/monitor-health.sh

# View health check log
cat ~/monitor-logs/health-check.log
```

### Check Wallet Balance

```bash
cd ~/1SLiquidity/local-monitor
npm run balance-check
```

### View Cron Status

```bash
# View cron jobs
crontab -l

# Check cron service
systemctl status cron

# View cron execution logs
grep CRON /var/log/syslog | tail -20
```

---

## 🛠️ Troubleshooting

### Bot Not Running

**Check cron service**:
```bash
sudo systemctl status cron
sudo systemctl restart cron
```

**Check for errors in logs**:
```bash
tail -50 ~/monitor-logs/error.log
```

**Run manually to see errors**:
```bash
~/1SLiquidity/server/run-monitor.sh
```

### Telegram Alerts Not Working

**Test Telegram connection**:
```bash
# Load env vars
source ~/1SLiquidity/server/.env

# Test message
curl -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  -d "chat_id=${TELEGRAM_CHAT_ID}" \
  -d "text=Test from 1SLiquidity Bot"
```

**Common issues**:
- Bot token incorrect → Check `TELEGRAM_BOT_TOKEN` in `.env`
- Chat ID incorrect → Check `TELEGRAM_CHAT_ID` in `.env`
- Haven't started chat → Send a message to your bot in Telegram first

### Out of Disk Space

**Check disk usage**:
```bash
df -h
```

**Clean old logs**:
```bash
# Remove logs older than 7 days
find ~/monitor-logs -name "*.log" -mtime +7 -delete
```

### Gas/Funds Issues

**Check wallet balance**:
```bash
cd ~/1SLiquidity/local-monitor
npm run balance-check
```

**If balance low**, transfer more ETH to: `0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6`

**After Curve removal**, typical gas per execution:
- Before: ~180,000-800,000 gas ($40-180)
- After: ~100,000-200,000 gas ($0.10-2)

### SSH Connection Issues

**If "Connection refused"**:
1. Check EC2 instance is running (AWS Console)
2. Check security group allows SSH from your IP
3. Verify SSH key permissions: `chmod 400 ~/.ssh/1sliquidity-bot-key.pem`

**If "Permission denied"**:
- Verify using correct user: `ubuntu` (not `ec2-user` or `root`)
- Verify correct SSH key path

---

## 📈 Performance Expectations

### Before (GitHub Actions)
- ⚠️ Runs every 25-120 minutes (unreliable)
- ❌ Misses optimal execution windows
- ❌ High gas costs (Curve included)

### After (Self-Hosted)
- ✅ Runs every 5 minutes (exact)
- ✅ Catches all execution opportunities
- ✅ ~70% lower gas costs (Curve removed)
- ✅ Real-time monitoring & alerts

---

## 💰 Cost Breakdown

| Component | Cost (Year 1 - Free Tier) | Cost (After Year 1) |
|-----------|---------------------------|---------------------|
| EC2 t3.micro | $0/month (750 hrs/month free) | $7.50/month |
| EBS Storage (8GB) | $0.80/month | $0.80/month |
| Data Transfer | $0.09/month | $0.09/month |
| **Total** | **$0.89/month** | **$8.39/month** |

**Note**: If new to AWS, first 12 months are essentially FREE!

---

## 🔐 Security Best Practices

### Implemented Automatically:
- ✅ UFW firewall (SSH only)
- ✅ SSH key authentication (no passwords)
- ✅ Automatic security updates
- ✅ `.env` file with 600 permissions
- ✅ Non-root user execution

### Additional Recommendations:
1. **Rotate private keys** periodically
2. **Monitor wallet balance** weekly
3. **Review logs** for suspicious activity
4. **Update SSH allowed IPs** if your IP changes
5. **Backup `.env` file** securely offline

---

## 🔔 Alert Types

### Automatic Alerts to @immaxkent:

**Error Alerts** (always enabled):
- ❌ Execution failures
- 🚨 Bot crashes or timeouts
- ⚠️ Low wallet balance (<0.005 ETH)
- ⚠️ Bot hasn't run in 15+ minutes

**Daily Summary** (configurable):
- 📊 Total bot runs in 24 hours
- ✅ Successful executions
- ❌ Failed executions  
- 💾 System health stats
- Sent at 00:00 UTC daily

**Success Alerts** (disabled by default):
- Can enable with `ALERT_ON_SUCCESS=true`
- Sends notification on every successful execution

---

## 🔧 Useful Commands

### Logs & Monitoring

```bash
# View today's full log
less ~/monitor-logs/$(date +%Y-%m-%d).log

# Live tail (real-time updates)
tail -f ~/monitor-logs/$(date +%Y-%m-%d).log

# Search for failures
grep -i "failed" ~/monitor-logs/*.log

# View execution summary
grep "Execution Summary" ~/monitor-logs/*.log -A 5

# Check health
~/1SLiquidity/server/monitor-health.sh
```

### System Management

```bash
# Check system resources
htop  # or top

# Check disk space
df -h

# Check memory
free -h

# View system logs
sudo journalctl -xe
```

### Cron Management

```bash
# Edit cron jobs
crontab -e

# View cron jobs
crontab -l

# Disable bot temporarily (comment out in crontab)
crontab -e
# Add # before */5 * * * * line

# Re-enable (remove #)
crontab -e
```

---

## 📁 File Structure

```
~/1SLiquidity/
├── server/
│   ├── setup-server.sh       # Initial setup script
│   ├── run-monitor.sh         # Cron execution wrapper
│   ├── monitor-health.sh      # Health checks
│   ├── deploy-monitor.sh      # Deployment script (run from local)
│   ├── .env                   # Environment variables (SECRETS!)
│   ├── .env.example           # Template
│   ├── alerts/
│   │   └── telegram.ts        # Telegram alert module
│   └── README.md              # This file
├── local-monitor/
│   ├── src/                   # Bot source code
│   ├── dist/                  # Compiled JavaScript
│   ├── localData.json         # Bot state persistence
│   └── package.json
└── monitor-logs/
    ├── 2026-02-02.log         # Daily logs
    ├── error.log              # Error log
    └── health-check.log       # Health check log
```

---

## 🔄 Migration from GitHub Actions

### Safe Migration Process:

1. **Keep GitHub Actions running** (don't disable yet!)
2. **Deploy AWS bot** following this guide
3. **Run both in parallel** for 24-48 hours
4. **Compare results**:
   - Check both are finding same trades
   - Verify AWS bot executes more frequently
   - Confirm Telegram alerts working
5. **When confident**, disable GitHub Actions:
   ```yaml
   # In .github/workflows/local-monitor.yml
   # Comment out the schedule section:
   # on:
   #   schedule:
   #     - cron: "*/5 * * * *"
   workflow_dispatch:  # Keep this for manual runs
   ```
6. **Push change** to GitHub

---

## 📞 Support & Contact

### Getting Help:

1. **Check logs first**: `~/monitor-logs/*.log`
2. **Run health check**: `~/1SLiquidity/server/monitor-health.sh`
3. **Test manual run**: `~/1SLiquidity/server/run-monitor.sh`
4. **Review this README** - most issues covered in Troubleshooting

### Common Issues Already Solved:

- ✅ Curve high gas costs → Removed in v1.0.5
- ✅ GitHub Actions timing → Migrated to AWS
- ✅ Event tracking → Purely event-driven now
- ✅ `onlyInstasettle` handling → Correct in latest version
- ✅ Attempts tracking → Uses `getTrade()` for ongoing trades

---

## 📝 Maintenance Schedule

### Daily (Automated):
- ✅ Bot runs every 5 minutes
- ✅ Health check every hour
- ✅ Daily summary at midnight UTC
- ✅ Log rotation (keeps 7 days)

### Weekly (Manual):
- Check Telegram alerts are working
- Review error log: `cat ~/monitor-logs/error.log`
- Verify wallet balance sufficient

### Monthly (Manual):
- Review disk space: `df -h`
- Update dependencies: `cd ~/1SLiquidity/local-monitor && npm audit fix`
- Check for contract version updates

### Quarterly (Manual):
- Update system: `sudo apt update && sudo apt upgrade`
- Review cron timing accuracy
- Rotate private keys (best practice)

---

## 🎯 Success Checklist

After setup, verify:

- [ ] EC2 instance running
- [ ] SSH connection working
- [ ] Cron jobs installed (`crontab -l`)
- [ ] `.env` file configured with secrets
- [ ] Telegram bot sending test messages
- [ ] Manual run successful
- [ ] First automatic cron run completed
- [ ] Logs being written to `~/monitor-logs/`
- [ ] Health checks running
- [ ] Alerts received on Telegram

---

## 🚀 Next Steps

1. **Complete AWS EC2 Setup** (see above)
2. **Complete Telegram Bot Setup** (see above)
3. **Run `setup-server.sh`** on EC2
4. **Configure `.env`** with your secrets
5. **Test manual run**
6. **Wait for first automatic run** (5 minutes)
7. **Verify Telegram alerts** working
8. **Run in parallel with GitHub Actions** for 24-48 hours
9. **Disable GitHub Actions** once confident
10. **Enjoy reliable 5-minute execution!** 🎉

---

## 📚 Additional Resources

- [AWS EC2 Documentation](https://docs.aws.amazon.com/ec2/)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Cron Expression Generator](https://crontab.guru/)
- [1SLiquidity Protocol Docs](../README.md)

---

**Questions?** Check logs first, then review Troubleshooting section above.

**Ready to deploy?** Start with [AWS EC2 Setup](#aws-ec2-setup)! 🚀
