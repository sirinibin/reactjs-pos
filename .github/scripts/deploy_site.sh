#!/usr/bin/env bash
# Deploys build/ to one site on the server: rsync into a staging dir, swap it
# in with two renames (~1 ms), then check the site serves this build's
# index.html. If it doesn't, the previous build is swapped back and the script
# fails, so a pipeline stops before the next site.
#
# Env: SSH_PRIVATE_KEY AWS_HOST AWS_USER AWS_PORT AWS_DEST_PATH SITE_URL
# Optional: VERIFY_ATTEMPTS (default 10), VERIFY_DELAY seconds (default 3)
set -euo pipefail

: "${SSH_PRIVATE_KEY:?}" "${AWS_HOST:?}" "${AWS_USER:?}" "${AWS_PORT:?}" "${AWS_DEST_PATH:?}" "${SITE_URL:?}"
ATTEMPTS="${VERIFY_ATTEMPTS:-10}"
DELAY="${VERIFY_DELAY:-3}"

if [ ! -s build/index.html ]; then
  echo "build/index.html is missing — nothing to deploy."
  exit 1
fi
WANT=$(sha256sum build/index.html | awk '{print $1}')

KEY=$(mktemp)
trap 'rm -f "$KEY"' EXIT
printf '%s\n' "$SSH_PRIVATE_KEY" > "$KEY"
chmod 600 "$KEY"

SSH_OPTS="-o StrictHostKeyChecking=no -o ConnectTimeout=30 -i $KEY -p $AWS_PORT"
REMOTE="$AWS_USER@$AWS_HOST"
DEST="${AWS_DEST_PATH%/}"   # strip trailing slash
TMP="${DEST}_new"
OLD="${DEST}_old"

# shellcheck disable=SC2086
remote() { ssh $SSH_OPTS "$REMOTE" "$1"; }

# Step 1: rsync into a fresh staging dir — the live site is untouched meanwhile.
remote "rm -rf '$TMP' && mkdir -p '$TMP' '$DEST'"
rsync -az --partial --timeout=60 -e "ssh $SSH_OPTS" build/ "$REMOTE:$TMP/"

# Step 2: atomic swap; the previous build is kept until the check passes.
remote "rm -rf '$OLD' && mv '$DEST' '$OLD' && mv '$TMP' '$DEST'"

# Step 3: the site must serve exactly this build's index.html.
for i in $(seq 1 "$ATTEMPTS"); do
  GOT=$(curl -fsS -m 15 -H 'Cache-Control: no-cache' "${SITE_URL}?deploy=${GITHUB_SHA:-$$}-$i" 2>/dev/null | sha256sum | awk '{print $1}' || true)
  if [ "$GOT" = "$WANT" ]; then
    remote "rm -rf '$OLD'"
    echo "Deployed and verified: $SITE_URL serves index.html $WANT"
    exit 0
  fi
  echo "Check $i/$ATTEMPTS: $SITE_URL does not serve the new build yet."
  sleep "$DELAY"
done

echo "::error::$SITE_URL never served the new build — restoring the previous one."
remote "rm -rf '${DEST}_failed' && mv '$DEST' '${DEST}_failed' && mv '$OLD' '$DEST'"
exit 1
