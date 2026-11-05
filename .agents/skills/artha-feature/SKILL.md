---
name: artha-feature
description: SOP pembuatan modul fitur baru end-to-end di ArthaOS (Model -> Migration -> Repository & Service -> Handler & Routes -> Next.js Frontend dengan AppLayout -> Verification)
---

# SOP Modul Fitur Baru ArthaOS (End-to-End)

Dokumen ini adalah Standard Operating Procedure (SOP) resmi dan pedoman arsitektur untuk penambahan atau modifikasi modul fitur baru di **ArthaOS**. Ikuti seluruh tahapan secara berurutan mulai dari model data hingga antarmuka frontend dan tahapan verifikasi kualitas.

---

## 1. Arsitektur & Prinsip Utama

ArthaOS dibangun dengan arsitektur bersih (*layered / clean architecture*) multi-tenant berbasis toko (`store_id`):

```
[ Next.js 16 Frontend (web/src/app) ]
                 │  (HTTP / JSON API)
                 ▼
[ Fiber v3 Routes & Middleware (internal/routes) ]
                 │
                 ▼
[ Handlers (internal/handlers) ]
                 │
                 ▼
[ Services (internal/services) ] ── (Transactional Boundary)
                 │
                 ▼
[ Repositories (internal/repository) ] ── (Filter store_id = ?)
                 │
                 ▼
[ GORM Models & PostgreSQL (internal/models, internal/migrations) ]
```

### Prinsip Wajib:
1. **Multi-Tenancy Mutlak (Anti-IDOR):** Semua operasi database pada level repository WAJIB menerima parameter `storeID uint` dan memfilter kondisi `store_id = ?`. Tidak boleh ada pembacaan atau mutasi data tanpa isolasi toko.
2. **Transactional Boundary:** Operasi bisnis yang menyentuh stok produk, saldo kas, piutang/kasbon, atau mutasi lintas tabel WAJIB dieksekusi di dalam blok transaksi `db.Transaction(func(tx *gorm.DB) error { ... })`.
3. **Role-Based Access Control (RBAC):** Rute mutasi atau data sensitif toko wajib dilindungi middleware `middleware.RequireRole("owner", "manager")`.
4. **Desain Bersih & Anti-Slop:** Antarmuka web wajib mengikuti `DESIGN.md`, dilarang memakai tanda *em dash* (`—`), dan dilarang menggunakan `alert()` / `confirm()` native browser.
5. **Verifikasi Dua Arah:** Setiap modul baru wajib lulus `go test ./...` dan `npm --prefix web run build`.

---

## 2. Tahap 1: Model Data (`internal/models/`)

Buat definisi model entitas di dalam `internal/models/<nama_fitur>.go`.

### Pedoman:
- Gunakan tag GORM dan JSON yang jelas.
- Kolom `StoreID` wajib ada dengan tag `gorm:"not null;index" json:"store_id"`.
- Sertakan relasi, soft delete (jika relevan), serta indeks komposit untuk query performan.

