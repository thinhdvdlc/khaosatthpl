#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
rc=0
"$HARNESS_ROOT/bin/with-lock.sh" e2e -- bash -c "cd '$LANE_DIR' && \
  E2E_BASE_URL='$API_BASE' \
  timeout -k 30 ${E2E_TIMEOUT:-1200} $PY pytest -m e2e -q" || rc=$?
[ "$rc" -eq 124 ] && echo "e2e: TIMED OUT" >&2
exit "$rc"
