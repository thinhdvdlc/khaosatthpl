# Senior-gate & code-review checks — GovDoc AI

Khi tới stage **code review / senior GO-NO-GO**, ưu tiên dùng **VNPT-Review-Bot** (đã có MCP):
- `get_review_guidelines` → lấy guideline review nội bộ trước khi chấm.
- `get_atbm_remediation_guidelines` → checklist an toàn bảo mật (ATBM).
- `review_merge_request` → review MR; `generate_review_report` → báo cáo.

## Điểm bắt buộc kiểm cho stack này
- **EF Core**: migration đi kèm thay đổi entity; không có `EnsureCreated` lẫn migration; không query N+1 rõ ràng.
- **Async**: không `.Result`/`.Wait()` (deadlock Blazor Server); truyền `CancellationToken`.
- **Cấu hình**: không hardcode connection string / secret; đọc qua `IConfiguration` (`ConnectionStrings__*`, `S3__*`, `IKnow__*`).
- **iKnow**: mọi sinh nội dung/hỏi-đáp đi qua `IKnowClient` — KHÔNG gọi LLM ngoài (đúng cam kết dự thi).
- **Bảo mật**: input HSMT/file upload được validate; không lộ thông tin nhạy cảm ra log; check phân quyền theo `Role`.
- **DI**: service đăng ký đúng lifetime (DbContext scoped; multiplexer singleton).
