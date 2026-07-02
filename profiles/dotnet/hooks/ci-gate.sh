#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
TEST_CS="$(python3 - "$TEST_DATABASE_URL" <<'PY'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
print(f"Host={p.hostname};Port={p.port or 5432};Database={p.path.lstrip('/')};"
      f"Username={u.unquote(p.username or '')};Password={u.unquote(p.password or '')}")
PY
)"
echo "harness: [gate 1/2] build + unit tests ..."
( cd "$LANE_DIR" && ConnectionStrings__Default="$TEST_CS" REDIS_URL="$REDIS_URL" \
    dotnet test "$SLN" -c Release --filter "Category!=Integration" )
echo "harness: [gate 2/2] dotnet format ..."
( cd "$LANE_DIR" && dotnet format "$SLN" --verify-no-changes )
