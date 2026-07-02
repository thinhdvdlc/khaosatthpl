# AI-SDLC Harness Starter Kit

Bộ khung tái sử dụng để **nhân một dự án ra nhiều dự án / nhiều công nghệ**, dùng chung một
"harness" (shipyard) chạy nhiều feature song song bằng Claude Code, có **gate + evidence + dashboard**
đúng phương pháp **AI-First / BMAD** mà Hackathon 2026 chấm điểm.

> **Repo tự chứa** — engine harness đã nhúng sẵn tại `harness/` (bản GitLab-hoá: glab + GitLab-MCP +
> VNPT-Review-Bot thay cho GitHub `gh`). Clone 1 repo này là đủ, không cần clone thêm gì.
> Engine gốc: [minhduc2803/shipyard](https://github.com/minhduc2803/shipyard) (đã chỉnh cho GitLab/VNPT).

## Ý tưởng cốt lõi
> **Harness là stack-agnostic.** Nó không biết app viết bằng gì — chỉ gọi **7 hook** và đọc **1 file cấu hình**.
> Đổi công nghệ = đổi profile (`profile.env` + 7 hook). Mọi thứ khác (dashboard, pipeline, gate, QC, GitLab MR) dùng lại nguyên.

```
harness/ (dùng chung)  ──gọi──►  profiles/<dự-án>/  ──►  app của bạn (bất kỳ stack nào)
   bin/ dashboard/ skills/            profile.env             chạy trên Postgres+Redis (docker-compose)
                                      hooks/ (7 script)
```

## Cấu trúc kit
```
starter-kit/  (repo này)
├─ README.md                 ← file này
├─ CREATE-NEW-PROJECT.md      ← quy trình tạo dự án mới (đọc cái này)
├─ HOOK-CONTRACT.md           ← hợp đồng 7 hook + biến môi trường harness cấp
├─ STACK-RECIPES.md           ← bảng map lệnh build/test/migrate cho từng stack
├─ harness/                   ← ENGINE shipyard nhúng sẵn (GitLab-hoá) — bin/ dashboard/ skills/ profiles/
├─ profiles/                  ← profile mẫu SẴN theo stack (generator copy vào harness/profiles/)
│   ├─ dotnet/   (ASP.NET Core + EF Core)
│   ├─ node/     (NestJS/Express + Prisma)
│   └─ python/   (FastAPI + Alembic + SQLAlchemy)
├─ deploy/                    ← Dockerfile theo stack + Helm chart generic (VKS/SmartCloud)
├─ docs-templates/            ← BMAD: 01-problem / 02-prd / 03-architecture / 04-evidence (+ evidence/)
├─ handbook.template.html     ← cẩm nang HTML (thay __PROJECT__ là xong)
└─ tools/
    ├─ new-project.sh          ← generator (Linux/WSL) — mặc định dùng harness/ nhúng trong repo
    └─ new-project.ps1         ← generator (Windows)
```

## Dùng nhanh
```bash
# Trong WSL:
git clone <repo-này> ~/work/starter-kit && cd ~/work/starter-kit
tools/new-project.sh  --name "Tên Dự Án"  --slug myapp  --stack dotnet \
   --source ~/work/myapp  --gitlab git@gitlab.vnpt:team/myapp.git
# (không cần --harness: generator tự dùng harness/ nhúng trong repo)
```
Generator sẽ: tạo `harness/profiles/myapp`, ghi `harness/config/lanes.env`, sinh `docs/` + `handbook.html`
cho repo app, in các bước còn lại. Chi tiết: **CREATE-NEW-PROJECT.md**.

## Yêu cầu với app (mọi stack)
1. App tự clone–cài–chạy được ở local.
2. Dùng **PostgreSQL + Redis qua docker-compose** (harness tự tạo/xoá DB + gán Redis index theo lane).
3. Có endpoint **health** trả 200 khi sẵn sàng.
4. Có **migration** + **script seed** user/tổ chức đầu tiên.
5. (khuyến nghị) vài **test** để CI-gate có cái chạy.

> Stack chưa có profile sẵn (Java/Spring, Go, PHP/Laravel…)? Xem bảng trong **STACK-RECIPES.md**,
> copy `profiles/_skeleton` tư duy tương tự rồi điền 7 hook theo **HOOK-CONTRACT.md**.
