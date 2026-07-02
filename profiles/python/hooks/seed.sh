#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
( cd "$LANE_DIR" && DATABASE_URL="$DATABASE_URL" \
    SEED_USER_EMAIL="$SEED_USER_EMAIL" SEED_USER_PASSWORD="$SEED_USER_PASSWORD" \
    $PY python -m "$SEED_MODULE" )
