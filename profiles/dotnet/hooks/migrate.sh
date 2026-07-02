#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
export ConnectionStrings__Default="Host=$PG_HOST;Port=$PG_PORT;Database=$DB_NAME;Username=$PG_USER;Password=$PG_PASS"
( cd "$LANE_DIR" && dotnet ef database update -p "$INFRA_PROJECT" -s "$WEB_PROJECT" )
