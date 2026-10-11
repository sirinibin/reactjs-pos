#!/usr/bin/env bash
# The unit, functional and end-to-end suites of .github/workflows/tests.yml,
# on this machine, plus the build deploy.sh ships. deploy.sh runs this and
# deploys only if it exits 0. It stops at the first failing stage.
#
#   ci/run_all_tests.sh          unit, functional and e2e (the default)
#   FULL=1 ci/run_all_tests.sh   also every screen size and the role audit,
#                                as GitHub Actions runs on every push
#
# Builds build/ once, site-neutral (no REACT_APP_API_URL baked in;
# src/utils/apiBaseURL.js picks the API from the page's host), as tests.yml
# does; that exact build is what gets tested and deployed to both sites.
#
# Stages (each stage that needs an API gets fresh, empty MongoDB and Redis):
#   1. ESLint (errors only)
#   2. Jest: every suite (unit, component, functional, integration), with the
#      API source from sirinibin/pos-rest for the suites that read it
#   3. Production build, failing on "Compiled with warnings"
#   4. Browser e2e with a mocked API (e2e/tests)
#   5. Full-stack browser e2e against the real API on MongoDB + Redis on a
#      laptop screen (FULL=1: also desktop-large, tablet, tablet-landscape,
#      phone, phone-small)
#   FULL=1 only:
#   6. Role audit: staff personas on every device, English and Arabic
#
# Needs: git, go, node 18+, npm, curl, Docker. The API comes from
# sirinibin/pos-rest at BACKEND_REF (default master); BACKEND_DIR=<path> uses
# that checkout as it is instead.
# Other settings: see ci/lib.sh.
set -euo pipefail

FE="$(cd "$(dirname "$0")/.." && pwd)"
# shellcheck source=ci/lib.sh
. "$FE/ci/lib.sh"
trap ci_cleanup EXIT

BUILD="$FE/build"

cd "$FE"
require_tools git go node npm curl
require_node_major 18
require_docker

BACKEND_REF="${BACKEND_REF:-$(default_ref)}"
CI_LOGS="$(mktemp -d "${TMPDIR:-/tmp}/startpos-frontend-ci.XXXXXX")"
echo "==> Testing reactjs-pos $(git log --oneline -1) (logs: $CI_LOGS)"

stage "Install dependencies"
npm_install_keep_lock "$FE"
if [ -n "${BACKEND_DIR:-}" ]; then
    BE="$(cd "$BACKEND_DIR" && pwd)"
    echo "==> Using the API checkout at $BE as it is"
else
    BE_URL="$(origin_url "$FE/../pos-rest" "$FE/../backend" || echo https://github.com/sirinibin/pos-rest.git)"
    BE="$(fetch_repo pos-rest "$BACKEND_REF" "$BE_URL")"
fi

# ── 1. ESLint (errors only) ──────────────────────────────────────────────────
stage "ESLint"
npx eslint src --ext .js,.jsx --quiet \
    --ignore-pattern 'src/**/__tests__/**' \
    --ignore-pattern 'src/**/*.test.js' \
    --ignore-pattern 'src/**/*.test.jsx'

# ── 2. Jest: every suite ─────────────────────────────────────────────────────
stage "Jest (unit, component, functional, integration)"
POS_REST_DIR="$BE" NODE_OPTIONS="--max-old-space-size=6144" \
    npm test -- --watchAll=false --maxWorkers=2 --testPathIgnorePatterns="/pos-rest/"

# ── 3. Production build, no warnings ─────────────────────────────────────────
stage "Build (site-neutral, no warnings)"
rm -rf "$BUILD"
frontend_build "$FE" "" "$BUILD"

# ── 4. Browser e2e, mocked API ───────────────────────────────────────────────
stage "Install Playwright"
playwright_setup "$FE/e2e"
stage "UI e2e tests, mocked API"
port_free "$CI_STATIC_PORT" || fail "port $CI_STATIC_PORT is already in use (set CI_STATIC_PORT)"
(cd e2e && E2E_BUILD_DIR="$BUILD" npx playwright test) || fail "mocked-API e2e tests (report: $FE/e2e/playwright-report)"

# ── 5. Full-stack browser e2e, one run per screen size ───────────────────────
stage "Build the API ($BACKEND_REF)"
(cd "$BE" && go mod tidy && go build -o pos-rest .)
export MONGO_DB=pos_e2e

PROJECTS="desktop"
[ "${FULL:-}" = 1 ] && PROJECTS="desktop desktop-large tablet tablet-landscape phone phone-small"
for project in $PROJECTS; do
    stage "UI e2e tests, real API + MongoDB + Redis ($project)"
    services_up
    (cd "$BE" && go run ./e2e/seed)
    start_api "$BE" ./pos-rest "$CI_LOGS/api-$project.log" "$BUILD"
    (cd e2e && npx playwright test -c playwright.fullstack.config.js --project="$project") \
        || fail "full-stack e2e ($project); report: $FE/e2e/playwright-report-fullstack, API log: $CI_LOGS/api-$project.log"
    stop_api
done

# ── 6. Role audit: staff personas, every device, EN + AR (FULL=1) ──────────
if [ "${FULL:-}" = 1 ]; then
    stage "Role audit (staff personas, every device, EN + AR)"
    (cd e2e && npm run test:audit-unit)
    services_up
    (cd "$BE" && go run ./e2e/seed)
    start_api "$BE" ./pos-rest "$CI_LOGS/api-audit.log" "$BUILD"
    audit_status=0
    (cd e2e && AUDIT_MATRIX=standard AUDIT_LANGS=en,ar AUDIT_OUT_DIR=audit-reports/ci node audit/run.js) || audit_status=$?
    (cd e2e && node audit/gate.js audit-reports/ci/report.json) || fail "role audit gate (report: $FE/e2e/audit-reports/ci)"
    [ "$audit_status" = 0 ] || fail "role audit run (report: $FE/e2e/audit-reports/ci)"
    stop_api
else
    stage_end
    note "other screen sizes and the role audit not run (FULL=1 runs them; GitHub Actions runs them on every push)"
fi

ci_summary
rm -rf "$CI_LOGS"
