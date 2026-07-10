#!/usr/bin/env bash
#
# Self-update liquidity-bot on this host from origin/<branch>.
# Intended for Telegram /pull or: npm run pull -- <bot-id>
#
# Env:
#   BOT_ID              required
#   PULL_BRANCH         default main
#   PULL_ALLOW_DIRTY    0 (default) refuse unexpected dirty tracked files
#   TELEGRAM_BOT_TOKEN  optional completion ping
#   TELEGRAM_CHAT_ID    optional completion ping
#   REPO_ROOT           optional monorepo root
#   DRY_RUN             1 = print plan only
#
set -euo pipefail

BOT_ID="${BOT_ID:-}"
PULL_BRANCH="${PULL_BRANCH:-main}"
PULL_ALLOW_DIRTY="${PULL_ALLOW_DIRTY:-0}"
DRY_RUN="${DRY_RUN:-0}"

if [[ -z "$BOT_ID" ]]; then
  echo "ERROR: BOT_ID is required" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="${REPO_ROOT:-$(cd "$PACKAGE_ROOT/.." && pwd)}"
REPO_ROOT="${REPO_ROOT/#\~/$HOME}"
LOCK_FILE="${TMPDIR:-/tmp}/liquidity-bot-pull-${BOT_ID}.lock"
LOG_FILE="${TMPDIR:-/tmp}/liquidity-bot-pull-${BOT_ID}.log"

telegram_ping() {
  local text="$1"
  if [[ -z "${TELEGRAM_BOT_TOKEN:-}" || -z "${TELEGRAM_CHAT_ID:-}" ]]; then
    return 0
  fi
  # Prefer jq; fall back to python3 for JSON escaping.
  local payload
  if command -v jq >/dev/null 2>&1; then
    payload="$(jq -n --arg chat "$TELEGRAM_CHAT_ID" --arg text "$text" \
      '{chat_id:$chat, text:$text, disable_web_page_preview:true}')"
  else
    payload="$(TELEGRAM_CHAT_ID="$TELEGRAM_CHAT_ID" PULL_MSG="$text" python3 -c \
      'import json,os; print(json.dumps({"chat_id":os.environ["TELEGRAM_CHAT_ID"],"text":os.environ["PULL_MSG"],"disable_web_page_preview":True}))')"
  fi
  curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null || true
}

fail() {
  local msg="$1"
  echo "ERROR: $msg" >&2
  telegram_ping "bot=${BOT_ID} /pull FAILED: ${msg}"
  exit 1
}

cleanup_lock() {
  rm -f "$LOCK_FILE" 2>/dev/null || true
}
trap cleanup_lock EXIT

if [[ -f "$LOCK_FILE" ]]; then
  fail "pull already in progress (lock: $LOCK_FILE)"
fi
echo $$ >"$LOCK_FILE"

exec > >(tee -a "$LOG_FILE") 2>&1
echo "==> self-update bot=$BOT_ID branch=$PULL_BRANCH repo=$REPO_ROOT"
echo "==> log: $LOG_FILE"

cd "$REPO_ROOT"

if [[ ! -d .git ]]; then
  fail "not a git repo: $REPO_ROOT"
fi

if [[ -f ~/.nvm/nvm.sh ]]; then
  # shellcheck disable=SC1090
  source ~/.nvm/nvm.sh
  nvm use 22 >/dev/null || true
fi

BEFORE_SHA="$(git rev-parse --short HEAD)"
echo "==> before: $BEFORE_SHA"

if [[ "$DRY_RUN" == "1" ]]; then
  echo "==> DRY_RUN=1 — fetch only (no merge/restart)"
  git fetch origin "$PULL_BRANCH" || true
  echo "    local:  $(git rev-parse --short HEAD)"
  echo "    remote: $(git rev-parse --short "origin/${PULL_BRANCH}" 2>/dev/null || echo unknown)"
  exit 0
fi

# Preserve local bot config if dirty (peers often edit bots/<id>.json on the host).
BOT_JSON="liquidity-bot/bots/${BOT_ID}.json"
STASHED_BOT_JSON=0
if [[ -f "$BOT_JSON" ]] && ! git diff --quiet -- "$BOT_JSON" 2>/dev/null; then
  echo "==> preserving dirty $BOT_JSON"
  cp "$BOT_JSON" "/tmp/liquidity-bot-${BOT_ID}.json.pullbak"
  STASHED_BOT_JSON=1
fi

# Unexpected dirty tracked files (excluding bot json we preserve).
DIRTY="$(git status --porcelain --untracked-files=no | grep -v " liquidity-bot/bots/${BOT_ID}.json\$" || true)"
if [[ -n "$DIRTY" && "$PULL_ALLOW_DIRTY" != "1" ]]; then
  fail "dirty tracked files — fix via SSH or set PULL_ALLOW_DIRTY=1"$'\n'"$DIRTY"
fi

git fetch origin "$PULL_BRANCH"
git checkout "$PULL_BRANCH"
if ! git merge --ff-only "origin/${PULL_BRANCH}"; then
  fail "ff-only merge failed (local branch diverged from origin/${PULL_BRANCH})"
fi

AFTER_SHA="$(git rev-parse --short HEAD)"
echo "==> after:  $AFTER_SHA"

if [[ "$STASHED_BOT_JSON" -eq 1 && -f "/tmp/liquidity-bot-${BOT_ID}.json.pullbak" ]]; then
  cp "/tmp/liquidity-bot-${BOT_ID}.json.pullbak" "$BOT_JSON"
  echo "==> restored local $BOT_JSON"
fi

cd "$REPO_ROOT/liquidity-bot"

echo "==> npm ci"
npm ci --include=optional

echo "==> build"
if ! npm run build; then
  fail "build failed — PM2 left running on previous dist (sha was $BEFORE_SHA, tree now $AFTER_SHA)"
fi

echo "==> restart PM2 bot=$BOT_ID"
npm run stop bot -- "$BOT_ID" || true
npm run start bot -- "$BOT_ID"
npm run status bot -- "$BOT_ID" || true

MSG="bot=${BOT_ID} /pull OK ${BEFORE_SHA} → ${AFTER_SHA} (branch=${PULL_BRANCH})"
echo "==> $MSG"
telegram_ping "$MSG"
