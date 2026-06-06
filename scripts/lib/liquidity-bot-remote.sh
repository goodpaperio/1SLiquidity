# Shared defaults for liquidity-bot EC2 remote scripts.
# Source from start/pause scripts — do not execute directly.

liquidity_bot_remote_defaults() {
  LIQUIDITY_BOT_HOST="${LIQUIDITY_BOT_HOST:-13.40.113.237}"
  LIQUIDITY_BOT_SSH_KEY="${LIQUIDITY_BOT_SSH_KEY:-$HOME/.ssh/liquidity-bot-alpha.pem}"
  LIQUIDITY_BOT_ID="${LIQUIDITY_BOT_ID:-alpha}"
  LIQUIDITY_BOT_BRANCH="${LIQUIDITY_BOT_BRANCH:-main}"
  SSH_USER="${SSH_USER:-ubuntu}"
  REMOTE_ROOT="${REMOTE_ROOT:-~/1SLiquidity}"
  LIQUIDITY_BOT_SSH_KEY="${LIQUIDITY_BOT_SSH_KEY/#\~/$HOME}"
}

liquidity_bot_resolve_args() {
  liquidity_bot_remote_defaults
  SERVER_IP="${1:-$LIQUIDITY_BOT_HOST}"
  SSH_KEY="${2:-$LIQUIDITY_BOT_SSH_KEY}"
  BOT_ID="${3:-$LIQUIDITY_BOT_ID}"
  SSH_KEY="${SSH_KEY/#\~/$HOME}"
}

liquidity_bot_require_key() {
  if [[ ! -f "$SSH_KEY" ]]; then
    echo "ERROR: SSH key not found: $SSH_KEY" >&2
    echo "Set LIQUIDITY_BOT_SSH_KEY or place key at ~/.ssh/liquidity-bot-alpha.pem" >&2
    exit 1
  fi
}
