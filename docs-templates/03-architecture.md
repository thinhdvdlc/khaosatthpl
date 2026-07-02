# P1 — Architecture — __PROJECT__

> BMAD `bmad-create-architecture`: API · Data · Security · Deployment. Gate: Architect/Tech Lead.

## Thành phần
_(Sơ đồ khối: app ↔ PostgreSQL ↔ Redis ↔ Object Storage ↔ service ngoài.)_

## API
- _(Danh sách endpoint chính + `/health`.)_

## Data
- _(Bảng/entity chính, migration, cache.)_

## Security
- Phân quyền theo vai trò · secret qua K8s Secret · validate input · không log dữ liệu nhạy cảm.

## Deployment (VNPT SmartCloud)
- Dockerfile → Container Registry → Helm → VKS → Ingress `*.smartcloud.vn`.
- Managed: PostgreSQL · Redis · Object Storage S3 (`s3hn.smartcloud.vn`). CI/CD: GitLab.
