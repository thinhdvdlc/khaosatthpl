# Tracker notes — GovDoc AI (Jira nội bộ qua MCP)

Không dùng agent Playwright đăng nhập web như mặc định của shipyard. Thay vào đó dùng
**VNPT-Review-Bot MCP** (đã kết nối Jira):

- Tạo/cập nhật ticket: `jira_analyze_task`, `jira_append_description`, `jira_create_test_ticket`,
  `jira_assign_issue`, `jira_transition_issue`, `jira_update_estimate`.
- Idempotent: tìm ticket theo feature slug trước; có rồi thì **update**, chưa có thì tạo — không tạo trùng.

Điền `TRACKER_URL` / `TRACKER_PROJECT` trong `integrations.env` và đặt `TRACKER_ENABLED=1` khi sẵn sàng.
