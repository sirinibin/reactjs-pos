#!/usr/bin/env bash
# Deploy startpos frontend v2 to https://startpos-v2.gulfunionozone.com
# Must be run from the v2 branch (enforced below).
#
# Usage:
#   ./deploy_v2.sh          — lint, test, build, deploy
#   ./deploy_v2.sh --force  — skip branch check (for emergencies)

set -eo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Downloads/startuptech-v2.pem}"
SERVER_USER="ubuntu"
SERVER_HOST="ec2-13-42-39-69.eu-west-2.compute.amazonaws.com"

V2_API_URL="https://startpos-api-v2.gulfunionozone.com"
V2_DEST="/home/ubuntu/reactjs-pos-v2/build"

FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)"

FORCE=false
for arg in "$@"; do [ "$arg" = "--force" ] && FORCE=true; done

# ─── guard: must be on v2 branch ──────────────────────────────────────────────

check_branch() {
    local current_branch
    current_branch=$(git -C "$FRONTEND_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
    if [ "$current_branch" != "v2" ]; then
        echo ""
        echo "==> ABORTED: deploy_v2.sh must be run from the v2 branch."
        echo "    Current branch: $current_branch"
        echo "    Switch with: git checkout v2"
        echo "    Or bypass with: ./deploy_v2.sh --force"
        exit 1
    fi
}

# ─── guard: uncommitted changes ───────────────────────────────────────────────

check_uncommitted() {
    echo ""
    echo "==> Checking for uncommitted changes..."
    cd "$FRONTEND_DIR"
    if [ -n "$(git status --porcelain 2>/dev/null)" ]; then
        echo "==> ABORTED: uncommitted changes found. Commit or stash them before deploying."
        echo ""
        git status --short
        exit 1
    fi
    echo "==> Working tree is clean."
}

# ─── lint / typecheck ─────────────────────────────────────────────────────────

check_eslint() {
    echo ""
    echo "==> Type-checking and linting (zero warnings allowed)..."
    cd "$FRONTEND_DIR"
    if ! npm run typecheck; then
        echo "==> ABORTED: TypeScript errors found."
        exit 1
    fi
    if ! npm run lint; then
        echo ""
        echo "==> ABORTED: ESLint errors/warnings found. Fix them before deploying."
        exit 1
    fi
    echo "==> Types and lint clean."
}

# ─── tests ────────────────────────────────────────────────────────────────────

run_tests() {
    echo ""
    echo "==> Running unit + functional tests..."
    cd "$FRONTEND_DIR"
    CI=true npm test
    echo "==> All tests passed."
}

# ─── build ────────────────────────────────────────────────────────────────────

build_v2() {
    echo ""
    echo "==> Building v2 (same-origin API, served by nginx / Go STATIC_DIR) ..."
    cd "$FRONTEND_DIR"

    local tmp_log
    tmp_log=$(mktemp)
    trap 'rm -f "$tmp_log"' RETURN

    npm run build 2>&1 | tee "$tmp_log"

    # Vite prints "(!)" for warnings (e.g. oversized chunks, unresolved imports).
    if grep -qiE "\(!\)|warning" "$tmp_log"; then
        echo ""
        echo "==> ABORTED: build produced warnings. Fix all warnings before deploying."
        exit 1
    fi
    echo "==> Build complete."
}

# ─── deploy (atomic swap, near-zero downtime) ─────────────────────────────────

SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -i $SSH_KEY"

deploy_v2() {
    local src="$FRONTEND_DIR/build"
    local dest="${V2_DEST%/}"
    local tmp="${dest}_new"
    local old="${dest}_old"
    local attempt=1 max=3 delay=15

    echo ""
    echo "==> Deploying v2 to $SERVER_HOST:$dest ..."

    ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "mkdir -p $tmp $dest" 2>/dev/null || true

    while [ "$attempt" -le "$max" ]; do
        [ "$attempt" -gt 1 ] && { echo "==> Retry $attempt/$max in ${delay}s..."; sleep "$delay"; delay=$((delay * 2)); }

        if rsync -az --partial --timeout=60 \
            -e "ssh $SSH_OPTS" \
            "$src/" "$SERVER_USER@$SERVER_HOST:$tmp/"; then

            echo "==> Transfer complete. Swapping live directory..."
            ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" \
                "mv $dest $old && mv $tmp $dest && rm -rf $old"
            echo "==> v2 deploy complete."
            return 0
        fi

        attempt=$((attempt + 1))
    done

    echo "==> v2 deploy FAILED after $max attempts. Live site untouched."
    return 1
}

# ─── main ─────────────────────────────────────────────────────────────────────

$FORCE || check_branch
check_uncommitted
check_eslint
run_tests
build_v2
deploy_v2

echo ""
echo "Done. v2 live at https://startpos-v2.gulfunionozone.com"
