# ArthaOS - Sistem Kasir POS & Manajemen Bisnis Ritel Terintegrasi

ArthaOS adalah platform enterprise Point-of-Sale (POS), manajemen keuangan ritel, pencatatan kasbon pelanggan, multi-outlet, serta kecerdasan buatan (*AI Copilot & WhatsApp Hub*) yang dirancang khusus untuk operasional UMKM dan bisnis ritel modern di Indonesia.

---

## Fitur Utama

### 1. Point of Sale (POS) Kasir Cepat & Multi-Metode Pembayaran
- Pencatatan transaksi kilat dengan katalog visual produk, kategori, dan barcode scanner.
- Mendukung pembayaran Tunai, QRIS dinamis, Transfer Bank, dan Kasbon (Hutang Pelanggan).
- Perhitungan kembalian otomatis dan pencetakan struk digital / fisik.

### 2. Manajemen Stok & Multi-Outlet
- Manajemen stok real-time dengan status stok kritis (*low stock warning*).
- Riwayat pergerakan stok, batch expiry, dan penyesuaian opname persediaan.
- Dukungan multi-toko / multi-cabang dengan isolasi data per toko.

### 3. Manajemen Kasbon & Piutang Pelanggan
- Pencatatan hutang/kasbon per pelanggan dengan pelacakan riwayat pembayaran parsial / lunas.
- Integrasi penagihan dan pengingat jatuh tempo via WhatsApp Hub.

### 4. WhatsApp Hub & Otomasi Penjualan
- Sinkronisasi kontak pelanggan dengan integrasi WhatsApp langsung.
- Ekstraksi otomatis pesanan belanja pelanggan dari format chat WhatsApp menjadi transaksi kasir POS via AI.
- Broadcast promo produk terarah berdasarkan segmen pelanggan (memiliki kasbon, pelanggan setia, dll).

### 5. Artha AI Copilot (Powered by Groq LPU)
- **Konsultasi Bisnis Interaktif**: Tanya jawab strategi margin laba, restock persediaan, dan evaluasi keuangan berbasis data riil toko.
- **Sistem Memory Multi-Turn**: AI mempertahankan konteks percakapan bertahap untuk analisis mendalam.
- **Strict Domain Guardrails**: AI fokus 100% pada operasional bisnis ritel toko tanpa kode/markup liar.
- **Generator Promosi WhatsApp**: Membuat pesan promosi persuasif dan siap kirim tanpa emoji.
- **Bot CS 24/7**: Menjawab pertanyaan ketersediaan stok dan harga secara otomatis.

### 6. Laporan Keuangan & Audit Laba Rugi
- Laporan Laba Rugi real-time (*Revenue, COGS / HPP, Gross Profit, Operating Expenses, Net Profit*).
- Valuasi nilai persediaan stok dan rekap transaksi harian.

---

## Arsitektur & Teknologi

- **Backend**: Go (Golang) 1.23+ dengan Fiber v3 framework, GORM, PostgreSQL, JWT Authentication, dan Groq LPU API SDK.
- **Frontend**: Next.js 16+ (App Router), React 19, TypeScript, Tailwind CSS, Lucide Icons, Markdown Renderer.
- **Keamanan**: Role-Based Access Control (RBAC: Owner, Manager, Cashier), BCrypt Password Hashing, Webhook Signature Verification, Strict Content Security.

---

## Panduan Instalasi & Menjalankan Aplikasi

### Prasyarat
- Go 1.23 atau lebih baru
- Node.js 18+ dan npm
- PostgreSQL database

### 1. Menjalankan Backend (Go Fiber)

```bash
cd backend
cp .env.example .env
# Sesuaikan konfigurasi database DB_URL dan GROQ_API_KEY di .env

go mod tidy
go run ./cmd/api
# Backend berjalan di http://localhost:3000
```

### 2. Menjalankan Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev -- -p 3001
# Frontend berjalan di http://localhost:3001
```

---

## Dokumentasi API & Postman Collection

- Dokumentasi RESTful API lengkap: [`API_DOCUMENTATION.md`](./API_DOCUMENTATION.md)
- Panduan Postman & Variabel Lingkungan: [`POSTMAN_GUIDE.md`](./POSTMAN_GUIDE.md)
- File Postman Collection: [`FluxOS_Postman_Collection.json`](./FluxOS_Postman_Collection.json)

---

## Lisensi & Kontributor

Dikembangkan untuk ekosistem platform ritel & POS **ArthaOS**.
