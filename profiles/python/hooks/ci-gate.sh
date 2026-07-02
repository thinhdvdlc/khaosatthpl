#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
echo "harness: [gate 1/2] lint ..."
( cd "$LANE_DIR" && $LINT_CMD )
echo "harness: [gate 2/2] pytest (DB test cách ly) ..."
( cd "$LANE_DIR" && DATABASE_URL="$TEST_DATABASE_URL" REDIS_URL="$REDIS_URL" $PY pytest -m "not e2e" -q )
