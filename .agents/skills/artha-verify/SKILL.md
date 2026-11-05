---
name: artha-verify
description: Checklist otomatis dan prosedur verifikasi kualitas sebelum commit/rilis di ArthaOS (Audit Multi-tenancy, Anti-Slop, Build Test, Kontras Dark Mode)
---

# Prosedur Verifikasi Kualitas ArthaOS (`artha-verify`)

Dokumen ini adalah panduan standar dan runbook verifikasi otomatis sebelum melakukan `git commit`, `pull request`, atau rilis produksi pada ekosistem **ArthaOS**. 

Verifikasi ini memastikan 4 pilar utama integritas perangkat lunak ArthaOS:
1. **Multi-Tenant Isolation**: Menjamin tidak ada celah kebocoran data antar-toko (*data leakage / IDOR*).
2. **Anti-Slop & UI Quality**: Menghilangkan artefak AI generik, larangan dialog browser primitif, menjaga kompatibilitas Dark Mode, serta konsistensi shell aplikasi.
3. **Build & Test Gates**: Menjamin integritas kompilasi backend Go, kelulusan unit test layanan, dan keberhasilan build produksi frontend Next.js.
4. **Automated Scanner**: Skrip otomatis siap pakai untuk memvalidasi seluruh checklist dalam satu perintah.

---

## 1. Multi-Tenant Isolation Audit (Keamanan Data Toko)

ArthaOS adalah platform SaaS Point of Sale & ERP multi-tenant. Setiap data transaksi, persediaan, pelanggan, supplier, kasbon/hutang, dan resep **wajib** terikat secara ketat pada `store_id`.

> [!CAUTION]
> **Kerentanan IDOR (Insecure Direct Object Reference)**:
> Query pengambilan data berdasar `id` entitas **tanpa menyertakan `store_id`** memungkinkan pengguna Toko A membaca atau memodifikasi data milik Toko B hanya dengan menebak ID numerik.

### A. Aturan Baku Penulisan Query & Method Repository
1. Semua fungsi repository untuk entitas toko wajib menerima `storeID` dan memasukkannya ke klausul query database:
   - ✅ **Benar**: `GetByID(id uint, storeID uint) (*models.Entity, error)`
   - ✅ **Benar**: `GetByIDAndStore(id uint, storeID uint) (*models.Entity, error)`
   - ❌ **Dilarang**: `GetByID(id uint) (*models.Entity, error)` (pada entitas tenant)
2. Pada klausul GORM / raw SQL:
   - ✅ **Benar**: `.Where("id = ? AND store_id = ?", id, storeID)`
   - ❌ **Dilarang**: `.Where("id = ?", id)` (tanpa verifikasi `store_id`)
3. **Pengecualian Resmi**:
   - `internal/repository/store_repository.go` (`Store` adalah root tenant).
   - `internal/repository/user_repository.go` (`User` adalah entitas autentikasi global/multi-toko).

### B. Command Scan Otomatis Multi-Tenancy

Jalankan perintah berikut untuk mendeteksi repository yang mendefinisikan `GetByID` tanpa parameter `storeID`:

#### Menggunakan Ripgrep (`rg`):
```bash
# Cek definisi method GetByID di internal/repository
# Output yang diperbolehkan HANYA storeRepository dan userRepository!
rg -n "func \([^)]+\) GetByID\((?!.*storeID|.*store_id)[^)]*\)" internal/repository/
```

#### Menggunakan PowerShell:
```powershell
Get-ChildItem -Path "internal\repository\*.go" | ForEach-Object {
    $file = $_.FullName
    $base = $_.Name
    if ($base -notin @("store_repository.go", "user_repository.go")) {
        Select-String -Path $file -Pattern "func\s+\([^)]+\)\s+GetByID\s*\((?!.*storeID|.*store_id)[^)]*\)" | ForEach-Object {
            Write-Error "PELANGGARAN MULTI-TENANCY: $($_.Path):$($_.LineNumber) -> $($_.Line.Trim())"
        }
    }
}
```

---

## 2. Anti-Slop Checklist & UI Quality Locks

Standar antarmuka ArthaOS mengacu pada prinsip ketat *anti-AI-slop* dan pengalaman pengguna profesional.

### A. Larangan Em Dash (`—` atau `\u2014`) di Teks UI
* **Alasan**: Tanda baca em dash (`—`) adalah ciri khas teks buatan model AI generik yang membuat *copywriting* terasa kaku, panjang, dan tidak alami dalam antarmuka aplikasi kasir/operasional.
* **Standar**: Gunakan tanda pisah sederhana (`-`), titik dua (`:`), tanda kurung, atau kalimat ringkas langsung pada intinya.
* **Scan Command**:
  ```bash
  # Memindai seluruh teks komponen dan halaman UI di frontend
  rg -n "—|&mdash;|\\u2014" web/src/
  ```

