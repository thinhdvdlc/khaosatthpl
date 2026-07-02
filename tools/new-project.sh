#!/usr/bin/env bash
# Tạo dự án mới từ AI-SDLC Starter Kit. Chạy trong WSL/Linux.
#   new-project.sh --name "Tên" --slug myapp --stack dotnet|node|python \
#                  --source ~/work/myapp [--gitlab git@...] [--harness ~/work/harness]
set -euo pipefail

NAME="" SLUG="" STACK="" SOURCE="" GITLAB="" HARNESS=""
while [ $# -gt 0 ]; do
  case "$1" in
    --name) NAME="$2"; shift 2;;
    --slug) SLUG="$2"; shift 2;;
    --stack) STACK="$2"; shift 2;;
    --source) SOURCE="$2"; shift 2;;
    --gitlab) GITLAB="$2"; shift 2;;
    --harness) HARNESS="$2"; shift 2;;
    *) echo "unknown arg: $1" >&2; exit 1;;
  esac
done

KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
: "${NAME:?--name required}"; : "${SLUG:?--slug required}"
: "${STACK:?--stack required}"; : "${SOURCE:?--source required}"
# Mặc định: dùng engine nhúng trong kit ($KIT/harness); fallback thư mục cạnh kit, rồi ~/work/harness
if [ -z "$HARNESS" ]; then
  if   [ -d "$KIT/harness/bin" ];    then HARNESS="$KIT/harness"
  elif [ -d "$KIT/../harness/bin" ]; then HARNESS="$(cd "$KIT/../harness" && pwd)"
  else HARNESS="$HOME/work/harness"; fi
fi
GITLAB="${GITLAB:-git@gitlab.vnpt:team/$SLUG.git}"
LANES_ROOT="$(dirname "$SOURCE")"

[ -d "$KIT/profiles/$STACK" ] || { echo "stack '$STACK' chưa có profile (dotnet|node|python)"; exit 1; }
[ -d "$HARNESS" ]           || { echo "không thấy harness ở $HARNESS (dùng --harness)"; exit 1; }

echo "==> profile: $HARNESS/profiles/$SLUG (từ $STACK)"
rm -rf "$HARNESS/profiles/$SLUG"
cp -r "$KIT/profiles/$STACK" "$HARNESS/profiles/$SLUG"
chmod +x "$HARNESS/profiles/$SLUG/hooks/"*.sh

echo "==> $HARNESS/config/lanes.env"
sed -e "s|__HARNESS__|$HARNESS|g" -e "s|__LANES_ROOT__|$LANES_ROOT|g" \
    -e "s|__SOURCE__|$SOURCE|g"   -e "s|__GITLAB__|$GITLAB|g" \
    -e "s|__SLUG__|$SLUG|g" "$KIT/tools/lanes.env.tmpl" > "$HARNESS/config/lanes.env"

echo "==> docs + evidence trong $SOURCE"
mkdir -p "$SOURCE/docs" "$SOURCE/evidence"
subst(){ sed -e "s|__PROJECT__|$NAME|g" -e "s|__SLUG__|$SLUG|g" "$1"; }
for f in 01-problem 02-prd 03-architecture 04-evidence; do
  subst "$KIT/docs-templates/$f.md" > "$SOURCE/docs/$f.md"
done
subst "$KIT/docs-templates/evidence-README.md" > "$SOURCE/evidence/README.md"
subst "$KIT/handbook.template.html" > "$SOURCE/docs/handbook.html"

echo "==> Dockerfile + deploy/helm"
cp "$KIT/deploy/Dockerfile.$STACK" "$SOURCE/Dockerfile"
mkdir -p "$SOURCE/deploy"; rm -rf "$SOURCE/deploy/helm"; cp -r "$KIT/deploy/helm" "$SOURCE/deploy/helm"

cat <<EOF

✅ Đã tạo '$NAME' (slug=$SLUG, stack=$STACK).
Việc còn lại:
  1) App '$SOURCE': docker-compose (pg+redis) · /health · migration · seed · vài test.
  2) Sửa $HARNESS/profiles/$SLUG/profile.env cho đúng layout ($STACK).
  3) $HARNESS/config/secrets.env: đặt SEED_USER_PASSWORD.
  4) glab auth login ; đăng ký GitLab-MCP trong repo app.
  5) cd $HARNESS && bin/harness-doctor.sh $SLUG      # → 0 lỗi
  6) bin/db-shared-up.sh ; bin/dashboard.sh start ; bin/lane-bootstrap.sh 1
EOF
