# Senior-gate / review checks — Node/TypeScript

Ưu tiên VNPT-Review-Bot: `get_review_guidelines` + `get_atbm_remediation_guidelines`.

- Prisma: đổi schema ⇒ có migration (`prisma migrate`); không dùng `db push` cho prod.
- Async/await đúng; không nuốt lỗi (`catch` rỗng); có xử lý lỗi tập trung.
- DTO/validation (class-validator) cho input; không tin dữ liệu client.
- Config qua `@nestjs/config`/env; không hardcode secret; không log token/PII.
- Không chặn event-loop bằng tác vụ nặng; dùng queue nếu cần.
