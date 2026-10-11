#!/usr/bin/env bash
# Deployment script for startpos frontend, the only deploy path (there is no
# GitHub Actions pipeline): one script for both sites, run from this machine.
# Every test suite (ci/run_all_tests.sh), one build, then
# that exact build to the test site and, only after the test site serves it,
# to production (.github/scripts/deploy_site.sh: atomic swap, verify, roll
# back). The build is site-neutral (src/utils/apiBaseURL.js picks the API from
# the page's host). Needs Docker running (throwaway MongoDB and Redis for the
# browser tests); see ci/run_all_tests.sh for the other tools and settings.
#
# Usage:
#   ./deploy.sh              — run the tests, build once, deploy to the test
#                              site, verify it, then production
#   ./deploy.sh --test-only  — same, but stop after the test site

set -eo pipefail

# Deploy only after every suite passes: QUICK=1 (fewer suites) is for local
# iteration with ci/run_all_tests.sh, never for a deploy.
if [ -n "${QUICK:-}" ]; then
    echo "==> ABORTED: deploy.sh always runs every test suite; unset QUICK and run it again."
    exit 1
fi

SSH_KEY="${SSH_KEY:-$HOME/Downloads/startuptech-v2.pem}"
SERVER_USER="ubuntu"
SERVER_HOST="ec2-13-42-39-69.eu-west-2.compute.amazonaws.com"

TEST_DEST="/home/ubuntu/reactjs-pos-test/build/"
PROD_DEST="/home/ubuntu/reactjs-pos/build/"
TEST_SITE="https://test.gulfunionozone.com/"
PROD_SITE="https://startpos.gulfunionozone.com/"
TEST_API="https://startpos-api-test.gulfunionozone.com"
PROD_API="https://startpos-api.gulfunionozone.com"

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

# ─── tests + build ────────────────────────────────────────────────────────────
# ci/run_all_tests.sh runs ESLint, Jest, the build with no warnings, the
# mocked-API browser e2e, the full-stack browser e2e on every screen size and
# the role audit, and leaves the tested build in build/.
# Nothing deploys unless all of it passes.

run_all_tests() {
    echo ""
    echo "==> Running the test suites (ci/run_all_tests.sh)..."
    bash "$FRONTEND_DIR/ci/run_all_tests.sh"
    echo "==> All tests passed."
}

# deploy_to <dest> <site url> <label> <api url>: deploy build/ to one site; its
# API then tells the open pages about the new build.
deploy_to() {
    echo ""
    echo "==> Deploying to $3 ($SERVER_HOST:$1) ..."
    cd "$FRONTEND_DIR"
    SSH_PRIVATE_KEY="$(cat "$SSH_KEY")" AWS_HOST="$SERVER_HOST" AWS_USER="$SERVER_USER" AWS_PORT=22 \
    AWS_DEST_PATH="$1" SITE_URL="$2" APP_API_URL="$4" \
        bash .github/scripts/deploy_site.sh || { echo "==> $3 deploy FAILED"; exit 1; }
}

# ─── main ─────────────────────────────────────────────────────────────────────

TEST_ONLY=false
for arg in "$@"; do
    case "$arg" in
        --test-only) TEST_ONLY=true ;;
        *) echo "Unknown option: $arg"; echo "Usage: $0 [--test-only]"; exit 1 ;;
    esac
done

[ -r "$SSH_KEY" ] || { echo "==> ABORTED: SSH key $SSH_KEY not found (set SSH_KEY)."; exit 1; }
check_uncommitted
run_all_tests

# Production only after the test site serves this build; if the test deploy
# fails it is rolled back and production is left alone.
deploy_to "$TEST_DEST" "$TEST_SITE" "test" "$TEST_API"
if [ "$TEST_ONLY" = true ]; then
    echo ""
    echo "Done (test site only)."
    exit 0
fi
deploy_to "$PROD_DEST" "$PROD_SITE" "production" "$PROD_API"

echo ""
echo "Done: the same tested build is live on the test site and production."
