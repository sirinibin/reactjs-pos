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

# ─── guard: test-deploy window (10 pm – 6 am Saudi time) ─────────────────────

# Returns 0 (allowed) if the current Saudi time is within the test-deploy window.
# Saudi Arabia is UTC+3; allowed hours are 22, 23, 0, 1, 2, 3, 4, 5.
test_window_open() {
    local sa_hour
    sa_hour=$(TZ='Asia/Riyadh' date +%H)
    # Strip leading zero so the comparison is numeric, not octal.
    sa_hour=$((10#$sa_hour))
    [ "$sa_hour" -ge 22 ] || [ "$sa_hour" -le 5 ]
}

check_test_window() {
    if ! test_window_open; then
        local sa_time
        sa_time=$(TZ='Asia/Riyadh' date '+%H:%M')
        echo ""
        echo "==> ABORTED: test deploy is only allowed between 10 pm and 6 am Saudi time."
        echo "    Current Saudi time: $sa_time. Try again after 10 pm."
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

# ─── eslint error check ───────────────────────────────────────────────────────

check_eslint() {
    echo ""
    echo "==> Checking for ESLint errors (src, excluding __tests__)..."
    cd "$FRONTEND_DIR"
    # --quiet: report errors only (not warnings). Exit code 1 if any errors found.
    # Exclude test files — they have pre-existing import/first issues that don't affect production.
    if ! npx eslint src --ext .js,.jsx --quiet --ignore-pattern 'src/**/__tests__/**' --ignore-pattern 'src/**/*.test.js' --ignore-pattern 'src/**/*.test.jsx' 2>&1; then
        echo ""
        echo "==> ABORTED: ESLint errors found. Fix all errors before deploying."
        exit 1
    fi
    echo "==> No ESLint errors."
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

SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30 -o ServerAliveInterval=15 -o ServerAliveCountMax=3 -i $SSH_KEY"

deploy_to() {
    local src="$1"
    local dest="${2%/}"   # strip trailing slash: /home/ubuntu/reactjs-pos/build
    local label="$3"
    local tmp="${dest}_new"   # rsync target: build_new/
    local old="${dest}_old"   # temporary backup during swap
    local attempt=1 max=3 delay=15

    echo ""
    echo "==> Deploying to $label ($SERVER_HOST:$dest) ..."

    # Ensure both the temp dir and the live dir exist so the atomic swap never fails
    # on a fresh server where the live dir hasn't been created yet.
    ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" "mkdir -p $tmp $dest" 2>/dev/null || true

    while [ "$attempt" -le "$max" ]; do
        [ "$attempt" -gt 1 ] && { echo "==> [$label] Retry $attempt/$max in ${delay}s..."; sleep "$delay"; delay=$((delay * 2)); }

        # rsync into the temp dir — no --delete yet, so the live dir is untouched.
        # --partial keeps incomplete files so retries resume from the last byte, not scratch.
        # --timeout aborts after 60s of silence (catches hung connections).
        if rsync -az --partial --timeout=60 \
            -e "ssh $SSH_OPTS" \
            "$src/" "$SERVER_USER@$SERVER_HOST:$tmp/"; then

            # Full transfer succeeded → atomic swap.
            # Two renames on the same filesystem — each is a single syscall (~1ms total).
            # Users see either the old or the new build; never a half-deployed mix.
            echo "==> [$label] Transfer complete. Swapping live directory..."
            ssh $SSH_OPTS "$SERVER_USER@$SERVER_HOST" \
                "mv $dest $old && mv $tmp $dest && rm -rf $old"
            echo "==> [$label] Deploy complete."
            return 0
        fi

        attempt=$((attempt + 1))
    done
    echo "==> [$label] Deploy FAILED after $max attempts. Live site untouched."
    return 1
}

# ─── main ─────────────────────────────────────────────────────────────────────
#
# Usage:
#   ./deploy.sh [test|production|both] [--force]
#
#   --force  bypass the 10 pm–6 am Saudi time restriction on test deployments

TARGET="${1:-both}"
FORCE=false
for arg in "$@"; do [ "$arg" = "--force" ] && FORCE=true; done

check_uncommitted

# Helper: returns 0 when test deploy is allowed (window open OR --force given).
test_allowed() {
    $FORCE && return 0
    test_window_open
}

case "$TARGET" in
    test)
        if ! test_allowed; then
            sa_time=$(TZ='Asia/Riyadh' date '+%H:%M')
            echo ""
            echo "==> ABORTED: test deploy is only allowed between 10 pm and 6 am Saudi time."
            echo "    Current Saudi time: $sa_time. Use --force to override."
            exit 1
        fi
        $FORCE && echo "==> [--force] Bypassing test deploy time restriction."
        check_eslint
        run_tests
        build "$TEST_API_URL"
        deploy_to "$FRONTEND_DIR/build" "$TEST_DEST" "test (https://startpos-test.startuptech.uk)"
        ;;
    production|prod)
        check_eslint
        run_tests
        build "$PROD_API_URL"
        deploy_to "$FRONTEND_DIR/build" "$PROD_DEST" "production (https://startpos.startuptech.uk)"
        ;;
    both)
        check_eslint
        run_tests
        if test_allowed; then
            $FORCE && ! test_window_open && echo "==> [--force] Bypassing test deploy time restriction."
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
        else
            sa_time=$(TZ='Asia/Riyadh' date '+%H:%M')
            echo ""
            echo "==> Note: test deploy skipped (outside 10 pm–6 am Saudi window; current: $sa_time). Use --force to override."
            echo "==> Building production only..."
            build "$PROD_API_URL"
            deploy_to "$FRONTEND_DIR/build" "$PROD_DEST" "production (https://startpos.startuptech.uk)"
        fi
        ;;
    *)
        echo "Unknown target: $TARGET"
        echo "Usage: $0 <test|production|both>"
        exit 1
        ;;
esac

echo ""
echo "Done."
