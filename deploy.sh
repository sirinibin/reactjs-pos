#!/usr/bin/env bash
# Direct deployment script for startpos frontend.
# Mirrors what .github/workflows/deploy.yml (test) and deploy_production.yml (production) do.
#
# Usage:
#   ./deploy.sh test        — build with test API URL and deploy to reactjs-pos-test
#   ./deploy.sh production  — build with production API URL and deploy to reactjs-pos
#   ./deploy.sh both        — deploy test first, then production

set -e

SSH_KEY="${SSH_KEY:-$HOME/Downloads/startuptech-v2.pem}"
SERVER_USER="ubuntu"
SERVER_HOST="ec2-13-42-39-69.eu-west-2.compute.amazonaws.com"

TEST_API_URL="https://startpos-api-test.startuptech.uk"
PROD_API_URL="https://startpos-api.startuptech.uk"

TEST_DEST="/home/ubuntu/reactjs-pos-test/build/"
PROD_DEST="/home/ubuntu/reactjs-pos/build/"

FRONTEND_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── tests ────────────────────────────────────────────────────────────────────

run_tests() {
    echo ""
    echo "==> Running tests..."
    cd "$FRONTEND_DIR"
    CI=true npm test -- --watchAll=false
    echo "==> All tests passed."
}

# ─── helpers ──────────────────────────────────────────────────────────────────

build() {
    local api_url="$1"
    echo ""
    echo "==> Building (API: $api_url) ..."
    cd "$FRONTEND_DIR"
    NODE_OPTIONS=--openssl-legacy-provider \
    DANGEROUSLY_DISABLE_HOST_CHECK=true \
    REACT_APP_API_URL="$api_url" \
    GENERATE_SOURCEMAP=false \
    npm run build
    echo "==> Build complete."
}

deploy_to() {
    local dest="$1"
    local label="$2"
    echo ""
    echo "==> Deploying to $label ($SERVER_HOST:$dest) ..."
    rsync -avz --delete \
        -e "ssh -o StrictHostKeyChecking=no -i $SSH_KEY" \
        "$FRONTEND_DIR/build/" \
        "$SERVER_USER@$SERVER_HOST:$dest"
    echo "==> Deploy to $label complete."
}

# ─── main ─────────────────────────────────────────────────────────────────────

TARGET="${1:-}"

if [[ -z "$TARGET" ]]; then
    echo "Usage: $0 <test|production|both>"
    exit 1
fi

case "$TARGET" in
    test)
        run_tests
        build "$TEST_API_URL"
        deploy_to "$TEST_DEST" "test (https://startpos-test.startuptech.uk)"
        ;;
    production|prod)
        run_tests
        build "$PROD_API_URL"
        deploy_to "$PROD_DEST" "production (https://startpos.startuptech.uk)"
        ;;
    both)
        run_tests
        build "$TEST_API_URL"
        deploy_to "$TEST_DEST" "test (https://startpos-test.startuptech.uk)"
        build "$PROD_API_URL"
        deploy_to "$PROD_DEST" "production (https://startpos.startuptech.uk)"
        ;;
    *)
        echo "Unknown target: $TARGET"
        echo "Usage: $0 <test|production|both>"
        exit 1
        ;;
esac

echo ""
echo "Done."
