# Thay lớp GitHub `gh` → GitLab trong shipyard

Phần git lõi (branch/merge/push) là **git thuần → GitLab chạy thẳng**. Chỉ lớp **PR/MR + CI-status**
bám `gh`. Dưới đây là toàn bộ bề mặt cần đổi (đo trên repo shipyard@main).

## Chiến lược
- **Bash helper** → dùng `glab` (CLI GitLab, gần drop-in của `gh`).
- **Hành động do agent điều khiển** (mở MR, trả lời thread, review) → dùng **GitLab-MCP** + **VNPT-Review-Bot**
  (đã pre-approve qua allow-rule `mcp__*`).

## Bảng đổi

| `gh` (GitHub) | File : dòng | Thay bằng (GitLab) |
|---|---|---|
| `gh pr create --base main --fill` | `claude/skills/ship-feature/SKILL.md:153` | MCP `create_merge_request` (source=`feat/<slug>`, target=`main`) → lấy `web_url`. Hoặc `glab mr create -b feat/<slug> -t main --fill -y` |
| `gh pr comment <url> --body-file f` | `ship-feature/SKILL.md:193,194,196` | MCP `create_merge_request_note` / `create_merge_request_discussion_note`. Vẫn ký `— 🤖 ship-feature · lane <N>` |
| `gh pr view --json state,mergeable,mergeStateStatus` | `bin/lane-pr-comments.sh:39` | `glab mr view <iid> -F json` (đọc `state`, `detailed_merge_status`) |
| regex `github.com/.../pull/N` | `bin/lane-pr-comments.sh:21-26` | đổi sang `…/-/merge_requests/<iid>`; bắt thêm project path |
| `gh pr list` / `gh pr view` / `gh api user` | `bin/lane-pr-poll.sh:32,33,115` | **Bỏ** — `/review-prs` dùng thẳng VNPT-Review-Bot: `list_merge_requests` → `review_merge_request` → `generate_review_report` |
| allow-rules `Bash(gh pr …)` | `bin/lane-mcp-sync.sh:123-126` | xem patch bên dưới |
| CI green (`statusCheckRollup`) | `bin/lane-pr-poll.sh:82-83` | GitLab pipeline: MCP `list_merge_request_pipelines` / `get_merge_request.head_pipeline.status` |

## Patch `bin/lane-mcp-sync.sh` (block ~123-126)
Thay khối:
```python
rules += [
    "Bash(gh pr comment:*)", "Bash(gh pr review:*)",
    "Bash(gh pr create:*)", "Bash(gh pr edit:*)",
    "Bash(gh pr view:*)", "Bash(gh pr diff:*)", "Bash(gh pr list:*)",
    "Bash(gh pr checks:*)", "Bash(gh pr status:*)",
    "Bash(gh api:*)", "Bash(gh auth token)", "Bash(gh auth token:*)",
]
```
bằng:
```python
rules += [
    "Bash(glab mr:*)", "Bash(glab api:*)", "Bash(glab ci:*)",
    "Bash(glab auth status)",
]
# GitLab-MCP + VNPT-Review-Bot đã được phủ bởi rule `mcp__<name>` ở (a) nếu đã đăng ký trong MCP config.
```
Và sửa text autoMode (~dòng 146) nói "GitLab merge request" thay cho "GitHub PR".

## Prereq GitLab
- Cài `glab` + `glab auth login` (trỏ GitLab nội bộ VNPT).
- `config/lanes.env`: đặt `ORIGIN_URL="git@gitlab.<vnpt>:team/govdoc-ai.git"` để lane `git push` lên GitLab.
- Đảm bảo `GitLab-MCP` và `VNPT-Review-Bot` nằm trong MCP config của **source repo** (lane-mcp-sync copy vào từng lane).

## Lưu ý
Skills (`ship-feature`, `review-prs`) là file generic, cài vào `~/.claude` qua `bin/install-claude-assets.sh`.
Sửa bản nguồn trong `harness/claude/skills/...` rồi chạy lại installer + restart Claude session của lane.