### B. Larangan Dialog Native Browser (`alert()` & `confirm()`)
* **Alasan**: Pemanggilan `window.alert()` atau `window.confirm()` memblokir event loop browser, tidak responsif pada layar sentuh/perangkat POS tablet/mobile, tidak dapat di-style, dan merusak estetika profesional ArthaOS.
* **Standar**:
  - Untuk notifikasi aksi / feedback: Gunakan toast system (misal: `showToast("pesan")` atau sonner/toast UI).
  - Untuk konfirmasi destruktif (hapus data, batalkan transaksi): Gunakan komponen modal dialog (misal: Radix/shadcn `AlertDialog` atau modal konfirmasi custom).
* **Scan Command**:
  ```bash
  # Deteksi pemanggilan alert() dan confirm() native
  rg -n "\b(window\.)?(alert|confirm)\(" web/src/
  ```

### C. Larangan Hardcoded Styling yang Merusak Dark Mode
* **Alasan**: ArthaOS mendukung tema gelap (*Dark Mode*). Penggunaan utility class warna absolut terang tanpa adaptasi tema gelap akan menciptakan kontras tajam yang merusak mata dan teks yang tidak terbaca (*invisible text*).
* **Kelas yang Dilarang Secara Mandiri**:
  - `bg-white` (harus diganti atau dipasangkan dengan `dark:bg-*`)
  - `bg-slate-100` (harus diganti atau dipasangkan dengan `dark:bg-*`)
  - `text-black` (harus diganti atau dipasangkan dengan `dark:text-*`)
* **Standar Pengganti**:
  - Gunakan token semantik CSS variable:
    - Background: `bg-background`, `bg-card`, `bg-muted`, `bg-secondary`
    - Teks: `text-foreground`, `text-card-foreground`, `text-muted-foreground`
    - Border: `border-border`
  - Atau sertakan varian dark mode: `bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100`
* **Scan Command**:
  ```bash
  # Deteksi hardcoded styling terang tanpa varian dark mode
  rg -n "\b(bg-white|bg-slate-100|text-black)\b" web/src/app/
  ```

### D. Verifikasi Pembungkusan `<AppLayout>` pada Semua Halaman Fitur
* **Alasan**: Setiap halaman aplikasi internal ArthaOS memerlukan navigasi sidebar terpadu, header informasi toko, switcher shift kasir, dan tema konsisten yang disediakan oleh shell `<AppLayout>`.
* **Cakupan Wajib**: Semua file `web/src/app/*/page.tsx`.
* **Pengecualian**:
  - `web/src/app/page.tsx` (Root redirect / landing)
  - `web/src/app/login/page.tsx` (Autentikasi)
  - `web/src/app/register/page.tsx` (Registrasi)
* **Scan Command**:
  ```powershell
  # Validasi apakah setiap rute aplikasi membungkus UI dengan <AppLayout>
  Get-ChildItem -Path "web\src\app" -Recurse -Filter "page.tsx" | ForEach-Object {
      $path = $_.FullName
      $rel = $_.FullName.Replace((Get-Location).Path + "\", "")
      if ($rel -notmatch "login|register|web\\src\\app\\page\.tsx") {
          $content = Get-Content $path -Raw
          if ($content -notmatch "<AppLayout") {
              Write-Error "HALAMAN TIDAK DIBUNGKUS <AppLayout>: $rel"
          }
      }
  }
  ```

---

## 3. Build & Test Gates (Integritas Kode)

Sebelum kode di-commit, seluruh gate kompilasi dan pengujian harus lulus tanpa peringatan atau kegagalan.

```
                    ┌────────────────────────────┐
                    │    1. Backend Go Build     │
                    │   'go build ./cmd/api'     │
                    └─────────────┬──────────────┘
                                  │ Lulus
                                  ▼
                    ┌────────────────────────────┐
                    │   2. Go Unit & Svc Test    │
                    │ 'go test -v ./internal/...'│
                    └─────────────┬──────────────┘
                                  │ Lulus
                                  ▼
                    ┌────────────────────────────┐
                    │    3. Frontend Web Build   │
                    │ 'npm --prefix web run build'│
                    └────────────────────────────┘
```

### Gate 1: Backend Go Compilation
Memastikan kode Go bersih dari syntax error, unused imports, tipe data tidak cocok, atau kesalahan interface struct.
```powershell
go build ./cmd/api
```
* **Kriteria Kelulusan**: Exit code `0` dan binary berhasil dikompilasi tanpa error.

### Gate 2: Go Services & Business Logic Tests
Memastikan kalkulasi transaksi, HPP/COGS resep, valuasi stok, kasbon hutang, dan enkripsi data berfungsi dengan benar.
```powershell
go test -v ./internal/services/...
```
* **Kriteria Kelulusan**: Semua test suite berstatus `PASS`. Jika terdapat kegagalan integrasi database (misal enum migration), perbaiki skema atau migrasi test terlebih dahulu.