### Contoh Implementasi:
```go
package models

import (
	"time"
)

type ExampleItem struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	StoreID     uint      `gorm:"not null;index:idx_example_store" json:"store_id"`
	Name        string    `gorm:"type:varchar(200);not null" json:"name"`
	Amount      int64     `gorm:"not null;default:0" json:"amount"`
	Description *string   `gorm:"type:text" json:"description,omitempty"`
	IsActive    bool      `gorm:"not null;default:true" json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// Relasi
	Store       *Store    `gorm:"foreignKey:StoreID;constraint:OnDelete:CASCADE" json:"store,omitempty"`
}
```

---

## 3. Tahap 2: Migrasi Database & DDL

ArthaOS menggunakan kombinasi DDL manual (`schema.sql`) sebagai *single source of truth* skema PostgreSQL dan GORM `AutoMigrate` pada saat bootstrap runtime.

### 2.1 Tambahkan DDL ke `internal/migrations/schema.sql`
Tuliskan perintah `CREATE TABLE`, foreign key constraint, dan indeks yang relevan:

```sql
-- ==========================================
-- Example Module Table
-- ==========================================
CREATE TABLE IF NOT EXISTS example_items (
    id SERIAL PRIMARY KEY,
    store_id INTEGER NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    amount BIGINT NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_example_items_store_id ON example_items(store_id);
```

### 2.2 Daftarkan ke `AutoMigrate` di `internal/database/database.go`
Tambahkan pointer struct model baru ke daftar `DB.AutoMigrate(...)`:

```go
err = DB.AutoMigrate(
    &models.User{},
    &models.Store{},
    // ... model lainnya
    &models.ExampleItem{}, // Tambahkan model baru di sini
)
if err != nil {
    log.Fatalf("AutoMigrate failed: %v", err)
}
```

---

## 4. Tahap 3: Repository Layer (`internal/repository/`)

Buat antarmuka dan implementasi repository di `internal/repository/<nama_fitur>_repository.go`.

### Pedoman Multi-Tenancy:
- **IDOR Prevention:** Setiap metode (kecuali lookup global sistem) WAJIB menerima parameter `storeID uint`.
- Sertakan `store_id = ?` di setiap query `Where`, `Find`, `First`, `Update`, maupun `Delete`.

### Contoh Implementasi:
```go
package repository

import (
	"app/internal/models"

	"gorm.io/gorm"
)

type ExampleRepository interface {
	Create(item *models.ExampleItem) error
	CreateTx(tx *gorm.DB, item *models.ExampleItem) error
	GetByIDAndStore(id uint, storeID uint) (*models.ExampleItem, error)
	GetByIDAndStoreWithLock(tx *gorm.DB, id uint, storeID uint) (*models.ExampleItem, error)
	GetAllByStore(storeID uint) ([]models.ExampleItem, error)
	Update(storeID uint, item *models.ExampleItem) error
	Delete(id uint, storeID uint) error
}

type exampleRepository struct {
	db *gorm.DB
}

func NewExampleRepository(db *gorm.DB) ExampleRepository {
	return &exampleRepository{db: db}
}

func (r *exampleRepository) Create(item *models.ExampleItem) error {
	return r.db.Create(item).Error
}

func (r *exampleRepository) CreateTx(tx *gorm.DB, item *models.ExampleItem) error {
	return tx.Create(item).Error
}

func (r *exampleRepository) GetByIDAndStore(id uint, storeID uint) (*models.ExampleItem, error) {
	var item models.ExampleItem
	err := r.db.Where("id = ? AND store_id = ? AND is_active = ?", id, storeID, true).First(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *exampleRepository) GetByIDAndStoreWithLock(tx *gorm.DB, id uint, storeID uint) (*models.ExampleItem, error) {
	var item models.ExampleItem
	err := tx.Raw(`
		SELECT * FROM example_items 
		WHERE id = $1 AND store_id = $2 AND is_active = true 
		FOR UPDATE
	`, id, storeID).Scan(&item).Error
	if err != nil {
		return nil, err
	}
	return &item, nil
}

func (r *exampleRepository) GetAllByStore(storeID uint) ([]models.ExampleItem, error) {
	var items []models.ExampleItem
	err := r.db.Where("store_id = ? AND is_active = ?", storeID, true).
		Order("created_at DESC").
		Find(&items).Error
	return items, err
}

func (r *exampleRepository) Update(storeID uint, item *models.ExampleItem) error {
	return r.db.Where("id = ? AND store_id = ?", item.ID, storeID).Updates(item).Error
}

func (r *exampleRepository) Delete(id uint, storeID uint) error {
	// Soft delete menggunakan flag is_active
	return r.db.Model(&models.ExampleItem{}).
		Where("id = ? AND store_id = ?", id, storeID).
		Update("is_active", false).Error
}
```

---

## 5. Tahap 4: Service Layer (`internal/services/`)

Buat antarmuka dan logika bisnis di `internal/services/<nama_fitur>_service.go`.

### Pedoman Transactional Boundary:
Jika bisnis melibatkan perubahan stok, kas/saldo toko, kasbon pelanggan, atau beberapa pembaruan tabel sekaligus, wajib gunakan `s.db.Transaction(func(tx *gorm.DB) error { ... })`.

### Contoh Implementasi:
```go
package services

import (
	"errors"

	"app/internal/models"
	"app/internal/repository"

	"gorm.io/gorm"
)

type ExampleService interface {
	GetAll(storeID uint) ([]models.ExampleItem, error)
	GetByID(storeID uint, id uint) (*models.ExampleItem, error)
	CreateWithAudit(storeID uint, name string, amount int64, description *string) (*models.ExampleItem, error)
}

type exampleService struct {
	db          *gorm.DB
	exampleRepo repository.ExampleRepository
	auditRepo   repository.AuditRepository
}

func NewExampleService(
	db *gorm.DB,
	exampleRepo repository.ExampleRepository,
	auditRepo repository.AuditRepository,
) ExampleService {
	return &exampleService{
		db:          db,
		exampleRepo: exampleRepo,
		auditRepo:   auditRepo,
	}
}

func (s *exampleService) GetAll(storeID uint) ([]models.ExampleItem, error) {
	return s.exampleRepo.GetAllByStore(storeID)
}

func (s *exampleService) GetByID(storeID uint, id uint) (*models.ExampleItem, error) {
	return s.exampleRepo.GetByIDAndStore(id, storeID)
}

func (s *exampleService) CreateWithAudit(storeID uint, name string, amount int64, description *string) (*models.ExampleItem, error) {
	if name == "" {
		return nil, errors.New("nama tidak boleh kosong")
	}
	if amount < 0 {
		return nil, errors.New("nominal tidak boleh negatif")
	}

	var item models.ExampleItem

	// Transactional Boundary
	err := s.db.Transaction(func(tx *gorm.DB) error {
		item = models.ExampleItem{
			StoreID:     storeID,
			Name:        name,
			Amount:      amount,
			Description: description,
			IsActive:    true,
		}

		if err := s.exampleRepo.CreateTx(tx, &item); err != nil {
			return err
		}

		// Jika ada mutasi audit atau tabel lain
		if s.auditRepo != nil {
			if err := s.auditRepo.LogActionTx(tx, storeID, "CREATE_EXAMPLE", "example_items", item.ID, nil, item); err != nil {
				return err
			}
		}

		return nil
	})

	if err != nil {
		return nil, err
	}

	return &item, nil
}
```

---

## 6. Tahap 5: Handler & Request Validation (`internal/handlers/`)

Buat HTTP handler berbasis Go Fiber v3 di `internal/handlers/<nama_fitur>_handler.go`.

### Pedoman:
- Ambil tenant context via `storeID, ok := c.Locals("store_id").(uint)`.
- Lakukan parsing body via `c.Bind().Body(&req)`.
- Validasi payload via `appvalidator.Validate(req)`.
- Kembalikan status HTTP semantik (200, 201, 400, 422, 404, 500) dengan kode error JSON seragam.

### Contoh Implementasi:
```go
package handlers

import (
	"errors"

	"app/internal/services"
	appvalidator "app/pkg/validator"

	"github.com/gofiber/fiber/v3"
	"gorm.io/gorm"
)

type ExampleHandler struct {
	service services.ExampleService
}

func NewExampleHandler(service services.ExampleService) *ExampleHandler {
	return &ExampleHandler{service: service}
}

type CreateExampleRequest struct {
	Name        string  `json:"name" validate:"required,min=2,max=200"`
	Amount      int64   `json:"amount" validate:"gte=0"`
	Description *string `json:"description" validate:"omitempty,max=1000"`
}

func (h *ExampleHandler) GetAll(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Autentikasi toko tidak valid",
			"code":  "UNAUTHORIZED",
		})
	}

	items, err := h.service.GetAll(storeID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Gagal memuat data",
			"code":  "INTERNAL_ERROR",
		})
	}

	return c.JSON(fiber.Map{"data": items})
}

