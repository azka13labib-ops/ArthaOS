---
name: artha-db-sync
description: Prosedur dan panduan sinkronisasi skema database ArthaOS antara struct GORM Go, internal/migrations/schema.sql, dan docker-compose.yml
---

# Panduan Sinkronisasi Skema Database ArthaOS (`artha-db-sync`)

Dokumen ini adalah panduan standar dan runbook operasional untuk memastikan konsistensi skema database di seluruh ekosistem ArthaOS. Sinkronisasi harus selalu dijaga antara tiga komponen utama:
1. **Struct GORM Go** di `internal/models/`
2. **AutoMigrate & Patches** di `internal/database/database.go`
3. **DDL PostgreSQL (Source of Truth init container)** di `internal/migrations/schema.sql` yang dimuat oleh `docker-compose.yml`

---

## 1. Arsitektur Database ArthaOS

ArthaOS menggunakan pendekatan hibrida untuk manajemen database:

```
                  ┌──────────────────────────────────────────┐
                  │          docker-compose.yml              │
                  │ (Mounts schema.sql to init.sql:ro)       │
                  └────────────────────┬─────────────────────┘
                                       │
                      Eksekusi 1x saat volume kosong
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │    internal/migrations/schema.sql        │
                  │   - DDL Mentah (CREATE TABLE/TYPE/INDEX) │
                  │   - CHECK constraints & Foreign Keys     │
                  │   - "Source of Truth" Fresh Deployment   │
                  └──────────────────────────────────────────┘
                                       ▲
                                       │ Sinkronisasi Manual / Dev Workflow
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │           internal/models/*.go           │
                  │   - Definisi Struct Go & GORM tags       │
                  └────────────────────┬─────────────────────┘
                                       │
                                AutoMigrate
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │      internal/database/database.go       │
                  │   1. createCustomTypes()                 │
                  │   2. runSchemaMigrations() (Patches)     │
                  │   3. DB.AutoMigrate(&models.X{}, ...)    │
                  └──────────────────────────────────────────┘
```

### A. GORM AutoMigrate (`internal/database/database.go`)
* Dijalankan setiap kali aplikasi backend Go dijalankan (`ConnectDB()`).
* **Urutan Eksekusi**:
  1. `createCustomTypes(db)`: Membuat enum Postgres secara idempotent (`DO $$ BEGIN IF NOT EXISTS ...`).
  2. `runSchemaMigrations(db)`: Menjalankan patch SQL incremental khusus untuk database yang sudah berjalan (misal: rename kolom, casting enum dengan `USING`, memastikan kolom baru memiliki nilai default).
  3. `db.AutoMigrate(...)`: Membuat tabel baru dan menambahkan kolom baru yang belum ada di database.
* **Keterbatasan GORM AutoMigrate**:
  * GORM **tidak akan** menghapus kolom yang tidak terpakai (drop unused columns).
  * GORM **tidak akan** otomatis mengubah tipe data kolom yang membutuhkan type casting kompleks.
  * GORM **tidak secara otomatis** membuat Postgres `CHECK` constraints (seperti `CHECK (buy_price >= 0)`).

### B. DDL PostgreSQL Mentah (`internal/migrations/schema.sql`)
* Dimuat oleh service `postgres` di `docker-compose.yml`:
  ```yaml
  volumes:
    - postgres_data:/var/lib/postgresql/data
    - ./internal/migrations/schema.sql:/docker-entrypoint-initdb.d/init.sql:ro
  ```
* **PENTING**: PostgreSQL official image hanya menjalankan file di `/docker-entrypoint-initdb.d/` **satu kali saja**, yaitu ketika container pertama kali dibuat dan volume database (`postgres_data`) masih kosong.
* File ini adalah **Source of Truth** untuk:
  * Fresh setup / developer onboarding.
  * Pipeline CI/CD dan staging environment baru.
  * Referensi skema DDL lengkap dengan `CHECK` constraints, default values, dan foreign key cascade.

---

## 2. Prosedur Standar Perubahan Skema (Step-by-Step)

Setiap penambahan tabel baru, penambahan kolom, atau perubahan tipe data wajib mengikuti 4 langkah berurutan di bawah ini:

### Langkah 1: Modifikasi atau Buat Struct di `internal/models/`

Buat atau perbarui file struct di `internal/models/`. Ikuti konvensi standar ArthaOS:

