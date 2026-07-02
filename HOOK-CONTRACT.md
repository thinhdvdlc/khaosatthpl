# Hook Contract — hợp đồng giữa harness và profile

Harness gọi **7 hook** trong `profiles/<slug>/hooks/`. Trước mỗi hook, nó export sẵn các biến sau.
Viết hook cho stack của bạn = dùng các biến này.

## Biến môi trường harness cấp
| Biến | Ý nghĩa |
|---|---|
| `LANE` / `LANE_DIR` | số lane / đường dẫn clone của lane (cwd của app) |
| `API_PORT` / `FE_PORT` | cổng API `:800N` / cổng UI `:300N` |
| `API_BASE` / `FE_URL` | `http://127.0.0.1:$API_PORT` / `...:$FE_PORT` |
| `DATABASE_URL` | `postgresql://user:pass@host:port/db` (per-lane) |
| `REDIS_URL` | `redis://host:port/N` (index N riêng theo lane) |
| `DB_NAME` · `PG_HOST/PG_PORT/PG_USER/PG_PASS` | thành phần DB (để tự dựng conn-string nếu driver không nhận URL) |
| `UPLOAD_DIR` | thư mục upload per-lane |
| `TEST_DATABASE_URL` | (chỉ ở `ci-gate`) DB test cách ly |
| `RUN_DIR` / `LOG_DIR` | nơi ghi pid/log |
| `SOURCE_REPO` / `HARNESS_ROOT` / `PROFILE_DIR` | đường dẫn hệ thống |
| `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` | tài khoản seed |
| … + mọi key trong `profile.env` | (BACKEND_DIR, FRONTEND_DIR, …) |

## Helper có sẵn trong hook
- `harness_spawn <name> <workdir> <cmd…>` — chạy nền 1 service (detached, ghi pid/log). Dùng trong `boot`.
- `die <msg>` — thoát lỗi có thông báo.
- `"$HARNESS_ROOT/bin/with-lock.sh" <lock> -- <cmd>` — chạy dưới khoá liên-lane (dùng cho `build`, `e2e`).

## 7 hook phải làm gì
| Hook | Nhiệm vụ | Ghi chú |
|---|---|---|
| `bootstrap` | cài dependencies trong lane clone | — |
| `migrate` | áp migration lên `DATABASE_URL` | — |
| `seed` | tạo user/tổ chức đầu tiên | dùng `SEED_USER_*` |
| `boot` | build + start service rồi **return** | dùng `harness_spawn`; `$1 == --no-build` ⇒ dùng lại build |
| `health` | exit 0 chỉ khi sẵn sàng | nên `curl --retry` vào `$API_BASE/health` |
| `ci-gate` | lint / test / contract; non-zero nếu fail | có `TEST_DATABASE_URL` cách ly |
| `e2e` | chạy e2e với stack đang chạy, dưới e2e-lock | `with-lock.sh e2e -- <cmd>` |

## Nguyên tắc quan trọng
- **Driver nhận URL** (Node/Prisma, Python/SQLAlchemy): dùng thẳng `$DATABASE_URL` / `$REDIS_URL`.
- **Driver KHÔNG nhận URL** (.NET/Npgsql): tự dựng từ `PG_*` + `DB_NAME`; lấy Redis index bằng
  `python3 -c 'import sys,urllib.parse as u;print(u.urlparse(sys.argv[1]).path.lstrip("/") or "0")' "$REDIS_URL"`.
- **App phải nghe `0.0.0.0`** trên `$API_PORT` (và `$FE_PORT` nếu có UI riêng).
- **DB create/drop + Redis-index** do harness lo (dựa `PG_*`/`DB_PREFIX`/`COMPOSE_SERVICES`) — hook KHÔNG tự tạo DB.
- **Bắt buộc Postgres + Redis qua docker-compose** của repo app.
