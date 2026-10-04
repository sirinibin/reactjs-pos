#!/usr/bin/env bash
# ╔══════════════════════════════════════════════════════════════════════════╗
# ║  EMERGENCY QUICK DEPLOY — SKIPS ESLINT AND ALL TESTS                   ║
# ║  Use only when a critical bug must be fixed immediately in production.  ║
# ║  Under normal circumstances always use deploy.sh / deploy_v2.sh.        ║
# ╚══════════════════════════════════════════════════════════════════════════╝
#
# Branch routing (auto-detected):
#   master → production  (https://startpos.gulfunionozone.com)
#   test   → test        (https://startpos-test.gulfunionozone.com)
#   v2     → v2          (https://startpos-v2.gulfunionozone.com)
#
# Usage:
#   ./deploy_quick.sh          — build + deploy current branch target
#   ./deploy_quick.sh --force  — also skip uncommitted-changes check

set -eo pipefail

FORCE=false
for arg in "$@"; do [ "$arg" = "--force" ] && FORCE=true; done

SSH_KEY="${SSH_KEY:-$HOME/Downloads/startuptech-v2.pem}"
SERVER_USER="ubuntu"
SERVER_HOST="ec2-13-42-39-69.eu-west-2.compute.amazonaws.com"

FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Detect branch → set target ───────────────────────────────────────────────
BRANCH=$(git -C "$FRONTEND_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
case "$BRANCH" in
  master)
    API_URL="https://startpos-api.gulfunionozone.com"
    DEST="/home/ubuntu/reactjs-pos/build"
    LABEL="PRODUCTION"
    ;;
  test)
    API_URL="https://startpos-api-test.gulfunionozone.com"
    DEST="/home/ubuntu/reactjs-pos-test/build"
    LABEL="TEST"
    ;;
  v2)
    API_URL="https://startpos-api-v2.gulfunionozone.com"
    DEST="/home/ubuntu/reactjs-pos-v2/build"
    LABEL="V2"
    ;;
  *)
    echo "==> ABORTED: deploy_quick.sh does not support branch '$BRANCH'."
    echo "    Supported branches: master, test, v2"
    exit 1
    ;;
esac

echo ""
echo "╔══════════════════════════════════════════════════════════════════════╗"
echo "║  ⚠  EMERGENCY QUICK DEPLOY — TESTS SKIPPED — TARGET: $LABEL"
echo "╚══════════════════════════════════════════════════════════════════════╝"
echo ""

# ─── guard: uncommitted changes ───────────────────────────────────────────────
if ! $FORCE; then
    echo "==> Checking for uncommitted changes..."
    cd "$FRONTEND_DIR"
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        echo "==> ABORTED: uncommitted changes found. Commit or stash, or use --force."
        git status --short
        exit 1
    fi
    echo "==> Working tree is clean."
fi

# ─── Build (ESLint + tests SKIPPED) ───────────────────────────────────────────
echo ""
echo "==> Building [$LABEL] (API: $API_URL) — ESLint and tests SKIPPED..."
cd "$FRONTEND_DIR"

tmp_log=$(mktemp)
trap 'rm -f "$tmp_log"' RETURN

NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=4096" \
DANGEROUSLY_DISABLE_HOST_CHECK=true \
REACT_APP_API_URL="$API_URL" \
GENERATE_SOURCEMAP=false \
DISABLE_ESLINT_PLUGIN=true \
npm run build 2>&1 | tee "$tmp_log"

if grep -qi "compiled with warnings" "$tmp_log"; then
    echo ""
    echo "==> ABORTED: build produced warnings. Fix warnings or use deploy_quick.sh --force to skip this check too."
    exit 1
fi
echo "==> Build complete."

# ─── Deploy (atomic swap, near-zero downtime) ─────────────────────────────────
SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -i $SSH_KEY"
dest="${DEST%/}"
tmp_dir="${dest}_new"
old_dir="${dest}_old"
attempt=1; max=3; delay=15

echo ""
echo "==> [$LABEL] Deploying to $SERVER_HOST:$dest ..."

ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "mkdir -p $tmp_dir $dest" 2>/dev/null || true

while [ "$attempt" -le "$max" ]; do
    [ "$attempt" -gt 1 ] && { echo "==> Retry $attempt/$max in ${delay}s..."; sleep "$delay"; delay=$((delay * 2)); }

    if rsync -az --partial --timeout=60 \
        -e "ssh $SSH_OPTS" \
        "$FRONTEND_DIR/build/" "$SERVER_USER@$SERVER_HOST:$tmp_dir/"; then

        echo "==> Transfer complete. Swapping live directory..."
        ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" \
            "mv $dest $old_dir && mv $tmp_dir $dest && rm -rf $old_dir"
        echo "==> [$LABEL] Quick deploy complete. Remember to run full deploy.sh when stable."
        exit 0
    fi

    attempt=$((attempt + 1))
done

echo "==> Deploy FAILED after $max attempts."
exit 1
