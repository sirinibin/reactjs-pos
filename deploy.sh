#!/usr/bin/env bash
# Direct deployment script for startpos frontend: one script for both sites,
# doing what .github/workflows/deploy.yml does, from this machine. The unit,
# functional and e2e suites (ci/run_all_tests.sh), one build, then
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
#   FULL=1 ./deploy.sh       — with the full GitHub Actions test set (every
#                              screen size, role audit)

set -eo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Downloads/startuptech-v2.pem}"
SERVER_USER="ubuntu"
SERVER_HOST="ec2-13-42-39-69.eu-west-2.compute.amazonaws.com"

TEST_DEST="/home/ubuntu/reactjs-pos-test/build/"
PROD_DEST="/home/ubuntu/reactjs-pos/build/"
TEST_SITE="https://test.gulfunionozone.com/"
PROD_SITE="https://startpos.gulfunionozone.com/"

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
# ci/run_all_tests.sh runs ESLint, Jest, the build with no warnings, and the
# mocked-API and full-stack browser e2e, and leaves the tested build in build/.
# Nothing deploys unless all of it passes.

run_all_tests() {
    echo ""
    echo "==> Running the test suites (ci/run_all_tests.sh)..."
    bash "$FRONTEND_DIR/ci/run_all_tests.sh"
    echo "==> All tests passed."
}

# deploy_to <dest> <site url> <label>: the deploy step deploy.yml runs.
deploy_to() {
    echo ""
    echo "==> Deploying to $3 ($SERVER_HOST:$1) ..."
    cd "$FRONTEND_DIR"
    SSH_PRIVATE_KEY="$(cat "$SSH_KEY")" AWS_HOST="$SERVER_HOST" AWS_USER="$SERVER_USER" AWS_PORT=22 \
    AWS_DEST_PATH="$1" SITE_URL="$2" \
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
deploy_to "$TEST_DEST" "$TEST_SITE" "test"
if [ "$TEST_ONLY" = true ]; then
    echo ""
    echo "Done (test site only)."
    exit 0
fi
deploy_to "$PROD_DEST" "$PROD_SITE" "production"

echo ""
echo "Done: the same tested build is live on the test site and production."
