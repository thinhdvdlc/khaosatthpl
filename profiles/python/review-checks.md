# Senior-gate / review checks — Python/FastAPI

Ưu tiên VNPT-Review-Bot: `get_review_guidelines` + `get_atbm_remediation_guidelines`.

- Alembic: đổi model ⇒ có revision; không `create_all` cho prod.
- async: dùng async driver (asyncpg); không gọi hàm blocking trong route async.
- Pydantic schema cho input/response; validate dữ liệu; không tin client.
- Config qua pydantic-settings/env; không hardcode secret; không log token/PII.
- Xử lý lỗi bằng exception handler; không nuốt exception.
