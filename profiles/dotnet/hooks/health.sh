#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
ok=0
curl -fsS --retry 60 --retry-delay 2 --retry-all-errors --retry-connrefused --max-time 5 \
  "$API_BASE/health" >/dev/null 2>&1 && echo "harness: API ok" || { echo "harness: API NOT healthy" >&2; ok=1; }
if [ "${DUAL_PORT:-0}" == "1" ]; then
  curl -fsS --retry 40 --retry-delay 2 --retry-all-errors --retry-connrefused --max-time 5 \
    "$FE_URL/" >/dev/null 2>&1 && echo "harness: UI ok" || { echo "harness: UI NOT healthy" >&2; ok=1; }
fi
exit "$ok"
