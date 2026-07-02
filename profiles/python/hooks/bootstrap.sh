#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
( cd "$LANE_DIR" && $INSTALL_CMD )
