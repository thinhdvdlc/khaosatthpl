# Deploy lên Vercel (Prisma Postgres)

App đã cấu hình sẵn cho Vercel: frontend React (Vite) phục vụ tĩnh, API Express chạy dưới dạng
serverless function (`api/index.js`), CSDL **PostgreSQL** (Prisma Postgres/Neon/Vercel Postgres) —
dữ liệu **lưu bền** (không reset).

## Bước 1 — Import repo vào Vercel
1. Đăng nhập **https://vercel.com** bằng GitHub (`thinhdvdlc`).
2. **Add New… → Project** → chọn repo **khaosatthpl**.
3. **Root Directory**: bấm **Edit** → chọn **`apps/khaosat`** (repo là monorepo, app nằm trong thư mục con). Quan trọng.
4. Framework Preset để **Other** (Vercel tự đọc `vercel.json`). Chưa Deploy vội — sang bước 2 set biến môi trường.

## Bước 2 — Biến môi trường (Settings → Environment Variables)
Thêm cho cả Production + Preview:

| Key | Value |
|---|---|
| `DATABASE_URL` | chuỗi kết nối Postgres (chuỗi Prisma Postgres bạn đã tạo) |
| `ADMIN_KEY` | khóa quản trị (đổi khác `khaosat-admin` khi chạy thật) |

> `DATABASE_URL` được dùng cả lúc **build** (tạo bảng + seed) lẫn **runtime** (truy vấn). Không commit chuỗi này vào repo.

## Bước 3 — Deploy
Bấm **Deploy**. Quy trình build (`vercel.json`) sẽ tự:
`cài deps → prisma generate → prisma db push (tạo bảng) → seed 2 phiếu → build client`.
Xong có URL `https://khaosatthpl.vercel.app` (hoặc tên bạn đặt).

## Đường dẫn demo
| Trang | Link |
|---|---|
| Trang chủ (giới thiệu + 2 phiếu) | `/` |
| Phiếu 01 — cán bộ, công chức | `/khao-sat/477bd53c-4c8c-4cf8-baac-35d3ec983b7d` |
| Phiếu 02 — người dân | `/khao-sat/88d2c352-3fe1-4862-a1d2-fcd029ba1dcc` |
| Quản trị | `/quan-tri` (khóa = `ADMIN_KEY`) |

## Ghi chú
- **Dữ liệu lưu bền** trên Postgres — phiếu trả lời không mất khi deploy lại. `seed` idempotent (đã có thì bỏ qua).
- Mỗi lần `git push` lên `main`, Vercel tự build lại.
- Nếu build/hàm lỗi Prisma engine: kiểm tra `binaryTargets` trong `prisma/schema.prisma` có `rhel-openssl-3.0.x` (đã thêm sẵn).
- Local dev giờ cũng dùng Postgres (đặt `DATABASE_URL` trong `apps/khaosat/.env`). `npm run migrate` = `prisma db push`.
