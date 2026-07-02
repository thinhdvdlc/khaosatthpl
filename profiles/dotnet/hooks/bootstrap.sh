#!/usr/bin/env bash
set -euo pipefail
source "$PROFILE_DIR/profile.env"
( cd "$LANE_DIR" && dotnet restore "$SLN" && dotnet tool restore )
