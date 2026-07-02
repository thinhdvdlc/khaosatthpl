#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
curl -fsS --retry 60 --retry-delay 2 --retry-all-errors --retry-connrefused --max-time 5 \
  "$API_BASE$HEALTH_PATH" >/dev/null 2>&1 && { echo "harness: API ok"; exit 0; }
echo "harness: API NOT healthy ($API_BASE$HEALTH_PATH)" >&2; exit 1
