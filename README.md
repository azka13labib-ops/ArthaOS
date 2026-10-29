# ArthaOS - Sistem Kasir POS & Manajemen Bisnis Ritel Terintegrasi

ArthaOS adalah platform enterprise Point-of-Sale (POS), manajemen keuangan ritel, pencatatan kasbon pelanggan, multi-outlet, otomasi background worker, backup terenkripsi, serta kecerdasan buatan (*AI Copilot & WhatsApp Hub*) yang dirancang khusus untuk operasional UMKM dan bisnis ritel modern di Indonesia.

---

## Fitur Utama

### 1. Point of Sale (POS) Kasir Cepat & Multi-Metode Pembayaran
- Pencatatan transaksi kilat dengan katalog visual produk, kategori, resep, dan barcode scanner.
- Mendukung pembayaran Tunai, QRIS dinamis, Transfer Bank, dan Kasbon (Hutang Pelanggan).
- Perhitungan kembalian otomatis dan pencetakan struk digital / fisik.
- Sinkronisasi keranjang draft otomatis dari hasil ekstraksi pesanan chat WhatsApp.

### 2. Void & Retur Transaksi dengan Otorisasi Ketat
- Pembatalan transaksi (*sale void*) hanya dapat diotorisasi oleh role `owner` atau `manager`.
- **Atomic Stock Reversal**: Mengembalikan stok produk biasa atau bahan baku resep (`raw_materials`) ke posisi semula dalam transaksi database atomik.
- **Debt & Kasbon Reversal**: Otomatis menyesuaikan atau membatalkan catatan kasbon terkait jika transaksi dibayar via hutang.
- **Audit Trail & Alert**: Mencatat alasan pembatalan dan identitas pengotorisasi ke `audit_logs`, serta mengirimkan peringatan instan via Web Push.
- Proteksi anti-*double void* dan filter otomatis agar transaksi void tidak menggelembungkan omzet dan laba di laporan keuangan.

### 3. Backup Terenkripsi Lokal Harian (AES-256-GCM)
- Layanan backup otomatis berbasis `pg_dump` dengan enkripsi simetris **AES-256-GCM**.
- Key derivation aman berbasis SHA-256 dari `BACKUP_ENCRYPTION_KEY`.
- **Authenticated Decryption**: Verifikasi keaslian ciphertext sebelum restore untuk mencegah eksekusi file rusak atau hasil manipulasi pihak ketiga.
- Proteksi anti-*path traversal* pada berkas backup.
- Scheduler in-process yang mengeksekusi backup otomatis setiap 24 jam ke folder penyimpanan lokal yang aman (`BACKUP_DIR`).
- Endpoint khusus owner untuk membuat backup on-demand, melihat daftar file `.dump.enc`, dan restore database.

### 4. Notifikasi Web Push (VAPID RFC 8030 / 8292)
- Pengiriman notifikasi browser native tahap pertama menggunakan standar VAPID ECE tanpa dependensi pihak ketiga berbayar.
- Service Worker browser (`sw.js`) untuk menampilkan pop-up notifikasi sistem dan navigasi cepat saat notifikasi diklik.
- Otomatis melakukan *pruning* (penghapusan) subscription yang telah kedaluwarsa atau dicabut (`410 Gone` / `404 Not Found`).
- Dispatch notifikasi berjalan asinkron melalui Go Worker Pool sehingga tidak memperlambat latensi respons HTTP.

### 5. Worker Pool & Recurrent Scheduler In-Process (Tanpa Redis)
- Arsitektur antrean tugas latar belakang (*background jobs*) berbasis goroutine murni tanpa memerlukan Redis atau broker eksternal.
- Pengaturan kapasitas *concurrency worker* dan *buffered queue* yang terukur.
- **Panic Recovery**: Worker terlindungi dari crash mendadak sehingga antrean tugas berikutnya tetap berjalan normal.
- **Graceful Shutdown**: Terhubung ke sinyal OS (`SIGINT`, `SIGTERM`) untuk menuntaskan sisa tugas dan menutup koneksi server secara bersih.

### 6. Manajemen Stok, Bahan Baku & Produk Resep
- Manajemen stok real-time dengan status stok kritis (*low stock warning*).
- Dukungan produk berbasis resep (*recipe-based products*) yang secara otomatis memotong stok bahan baku (`raw_materials`) saat terjual.
- Riwayat pergerakan persediaan (`inventory_movements`) lengkap dengan pencatatan tipe penyesuaian, pembelian, penjualan, dan void.
- Dukungan multi-outlet dengan isolasi data ketat berbasis tenant (`store_id`).

### 7. Manajemen Kasbon & Piutang Pelanggan
- Pencatatan hutang/kasbon per pelanggan dengan pelacakan riwayat pembayaran parsial maupun lunas.
- Integrasi penagihan dan pengingat jatuh tempo via WhatsApp Hub.

### 8. WhatsApp Hub & Otomasi Penjualan
- Sinkronisasi kontak pelanggan dengan integrasi WhatsApp langsung.
- Ekstraksi otomatis pesanan belanja pelanggan dari format chat WhatsApp menjadi draft transaksi POS via AI.
- Broadcast promo produk terarah berdasarkan segmen pelanggan (memiliki kasbon, pelanggan setia, dll).

