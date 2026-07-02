#!/usr/bin/env bash
# e2e — integration tests chống lại stack ĐANG CHẠY của lane, dưới e2e-lock + wall-clock.
# (Nếu sau này thêm React SPA: đổi sang `pnpm exec playwright test`.)
set -euo pipefail
rc=0
"$HARNESS_ROOT/bin/with-lock.sh" e2e -- bash -c "cd '$LANE_DIR' && \
  E2E_BASE_URL='$API_BASE' E2E_UI_URL='$FE_URL' \
  timeout -k 30 ${E2E_TIMEOUT:-1200} \
  dotnet test tests/GovDoc.IntegrationTests -c Release --filter Category=Integration --logger 'console;verbosity=minimal'" || rc=$?
if [ "$rc" -eq 124 ]; then
  echo "e2e: TIMED OUT sau ${E2E_TIMEOUT:-1200}s — coi như FAIL (tăng E2E_TIMEOUT nếu suite thực sự cần lâu hơn)." >&2
fi
exit "$rc"
