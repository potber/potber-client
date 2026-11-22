#!/usr/bin/env bash
# Uploads a built dist/ to a Bunny Storage Zone without deleting anything, so
# browsers still holding an old index.html keep finding their hashed assets.
# Entry files go last: injected-config.js, then index.html, then version.json.
#
# Usage: deploy/upload-to-bunny-storage.sh <dist-dir>
# Env:   BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD,
#        BUNNY_STORAGE_HOSTNAME (default storage.bunnycdn.com),
#        BUNNY_STORAGE_PREFIX (optional folder, e.g. pr-132 for previews),
#        DRY_RUN=1 to only print the upload order.
set -euo pipefail

DIST="${1:?usage: $0 <dist-dir>}"
: "${BUNNY_STORAGE_ZONE:?BUNNY_STORAGE_ZONE is required}"
export BUNNY_STORAGE_HOSTNAME="${BUNNY_STORAGE_HOSTNAME:-storage.bunnycdn.com}"
export BUNNY_STORAGE_PREFIX="${BUNNY_STORAGE_PREFIX:+${BUNNY_STORAGE_PREFIX%/}/}"
export BUNNY_STORAGE_ZONE DRY_RUN="${DRY_RUN:-}"
if [ -z "$DRY_RUN" ]; then
  : "${BUNNY_STORAGE_PASSWORD:?BUNNY_STORAGE_PASSWORD is required}"
  export BUNNY_STORAGE_PASSWORD
fi

upload() {
  local path="$1"
  if [ -n "$DRY_RUN" ]; then
    echo "${BUNNY_STORAGE_PREFIX}${path}"
    return
  fi
  local checksum
  checksum="$(sha256sum "$path" | cut -d' ' -f1 | tr 'a-f' 'A-F')"
  curl --fail-with-body --silent --show-error --retry 3 --retry-all-errors \
    --request PUT \
    --header "AccessKey: ${BUNNY_STORAGE_PASSWORD}" \
    --header "Checksum: ${checksum}" \
    --header "Content-Type: application/octet-stream" \
    --upload-file "$path" \
    "https://${BUNNY_STORAGE_HOSTNAME}/${BUNNY_STORAGE_ZONE}/${BUNNY_STORAGE_PREFIX}${path}" > /dev/null
  echo "uploaded ${BUNNY_STORAGE_PREFIX}${path}"
}
export -f upload

cd "$DIST"
ENTRY_FILES=(injected-config.js index.html version.json)

# 1. Everything else (hashed assets, images, ...) in parallel.
find . -type f ! -name '.*' -print | sed 's#^\./##' \
  | grep -vxF -f <(printf '%s\n' "${ENTRY_FILES[@]}") \
  | sort \
  | xargs -P 8 -I {} bash -c 'upload "$1"' _ {}

# 2. Entry files, in order.
for file in "${ENTRY_FILES[@]}"; do
  if [ -f "$file" ]; then upload "$file"; fi
done
