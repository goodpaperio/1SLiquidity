# ✅ AWS Self-Hosted Bot - Setup Complete!

**Status**: 🟢 RUNNING  
**Server**: AWS EC2 `18.134.179.139` (eu-west-2)  
**Bot Wallet**: `0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6`

---

## 🎯 What's Running

### Cron Jobs (Automatic)
```
Every 5 minutes:  Bot execution (historical → execute → wait → verify)
Every hour:       Health check
Daily at midnight: Health summary + stats
```

### Security
- ✅ Private key encrypted in **AWS Secrets Manager**
- ✅ IAM role attached to EC2 instance
- ✅ No plaintext secrets on server
- ✅ SSH restricted to your IP: `86.143.57.96/32`

---

## 💰 Fund Your Wallet (IMPORTANT!)

**Current balance**: `0.000028 ETH` (~$0.08)  
**Recommended**: At least **0.05 ETH** (~$150) for gas

**Send ETH to**: `0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6`

---

## 📊 Monitoring & Management

### View Live Logs

```bash
# SSH into server
ssh -i ~/.ssh/1sliquidity.pem ubuntu@18.134.179.139

# View today's bot log
tail -f ~/monitor-logs/$(date +%Y-%m-%d).log

# View last 50 lines
tail -50 ~/monitor-logs/$(date +%Y-%m-%d).log

# View errors only
cat ~/monitor-logs/error.log

# View health checks
cat ~/monitor-logs/health-check.log
```

### Check Bot Status

```bash
# Check wallet balance
cd ~/1SLiquidity/local-monitor
USE_AWS_SECRETS=true npm run balance-check

# Run historical analysis manually
USE_AWS_SECRETS=true npm run historical

# Check cron jobs
crontab -l

# Check cron is running
systemctl status cron
```

### Manual Bot Run

```bash
# Run the full bot workflow manually
bash ~/1SLiquidity/server/run-monitor.sh
```

---

## 🔄 Updating Contract Addresses

When you deploy new contracts:

### Option 1: Via Code (Current Setup)

```bash
# On your local machine
cd /Users/zuludykes/code/1SLiquidity

# 1. Update addresses in local-monitor/src/config.ts
# Edit: CONTRACT_ADDRESSES and DEPLOYMENT_BLOCK

# 2. Commit and push to GitHub
git add local-monitor/src/config.ts
git commit -m "Update contract addresses to v1.0.X"
git push origin main

# 3. Deploy to server
ssh -i ~/.ssh/1sliquidity.pem ubuntu@18.134.179.139
cd ~/1SLiquidity
git pull origin main
cd local-monitor
npm run build
# Next cron run uses new addresses automatically!
```

### Option 2: Quick Deploy Script (from local)

```bash
# On your local machine
cd /Users/zuludykes/code/1SLiquidity/server
./deploy-monitor.sh 18.134.179.139 ~/.ssh/1sliquidity.pem
```

---

## 🔐 Managing AWS Secrets

### View/Update Secrets

1. **Go to AWS Secrets Manager**: https://console.aws.amazon.com/secretsmanager/home?region=eu-west-2
2. **Click**: `1sliquidity-bot-secrets`
3. **Click**: "Retrieve secret value"
4. **Edit**: Click "Edit" to update values
5. **Save**: Bot uses new values immediately (no restart needed!)

### Current Secrets

```
PRIVATE_KEY              - Bot wallet private key
MAINNET_RPC_HTTP_URL     - Infura/Alchemy RPC endpoint  
TELEGRAM_BOT_TOKEN       - 8565173388:AAFQ3QqGFEBmQMzVdKd8T_ijPtT4fNOR1VA
TELEGRAM_CHAT_ID         - 6043335495 (@immaxkent)
```

---

## 📱 Telegram Alerts

**Your bot**: Search `@` + your bot username in Telegram  
**Alerts sent to**: @immaxkent (ID: 6043335495)

### Alert Types

- ⚠️ **Execution failures** (immediate)
- 💰 **Low balance** (<0.005 ETH)
- 🚨 **Bot hasn't run** (>15 min)
- 📊 **Daily summary** (midnight UTC)

### Test Alert

```bash
ssh -i ~/.ssh/1sliquidity.pem ubuntu@18.134.179.139
bash ~/1SLiquidity/server/monitor-health.sh
```

---

## 🛠️ Troubleshooting

### Bot Not Running

```bash
# Check cron service
sudo systemctl status cron

# Restart cron
sudo systemctl restart cron

# Check for errors
tail -50 ~/monitor-logs/error.log

# Run manually to see errors
bash ~/1SLiquidity/server/run-monitor.sh
```

### AWS Secrets Not Working

```bash
# Check IAM role is attached
# AWS Console → EC2 → Your instance → Security → IAM role
# Should show: 1SLiquidity-EC2-Role

# Test secrets access
cd ~/1SLiquidity/local-monitor
USE_AWS_SECRETS=true npm run balance-check
```

### SSH Connection Issues

```bash
# If your IP changed, update security group:
# AWS Console → EC2 → Security Groups → launch-wizard-1
# Edit inbound rules → Update SSH source to new IP/32
```

### Low Disk Space

```bash
# Check disk usage
df -h

# Clean old logs (>7 days)
find ~/monitor-logs -name "*.log" -mtime +7 -delete
```

---

## 📈 Performance & Costs

### Bot Execution

- **Frequency**: Every 5 minutes (exact)
- **Execution time**: ~45 seconds per run
- **Gas costs**: ~100,000-200,000 gas per trade (~$0.10-2 with Curve removed)

### AWS Costs

| Component | Cost/Month |
|-----------|------------|
| EC2 t3.micro (Year 1) | Free |
| EC2 t3.micro (After) | $7.50 |
| EBS Storage (8GB) | $0.80 |
| Secrets Manager | $0.40 |
| Data Transfer | $0.09 |
| **Total (Year 1)** | **$1.29** |
| **Total (After)** | **$8.79** |

---

## 🎯 Next Steps

1. **✅ Fund wallet**: Send 0.05+ ETH to `0x8eE0E5d5FEfD3F0F6Ef9cb8C4bcb65B37f2484E6`
2. **✅ Test alerts**: Run health check and verify Telegram message
3. **✅ Monitor logs**: Check bot runs successfully every 5 min
4. **✅ Verify trades**: Confirm bot is executing trades on-chain

---

## 📞 Quick Commands Reference

```bash
# SSH into server
ssh -i ~/.ssh/1sliquidity.pem ubuntu@18.134.179.139

# View live logs
tail -f ~/monitor-logs/$(date +%Y-%m-%d).log

# Check balance
cd ~/1SLiquidity/local-monitor && USE_AWS_SECRETS=true npm run balance-check

# Manual run
bash ~/1SLiquidity/server/run-monitor.sh

# Update code from GitHub
cd ~/1SLiquidity && git pull origin main && cd local-monitor && npm run build

# View cron jobs
crontab -l

# View errors
cat ~/monitor-logs/error.log
```

---

## ✨ You're All Set!

Your bot is now:
- ✅ Running every 5 minutes automatically
- ✅ Secured with AWS Secrets Manager  
- ✅ Monitoring health and sending alerts
- ✅ Using latest contract addresses (v1.0.5)
- ✅ Ready to execute trades (once wallet is funded!)

**Next run**: Within 5 minutes (check logs to see it in action!)

🚀 Happy trading!