```go
package models

import "time"

type Supplier struct {
    ID          uint      `gorm:"primaryKey" json:"id"`
    StoreID     uint      `gorm:"not null;index" json:"store_id"`
    Store       Store     `gorm:"foreignKey:StoreID;constraint:OnDelete:CASCADE" json:"-"`
    Name        string    `gorm:"size:255;not null" json:"name"`
    PhoneNumber string    `gorm:"size:50" json:"phone_number"`
    Address     string    `gorm:"type:text" json:"address"`
    CreatedAt   time.Time `gorm:"autoCreateTime" json:"created_at"`
    UpdatedAt   time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}
```

**Aturan Penulisan Model**:
* Selalu sertakan tag JSON (`json:"snake_case"`).
* Gunakan relasi multi-tenant `StoreID uint` dengan constraint `OnDelete:CASCADE` jika data terisolasi per toko.
* Hindari tipe data floating point untuk nominal keuangan; gunakan `int64`.

---

### Langkah 2: Daftarkan ke `database.go` dan File Test (`getTestDB()`)

1. **Daftarkan Model ke `AutoMigrate`**:
   Buka `internal/database/database.go` dan tambahkan struct baru ke dalam pemanggilan `DB.AutoMigrate`:
   ```go
   err = DB.AutoMigrate(
       &models.User{},
       // ... model lainnya
       &models.Supplier{}, // Tambahkan di sini
   )
   ```

2. **Daftarkan Enum Baru (Jika Ada)**:
   Jika model menggunakan tipe enum PostgreSQL baru, daftarkan di fungsi `createCustomTypes()` pada `internal/database/database.go`:
   ```go
   enums := []struct {
       name   string
       values string
   }{
       // ...
       {"supplier_tier", "'standard', 'vip', 'wholesale'"},
   }
   ```

3. **Tambahkan Patch SQL di `runSchemaMigrations()` (Jika Perubahan Kolom Eksisting)**:
   Jika melakukan rename kolom atau perubahan tipe kolom pada tabel yang sudah beroperasi di production/staging:
   ```go
   {
       name: "rename suppliers.phone to phone_number",
       sql: `
           DO $$
           BEGIN
               IF EXISTS (
                   SELECT 1 FROM information_schema.columns
                   WHERE table_name='suppliers' AND column_name='phone'
               ) THEN
                   ALTER TABLE suppliers RENAME COLUMN phone TO phone_number;
               END IF;
           END $$;
       `,
   },
   ```

4. **Daftarkan ke Test Helper (`getTestDB`)**:
   Buka `internal/services/report_service_test.go` (dan file test terkait yang menggunakan koneksi database):
   ```go
   _ = db.AutoMigrate(
       &models.Store{},
       &models.Product{},
       // ...
       &models.Supplier{}, // Pastikan test DB juga memigrasikan struct baru
   )
   ```

---

### Langkah 3: Tuliskan DDL Ekuivalen di `internal/migrations/schema.sql`

Perbarui `internal/migrations/schema.sql` agar sinkron dengan model Go:

1. **Untuk Tabel Baru**:
   Tambahkan DDL `CREATE TABLE` pada seksi kategori yang sesuai (misalnya seksi `7. SUPPLIER PAYMENTS & SOCIAL MARKETING`):
   ```sql
   CREATE TABLE suppliers (
       id SERIAL PRIMARY KEY,
       store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
       name VARCHAR(255) NOT NULL,
       phone_number VARCHAR(50),
       address TEXT,
       created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
       updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
   );
   ```

2. **Perhatikan Urutan Dependensi (Foreign Keys)**:
   * Tabel yang direferensikan (parent table, misal `suppliers` atau `purchases`) **harus dibuat terlebih dahulu** sebelum tabel yang merujuknya (child table, misal `purchase_items` atau `supplier_payments`).
   * Jika urutan terbalik, inisialisasi Docker `init.sql` akan gagal dengan error `relation "..." does not exist`.

3. **Untuk Penambahan Kolom pada Tabel Eksisting**:
   Tambahkan definisi kolom langsung ke statement `CREATE TABLE` di `schema.sql` agar fresh setup mendapatkan skema final.

---

### Langkah 4: Standar Konsistensi Tipe Data & Konvensi ArthaOS

Pastikan tipe data dan constraint memenuhi standar arsitektur ArthaOS berikut:

| Kebutuhan Data | PostgreSQL DDL (`schema.sql`) | Struct Go GORM (`internal/models/`) | Constraint Wajib |
| :--- | :--- | :--- | :--- |
| **Harga / Nominal Uang** | `BIGINT NOT NULL` | `int64` | `CHECK (column_name >= 0)` atau `CHECK (amount > 0)` |
| **Kuantitas / Stok** | `INTEGER NOT NULL` | `int` atau `int64` | `CHECK (current_stock >= 0)` atau `CHECK (quantity > 0)` |
| **Waktu / Tanggal** | `TIMESTAMP WITH TIME ZONE` | `time.Time` | `DEFAULT CURRENT_TIMESTAMP` |
| **Multi-Tenancy** | `store_id INTEGER NOT NULL` | `StoreID uint` | `REFERENCES stores(id) ON DELETE CASCADE` |
| **Status / Tipe Tetap** | `VARCHAR(50)` atau `ENUM` | `string` | Tipe data string dengan validasi di service |
| **Teks Panjang / Catatan** | `TEXT` | `string` | Kolom nullable jika catatan bersifat opsional |

