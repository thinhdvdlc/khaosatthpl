#!/usr/bin/env bash
# health — readiness probe. exit 0 chỉ khi API (/health) và UI (/) đều lên.
# curl tự retry/backoff (không sleep shell); --max-time chặn treo.
set -euo pipefail
ok=0
echo "harness: chờ API ($API_BASE/health) ..."
curl -fsS --retry 60 --retry-delay 2 --retry-all-errors --retry-connrefused --max-time 5 \
  "$API_BASE/health" >/dev/null 2>&1 && echo "harness: API ok" || { echo "harness: API NOT healthy" >&2; ok=1; }
echo "harness: chờ UI ($FE_URL/) ..."
curl -fsS --retry 40 --retry-delay 2 --retry-all-errors --retry-connrefused --max-time 5 \
  "$FE_URL/" >/dev/null 2>&1 && echo "harness: UI ok" || { echo "harness: UI NOT healthy" >&2; ok=1; }
exit "$ok"
