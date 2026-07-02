# Senior-gate / review checks — .NET

Ưu tiên VNPT-Review-Bot: `get_review_guidelines` + `get_atbm_remediation_guidelines`.

- EF Core: đổi entity ⇒ có migration; không N+1 rõ ràng; không lẫn `EnsureCreated` với migration.
- Async: không `.Result`/`.Wait()`; truyền `CancellationToken`.
- Config: không hardcode connection string/secret; đọc qua `IConfiguration`.
- DI lifetime: DbContext scoped; client hạ tầng (Redis/S3) singleton.
- Bảo mật: validate input/upload; không log dữ liệu nhạy cảm; kiểm phân quyền.
