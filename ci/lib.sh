# shellcheck shell=bash
# Shared helpers for ci/run_all_tests.sh. The same file lives in
# sirinibin/pos-rest and sirinibin/reactjs-pos; keep the two copies identical.
#
# Everything the GitHub Actions test jobs need, run on this machine instead:
# throwaway MongoDB 7, Redis 7 and S3 (versitygw) containers on their own
# ports, so a MongoDB, Redis or API you already run on 27017, 6379 or 2000
# is never touched. Every stage gets fresh, empty databases, as every CI job
# did. Written for the bash 3.2 that ships with macOS.
#
# Settings (environment):
#   CI_CACHE        cache for the other repo, the ZATCA SDK and Python venvs
#                   (default ~/.cache/startpos-ci)
#   DOCKER          docker command (default "docker"; e.g. "sudo docker")
#   CI_MONGO_PORT, CI_REDIS_PORT, CI_S3_PORT, CI_API_PORT, CI_STATIC_PORT
#                   ports for the throwaway services (37017, 36379, 38333,
#                   32000 and 32001 for HTTPS, 34310)
#   E2E_CHROMIUM    a Chromium binary for Playwright instead of downloading one

CI_CACHE="${CI_CACHE:-$HOME/.cache/startpos-ci}"
DOCKER="${DOCKER:-docker}"
CI_MONGO_PORT="${CI_MONGO_PORT:-37017}"
CI_REDIS_PORT="${CI_REDIS_PORT:-36379}"
CI_S3_PORT="${CI_S3_PORT:-38333}"
CI_API_PORT="${CI_API_PORT:-32000}"
CI_STATIC_PORT="${CI_STATIC_PORT:-34310}"
CI_NAME="startpos-ci-$$"
CI_API_PID=""
CI_STAGES=""
CI_STAGE=""
CI_STAGE_START=0
CI_T0=$(date +%s)

# The e2e admin the API seeds and the browser and API e2e suites sign in as.
export E2E_EMAIL="${E2E_EMAIL:-e2e-admin@startpos.test}"
export E2E_PASSWORD="${E2E_PASSWORD:-E2e-Passw0rd!}"
export MONGO_HOST=127.0.0.1
export MONGO_PORT="$CI_MONGO_PORT"
export MONGODB_URI="mongodb://127.0.0.1:$CI_MONGO_PORT/"
export REDIS_DSN="127.0.0.1:$CI_REDIS_PORT"
export E2E_API_URL="http://localhost:$CI_API_PORT"
export E2E_BASE_URL="http://localhost:$CI_API_PORT"
export AUDIT_BASE_URL="http://localhost:$CI_API_PORT"
export E2E_PORT="$CI_STATIC_PORT"
export CI=true
unset MONGO_USER MONGO_PASS MONGO_RS

S3_KEY=ciaccesskey
S3_SECRET=cisecretkey123
S3_BUCKET=pos-ci

ci_secs() { local s=$1; printf '%dm%02ds' $((s / 60)) $((s % 60)); }

# stage "Name": prints a banner and starts the stage clock.
stage() {
    stage_end
    CI_STAGE="$1"
    CI_STAGE_START=$(date +%s)
    echo ""
    echo "════════════════════════════════════════════════════════════════════"
    echo "==> [$CI_STAGE] starting"
    echo "════════════════════════════════════════════════════════════════════"
}

stage_end() {
    [ -n "$CI_STAGE" ] || return 0
    local took=$(( $(date +%s) - CI_STAGE_START ))
    CI_STAGES="${CI_STAGES}  passed  $(ci_secs $took)  $CI_STAGE
"
    echo "==> [$CI_STAGE] passed ($(ci_secs $took))"
    CI_STAGE=""
}

# note "text": a non-blocking result (report-only checks), shown in the summary.
note() {
    CI_STAGES="${CI_STAGES}  NOTE            $1
"
    echo "==> NOTE: $1"
}

fail() {
    echo ""
    echo "==> FAILED${CI_STAGE:+ in [$CI_STAGE]}: $*"
    exit 1
}

ci_summary() {
    stage_end
    echo ""
    echo "==> Every test stage passed in $(ci_secs $(( $(date +%s) - CI_T0 ))):"
    printf '%s' "$CI_STAGES"
}

# Runs on every exit: stops the API and the containers, and on failure says
# which stage failed and where its logs are.
ci_cleanup() {
    local code=$?
    stop_api
    if [ "$code" -ne 0 ] && $DOCKER inspect "$CI_NAME-mongo" >/dev/null 2>&1; then
        echo "==> MongoDB log (last lines):"
        $DOCKER logs --tail 15 "$CI_NAME-mongo" 2>&1 | grep -v '"s":"I"' | cut -c1-400 || true
    fi
    services_down
    if [ "$code" -ne 0 ]; then
        echo ""
        echo "==> Tests FAILED${CI_STAGE:+ in [$CI_STAGE]}. Nothing was deployed."
        [ -n "$CI_STAGES" ] && { echo "    Passed before it:"; printf '%s' "$CI_STAGES"; }
        [ -n "${CI_LOGS:-}" ] && echo "    Logs: $CI_LOGS"
    fi
    return $code
}