func (h *ExampleHandler) Create(c fiber.Ctx) error {
	storeID, ok := c.Locals("store_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Autentikasi toko tidak valid",
			"code":  "UNAUTHORIZED",
		})
	}

	var req CreateExampleRequest
	if err := c.Bind().Body(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Format data request tidak valid",
			"code":  "INVALID_BODY",
		})
	}

	if errs := appvalidator.Validate(req); errs != nil {
		return c.Status(fiber.StatusUnprocessableEntity).JSON(fiber.Map{
			"error":  "Validasi input gagal",
			"code":   "VALIDATION_ERROR",
			"fields": errs,
		})
	}

	item, err := h.service.CreateWithAudit(storeID, req.Name, req.Amount, req.Description)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
			"code":  "OPERATION_FAILED",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"message": "Data berhasil dibuat",
		"data":    item,
	})
}
```

---

## 7. Tahap 6: Registrasi Rute & RBAC (`internal/routes/routes.go`)

Daftarkan repository, service, handler, dan endpoint rute pada `internal/routes/routes.go`.

### Pedoman RBAC:
- Rute tenant berada di bawah `tenantGroup := storesGroup.Group("/:storeId", storeMiddleware)`.
- Lindungi rute mutasi (POST, PUT, DELETE) atau fitur administratif dengan:
  `middleware.RequireRole("owner", "manager")`.

### Contoh Penambahan di `routes.go`:
```go
// 1. Dependency Inisialisasi
exampleRepo := repository.NewExampleRepository(db)
exampleService := services.NewExampleService(db, exampleRepo, auditRepo)
exampleHandler := handlers.NewExampleHandler(exampleService)

