#!/usr/bin/env bash
# GitLab-adapted MR-review poll helper for the /review-prs skill. Lists open MRs
# on the lane's repo and classifies each against a per-lane cursor so the loop only
# acts on MRs that need our input. Maintains the cursor + an append-only review
# history the dashboard renders. Stdout contract is unchanged from the GitHub version.
#
#   lane-pr-poll.sh <N> list                       # classify open MRs (heartbeats)
#   lane-pr-poll.sh <N> mark <iid>                  # snapshot MR state (after handling it)
#   lane-pr-poll.sh <N> log <iid> <action> <detail> # append a review-history event
#
# Classification (vs cursor harness/state/laneN-prcursor.json):
#   NEW / UPDATED (head sha changed) / TOUCHED (updated_at moved) / UPTODATE
# Env: LANE_PR_INCLUDE_OWN=1, LANE_PR_INCLUDE_DRAFTS=1.
set -euo pipefail
source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/_common.sh"
require_lane "${1:-}"
N="$1"; ACTION="${2:-list}"; shift 2 || true
DIR="$(lane_dir "$N")"
[ -d "$DIR/.git" ] || die "lane $N not bootstrapped"
CURSOR="$HARNESS_ROOT/state/lane$N-prcursor.json"
REVIEWS="$HARNESS_ROOT/state/lane$N-reviews.json"
now_iso() { date -u +%Y-%m-%dT%H:%M:%SZ; }

case "$ACTION" in
  list)
    "$HARNESS_ROOT/bin/state.sh" "$N" set >/dev/null 2>&1 || true   # heartbeat
    me="$(glab api user 2>/dev/null | python3 -c 'import sys,json; print(json.load(sys.stdin).get("username",""))' 2>/dev/null || echo '')"
    mrs="$(cd "$DIR" && glab mr list --per-page 100 -F json 2>/dev/null || echo '[]')"
    NA_OUT="$(mktemp)"
    CURSOR="$CURSOR" ME="$me" INCLUDE_OWN="${LANE_PR_INCLUDE_OWN:-0}" INCLUDE_DRAFTS="${LANE_PR_INCLUDE_DRAFTS:-0}" NA_OUT="$NA_OUT" \
    python3 - "$mrs" <<'PY'
import json, os, sys
mrs = json.loads(sys.argv[1] or "[]")
cur = {}
cpath = os.environ["CURSOR"]
if os.path.exists(cpath):
    try: cur = json.load(open(cpath))
    except Exception: cur = {}
me = os.environ.get("ME", ""); inc_own = os.environ.get("INCLUDE_OWN") == "1"
inc_drafts = os.environ.get("INCLUDE_DRAFTS") == "1"
order = {"NEW": 0, "UPDATED": 1, "TOUCHED": 2, "UPTODATE": 3}

rows = []; ready = []; awaiting = []
for p in mrs:
    if (p.get("draft") or p.get("work_in_progress")) and not inc_drafts:
        continue
    author = (p.get("author") or {}).get("username", "")
    if author == me and not inc_own:
        continue
    num = p.get("iid")
    key = str(num); c = cur.get(key)
    sha = p.get("sha", ""); upd = p.get("updated_at", "")
    if not c:
        cls = "NEW"
    elif c.get("sha") != sha:
        cls = "UPDATED"
    elif c.get("updatedAt") != upd:
        cls = "TOUCHED"
    else:
        cls = "UPTODATE"
    dms = (p.get("detailed_merge_status") or p.get("merge_status") or "").lower()
    conflicts = bool(p.get("has_conflicts"))
    rd = "-"     # GitLab approvals need a separate call; the reviewer agent inspects directly
    ci = "none"  # CI status via head_pipeline needs a per-MR call — left to the agent
    is_ready = (dms == "mergeable") and not conflicts
    is_await = (not is_ready) and (not conflicts) and cls == "UPTODATE"
    if is_ready: ready.append(num)
    elif is_await: awaiting.append(num)
    act = "ready" if is_ready else ("awaiting" if is_await else "-")
    rows.append((order[cls], cls, num, author, sha, rd, ci, act, p.get("title", "")))
rows.sort()
actionable = sum(1 for r in rows if r[1] != "UPTODATE")
print(f"PR_POLL: {len(rows)} open · {actionable} need review · {len(ready)} ready to merge · {len(awaiting)} awaiting your decision")
print("# columns: CLASS  #MR  HEAD_SHA(full — pass to `mark`)  AUTHOR  REVIEW  CI  MERGE_ACTION  TITLE")
for _, cls, num, author, sha, rd, ci, act, title in rows:
    print(f"{cls}\t#{num}\t{sha}\t{author}\t{rd}\t{ci}\t{act}\t{title}")

parts = []
if ready:    parts.append("✅ ready to merge: " + ", ".join("#%d" % n for n in ready))
if awaiting: parts.append("🙋 awaiting your review/merge: " + ", ".join("#%d" % n for n in awaiting))
open(os.environ["NA_OUT"], "w").write(" · ".join(parts))
PY
    NA="$(cat "$NA_OUT" 2>/dev/null || true)"; rm -f "$NA_OUT"
    "$HARNESS_ROOT/bin/state.sh" "$N" set needs_action="$NA" >/dev/null 2>&1 || true
    ;;
  mark)
    # Snapshot the MR's CURRENT state so the next `list` compares against real values.
    PR="${1:?usage: mark <iid>}"
    snap="$(cd "$DIR" && glab mr view "$PR" -F json 2>/dev/null || echo '{}')"
    CURSOR="$CURSOR" python3 - "$PR" "$(now_iso)" "$snap" <<'PY'
import json, os, sys
pr, ts, snap = sys.argv[1], sys.argv[2], json.loads(sys.argv[3] or "{}")
cpath = os.environ["CURSOR"]
cur = {}
if os.path.exists(cpath):
    try: cur = json.load(open(cpath))
    except Exception: cur = {}
cur[str(pr)] = {
    "sha": snap.get("sha", ""),
    "updatedAt": snap.get("updated_at", ""),
    "comment_count": len(snap.get("notes") or []),
    "handled_ts": ts,
}
json.dump(cur, open(cpath, "w"), indent=2)
print(f"marked #{pr} @ {(cur[str(pr)]['sha'] or '?')[:8]}")
PY
    ;;
  log)
    PR="${1:?pr number}"; EVT="${2:?action}"; DETAIL="${3:-}"
    REVIEWS="$REVIEWS" python3 - "$PR" "$EVT" "$DETAIL" "$(now_iso)" <<'PY'
import json, os, sys
pr, evt, detail, ts = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
rpath = os.environ["REVIEWS"]
hist = []
if os.path.exists(rpath):
    try: hist = json.load(open(rpath))
    except Exception: hist = []
hist.append({"ts": ts, "pr": int(pr), "action": evt, "detail": detail[:300]})
hist = hist[-100:]   # cap
json.dump(hist, open(rpath, "w"), indent=2)
print(f"logged {evt} #{pr}")
PY
    ;;
  *) die "unknown action '$ACTION' (list|mark|log)";;
esac