# require_tools cmd...: lists every missing command at once.
require_tools() {
    local missing="" t
    for t in "$@"; do command -v "$t" >/dev/null 2>&1 || missing="$missing $t"; done
    [ -z "$missing" ] || fail "missing tools:$missing (install them and run again)"
}

# require_node_major N: Playwright 1.56 needs Node 18 or newer.
require_node_major() {
    local major
    major=$(node -p 'process.versions.node.split(".")[0]')
    [ "$major" -ge "$1" ] || fail "Node $1 or newer is needed (found $(node -v))"
}

require_docker() {
    $DOCKER info >/dev/null 2>&1 || fail "Docker is not running (start Docker Desktop, or set DOCKER=\"sudo docker\")"
}

port_free() {
    ! curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$1/" 2>/dev/null
}

# services_up [s3]: fresh MongoDB and Redis (and S3), empty, on the CI ports.
services_up() {
    services_down
    local p
    for p in "$CI_MONGO_PORT" "$CI_REDIS_PORT"; do
        port_free "$p" || fail "port $p is already in use (set CI_MONGO_PORT / CI_REDIS_PORT)"
    done
    # Every store is its own database, so MongoDB opens many files: without
    # a raised limit (1024 on some Docker hosts) it aborts mid-test. Take the
    # highest limit this Docker host allows.
    local nofile started=""
    for nofile in 64000 20000 8192; do
        if $DOCKER run -d --rm --name "$CI_NAME-mongo" --tmpfs /data/db --ulimit "nofile=$nofile:$nofile" \
            -p "127.0.0.1:$CI_MONGO_PORT:27017" mongo:7 >/dev/null 2>&1; then
            started=1; break
        fi
        $DOCKER rm -f "$CI_NAME-mongo" >/dev/null 2>&1 || true
    done
    [ -n "$started" ] || fail "could not start MongoDB (try: $DOCKER run --rm mongo:7)"
    $DOCKER run -d --rm --name "$CI_NAME-redis" \
        -p "127.0.0.1:$CI_REDIS_PORT:6379" redis:7 >/dev/null || fail "could not start Redis"
    if [ "${1:-}" = s3 ]; then
        $DOCKER run -d --rm --name "$CI_NAME-s3" --tmpfs /data \
            -e ROOT_ACCESS_KEY=$S3_KEY -e ROOT_SECRET_KEY=$S3_SECRET \
            -p "127.0.0.1:$CI_S3_PORT:8333" versity/versitygw:v1.0.16 --port :8333 posix /data \
            >/dev/null || fail "could not start the S3 server"
    fi
    local i
    for i in $(seq 1 60); do
        $DOCKER exec "$CI_NAME-mongo" mongosh --quiet --eval 'db.runCommand({ping:1})' >/dev/null 2>&1 && break
        [ "$i" = 60 ] && fail "MongoDB did not become ready"
        sleep 1
    done
    for i in $(seq 1 30); do
        $DOCKER exec "$CI_NAME-redis" redis-cli ping >/dev/null 2>&1 && break
        [ "$i" = 30 ] && fail "Redis did not become ready"
        sleep 1
    done
    if [ "${1:-}" = s3 ]; then
        for i in $(seq 1 30); do
            [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$CI_S3_PORT/")" = 403 ] && break
            [ "$i" = 30 ] && fail "the S3 server did not become ready"
            sleep 1
        done
        # The bucket the S3 tests use, created with the AWS CLI image inside
        # the S3 container's network (no AWS CLI needed on this machine).
        $DOCKER run --rm --network "container:$CI_NAME-s3" \
            -e AWS_ACCESS_KEY_ID=$S3_KEY -e AWS_SECRET_ACCESS_KEY=$S3_SECRET -e AWS_DEFAULT_REGION=us-east-1 \
            amazon/aws-cli:2.17.0 --endpoint-url http://127.0.0.1:8333 s3api create-bucket --bucket $S3_BUCKET \
            >/dev/null || fail "could not create the S3 test bucket"
    fi
    echo "==> Fresh MongoDB :$CI_MONGO_PORT, Redis :$CI_REDIS_PORT${1:+, S3 :$CI_S3_PORT} are up."
}

services_down() {
    $DOCKER rm -f "$CI_NAME-mongo" "$CI_NAME-redis" "$CI_NAME-s3" >/dev/null 2>&1 || true
}