// 2. Registrasi Rute di tenantGroup
tenantGroup.Get("/examples", exampleHandler.GetAll)
tenantGroup.Post("/examples", middleware.RequireRole("owner", "manager"), exampleHandler.Create)
```

---

## 8. Tahap 7: Frontend Next.js 16 App Router (`web/src/app/<nama>/page.tsx`)

### 8.1 Sinkronisasi Klien API & Types
1. Tambahkan type di `web/src/lib/types.ts`:
   ```ts
   export interface ExampleItem {
     id: number;
     store_id: number;
     name: string;
     amount: number;
     description?: string;
     is_active: boolean;
     created_at: string;
     updated_at: string;
   }
   ```
2. Tambahkan endpoint pada objek `api` di `web/src/lib/api.ts`:
   ```ts
   export const api = {
     // ...
     examples: {
       list: (storeId: number) => request<ExampleItem[]>(`/stores/${storeId}/examples`),
       create: (storeId: number, data: { name: string; amount: number; description?: string }) =>
         request<ExampleItem>(`/stores/${storeId}/examples`, {
           method: "POST",
           body: JSON.stringify(data),
         }),
     },
   };
   ```

### 8.2 Pedoman Desain ArthaOS & Aturan Anti-Slop (`DESIGN.md`)
- **Pembungkus Utama:** Halaman wajib dibungkus dengan `<AppLayout>`.
- **Dilarang Em Dash (`—`):** Gunakan strip biasa (`-`), tanda kurung, atau titik pemisah kata. Em dash adalah indikator AI slop yang dilarang.
- **Dilarang `alert()` / `confirm()` Native:** Gunakan komponen dialog/modal interaktif atau notifikasi berbasis UI.
- **Gunakan Token Tailwind Semantik:**
  - Latar: `bg-background`, `bg-card`, `border-border`.
  - Teks: `text-foreground`, `text-muted-foreground`, `text-primary`.
  - Tombol & Interaksi: `rounded-lg`, tinggi minimal 44px (`h-11` atau `min-h-[44px]`) untuk mobile accessibility.
- **Integritas Data:** Tampilkan data nyata dari API. Jangan menggunakan mock chart atau delay tiruan (`setTimeout`).

### 8.3 Contoh Struktur Halaman Frontend:
```tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, RefreshCw, Layers } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/context/AuthContext";
import { useStore } from "@/context/StoreContext";
import { api } from "@/lib/api";
import { formatIDR } from "@/lib/utils";
import { ExampleItem } from "@/lib/types";

