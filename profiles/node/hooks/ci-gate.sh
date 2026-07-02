#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
echo "harness: [gate 1/2] lint ..."
( cd "$LANE_DIR" && $PKG_MGR run "$LINT_SCRIPT" )
echo "harness: [gate 2/2] test (DB test cách ly) ..."
( cd "$LANE_DIR" && DATABASE_URL="$TEST_DATABASE_URL" REDIS_URL="$REDIS_URL" $PKG_MGR run "$TEST_SCRIPT" )
