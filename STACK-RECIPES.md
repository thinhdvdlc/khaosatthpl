# Stack Recipes — map 7 hook sang từng công nghệ

Bảng lệnh gợi ý cho mỗi hook, theo stack. Profile sẵn có: **dotnet · node · python** (trong `profiles/`).
Stack khác: copy tư duy, điền theo bảng.

## Bảng tổng hợp
| Hook | .NET 8 (EF Core) | Node (NestJS + Prisma) | Python (FastAPI + Alembic) | Java (Spring + Flyway) | Go (+ migrate) | PHP (Laravel) |
|---|---|---|---|---|---|---|
| bootstrap | `dotnet restore` `dotnet tool restore` | `npm ci` | `uv sync` | `./mvnw -q dependency:go-offline` | `go mod download` | `composer install` |
| migrate | `dotnet ef database update` | `npx prisma migrate deploy` | `alembic upgrade head` | `./mvnw flyway:migrate` | `migrate -path db -database $DATABASE_URL up` | `php artisan migrate --force` |
| seed | `dotnet run -- --seed` | `npm run seed` | `python -m app.seed` | `./mvnw -Dseed spring-boot:run` | `go run ./cmd/seed` | `php artisan db:seed --force` |
| boot | publish + `harness_spawn` dll `--urls` | `npm run build` + `harness_spawn node dist/main.js` | `harness_spawn uvicorn app.main:app` | `./mvnw package` + `harness_spawn java -jar` | `go build` + `harness_spawn ./app` | `harness_spawn php artisan serve` |
| health | `curl $API_BASE/health` | `curl $API_BASE/health` | `curl $API_BASE/health` | `curl $API_BASE/actuator/health` | `curl $API_BASE/healthz` | `curl $API_BASE/up` |
| ci-gate | `dotnet test` + `dotnet format` | `npm run lint && npm test` | `ruff check && pytest` | `./mvnw verify` | `go vet && go test ./...` | `pint --test && php artisan test` |
| e2e | `dotnet test IntegrationTests` | `npm run test:e2e` (Playwright) | `pytest -m e2e` | `./mvnw -Pe2e test` | `go test -tags e2e ./...` | `php artisan dusk` |

## Chuỗi DB/Redis theo driver
| Stack | DATABASE_URL | Redis |
|---|---|---|
| .NET | dựng `Host=..;Port=..;Database=$DB_NAME;Username=..;Password=..` từ `PG_*` | `$REDIS_HOST:$REDIS_PORT,defaultDatabase=<index>` |
| Node/Prisma | dùng thẳng `$DATABASE_URL` | dùng thẳng `$REDIS_URL` |
| Python/SQLAlchemy | `$DATABASE_URL` (đổi scheme `postgresql+asyncpg://` nếu async) | `$REDIS_URL` |
| Java/JDBC | `jdbc:postgresql://$PG_HOST:$PG_PORT/$DB_NAME` + user/pass riêng | `$REDIS_HOST:$REDIS_PORT` |

## profile.env theo stack (các key khác mặc định)
| Key | dotnet | node | python |
|---|---|---|---|
| `BACKEND_DIR` | `.` | `.` | `.` |
| `FRONTEND_DIR` | `` (Blazor) | `` (API-only) | `` (API-only) |
| `API_PATH` | `/api` | `/api` | `/api` |
| `DB_URL_SCHEME` | `postgresql` | `postgresql` | `postgresql+asyncpg` |
| `TEST_PATHS` | `tests/ *Tests.cs` | `test/ *.spec.ts *.e2e-spec.ts` | `tests/ test_*.py` |

> API-only (không UI riêng): hook `health` chỉ kiểm `$API_BASE/health`; thẻ lane hiện "fe down" là bình thường (cosmetic).
> Muốn xanh cả hai: cho app nghe thêm `$FE_PORT` (vd .NET Blazor `--urls "…:$API_PORT;…:$FE_PORT"`).
