#!/usr/bin/env bash
# boot — publish + chạy GovDoc.Web (Blazor Server) trên CẢ 2 port lane trong 1 process.
# $1 == --no-build  => tái dùng bản publish hiện có.
set -euo pipefail
BUILD=1; [ "${1:-}" == "--no-build" ] && BUILD=0
APP="$LANE_DIR/src/GovDoc.Web"
PUB="$LANE_DIR/.publish"

# --- Connection strings per-lane (cách ly) ---
export ConnectionStrings__Default="Host=$PG_HOST;Port=$PG_PORT;Database=$DB_NAME;Username=$PG_USER;Password=$PG_PASS"
# index Redis per-lane nằm trong REDIS_URL (redis://host:port/N)
REDIS_DB="$(python3 -c 'import sys,urllib.parse as u; print(u.urlparse(sys.argv[1]).path.lstrip("/") or "0")' "$REDIS_URL")"
export ConnectionStrings__Redis="$REDIS_HOST:$REDIS_PORT,defaultDatabase=$REDIS_DB"
# MinIO/S3 dùng chung — bucket riêng từng lane để cách ly
export S3__Endpoint="http://127.0.0.1:9000" S3__AccessKey="minio" S3__SecretKey="minio12345" S3__Bucket="govdoc-l$LANE"
# iKnow (mock tới khi có token thật)
export IKnow__Enabled="${IKNOW_ENABLED:-false}" IKnow__BaseUrl="${IKNOW_BASE_URL:-}" IKnow__Token="${IKNOW_TOKEN:-}"

if [ "$BUILD" == 1 ]; then
  echo "harness: publish GovDoc.Web (Release) ..."
  "$HARNESS_ROOT/bin/with-lock.sh" build -- dotnet publish "$APP" -c Release -o "$PUB"
fi

echo "harness: start app on :$API_PORT (api) + :$FE_PORT (ui) ..."
export ASPNETCORE_ENVIRONMENT=Production
harness_spawn app "$PUB" dotnet GovDoc.Web.dll --urls "http://0.0.0.0:$API_PORT;http://0.0.0.0:$FE_PORT"
