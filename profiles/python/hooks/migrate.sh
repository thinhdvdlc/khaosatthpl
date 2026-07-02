#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
( cd "$LANE_DIR" && DATABASE_URL="$DATABASE_URL" $MIGRATE_CMD )
