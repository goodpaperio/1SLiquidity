#!/usr/bin/env bash
#
# Bot-agnostic PM2 stuck-cycle watcher.
# Restarts any `liquidity-bot-*` / `liquidity-bot-v2-*` process whose recent
# out-log is dominated by "previous cycle still running" with no fresh scan.
#
# Cron (every 10 min) on each bot host:
#   */10 * * * * bash ~/1SLiquidity/liquidity-bot/scripts/pm2-stuck-cycle-watch.sh >>/tmp/pm2-stuck-watch.log 2>&1
#
# Env:
#   STUCK_SKIP_MIN      min skip lines in recent window (default 5)
#   STUCK_TAIL_LINES    out-log lines to inspect (default 40)
#   TELEGRAM_BOT_TOKEN  optional alert
#   TELEGRAM_CHAT_ID    optional alert
#
set -euo pipefail

STUCK_SKIP_MIN="${STUCK_SKIP_MIN:-5}"
STUCK_TAIL_LINES="${STUCK_TAIL_LINES:-40}"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
# shellcheck disable=SC1091
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

if ! command -v pm2 >/dev/null 2>&1; then
  echo "pm2 not found" >&2
  exit 0
fi

telegram_ping() {
  local text="$1"
  if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
    return 0
  fi
  local payload
  if command -v jq >/dev/null 2>&1; then
    payload="$(jq -n --arg chat "$TELEGRAM_CHAT_ID" --arg text "$text" \
      '{chat_id:$chat, text:$text, disable_web_page_preview:true}')"
  else
    payload="$(TELEGRAM_CHAT_ID="$TELEGRAM_CHAT_ID" PULL_MSG="$text" python3 -c \
      'import json,os; print(json.dumps({"chat_id":os.environ["TELEGRAM_CHAT_ID"],"text":os.environ["PULL_MSG"],"disable_web_page_preview":True}))')"
  fi
  curl -sS -m 10 -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null || true
}

is_stuck_out_log() {
  local logfile="$1"
  [[ -f "$logfile" ]] || return 1
  local tail_txt
  tail_txt="$(tail -n "$STUCK_TAIL_LINES" "$logfile" 2>/dev/null || true)"
  [[ -n "$tail_txt" ]] || return 1

  if echo "$tail_txt" | grep -qE 'Scan complete|runner started|leg1 confirmed|leg2 confirmed|WOULD EXECUTE|RUNNER: executing'; then
    return 1
  fi

  local skips
  skips="$(echo "$tail_txt" | grep -c 'previous cycle still running' || true)"
  [[ "$skips" -ge "$STUCK_SKIP_MIN" ]]
}

mapfile -t APPS < <(pm2 jlist | python3 -c '
import json,sys
apps=json.load(sys.stdin)
for a in apps:
    name=a.get("name") or ""
    env=a.get("pm2_env") or {}
    status=env.get("status") or ""
    out_log=env.get("pm_out_log_path") or ""
    if status!="online":
        continue
    if not (name.startswith("liquidity-bot-") or name.startswith("liquidity-bot-v2-")):
        continue
    if name.endswith("-placeholder"):
        continue
    print(f"{name}\t{out_log}")
')

for row in "${APPS[@]:-}"; do
  [[ -z "$row" ]] && continue
  name="${row%%$'\t'*}"
  out_log="${row#*$'\t'}"
  if is_stuck_out_log "$out_log"; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) STUCK $name — restarting (out=$out_log)"
    telegram_ping "pm2-health: $name stuck on previous-cycle skips — restarting"
    pm2 restart "$name" --update-env || true
  else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) ok $name"
  fi
done
