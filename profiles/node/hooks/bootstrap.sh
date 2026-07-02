#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
cd "$LANE_DIR"
case "$PKG_MGR" in
  pnpm) pnpm install --frozen-lockfile ;;
  yarn) yarn install --immutable ;;
  *)    npm ci ;;
esac
