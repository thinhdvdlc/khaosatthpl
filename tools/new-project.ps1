<#
  Tạo dự án mới từ AI-SDLC Starter Kit (Windows staging).
  Ví dụ:
    .\new-project.ps1 -Name "Tên" -Slug myapp -Stack dotnet -Source F:\harness\myapp
  LƯU Ý: nếu chuẩn bị cho WSL, truyền path kiểu WSL cho -Harness/-Source
         (vd -Harness /home/you/work/harness) để lanes.env có path đúng.
         Cách chuẩn nhất: chạy tools/new-project.sh TRONG WSL.
#>
param(
  [Parameter(Mandatory)][string]$Name,
  [Parameter(Mandatory)][string]$Slug,
  [Parameter(Mandatory)][ValidateSet('dotnet','node','python')][string]$Stack,
  [Parameter(Mandatory)][string]$Source,
  [string]$Gitlab,
  [string]$Harness
)
$ErrorActionPreference = 'Stop'
$Kit = Split-Path -Parent $PSScriptRoot
if (-not $Harness) {
  if (Test-Path (Join-Path $Kit 'harness\bin')) { $Harness = Join-Path $Kit 'harness' }
  else { $Harness = Join-Path (Split-Path -Parent $Kit) 'harness' }
}
if (-not $Gitlab)  { $Gitlab  = "git@gitlab.vnpt:team/$Slug.git" }
$LanesRoot = Split-Path -Parent $Source

if (-not (Test-Path "$Kit\profiles\$Stack")) { throw "stack '$Stack' chưa có profile (dotnet|node|python)" }
if (-not (Test-Path $Harness)) { throw "không thấy harness ở $Harness (dùng -Harness)" }

function Write-Lf($path, $content) {
  $dir = Split-Path -Parent $path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Force $dir | Out-Null }
  [System.IO.File]::WriteAllText($path, ($content -replace "`r`n", "`n"))
}
function Subst($content) { $content.Replace('__PROJECT__', $Name).Replace('__SLUG__', $Slug) }
function Fwd($p) { $p -replace '\\', '/' }

Write-Host "==> profile: $Harness\profiles\$Slug (từ $Stack)"
if (Test-Path "$Harness\profiles\$Slug") { Remove-Item "$Harness\profiles\$Slug" -Recurse -Force }
Copy-Item "$Kit\profiles\$Stack" "$Harness\profiles\$Slug" -Recurse -Force

Write-Host "==> $Harness\config\lanes.env"
$lanes = (Get-Content "$Kit\tools\lanes.env.tmpl" -Raw).
  Replace('__HARNESS__', (Fwd $Harness)).
  Replace('__LANES_ROOT__', (Fwd $LanesRoot)).
  Replace('__SOURCE__', (Fwd $Source)).
  Replace('__GITLAB__', $Gitlab).
  Replace('__SLUG__', $Slug)
Write-Lf "$Harness\config\lanes.env" $lanes

Write-Host "==> docs + evidence trong $Source"
foreach ($f in '01-problem', '02-prd', '03-architecture', '04-evidence') {
  Write-Lf "$Source\docs\$f.md" (Subst (Get-Content "$Kit\docs-templates\$f.md" -Raw))
}
Write-Lf "$Source\evidence\README.md" (Subst (Get-Content "$Kit\docs-templates\evidence-README.md" -Raw))
Write-Lf "$Source\docs\handbook.html" (Subst (Get-Content "$Kit\handbook.template.html" -Raw))

Write-Host "==> Dockerfile + deploy\helm"
Copy-Item "$Kit\deploy\Dockerfile.$Stack" "$Source\Dockerfile" -Force
if (Test-Path "$Source\deploy\helm") { Remove-Item "$Source\deploy\helm" -Recurse -Force }
New-Item -ItemType Directory -Force "$Source\deploy" | Out-Null
Copy-Item "$Kit\deploy\helm" "$Source\deploy\helm" -Recurse -Force

Write-Host ""
Write-Host "OK: đã tạo '$Name' (slug=$Slug, stack=$Stack)."
Write-Host "Nếu path trong lanes.env là Windows → sửa lại theo WSL trước khi chạy harness. Xem CREATE-NEW-PROJECT.md."
