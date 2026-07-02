#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
# Python là interpreted → không cần build; DATABASE_URL/REDIS_URL đã được harness export.
echo "harness: start uvicorn $APP_MODULE on :$API_PORT ..."
harness_spawn api "$LANE_DIR" $PY uvicorn "$APP_MODULE" --host 0.0.0.0 --port "$API_PORT"