# start_api <dir> <binary> <log> [static_dir] [extra env...]: starts the API
# from <dir> (it reads ZatcaPython/ relative to it) and waits until it answers.
start_api() {
    local dir="$1" bin="$2" log="$3" static="${4:-}"
    local envs=("API_PORT=$CI_API_PORT")
    [ -n "$static" ] && envs+=("STATIC_DIR=$static")
    shift $(( $# < 4 ? $# : 4 ))
    envs+=("$@")
    stop_api
    port_free "$CI_API_PORT" || fail "port $CI_API_PORT is already in use (set CI_API_PORT)"
    (cd "$dir" && exec env "${envs[@]}" "$bin") >"$log" 2>&1 &
    CI_API_PID=$!
    local i
    for i in $(seq 1 90); do
        curl -s -o /dev/null --max-time 2 "http://127.0.0.1:$CI_API_PORT/v1/me" && {
            echo "==> API is up on :$CI_API_PORT (log: $log)"; return 0; }
        kill -0 "$CI_API_PID" 2>/dev/null || break
        sleep 1
    done
    tail -n 50 "$log"
    fail "the API did not start"
}

stop_api() {
    [ -n "$CI_API_PID" ] || return 0
    kill "$CI_API_PID" 2>/dev/null || true
    local i
    for i in $(seq 1 30); do kill -0 "$CI_API_PID" 2>/dev/null || break; sleep 1; done
    kill -9 "$CI_API_PID" 2>/dev/null || true
    CI_API_PID=""
}

# fetch_repo <name> <ref> <url>: a clean checkout of <url> at origin/<ref> in
# the cache (node_modules kept between runs); prints its path.
fetch_repo() {
    local name="$1" ref="$2" url="$3" dir="$CI_CACHE/$1-$2"
    mkdir -p "$CI_CACHE"
    if [ ! -d "$dir/.git" ]; then
        rm -rf "$dir"
        git clone --quiet "$url" "$dir" >&2 || fail "could not clone $url"
    fi
    git -C "$dir" remote set-url origin "$url"
    git -C "$dir" fetch --quiet origin "$ref" >&2 || fail "could not fetch $name $ref"
    git -C "$dir" checkout --quiet -f -B ci-local FETCH_HEAD >&2
    git -C "$dir" clean -qffdx -e node_modules -e /e2e/node_modules >&2
    echo "==> $name $ref at $(git -C "$dir" log --oneline -1)" >&2
    echo "$dir"
}

# origin_url <sibling dir...>: the origin URL of the first sibling checkout
# found, so the other repo is fetched with the credentials it already uses.
origin_url() {
    local d
    for d in "$@"; do
        [ -d "$d/.git" ] || [ -f "$d/.git" ] || continue
        git -C "$d" remote get-url origin 2>/dev/null && return 0
    done
    return 1
}

# default_ref: the other repo's branch to test against. Both repos ship from
# master alone, as the deploy pipelines do.
default_ref() { echo master; }

# playwright_setup <e2e dir>
playwright_setup() {
    (cd "$1" && npm ci --no-audit --no-fund) || fail "npm ci in $1 failed"
    if [ -z "${E2E_CHROMIUM:-}" ]; then
        (cd "$1" && npx playwright install chromium) || fail "could not install Playwright's Chromium"
    fi
}

# frontend_build <frontend dir> <api url> <out dir>: the production build,
# failing on "Compiled with warnings" as CI and deploy.sh always did.
frontend_build() {
    local dir="$1" api="$2" out="$3" log
    log="$(mktemp)"
    (cd "$dir" && NODE_OPTIONS="--openssl-legacy-provider --max-old-space-size=4096" \
        DANGEROUSLY_DISABLE_HOST_CHECK=true REACT_APP_API_URL="$api" \
        GENERATE_SOURCEMAP=false DISABLE_ESLINT_PLUGIN=true BUILD_PATH="$out" \
        npm run build) >"$log" 2>&1 || { cat "$log"; rm -f "$log"; fail "the frontend build failed"; }
    if grep -qi "compiled with warnings" "$log"; then
        cat "$log"; rm -f "$log"; fail "the frontend build produced warnings"
    fi
    tail -n 5 "$log"; rm -f "$log"
}

# npm_install_keep_lock <dir>: npm install as CI does, without leaving a
# rewritten package-lock.json behind in a checkout. --legacy-peer-deps
# because npm 9+ rejects peer ranges the lockfile already resolves (CI's
# Node 17 ships npm 8, which accepts them).
npm_install_keep_lock() {
    if ! (cd "$1" && npm install --no-audit --no-fund --legacy-peer-deps); then
        # canvas (a pdf/jsdom dependency) has no prebuilt binary for newer
        # Node versions and needs Cairo to compile. Install without build
        # scripts and drop the unbuilt canvas: jsdom works without it.
        echo "==> npm install failed; retrying without build scripts (canvas left out)"
        (cd "$1" && npm install --no-audit --no-fund --legacy-peer-deps --ignore-scripts) || fail "npm install in $1 failed"
        rm -rf "$1/node_modules/canvas"
    fi
    if [ -d "$1/.git" ] || [ -f "$1/.git" ]; then
        git -C "$1" checkout -- package-lock.json 2>/dev/null || true
    fi
}