### Gate 3: Frontend Next.js Production Build
Memastikan TypeScript type checking, validasi dependensi React, bundling Turbopack, dan SSR pre-rendering halaman selesai tanpa kegagalan.
```powershell
npm --prefix web run build
```
* **Kriteria Kelulusan**:
  - `✓ Compiled successfully`
  - `Finished TypeScript` dengan nol error tipe data
  - Seluruh rute statis/dinamis berhasil di-generate

---

## 4. Panduan Baris Perintah Scan Otomatis

Untuk memudahkan pengujian cepat, Anda dapat menjalankan seluruh audit di atas secara otomatis menggunakan skrip verifikasi:

### Menjalankan Skrip All-In-One (PowerShell / Windows)

Simpan atau jalankan skrip `verify.ps1` yang tersedia di direktori skill ini:
```powershell
powershell -ExecutionPolicy Bypass -File .agents/skills/artha-verify/scripts/verify.ps1
```

Atau jalankan one-liner PowerShell berikut langsung di terminal root repository:

```powershell
Write-Host "=== [1/6] Scanning Multi-Tenant Isolation ===" -ForegroundColor Cyan
$mtLeaks = rg -n "func \([^)]+\) GetByID\((?!.*storeID|.*store_id)[^)]*\)" internal/repository/ | Where-Object { $_ -notmatch "store_repository|user_repository" }
if ($mtLeaks) { Write-Host "FAIL: Ditemukan GetByID tanpa store_id:`n$mtLeaks" -ForegroundColor Red } else { Write-Host "PASS: Multi-tenancy aman!" -ForegroundColor Green }

Write-Host "`n=== [2/6] Scanning Anti-Slop (Em Dash) ===" -ForegroundColor Cyan
$emDashes = rg -n "—" web/src/
if ($emDashes) { Write-Host "WARN: Ditemukan em dash di UI:`n$emDashes" -ForegroundColor Yellow } else { Write-Host "PASS: Bersih dari em dash!" -ForegroundColor Green }

Write-Host "`n=== [3/6] Scanning Native Dialogs (alert/confirm) ===" -ForegroundColor Cyan
$alerts = rg -n "\b(window\.)?(alert|confirm)\(" web/src/
if ($alerts) { Write-Host "WARN: Ditemukan native alert/confirm:`n$alerts" -ForegroundColor Yellow } else { Write-Host "PASS: Bersih dari dialog native!" -ForegroundColor Green }

Write-Host "`n=== [4/6] Checking <AppLayout> Wrapping ===" -ForegroundColor Cyan
Get-ChildItem -Path "web\src\app" -Recurse -Filter "page.tsx" | ForEach-Object {
    $rel = $_.FullName.Replace((Get-Location).Path + "\", "")
    if ($rel -notmatch "login|register|web\\src\\app\\page\.tsx") {
        if ((Get-Content $_.FullName -Raw) -notmatch "<AppLayout") {
            Write-Host "FAIL: Halaman belum dibungkus <AppLayout>: $rel" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== [5/6] Running Backend Build & Tests ===" -ForegroundColor Cyan
go build ./cmd/api
if ($LASTEXITCODE -eq 0) { Write-Host "PASS: go build ./cmd/api" -ForegroundColor Green } else { Write-Host "FAIL: go build ./cmd/api" -ForegroundColor Red }

Write-Host "`n=== [6/6] Running Frontend Next.js Build ===" -ForegroundColor Cyan
npm --prefix web run build
if ($LASTEXITCODE -eq 0) { Write-Host "PASS: npm --prefix web run build" -ForegroundColor Green } else { Write-Host "FAIL: npm build" -ForegroundColor Red }
```

---

## 5. Ringkasan Checklist Sebelum Commit

Gunakan tabel checklist ini sebagai konfirmasi final sebelum submit pekerjaan:

| No | Komponen Audit | Target File | Status Harapan |
|:---|:---|:---|:---|
| 1 | **Multi-Tenancy** | `internal/repository/*.go` | Tidak ada `GetByID` tanpa `store_id` (kecuali user & store) |
| 2 | **Anti-Slop Copy** | `web/src/**/*.{tsx,ts}` | Tidak ada tanda em dash (`—`) |
| 3 | **No Native Alerts** | `web/src/**/*.{tsx,ts}` | Tidak ada `alert()` atau `confirm()` native |
| 4 | **Dark Mode Contrast** | `web/src/**/*.{tsx,ts}` | Tidak ada `bg-white` / `text-black` tanpa varian dark |
| 5 | **AppLayout Wrapper** | `web/src/app/*/page.tsx` | Semua halaman fitur internal dibungkus `<AppLayout>` |
| 6 | **Backend Compile** | `cmd/api/main.go` | `go build ./cmd/api` sukses |
| 7 | **Unit Test Services** | `internal/services/*_test.go` | `go test -v ./internal/services/...` passing |
| 8 | **Frontend Build** | `web/src/**` | `npm --prefix web run build` sukses |
