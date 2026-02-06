#!/bin/bash
#
# 1SLiquidity Bot - Health Check & Monitoring
# Checks bot health and sends alerts if issues detected
#
# Usage: ./monitor-health.sh [--daily-summary]
#

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
fi

# Setup logging
LOG_DIR="$HOME/monitor-logs"
HEALTH_LOG="$LOG_DIR/health-check.log"
mkdir -p "$LOG_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$HEALTH_LOG"
}

# Function to send Telegram alert
send_alert() {
    local message="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=HTML" \
            > /dev/null 2>&1
    fi
}

log "========================================="
log "🔍 1SLiquidity Bot Health Check"
log "========================================="

ISSUES_FOUND=0

# Check 1: Last run time
log ""
log "📅 Checking last run time..."
LAST_LOG=$(ls -t "$LOG_DIR"/*.log 2>/dev/null | grep -v "health-check.log" | grep -v "error.log" | head -1)

if [ -n "$LAST_LOG" ]; then
    LAST_RUN_LINE=$(grep "Bot Run Completed Successfully" "$LAST_LOG" 2>/dev/null | tail -1)
    
    if [ -n "$LAST_RUN_LINE" ]; then
        LAST_RUN_TIME=$(echo "$LAST_RUN_LINE" | grep -oP '\[\K[0-9: -]+')
        LAST_RUN_EPOCH=$(date -d "$LAST_RUN_TIME" +%s 2>/dev/null || echo 0)
        CURRENT_EPOCH=$(date +%s)
        MINUTES_SINCE=$(( ($CURRENT_EPOCH - $LAST_RUN_EPOCH) / 60 ))
        
        log "Last successful run: $LAST_RUN_TIME ($MINUTES_SINCE minutes ago)"
        
        if [ $MINUTES_SINCE -gt 15 ]; then
            log "⚠️  WARNING: Bot hasn't run successfully in $MINUTES_SINCE minutes!"
            send_alert "⚠️ <b>Bot Health Alert</b>%0A%0ALast successful run: <code>$MINUTES_SINCE minutes ago</code>%0AExpected: Every 5 minutes%0A%0ACheck server: <code>tail -f $LOG_DIR/\$(date +%%Y-%%m-%%d).log</code>"
            ISSUES_FOUND=$((ISSUES_FOUND + 1))
        else
            log "✅ Bot is running on schedule"
        fi
    else
        log "⚠️  No successful completion found in last log"
        ISSUES_FOUND=$((ISSUES_FOUND + 1))
    fi
else
    log "⚠️  No log files found!"
    send_alert "⚠️ <b>Bot Health Alert</b>%0A%0ANo log files found!%0ABot may not be running.%0A%0ACheck: <code>crontab -l</code>"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check 2: Disk space
log ""
log "💾 Checking disk space..."
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
log "Disk usage: ${DISK_USAGE}%"

if [ "$DISK_USAGE" -gt 80 ]; then
    log "⚠️  WARNING: Disk space is at ${DISK_USAGE}%!"
    send_alert "⚠️ <b>Disk Space Alert</b>%0A%0AUsage: <code>${DISK_USAGE}%</code>%0AThreshold: 80%%"
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    log "✅ Disk space OK"
fi

# Check 3: Log directory size
log ""
log "📂 Checking log directory size..."
LOG_SIZE=$(du -sh "$LOG_DIR" 2>/dev/null | awk '{print $1}')
log "Log directory size: $LOG_SIZE"

# Check 4: Process check (cron)
log ""
log "⚙️  Checking cron service..."
if systemctl is-active --quiet cron 2>/dev/null || service cron status &>/dev/null; then
    log "✅ Cron service is running"
else
    log "⚠️  WARNING: Cron service is not running!"
    send_alert "⚠️ <b>Cron Service Alert</b>%0A%0ACron service is not running!%0ABot will not execute automatically."
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
fi

# Check 5: Recent errors
log ""
log "🔍 Checking for recent errors..."
if [ -f "$LOG_DIR/error.log" ]; then
    ERROR_COUNT=$(wc -l < "$LOG_DIR/error.log")
    RECENT_ERRORS=$(tail -5 "$LOG_DIR/error.log" 2>/dev/null | grep "ERROR" | wc -l)
    
    log "Total errors in error.log: $ERROR_COUNT"
    log "Recent errors (last 5 lines): $RECENT_ERRORS"
    
    if [ $RECENT_ERRORS -gt 0 ]; then
        log "⚠️  Recent errors detected!"
        LAST_ERROR=$(tail -1 "$LOG_DIR/error.log")
        log "Last error: $LAST_ERROR"
    fi
else
    log "✅ No error log found (good!)"
fi

# Daily Summary (if requested)
if [ "$1" = "--daily-summary" ]; then
    log ""
    log "📊 Generating daily summary..."
    
    TODAY=$(date +%Y-%m-%d)
    TODAY_LOG="$LOG_DIR/$TODAY.log"
    
    if [ -f "$TODAY_LOG" ]; then
        TOTAL_RUNS=$(grep -c "Bot Run Completed Successfully" "$TODAY_LOG" 2>/dev/null || echo 0)
        SUCCESS_COUNT=$(grep "Successful:" "$TODAY_LOG" 2>/dev/null | grep -oP '✅ \K\d+' | awk '{s+=$1} END {print s}')
        FAIL_COUNT=$(grep "Failed:" "$TODAY_LOG" 2>/dev/null | grep -oP '❌ \K\d+' | awk '{s+=$1} END {print s}')
        
        SUCCESS_COUNT=${SUCCESS_COUNT:-0}
        FAIL_COUNT=${FAIL_COUNT:-0}
        
        log "📈 Daily Summary for $TODAY:"
        log "   Total bot runs: $TOTAL_RUNS"
        log "   Successful executions: $SUCCESS_COUNT"
        log "   Failed executions: $FAIL_COUNT"
        
        if [ "${ALERT_DAILY_SUMMARY:-true}" = "true" ]; then
            send_alert "📊 <b>Daily Summary</b> - $TODAY%0A%0A🔄 Bot runs: <code>$TOTAL_RUNS</code>%0A✅ Successful: <code>$SUCCESS_COUNT</code>%0A❌ Failed: <code>$FAIL_COUNT</code>%0A%0A💾 Disk usage: <code>${DISK_USAGE}%</code>%0A📂 Log size: <code>$LOG_SIZE</code>"
        fi
    else
        log "⚠️  No log file found for today"
    fi
fi

# Final summary
log ""
log "========================================="
if [ $ISSUES_FOUND -eq 0 ]; then
    log "✅ Health Check Passed - All systems operational"
else
    log "⚠️  Health Check Completed with $ISSUES_FOUND issue(s)"
fi
log "========================================="
log ""

exit 0
