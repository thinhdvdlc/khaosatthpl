#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
rc=0
"$HARNESS_ROOT/bin/with-lock.sh" e2e -- bash -c "cd '$LANE_DIR' && \
  E2E_BASE_URL='$API_BASE' E2E_UI_URL='$FE_URL' \
  timeout -k 30 ${E2E_TIMEOUT:-1200} \
  dotnet test '$SLN' -c Release --filter Category=Integration --logger 'console;verbosity=minimal'" || rc=$?
[ "$rc" -eq 124 ] && echo "e2e: TIMED OUT" >&2
exit "$rc"
