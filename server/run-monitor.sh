#!/bin/bash
#
# 1SLiquidity Bot - Cron Execution Wrapper
# This script is called by cron every 5 minutes
#
# Usage: ./run-monitor.sh
#

set -e  # Exit on any error

# Determine script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
MONITOR_DIR="$REPO_DIR/local-monitor"

# Prevent overlapping cron runs (can cause contradictory summaries/state races).
LOCK_FILE="/tmp/1sliquidity-monitor.lock"
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: Another monitor run is still in progress, skipping this cycle."
    exit 0
fi

# Enable AWS Secrets Manager
export USE_AWS_SECRETS=true

# Load environment variables (optional when using AWS Secrets Manager)
if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(cat "$SCRIPT_DIR/.env" | grep -v '^#' | xargs)
else
    echo "INFO: No .env file found, using AWS Secrets Manager"
fi

# Setup logging
LOG_DIR="$HOME/monitor-logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/$(date +%Y-%m-%d).log"
ERROR_LOG="$LOG_DIR/error.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$LOG_FILE" "$ERROR_LOG"
}

# Function to send Telegram alert
send_alert() {
    local message="$1"
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${message}" \
            -d "parse_mode=HTML" \
            > /dev/null 2>&1 || true
    fi
}

# Trap errors
trap 'log_error "Script failed at line $LINENO"; send_alert "🚨 <b>Bot Error</b>%0A%0AScript failed at line $LINENO%0ACheck logs: $LOG_FILE"; exit 1' ERR

log "========================================="
log "🚀 Starting 1SLiquidity Bot Run"
log "========================================="
log "Working directory: $MONITOR_DIR"
log "Environment: $(node --version), $(npm --version)"
log ""

# Change to monitor directory
cd "$MONITOR_DIR"

# Check wallet balance
log "💰 Checking wallet balance..."
if npm run balance-check >> "$LOG_FILE" 2>&1; then
    # Extract balance from log (looks for pattern like "Balance: 0.0042 ETH")
    BALANCE=$(grep "Balance:" "$LOG_FILE" | tail -1 | grep -oP '\d+\.\d+' || echo "0")
    THRESHOLD="${ALERT_LOW_BALANCE_THRESHOLD:-0.02}"
    
    if [ -n "$BALANCE" ] && [ "$BALANCE" != "0" ]; then
        log "Current balance: $BALANCE ETH"
        
        # Compare using awk (more portable than bc)
        if awk "BEGIN {exit !($BALANCE < $THRESHOLD)}"; then
            log_error "⚠️  Low balance detected: $BALANCE ETH (threshold: $THRESHOLD ETH)"
            send_alert "⚠️ <b>Low Balance Alert</b>%0A%0ABot wallet balance: <code>$BALANCE ETH</code>%0AThreshold: <code>$THRESHOLD ETH</code>%0A%0APlease top up the wallet!"
        fi
    fi
else
    log "⚠️  Balance check failed (non-critical)"
fi

log ""
log "📊 Step 1/4: Running historical analysis..."
if npm run historical >> "$LOG_FILE" 2>&1; then
    log "✅ Historical analysis completed"
else
    log_error "❌ Historical analysis failed"
    send_alert "❌ <b>Historical Analysis Failed</b>%0A%0ACheck logs: <code>$LOG_FILE</code>"
    exit 1
fi

log ""
log "🔄 Step 2/4: Executing trades..."
EXECUTE_OUTPUT=$(mktemp)
if npm run execute-trades > "$EXECUTE_OUTPUT" 2>&1; then
    cat "$EXECUTE_OUTPUT" >> "$LOG_FILE"
    log "✅ Trade execution completed"
    
    # Parse execution summary
    if grep -q "Successful:" "$EXECUTE_OUTPUT"; then
        SUCCESS_COUNT=$(grep "Successful:" "$EXECUTE_OUTPUT" | grep -oP '\d+' | head -1)
        FAIL_COUNT=$(grep "Failed:" "$EXECUTE_OUTPUT" | grep -oP '\d+' | head -1)
        
        log "📊 Execution Summary: ✅ $SUCCESS_COUNT successful, ❌ $FAIL_COUNT failed"
        
        # Send alert on execution (if configured)
        if [ "$SUCCESS_COUNT" -gt 0 ] && [ "${ALERT_ON_SUCCESS:-false}" = "true" ]; then
            send_alert "✅ <b>Trades Executed</b>%0A%0ASuccessful: <code>$SUCCESS_COUNT</code>%0AFailed: <code>$FAIL_COUNT</code>%0A%0ATime: $(date '+%Y-%m-%d %H:%M:%S UTC')"
        fi
        
        # Send alert on failures (if configured)
        if [ "$FAIL_COUNT" -gt 0 ] && [ "${ALERT_ON_FAILURE:-true}" = "true" ]; then
            # Unique pair IDs only (same ID often appears multiple times in log)
            FAILED_PAIRS=$(grep -oP '0x[a-fA-F0-9]{64}' "$EXECUTE_OUTPUT" | sort -u | head -5)
            FAILED_PAIRS_FORMATTED=""
            while read -r id; do
                [ -z "$id" ] && continue
                short="${id:0:10}...${id: -6}"
                [ -n "$FAILED_PAIRS_FORMATTED" ] && FAILED_PAIRS_FORMATTED="${FAILED_PAIRS_FORMATTED}%0A"
                FAILED_PAIRS_FORMATTED="${FAILED_PAIRS_FORMATTED}  • ${short}"
            done <<< "$FAILED_PAIRS"
            # Include last failure reason if present (for debugging)
            LAST_REASON=""
            if grep -q "Last failure reason:" "$EXECUTE_OUTPUT"; then
                LAST_REASON=$(grep "Last failure reason:" "$EXECUTE_OUTPUT" | tail -1 | sed 's/.*Last failure reason: //' | tr -d '\n' | head -c 200)
                LAST_REASON=$(printf '%s' "$LAST_REASON" | sed 's/%/%25/g')
                LAST_REASON="%0A%0AReason: <code>${LAST_REASON:-unknown}</code>"
            fi
            send_alert "⚠️ <b>Execution Failures</b>%0A%0AFailed: <code>$FAIL_COUNT</code> trade(s)%0A%0APair IDs:%0A<code>${FAILED_PAIRS_FORMATTED:-none}</code>${LAST_REASON}%0A%0ACheck logs: <code>$LOG_FILE</code>"
        fi
    fi
else
    cat "$EXECUTE_OUTPUT" >> "$LOG_FILE"
    log_error "❌ Trade execution failed"
    send_alert "❌ <b>Trade Execution Failed</b>%0A%0ACheck logs: <code>$LOG_FILE</code>"
    rm -f "$EXECUTE_OUTPUT"
    exit 1
fi
rm -f "$EXECUTE_OUTPUT"

log ""
log "⏳ Step 3/4: Waiting 24 seconds for confirmations..."
sleep 24

log ""
log "🔍 Step 4/4: Running final historical analysis..."
if npm run historical >> "$LOG_FILE" 2>&1; then
    log "✅ Final analysis completed"
else
    log_error "❌ Final analysis failed"
    send_alert "⚠️ <b>Final Analysis Failed</b>%0A%0ACheck logs: <code>$LOG_FILE</code>"
fi

log ""
log "========================================="
log "✅ Bot Run Completed Successfully"
log "========================================="
log "Next run in 5 minutes"
log ""

exit 0
