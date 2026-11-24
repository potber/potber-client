#!/bin/sh
# Renders injected-config.js from environment variables.
# Usage: deploy/render-injected-config.sh <output-file>
set -eu

OUTPUT="${1:?usage: $0 <output-file>}"
TEMPLATE="$(dirname "$0")/injected-config.js.template"
VARIABLES='API_URL IMGPOT_URL AUTH_ISSUER_URL AUTH_CLIENT_ID MEME_HOST_URL'

if [ -z "${API_URL:-}" ]; then
  echo "$0: API_URL is required" >&2
  exit 1
fi

# Values land inside single-quoted JS strings; refuse anything that could break out.
for name in $VARIABLES; do
  eval "value=\${$name:-}"
  case "$value" in
    *\'* | *\\* | *'
'*)
      echo "$0: $name contains a quote, backslash or newline" >&2
      exit 1
      ;;
  esac
done

envsubst "$(printf '${%s} ' $VARIABLES)" < "$TEMPLATE" > "$OUTPUT"
echo "$0: rendered $OUTPUT"
