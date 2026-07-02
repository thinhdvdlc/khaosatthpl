#!/usr/bin/env bash
# migrate — áp EF Core migrations lên DB của lane.
# Postgres conn dựng thẳng từ env contract (PG_* + DB_NAME do run_hook export).
set -euo pipefail
export ConnectionStrings__Default="Host=$PG_HOST;Port=$PG_PORT;Database=$DB_NAME;Username=$PG_USER;Password=$PG_PASS"
( cd "$LANE_DIR" && dotnet ef database update -p src/GovDoc.Infrastructure -s src/GovDoc.Web )
