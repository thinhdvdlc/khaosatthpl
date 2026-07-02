#!/usr/bin/env bash
# ci-gate — cổng pre-push: build + unit test (DB test cách ly) + dotnet format.
# Engine cấp TEST_DATABASE_URL (postgresql://.../<testdb>) tách khỏi DB làm việc của lane.
set -euo pipefail

echo "harness: [gate 1/2] build + unit tests ..."
TEST_CS="$(python3 - "$TEST_DATABASE_URL" <<'PY'
import sys, urllib.parse as u
p = u.urlparse(sys.argv[1])
print(f"Host={p.hostname};Port={p.port or 5432};Database={p.path.lstrip('/')};"
      f"Username={u.unquote(p.username or '')};Password={u.unquote(p.password or '')}")
PY
)"
( cd "$LANE_DIR" && ConnectionStrings__Default="$TEST_CS" REDIS_URL="$REDIS_URL" \
    dotnet test GovDoc.sln -c Release --filter "Category!=Integration" )

echo "harness: [gate 2/2] dotnet format (style) ..."
( cd "$LANE_DIR" && dotnet format GovDoc.sln --verify-no-changes )
