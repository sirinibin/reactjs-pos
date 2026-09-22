#!/usr/bin/env bash
# Direct deployment script for startpos frontend.
# Mirrors what .github/workflows/deploy.yml (test) and deploy_production.yml (production) do.
#
# Usage:
#   ./deploy.sh              — run tests, then deploy to both test and production (default)
#   ./deploy.sh both         — same as above
#   ./deploy.sh test         — run tests, then deploy to test only
#   ./deploy.sh production   — run tests, then deploy to production only

set -eo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Downloads/startuptech-v2.pem}"
SERVER_USER="ubuntu"
SERVER_HOST="ec2-13-42-39-69.eu-west-2.compute.amazonaws.com"

TEST_API_URL="https://startpos-api-test.startuptech.uk"
PROD_API_URL="https://startpos-api.startuptech.uk"

TEST_DEST="/home/ubuntu/reactjs-pos-test/build/"
PROD_DEST="/home/ubuntu/reactjs-pos/build/"

FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)"

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

# ─── tests ────────────────────────────────────────────────────────────────────

run_tests() {
    echo ""
    echo "==> Running tests..."
    cd "$FRONTEND_DIR"
    NODE_OPTIONS="--max-old-space-size=6144" CI=true npm test -- --watchAll=false --runInBand --testPathIgnorePatterns="RFQReceived.smoke|importHandlers|QuotationCreate.productEditFocus"
    echo "==> All tests passed."
}

# ─── helpers ──────────────────────────────────────────────────────────────────

build() {
    local api_url="$1"
    local out_dir="${2:-$FRONTEND_DIR/build}"
    echo ""
    echo "==> Building (API: $api_url) ..."
    cd "$FRONTEND_DIR"

    local tmp_log
    tmp_log=$(mktemp)
    trap 'rm -f "$tmp_log"' RETURN

    NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=4096" \
    DANGEROUSLY_DISABLE_HOST_CHECK=true \
    REACT_APP_API_URL="$api_url" \
    GENERATE_SOURCEMAP=false \
    DISABLE_ESLINT_PLUGIN=true \
    BUILD_PATH="$out_dir" \
    npm run build 2>&1 | tee "$tmp_log"
    # npm's exit code is in PIPESTATUS[0]; set -eo pipefail already aborts on failure.

    if grep -qi "compiled with warnings" "$tmp_log"; then
        echo ""
        echo "==> ABORTED: build produced warnings. Fix all warnings before deploying."
        exit 1
    fi
    echo "==> Build complete ($out_dir)."
}

deploy_to() {
    local src="$1"
    local dest="$2"
    local label="$3"
    echo ""
    echo "==> Deploying to $label ($SERVER_HOST:$dest) ..."
    rsync -az --delete \
        -e "ssh -o StrictHostKeyChecking=no -i $SSH_KEY" \
        "$src/" \
        "$SERVER_USER@$SERVER_HOST:$dest"
    echo "==> Deploy to $label complete."
}

# ─── main ─────────────────────────────────────────────────────────────────────

TARGET="${1:-both}"

check_uncommitted

case "$TARGET" in
    test)
        run_tests
        build "$TEST_API_URL"
        deploy_to "$FRONTEND_DIR/build" "$TEST_DEST" "test (https://startpos-test.startuptech.uk)"
        ;;
    production|prod)
        run_tests
        build "$PROD_API_URL"
        deploy_to "$FRONTEND_DIR/build" "$PROD_DEST" "production (https://startpos.startuptech.uk)"
        ;;
    both)
        run_tests
        echo ""
        echo "==> Building test and production in parallel..."
        build "$TEST_API_URL" "$FRONTEND_DIR/build_test" > /tmp/build_test.log 2>&1 &
        PID_TEST=$!
        build "$PROD_API_URL" "$FRONTEND_DIR/build_prod" > /tmp/build_prod.log 2>&1 &
        PID_PROD=$!
        wait $PID_TEST || { echo "==> Test build FAILED:"; cat /tmp/build_test.log; exit 1; }
        echo "==> Test build done."
        wait $PID_PROD || { echo "==> Production build FAILED:"; cat /tmp/build_prod.log; exit 1; }
        echo "==> Production build done."
        deploy_to "$FRONTEND_DIR/build_test" "$TEST_DEST" "test (https://startpos-test.startuptech.uk)" &
        PID_RSYNC_TEST=$!
        deploy_to "$FRONTEND_DIR/build_prod" "$PROD_DEST" "production (https://startpos.startuptech.uk)" &
        PID_RSYNC_PROD=$!
        wait $PID_RSYNC_TEST || { echo "==> Test deploy FAILED"; exit 1; }
        wait $PID_RSYNC_PROD || { echo "==> Production deploy FAILED"; exit 1; }
        ;;
    *)
        echo "Unknown target: $TARGET"
        echo "Usage: $0 <test|production|both>"
        exit 1
        ;;
esac

echo ""
echo "Done."
