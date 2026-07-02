#!/usr/bin/env bash
# seed — tạo user/tổ chức ban đầu. SEED_USER_* do run_hook export.
set -euo pipefail
export ConnectionStrings__Default="Host=$PG_HOST;Port=$PG_PORT;Database=$DB_NAME;Username=$PG_USER;Password=$PG_PASS"
( cd "$LANE_DIR" && dotnet run --project src/GovDoc.Web -c Release -- --seed )
