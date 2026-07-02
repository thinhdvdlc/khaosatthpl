#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
BUILD=1; [ "${1:-}" == "--no-build" ] && BUILD=0
export PORT="$API_PORT" NODE_ENV=production   # DATABASE_URL/REDIS_URL đã được harness export
if [ "$BUILD" == 1 ]; then
  echo "harness: build ($PKG_MGR run $BUILD_SCRIPT) ..."
  "$HARNESS_ROOT/bin/with-lock.sh" build -- bash -c "cd '$LANE_DIR' && $PKG_MGR run $BUILD_SCRIPT"
fi
echo "harness: start on :$API_PORT ..."
harness_spawn app "$LANE_DIR" $START_CMD
