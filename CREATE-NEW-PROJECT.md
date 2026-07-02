# Tạo dự án mới từ Starter Kit

Giả định đã có: **harness/** (engine shipyard, đã GitLab hoá) và **starter-kit/** cạnh nhau trong `~/work`.

## Cách 1 — Generator (khuyến nghị)
```bash
cd ~/work/starter-kit
tools/new-project.sh \
  --name "Tên Dự Án"  --slug myapp  --stack dotnet \
  --source ~/work/myapp \
  --gitlab git@gitlab.vnpt:team/myapp.git \
  --harness ~/work/harness
```
Generator làm:
1. `cp profiles/<stack> harness/profiles/myapp`
2. Ghi `harness/config/lanes.env` (PROFILE, SOURCE_REPO, DB_PREFIX=myapp_l, ORIGIN_URL…)
3. Sinh `myapp/docs/{01-problem,02-prd,03-architecture,04-evidence}.md` + `evidence/` (thay `__PROJECT__`)
4. Sinh `myapp/docs/handbook.html`
5. Copy `deploy/Dockerfile.<stack>` → `myapp/Dockerfile`, `deploy/helm` → `myapp/deploy/helm`
6. In checklist việc còn lại.

## Cách 2 — Thủ công (5 bước)
1. **App chạy được local**: repo `myapp` có docker-compose (Postgres+Redis), health endpoint, migration, seed. (Xem `profiles/<stack>` để biết app cần layout gì.)
2. **Profile**: `cp -r starter-kit/profiles/<stack> harness/profiles/myapp` — chỉnh `profile.env` (BACKEND_DIR…) nếu layout khác.
3. **Config**: sửa `harness/config/lanes.env` → `PROFILE=myapp`, `SOURCE_REPO`, `DB_PREFIX=myapp_l`, `ORIGIN_URL`.
4. **Deploy**: copy `deploy/Dockerfile.<stack>` + `deploy/helm` vào repo app; sửa `values.yaml`.
5. **Docs/handbook**: copy `docs-templates/*` + `handbook.template.html`, thay `__PROJECT__`/`__SLUG__`.

## Kiểm tra & chạy
```bash
cd ~/work/harness
chmod +x profiles/myapp/hooks/*.sh
bin/harness-doctor.sh myapp        # phải 0 lỗi
bin/db-shared-up.sh && bin/install-claude-assets.sh && bin/dashboard.sh start
bin/lane-bootstrap.sh 1
cd ../lane1 && claude               # /ship-feature "..."
```

## Checklist "sẵn sàng nhân rộng"
- [ ] App: compose (pg+redis) · health · migration · seed · vài test
- [ ] Profile: 7 hook không còn TODO · `harness-doctor` 0 lỗi
- [ ] GitLab: repo + nhánh `main`/`development` · `glab auth login`
- [ ] MCP: GitLab-MCP (+ review bot) đăng ký trong repo app
- [ ] Deploy: Dockerfile + Helm values (registry/domain) · CI variables
- [ ] Docs BMAD điền xong · handbook.html mở được
