#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
BUILD=1; [ "${1:-}" == "--no-build" ] && BUILD=0
PUB="$LANE_DIR/.publish"

export ConnectionStrings__Default="Host=$PG_HOST;Port=$PG_PORT;Database=$DB_NAME;Username=$PG_USER;Password=$PG_PASS"
REDIS_DB="$(python3 -c 'import sys,urllib.parse as u; print(u.urlparse(sys.argv[1]).path.lstrip("/") or "0")' "$REDIS_URL")"
export ConnectionStrings__Redis="$REDIS_HOST:$REDIS_PORT,defaultDatabase=$REDIS_DB"
export ASPNETCORE_ENVIRONMENT=Production

if [ "$BUILD" == 1 ]; then
  echo "harness: publish $WEB_PROJECT (Release) ..."
  "$HARNESS_ROOT/bin/with-lock.sh" build -- dotnet publish "$LANE_DIR/$WEB_PROJECT" -c Release -o "$PUB"
fi

if [ "${DUAL_PORT:-0}" == "1" ]; then
  URLS="http://0.0.0.0:$API_PORT;http://0.0.0.0:$FE_PORT"
else
  URLS="http://0.0.0.0:$API_PORT"
fi
echo "harness: start $APP_DLL on $URLS ..."
harness_spawn app "$PUB" dotnet "$APP_DLL" --urls "$URLS"