### 9. Artha AI Copilot (Powered by Groq, Gemini & OpenAI)
- **Konsultasi Bisnis Interaktif**: Tanya jawab strategi margin laba, restock persediaan, dan evaluasi keuangan berbasis query agregat database riil toko.
- **Sistem Memory Multi-Turn**: AI mempertahankan konteks percakapan bertahap untuk analisis mendalam dengan sanitasi prompt anti-injection.
- **Strict Domain Guardrails**: AI fokus 100% pada operasional bisnis ritel toko tanpa kode/markup liar.
- **Generator Promosi WhatsApp**: Membuat pesan promosi persuasif dan siap kirim.
- **Bot CS 24/7**: Menjawab pertanyaan ketersediaan stok dan harga secara akurat sesuai katalog aktif.

### 10. Laporan Keuangan & Audit Laba Rugi
- Laporan Laba Rugi real-time (*Revenue, COGS / HPP, Gross Profit, Operating Expenses, Net Profit*).
- Laporan Arus Kas (*Cash Flow*) berdasarkan metode pembayaran riil (memisahkan kas masuk dan kasbon).
- Valuasi nilai persediaan stok dan rekap metrik dashboard harian.

---

## Arsitektur & Teknologi

- **Backend**: Go (Golang) 1.23+ dengan Fiber v3 framework, GORM, PostgreSQL 16 Alpine, JWT Authentication (HS256 enforced), AES-256-GCM Cipher, WebPush VAPID, dan In-Process Worker Pool.
- **Database**: PostgreSQL 16 Alpine terisolasi melalui Docker Compose dengan persistent volume dan healthcheck otomatis.
- **Frontend**: Next.js 16+ (App Router, Turbopack), React 19, TypeScript, Tailwind CSS, Lucide Icons, Service Worker Web Push.
- **Keamanan**: Role-Based Access Control (RBAC: Owner, Manager, Cashier), BCrypt Password Hashing, HMAC Webhook Signature Verification, Replay Attack Protection, Rate Limiter, Strict Content Security Headers, Anti-SSRF, dan Anti-Path Traversal.

---

## Panduan Instalasi & Menjalankan Aplikasi

### Prasyarat
- Docker & Docker Compose
- Go 1.23 atau lebih baru
- Node.js 18+ dan npm / pnpm

### 1. Menjalankan Database PostgreSQL via Docker Compose

Jalankan container PostgreSQL 16 Alpine lokal dengan konfigurasi volume dan inisialisasi skema otomatis:

```bash
docker compose up -d
```

Pemeriksaan status container dan healthcheck:
```bash
docker compose ps
```

### 2. Menjalankan Backend (Go Fiber)

Salin konfigurasi lingkungan dari template `.env.example`:

```bash
cp .env.example .env
```

Pastikan variabel utama di `.env` sudah sesuai:
- `DB_URL=postgres://postgres:postgres@localhost:5432/artha_db?sslmode=disable`
- `BACKUP_ENCRYPTION_KEY=super-secret-backup-passphrase-32bytes!`
- `BACKUP_DIR=./backups`
- `JWT_SECRET=rahasia-jwt-token-minimal-32-karakter-panjangnya`
- `VAPID_PUBLIC_KEY` & `VAPID_PRIVATE_KEY` (opsional untuk notifikasi Web Push)

Jalankan backend:
```bash
go mod tidy
go run ./cmd/api
# Server berjalan di http://localhost:8080
```

Menjalankan test backend:
```bash
go test ./...
```

### 3. Menjalankan Frontend (Next.js)

Masuk ke folder `web` dan jalankan development server:

```bash
cd web
npm install # atau pnpm install
npm run dev # atau pnpm dev
# Frontend berjalan di http://localhost:3000
```

Melakukan build produksi frontend:
```bash
npm run build # atau pnpm build
```

---

## Ringkasan Endpoint API Utama

| Method | Endpoint | Deskripsi | Otorisasi |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Pendaftaran akun baru | Publik |
| `POST` | `/api/v1/auth/login` | Login & perolehan JWT token | Publik (Rate-limited) |
| `GET` | `/api/v1/stores/:storeId/sales` | Mengambil daftar transaksi penjualan | Kasir, Manajer, Owner |
| `POST` | `/api/v1/stores/:storeId/sales` | Membuat transaksi penjualan baru | Kasir, Manajer, Owner |
| `POST` | `/api/v1/stores/:storeId/sales/:id/void` | Membatalkan transaksi (void/retur) & reversal stok | Manajer, Owner |
| `POST` | `/api/v1/stores/:storeId/backups` | Membuat backup database terenkripsi on-demand | Owner |
| `GET` | `/api/v1/stores/:storeId/backups` | Melihat daftar berkas backup `.dump.enc` | Owner |
| `POST` | `/api/v1/stores/:storeId/backups/restore` | Restore database dari backup terenkripsi | Owner |
| `POST` | `/api/v1/stores/:storeId/settings/push/subscribe` | Menyimpan browser push subscription | Kasir, Manajer, Owner |
| `POST` | `/api/v1/stores/:storeId/settings/push/unsubscribe` | Menghapus browser push subscription | Kasir, Manajer, Owner |
| `POST` | `/api/v1/stores/:storeId/ai/chat` | Chat konsultasi AI berbasis agregat toko | Kasir, Manajer, Owner |
| `POST` | `/api/v1/stores/:storeId/ai/parse-order` | Ekstraksi pesanan chat WhatsApp ke draft POS | Kasir, Manajer, Owner |

Dokumentasi endpoint selengkapnya tersedia pada:
- [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)
- [`POSTMAN_GUIDE.md`](./POSTMAN_GUIDE.md)
- [`ArthaOs_Postman_Collection.json`](./ArthaOs_Postman_Collection.json)

---

## Lisensi & Kontributor

Dikembangkan untuk ekosistem platform ritel & POS **ArthaOS**.