export default function ExamplesPage() {
  const router = useRouter();
  const { token, isLoading: authLoading } = useAuth();
  const { activeStore } = useStore();

  const [items, setItems] = useState<ExampleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
    }
  }, [token, authLoading, router]);

  const loadData = useCallback(async () => {
    if (!activeStore) return;
    setIsLoading(true);
    try {
      const res = await api.examples.list(activeStore.id);
      setItems(Array.isArray(res) ? res : []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeStore]);

  useEffect(() => {
    if (activeStore) {
      loadData();
    }
  }, [activeStore, loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    setErrorMsg("");
    setIsSubmitting(true);

    try {
      await api.examples.create(activeStore.id, { name, amount });
      setIsModalOpen(false);
      setName("");
      setAmount(0);
      await loadData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan data";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Manajemen Fitur Baru
            </h1>
            <p className="text-sm text-muted-foreground">
              Kelola data modul secara terpusat untuk toko Anda.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-10 px-4"
              onClick={loadData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
              Segarkan
            </Button>
            <Button
              variant="default"
              className="h-10 px-4"
              onClick={() => {
                setErrorMsg("");
                setIsModalOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Tambah Data
            </Button>
          </div>
        </div>

        {/* Content Table / Empty State */}
        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 flex justify-center">
              <Spinner size="md" />
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={<Layers className="w-8 h-8 text-muted-foreground" />}
              title="Belum Ada Data"
              description="Mulai tambahkan entri data baru untuk mengelola modul ini."
              actionLabel="Tambah Data Pertama"
              onAction={() => setIsModalOpen(true)}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-muted text-muted-foreground border-b border-border">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Nama</th>
                    <th className="px-6 py-4 font-semibold text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-foreground">{item.name}</td>
                      <td className="px-6 py-4 text-right text-foreground font-mono">
                        {formatIDR(item.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Form */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Tambah Data Baru"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
                {errorMsg}
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Nama Item
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Operasional Khusus"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider block mb-1">
                Nominal
              </label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                min={0}
                required
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
```

### 8.4 Navigasi Menu
Jika fitur baru membutuhkan menu di sidebar, tambahkan item navigasi ke array `navigation` di `web/src/components/layout/AppLayout.tsx`:
```ts
{
  name: "Nama Fitur",
  href: "/nama-fitur",
  icon: Layers,
  group: "Operasional", // Atau "Utama", "Analitik", "Pengaturan"
}
```

---

## 9. Tahap 8: Verifikasi & Quality Gate

Sebelum menyatakan pekerjaan selesai atau mengajukan pull request, jalankan dua pengujian verifikasi wajib dari root direktori proyek:

### 1. Verifikasi Backend Go
```powershell
go test ./...
```
Pastikan seluruh paket backend terkompilasi tanpa error dan semua unit test lulus (status `ok`).

### 2. Verifikasi Frontend Next.js
```powershell
npm --prefix web run build
```
Pastikan build Next.js 16 berhasil tanpa error TypeScript, kesalahan linting, atau kegagalan kompilasi halaman rute statis/dinamis.

---

## 10. Ringkasan Checklist Pengembang

- [ ] Model diletakkan di `internal/models/` dengan tag json dan gorm lengkap.
- [ ] DDL tabel ditambahkan ke `internal/migrations/schema.sql`.
- [ ] Model didaftarkan di `database.go` `AutoMigrate`.
- [ ] Semua query repository memfilter `store_id = ?`.
- [ ] Mutasi stok, saldo, kasbon, atau transaksi multi-tabel menggunakan `db.Transaction`.
- [ ] Rute di `internal/routes/routes.go` dilindungi `middleware.RequireRole` yang tepat.
- [ ] Halaman frontend dibungkus `<AppLayout>`.
- [ ] Desain mematuhi `DESIGN.md`: token warna semantik, tombol min-h 44px, bebas em dash (`—`), bebas `alert()`/`confirm()`.
- [ ] Perintah `go test ./...` lulus.
- [ ] Perintah `npm --prefix web run build` sukses.
