#!/usr/bin/env bash
# GitLab-adapted: poll a lane's MERGE REQUEST for new notes + merge status. Prints:
#   PR_STATE: OPENED|MERGED|CLOSED
#   PR_MERGEABLE: <detailed_merge_status>   (mergeable / conflict / ci_still_running / ...)
#   --- [kind] author timestamp [file:line]   (one block per NEW note)
#   <body>
#   NEW_COMMENTS: <count>
# "New" = created after this lane's cursor (state/laneN.pr-cursor), which advances
# each run. Covers general MR notes + inline diff-position notes (skips system notes).
#   lane-pr-comments.sh <N> [mr_url]      # mr_url defaults to the lane state's pr_url
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"
require_lane "${1:-}"
N="$1"
PR_URL="${2:-$("$HARNESS_ROOT/bin/state.sh" "$N" get pr_url 2>/dev/null || true)}"
[ -n "$PR_URL" ] || die "lane $N has no pr_url in state and none was passed"
# Per-feature cursor (keyed by active slug so a new feature starts fresh).
STATE_DIR="$HARNESS_ROOT/state/lane$N"; mkdir -p "$STATE_DIR"
ACTIVE_SLUG=""
[ -f "$STATE_DIR/.active" ] && ACTIVE_SLUG="$(tr -d '[:space:]' < "$STATE_DIR/.active" 2>/dev/null || true)"
if [ -n "$ACTIVE_SLUG" ]; then
  CURSOR_FILE="$STATE_DIR/$ACTIVE_SLUG.pr-cursor"
else
  CURSOR_FILE="$HARNESS_ROOT/state/lane$N.pr-cursor"   # back-compat
fi

# GitLab MR url: https://<host>/<group>/<sub>/<project>/-/merge_requests/<iid>
read -r PROJ IID <<<"$(python3 - "$PR_URL" <<'PY'
import re, sys, urllib.parse as u
m = re.search(r"https?://[^/]+/(.+?)/-/merge_requests/(\d+)", sys.argv[1])
if not m:
    sys.exit(1)
print(u.quote(m.group(1), safe=''), m.group(2))   # url-encode project path for glab api
PY
)" || die "cannot parse MR url: $PR_URL"

PRINFO="$(glab api "projects/$PROJ/merge_requests/$IID" 2>/dev/null \
  | python3 -c 'import sys,json; d=json.load(sys.stdin); print((d.get("state") or "unknown").upper(), (d.get("detailed_merge_status") or d.get("merge_status") or "unknown"))' \
  2>/dev/null || echo "UNKNOWN unknown")"
read -r STATE MSTATUS <<<"$PRINFO"
echo "PR_STATE: $STATE"
echo "PR_MERGEABLE: $MSTATUS"

PROJ="$PROJ" IID="$IID" CURSOR_FILE="$CURSOR_FILE" python3 <<'PY'
import json, os, subprocess

proj, iid = os.environ["PROJ"], os.environ["IID"]
cursor_file = os.environ["CURSOR_FILE"]
cur = "1970-01-01T00:00:00Z"
if os.path.exists(cursor_file):
    cur = open(cursor_file).read().strip() or cur

def glab(path):
    out = subprocess.run(["glab", "api", path], capture_output=True, text=True)
    if out.returncode != 0:
        return []
    try:
        data = json.loads(out.stdout)
        return data if isinstance(data, list) else []
    except Exception:
        return []

items = []
for c in glab(f"projects/{proj}/merge_requests/{iid}/notes?per_page=100&sort=asc"):
    if c.get("system"):
        continue  # skip GitLab system notes (label/assignee/status changes)
    who = (c.get("author") or {}).get("username", "")
    body = c.get("body") or ""
    pos = c.get("position") or {}
    loc = ""
    kind = "comment"
    if pos:
        loc = f'{pos.get("new_path") or pos.get("old_path") or ""}:{pos.get("new_line") or pos.get("old_line") or ""}'
        kind = "review-comment"
    items.append((c.get("created_at", ""), kind, who, loc, body))

new = sorted(i for i in items if i[0] > cur)
for ts, kind, who, loc, body in new:
    head = f"--- [{kind}] {who} {ts}" + (f" {loc}" if loc else "")
    print(head)
    print(body.strip())
    print()
print(f"NEW_COMMENTS: {len(new)}")

if items:
    mx = max(i[0] for i in items)
    if mx > cur:
        open(cursor_file, "w").write(mx)
PY

"$HARNESS_ROOT/bin/state.sh" "$N" set >/dev/null 2>&1 || true   # heartbeat
