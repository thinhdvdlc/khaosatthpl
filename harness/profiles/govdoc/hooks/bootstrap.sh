#!/usr/bin/env bash
# bootstrap — cài deps cho lane clone (.NET restore + công cụ dotnet-ef).
set -euo pipefail
( cd "$LANE_DIR" && dotnet restore GovDoc.sln && dotnet tool restore )