> [!WARNING]
> **Larangan Penggunaan Floating Point**: Dilarang keras menggunakan `FLOAT` atau `DOUBLE` untuk field mata uang/rupiah di ArthaOS. Selalu gunakan `BIGINT` untuk mencegah kesalahan pembulatan desimal.

---

## 3. Troubleshooting & Verifikasi

### Perintah Cepat: Deteksi Model Go vs `schema.sql`

Jalankan perintah PowerShell berikut di root proyek untuk memverifikasi apakah ada model Go yang belum terdaftar di `schema.sql`:

#### PowerShell Script (Windows):
```powershell
# 1. Ambil semua model dari internal/database/database.go
$migratedModels = Get-Content "internal/database/database.go" | 
    Select-String -Pattern "&models\.(\w+)\{\}" | 
    ForEach-Object { $_.Matches.Groups[1].Value } | 
    Sort-Object -Unique

# 2. Ambil semua tabel dari internal/migrations/schema.sql
$schemaTables = Get-Content "internal/migrations/schema.sql" | 
    Select-String -Pattern "CREATE\s+TABLE\s+(\w+)" | 
    ForEach-Object { $_.Matches.Groups[1].Value.ToLower() } | 
    Sort-Object -Unique

Write-Host "=== DAFTAR MODEL DI database.go ($($migratedModels.Count)) ==="
Write-Host ($migratedModels -join ", ")

Write-Host "`n=== DAFTAR TABEL DI schema.sql ($($schemaTables.Count)) ==="
Write-Host ($schemaTables -join ", ")
```

#### Bash Script (Linux / macOS / CI):
```bash
echo "=== Model di database.go ==="
grep -oE '&models\.[A-Za-z0-9]+' internal/database/database.go | sed 's/&models\.//' | sort -u

echo "=== Tabel di schema.sql ==="
grep -iE 'CREATE TABLE [a-z0-9_]+' internal/migrations/schema.sql | awk '{print $3}' | sort -u
```

---

### Prosedur Uji Fresh Container (Docker Compose)

Jika Anda memodifikasi `internal/migrations/schema.sql`, uji validitas DDL dengan menjalankan reset volume database:

```powershell
# Hentikan container dan hapus volume database lama
docker compose down -v

# Jalankan ulang postgres container
docker compose up -d postgres

# Periksa log postgres untuk memastikan tidak ada syntax error pada init.sql
docker compose logs postgres
```

Jika inisialisasi berhasil, log akan menampilkan:
```
PostgreSQL Database directory appears to contain a database; Skipping initialization
```
atau saat pertama kali berjalan:
```
/usr/local/bin/docker-entrypoint.sh: running /docker-entrypoint-initdb.d/init.sql
```
Pastikan tidak ada pesan `ERROR: relation "..." does not exist` atau `syntax error`.

---

### Prosedur Uji Integrasi Test Go

Setelah sinkronisasi selesai, pastikan unit test dan database test berjalan tanpa error:

```powershell
# Jalankan unit test internal services
go test ./internal/services/... -v

# Jalankan seluruh test suite
go test ./...
```

---

## 4. Checklist Ringkas untuk Developer

Sebelum membuat commit perubahan skema database, pastikan semua poin berikut tercentang:
- [ ] Struct model di `internal/models/` sudah memiliki tag GORM dan tag JSON yang rapi.
- [ ] Nilai uang menggunakan `BIGINT` / `int64`, dan kuantitas memiliki `CHECK` constraint yang tepat.
- [ ] Struct baru sudah didaftarkan ke `DB.AutoMigrate` di `internal/database/database.go`.
- [ ] Custom enum baru (jika ada) sudah didaftarkan di `createCustomTypes()` dalam `database.go`.
- [ ] Script DDL ekuivalen sudah ditambahkan ke `internal/migrations/schema.sql` dengan urutan dependensi yang valid.
- [ ] Struct baru sudah dimasukkan ke `getTestDB()` di `internal/services/report_service_test.go`.
- [ ] Docker compose down `-v` dan up sukses tanpa error sintaks SQL.
- [ ] Seluruh unit test Go lolos (`go test ./...`).
