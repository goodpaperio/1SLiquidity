#!/usr/bin/env bash
#
# Commit local changes, push, and redeploy liquidity-bot on EC2 (git pull + build + PM2).
#
# Usage (from liquidity-bot/):
#   npm run redeploy
#   npm run redeploy -- "fix: gas liquify before unwrap"
#   npm run redeploy -- --no-commit
#
# Env overrides (optional):
#   LIQUIDITY_BOT_HOST      EC2 IP (default 13.40.113.237)
#   LIQUIDITY_BOT_SSH_KEY   path to .pem (default ~/.ssh/liquidity-bot-alpha.pem)
#   LIQUIDITY_BOT_ID        bot id (default alpha)
#   LIQUIDITY_BOT_BRANCH    branch to push/deploy (default: current git branch)
#
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LIB="$REPO_ROOT/scripts/lib/liquidity-bot-remote.sh"

if [[ ! -f "$LIB" ]]; then
  echo "ERROR: missing $LIB" >&2
  exit 1
fi

# shellcheck source=../../scripts/lib/liquidity-bot-remote.sh
source "$LIB"

NO_COMMIT=0
COMMIT_MSG=""

usage() {
  cat <<'EOF'
Usage: npm run redeploy [-- <options>]

Options:
  --no-commit          Push existing commits only; do not create a new commit
  --help, -h           Show this help
  "<message>"          Commit message (default: chore: liquidity-bot redeploy)

Examples:
  npm run redeploy
  npm run redeploy -- "fix: liquify before gas refuel"
  npm run redeploy -- --no-commit
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-commit)
      NO_COMMIT=1
      shift
      ;;
    --help | -h)
      usage
      exit 0
      ;;
    *)
      COMMIT_MSG="$1"
      shift
      ;;
  esac
done

COMMIT_MSG="${COMMIT_MSG:-chore: liquidity-bot redeploy}"

liquidity_bot_remote_defaults
SERVER_IP="$LIQUIDITY_BOT_HOST"
SSH_KEY="${LIQUIDITY_BOT_SSH_KEY/#\~/$HOME}"
BOT_ID="$LIQUIDITY_BOT_ID"
DEPLOY_BRANCH="${LIQUIDITY_BOT_BRANCH:-$(git -C "$REPO_ROOT" rev-parse --abbrev-ref HEAD)}"
liquidity_bot_require_key

cd "$REPO_ROOT"

if [[ "$NO_COMMIT" -eq 0 ]]; then
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "==> Staging changes (excluding .env and .pem files)"
    git add -A
    while IFS= read -r secret; do
      [[ -n "$secret" ]] && git reset HEAD -- "$secret" 2>/dev/null || true
    done < <(git diff --cached --name-only | grep -E '(^|/)\.env$|\.pem$|protocol-fresh-mainnet\.env$' || true)

    if [[ -n "$(git diff --cached --name-only)" ]]; then
      echo "==> Committing: $COMMIT_MSG"
      git commit -m "$COMMIT_MSG"
    else
      echo "==> No committable changes after excluding secrets"
    fi
  else
    echo "==> Working tree clean — skipping commit"
  fi
else
  echo "==> --no-commit: skipping git commit"
fi

echo "==> Pushing origin/$DEPLOY_BRANCH"
git push -u origin "$DEPLOY_BRANCH"

echo "==> Redeploying on $SSH_USER@$SERVER_IP (bot=$BOT_ID branch=$DEPLOY_BRANCH)"
bash "$REPO_ROOT/scripts/redeploy-liquidity-bot.sh" "$SERVER_IP" "$SSH_KEY" "$BOT_ID" "$DEPLOY_BRANCH"

echo "==> Done. Bot $BOT_ID should be running latest code on $SERVER_IP"
