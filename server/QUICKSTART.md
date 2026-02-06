# 🚀 Quick Start - Self-Hosted Bot Deployment

**Time required**: 15-30 minutes  
**Cost**: $0.89/month (Year 1) or $8.39/month (after)

---

## ⚡ 5-Step Deployment

### 1️⃣ Create AWS EC2 Instance (5 min)

```yaml
1. Go to: https://console.aws.amazon.com/ec2
2. Click "Launch Instance"
3. Name: 1SLiquidity-Bot
4. OS: Ubuntu Server 22.04 LTS
5. Instance type: t3.micro (FREE TIER)
6. Key pair: Create new → Save .pem file
7. Security group: Allow SSH from "My IP"
8. Launch!
```

**Save**:
- Public IP: `_______________`
- SSH key: `~/.ssh/1sliquidity-bot-key.pem`

---

### 2️⃣ Setup Telegram Bot (5 min)

```
1. Open Telegram → Search @BotFather
2. Send: /newbot
3. Follow prompts, save bot token
4. Search @userinfobot → Get your chat ID
5. Find your bot → Click "Start"
```

**Save**:
- Bot token: `_______________`
- Chat ID: `_______________`

---

### 3️⃣ Install Bot on Server (10 min)

```bash
# Step 1: Secure SSH key
chmod 400 ~/.ssh/1sliquidity-bot-key.pem

# Step 2: SSH into server (replace YOUR_IP)
ssh -i ~/.ssh/1sliquidity-bot-key.pem ubuntu@YOUR_IP

# Step 3: Run setup script
curl -o setup.sh https://raw.githubusercontent.com/YOUR_USERNAME/1SLiquidity/main/server/setup-server.sh
bash setup.sh
```

---

### 4️⃣ Configure Secrets (5 min)

```bash
# Edit environment file
nano ~/1SLiquidity/server/.env
```

**Fill in**:
```bash
RPC_HTTP_URL=https://mainnet.infura.io/v3/YOUR_KEY
PRIVATE_KEY=0xYOUR_BOT_KEY
TELEGRAM_BOT_TOKEN=YOUR_TELEGRAM_TOKEN
TELEGRAM_CHAT_ID=YOUR_CHAT_ID
```

**Save**: `Ctrl+X` → `Y` → `Enter`

```bash
# Secure the file
chmod 600 ~/1SLiquidity/server/.env
```

---

### 5️⃣ Test & Monitor (5 min)

```bash
# Test manual run
~/1SLiquidity/server/run-monitor.sh

# Watch live logs
tail -f ~/monitor-logs/$(date +%Y-%m-%d).log

# Wait 5 minutes for first automatic run
# You should receive a Telegram alert!
```

---

## ✅ Verification

After setup, confirm:

```bash
# Check cron is running
crontab -l
# Should show: */5 * * * * .../run-monitor.sh

# Check last run
grep "Bot Run Completed" ~/monitor-logs/*.log | tail -1

# Check wallet balance
cd ~/1SLiquidity/local-monitor
npm run balance-check

# Send test alert
~/1SLiquidity/server/monitor-health.sh
```

---

## 🎯 Success!

You should now have:
- ✅ Bot running every 5 minutes (exact timing!)
- ✅ Telegram alerts to @immaxkent
- ✅ 70% lower gas costs (Curve removed)
- ✅ Real-time log monitoring

---

## 📞 Need Help?

**See full guide**: [README.md](./README.md)

**Common issues**:
- SSH not working → Check key permissions: `chmod 400 ~/.ssh/key.pem`
- Telegram not working → Verify you clicked "Start" on the bot
- Bot not running → Check logs: `tail ~/monitor-logs/error.log`
- Low balance → Transfer ETH to bot wallet

---

## 🔄 Daily Operations

**Normal operation** - No action needed! Bot runs automatically.

**When you push code updates**:
```bash
# From your local machine
cd /Users/zuludykes/code/1SLiquidity/server
./deploy-monitor.sh YOUR_EC2_IP ~/.ssh/1sliquidity-bot-key.pem
```

**Check if bot is healthy**:
```bash
ssh -i ~/.ssh/1sliquidity-bot-key.pem ubuntu@YOUR_EC2_IP
~/1SLiquidity/server/monitor-health.sh
```

---

That's it! The bot will now reliably execute trades every 5 minutes. 🚀
