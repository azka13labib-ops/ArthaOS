<#
.SYNOPSIS
    ArthaOS Quality Gate & Automated Verification Script (artha-verify)
.DESCRIPTION
    Menjalankan audit multi-tenant isolation, checklist anti-slop, kontras dark mode,
    validasi pembungkusan AppLayout, build backend, unit tests, dan build frontend Next.js.
#>

$ErrorActionPreference = "Continue"
$RootPath = (Get-Item $PSScriptRoot).Parent.Parent.Parent.FullName
Set-Location $RootPath

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         ArthaOS Automated Verification (artha-verify)    " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Root Directory: $RootPath"

$FailedChecks = 0

# 1. Multi-Tenant Isolation Audit
Write-Host "`n[1/6] Scanning Multi-Tenant Isolation..." -ForegroundColor Yellow
$violations = @()
Get-ChildItem -Path "internal\repository\*.go" | ForEach-Object {
    $name = $_.Name
    if ($name -notin @("store_repository.go", "user_repository.go")) {
        $matches = Select-String -Path $_.FullName -Pattern "func\s+\([^)]+\)\s+GetByID\s*\((?!.*storeID|.*store_id)[^)]*\)"
        if ($matches) {
            foreach ($m in $matches) {
                $violations += "$($m.Filename):$($m.LineNumber) -> $($m.Line.Trim())"
            }
        }
    }
}
if ($violations.Count -gt 0) {
    Write-Host "  [FAIL] Ditemukan query GetByID tanpa store_id:" -ForegroundColor Red
    $violations | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    $FailedChecks++
} else {
    Write-Host "  [PASS] Multi-tenant isolation aman (semua entitas menyertakan store_id)." -ForegroundColor Green
}

# 2. Anti-Slop: Em Dash
Write-Host "`n[2/6] Scanning Anti-Slop (Em Dash in UI text)..." -ForegroundColor Yellow
$emDashMatches = Select-String -Path "web\src\app\**\*.tsx", "web\src\components\**\*.tsx" -Pattern "—"
if ($emDashMatches) {
    Write-Host "  [FAIL] Ditemukan em dash (—) di teks antarmuka:" -ForegroundColor Red
    $emDashMatches | ForEach-Object { Write-Host "    $($_.Filename):$($_.LineNumber) -> $($_.Line.Trim())" -ForegroundColor Red }
    $FailedChecks++
} else {
    Write-Host "  [PASS] Bersih dari em dash." -ForegroundColor Green
}

# 3. Anti-Slop: Native alert / confirm
Write-Host "`n[3/6] Scanning Native Dialogs (alert / confirm)..." -ForegroundColor Yellow
$alertMatches = Select-String -Path "web\src\app\**\*.tsx", "web\src\components\**\*.tsx", "web\src\lib\**\*.ts" -Pattern "\b(window\.)?(alert|confirm)\("
if ($alertMatches) {
    Write-Host "  [WARN/FAIL] Ditemukan pemanggilan native alert() atau confirm():" -ForegroundColor Yellow
    $alertMatches | ForEach-Object { Write-Host "    $($_.Filename):$($_.LineNumber) -> $($_.Line.Trim())" -ForegroundColor Yellow }
    $FailedChecks++
} else {
    Write-Host "  [PASS] Bersih dari alert() / confirm() native." -ForegroundColor Green
}

# 4. Anti-Slop: Hardcoded Colors (bg-white, bg-slate-100, text-black)
Write-Host "`n[4/6] Scanning Hardcoded Colors (Dark Mode Safety)..." -ForegroundColor Yellow
$colorMatches = Select-String -Path "web\src\app\**\*.tsx" -Pattern "\b(bg-white|bg-slate-100|text-black)\b"
if ($colorMatches) {
    Write-Host "  [WARN] Ditemukan class warna hardcoded yang perlu diverifikasi terhadap Dark Mode:" -ForegroundColor Yellow
    $colorMatches | ForEach-Object { Write-Host "    $($_.Filename):$($_.LineNumber) -> $($_.Line.Trim())" -ForegroundColor Yellow }
} else {
    Write-Host "  [PASS] Tidak ada class warna hardcoded yang merusak dark mode." -ForegroundColor Green
}

# 5. Check <AppLayout> Wrapping
Write-Host "`n[5/6] Verifying <AppLayout> wrapper on app routes..." -ForegroundColor Yellow
$missingLayout = @()
Get-ChildItem -Path "web\src\app" -Recurse -Filter "page.tsx" | ForEach-Object {
    $rel = $_.FullName.Replace($RootPath + "\", "")
    if ($rel -notmatch "login|register|web\\src\\app\\page\.tsx") {
        $content = Get-Content $_.FullName -Raw
        if ($content -notmatch "<AppLayout") {
            $missingLayout += $rel
        }
    }
}
if ($missingLayout.Count -gt 0) {
    Write-Host "  [FAIL] Halaman belum dibungkus <AppLayout>:" -ForegroundColor Red
    $missingLayout | ForEach-Object { Write-Host "    - $_" -ForegroundColor Red }
    $FailedChecks++
} else {
    Write-Host "  [PASS] Semua rute aplikasi internal telah dibungkus <AppLayout>." -ForegroundColor Green
}

# 6. Build & Test Gates
Write-Host "`n[6/6] Executing Build & Test Gates..." -ForegroundColor Yellow

# Gate A: Go Build
Write-Host "  -> Running: go build ./cmd/api"
& go build ./cmd/api
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] go build ./cmd/api gagal!" -ForegroundColor Red
    $FailedChecks++
} else {
    Write-Host "  [PASS] go build ./cmd/api sukses." -ForegroundColor Green
}

# Gate B: Go Tests
Write-Host "  -> Running: go test -v ./internal/services/..."
& go test -v ./internal/services/...
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [WARN/FAIL] go test ./internal/services/... ada yang gagal!" -ForegroundColor Red
    $FailedChecks++
} else {
    Write-Host "  [PASS] go test ./internal/services/... sukses." -ForegroundColor Green
}

# Gate C: Frontend Build
Write-Host "  -> Running: npm --prefix web run build"
& npm --prefix web run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] npm --prefix web run build gagal!" -ForegroundColor Red
    $FailedChecks++
} else {
    Write-Host "  [PASS] npm --prefix web run build sukses." -ForegroundColor Green
}

Write-Host "`n==========================================================" -ForegroundColor Cyan
if ($FailedChecks -eq 0) {
    Write-Host "   SELURUH VERIFIKASI LULUS! KODE SIAP UNTUK DI-COMMIT.   " -ForegroundColor Green
} else {
    Write-Host "   VERIFIKASI GAGAL DENGAN $FailedChecks TEMUAN. HARAP PERBAIKI DULU. " -ForegroundColor Red
}
Write-Host "==========================================================" -ForegroundColor Cyan
