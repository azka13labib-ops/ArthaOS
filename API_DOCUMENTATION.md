# FluxOS REST API Documentation (v1.0.0)

Dokumentasi resmi FluxOS REST API. FluxOS adalah sistem backend untuk manajemen kasir (POS), stok inventaris multi-tenant, buku hutang piutang otomatis, laporan laba rugi real-time, dan integrasi WhatsApp Conversational Commerce.

---

## 1. Konfigurasi Dasar

- **Base URL:** `http://localhost:3000` (atau URL domain production)
- **API Version:** `v1` (Prefix: `/api/v1`)
- **Content-Type:** `application/json`
- **Authentication Scheme:** `Bearer <JWT_TOKEN>`

---

## 2. Standar Respons & Penanganan Error

Semua respons API dikembalikan dalam format JSON standar.

### Format Respons Sukses:
```json
{
  "message": "Resource created successfully",
  "data": {}
}
```

### Format Respons Error:
```json
{
  "error": "Pesan deskripsi kesalahan yang aman bagi pengguna",
  "code": "ERROR_CODE_STRING",
  "fields": [
    {
      "field": "email",
      "error": "email is a required field"
    }
  ]
}
```

### Daftar Kode HTTP:
| Kode | Nama | Deskripsi |
| :--- | :--- | :--- |
| `200` | OK | Request berhasil diproses |
| `201` | Created | Data baru berhasil dibuat |
| `400` | Bad Request | Request tidak valid atau melanggar aturan bisnis |
| `401` | Unauthorized | Token tidak ada, expired, atau kredensial login salah |
| `403` | Forbidden | User tidak memiliki akses ke toko yang diminta |
| `409` | Conflict | Data duplikat |
| `422` | Unprocessable Entity | Validasi input schema gagal |
| `429` | Too Many Requests | Melebihi batas rate limiter |
| `500` | Internal Server Error | Kesalahan pada server internal |

---

## 3. Aturan Rate Limiting

1. **Global API Endpoints:** Maksimum `300 request / menit` per IP.
2. **Auth Login (`/auth/login`):** Maksimum `5 request / menit` per IP untuk mencegah brute-force attack.

---

## 4. Endpoint Reference

---

### A. Autentikasi (`/api/v1/auth`)

#### 1. Registrasi Pengguna Baru
* **Endpoint:** `POST /api/v1/auth/register`
* **Auth:** Tidak butuh (Publik)
* **Request Body:**
  ```json
  {
    "name": "Nama Lengkap",
    "email": "user@domain.com",
    "password": "PasswordMinimal8Karakter!",
    "phone": "081234567890"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": 1,
      "name": "Nama Lengkap",
      "email": "user@domain.com"
    }
  }
  ```

---

#### 2. Login Akun
* **Endpoint:** `POST /api/v1/auth/login`
* **Auth:** Tidak butuh (Publik)
* **Catatan:** Dibatasi 5 percobaan per menit per IP.
* **Request Body:**
  ```json
  {
    "email": "user@domain.com",
    "password": "PasswordMinimal8Karakter!"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
  ```

---

### B. Toko & Multi-Tenancy (`/api/v1/stores`)

#### 1. Buat Toko Baru
* **Endpoint:** `POST /api/v1/stores`
* **Auth:** `Bearer Token`
* **Request Body:**
  ```json
  {
    "name": "FluxOS Mart Flagship",
    "address": "Jl. Sudirman No. 1, Jakarta Pusat",
    "timezone": "Asia/Jakarta"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "message": "Store created successfully",
    "store": {
      "id": 1,
      "name": "FluxOS Mart Flagship",
      "address": "Jl. Sudirman No. 1, Jakarta Pusat",
      "timezone": "Asia/Jakarta"
    }
  }
  ```

---

### C. Master Produk & Inventaris (`/api/v1/stores/:storeId/products`)

Semua endpoint di bawah ini mewajibkan header `Authorization: Bearer <TOKEN>` dan user harus terdaftar sebagai anggota dari `:storeId`.

#### 1. Buat Produk Baru
* **Endpoint:** `POST /api/v1/stores/:storeId/products`
* **Auth:** `Bearer Token`
* **Request Body:**
  ```json
  {
    "name": "Kopi Arabika Gayo 250g",
    "sku": "SKU-KOP-GAYO-01",
    "barcode": "8991234567890",
    "buy_price": 50000,
    "sell_price": 85000,
    "initial_stock": 100
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": 1,
    "store_id": 1,
    "name": "Kopi Arabika Gayo 250g",
    "sku": "SKU-KOP-GAYO-01",
    "buy_price": 50000,
    "sell_price": 85000,
    "current_stock": 100,
    "is_active": true,
    "created_at": "2026-09-20T08:00:00Z"
  }
  ```

---

#### 2. Penyesuaian Stok (Stock In / Stock Out / Opname)
* **Endpoint:** `POST /api/v1/stores/:storeId/products/:id/adjustments`
* **Auth:** `Bearer Token`
* **Request Body:**
  ```json
  {
    "quantity_delta": 25,
    "notes": "Restock supplier #PO-9921"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "message": "Stock adjusted successfully",
    "current_stock": 125
  }
  ```

---

#### 3. Riwayat Mutasi Stok (Audit Trail)
* **Endpoint:** `GET /api/v1/stores/:storeId/products/:id/movements`
* **Auth:** `Bearer Token`
* **Success Response (`200 OK`):**
  ```json
  [
    {
      "id": 1,
      "store_id": 1,
      "product_id": 1,
      "movement_type": "initial_stock",
      "quantity_delta": 100,
      "notes": "Initial stock creation",
      "created_at": "2026-09-20T08:00:00Z"
    },
    {
      "id": 2,
      "store_id": 1,
      "product_id": 1,
      "movement_type": "adjustment",
      "quantity_delta": 25,
      "notes": "Restock supplier #PO-9921",
      "created_at": "2026-09-20T08:05:00Z"
    }
  ]
  ```

---

### D. Manajemen Pelanggan (`/api/v1/stores/:storeId/customers`)

#### 1. Tambah Pelanggan
* **Endpoint:** `POST /api/v1/stores/:storeId/customers`
* **Auth:** `Bearer Token`
* **Request Body:**
  ```json
  {
    "name": "Budi Santoso",
    "phone": "081234567890"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": 1,
    "store_id": 1,
    "name": "Budi Santoso",
    "phone": "081234567890",
    "created_at": "2026-09-20T08:00:00Z"
  }
  ```

---

#### 2. Ambil Daftar Pelanggan
* **Endpoint:** `GET /api/v1/stores/:storeId/customers`
* **Auth:** `Bearer Token`
* **Success Response (`200 OK`):**
  ```json
  [
    {
      "id": 1,
      "store_id": 1,
      "name": "Budi Santoso",
      "phone": "081234567890",
      "created_at": "2026-09-20T08:00:00Z"
    }
  ]
  ```

---

### E. Kasir & Penjualan (`/api/v1/stores/:storeId/sales`)

#### 1. Transaksi Penjualan Tunai (POS Checkout)
* **Endpoint:** `POST /api/v1/stores/:storeId/sales`
* **Auth:** `Bearer Token`
* **Request Body:**
  ```json
  {
    "description": "Penjualan Kasir POS #001",
    "items": [
      {
        "product_id": 1,
        "quantity": 2
      }
    ],
    "payments": [
      {
        "amount": 170000,
        "payment_method": "cash"
      }
    ]
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": 1,
    "store_id": 1,
    "type": "sale",
    "total_amount": 170000,
    "total_cost": 100000,
    "description": "Penjualan Kasir POS #001",
    "occurred_at": "2026-09-20T08:10:00Z"
  }
  ```

---

#### 2. Transaksi Penjualan Kredit / Kasbon (Auto-Create Debt)
* **Endpoint:** `POST /api/v1/stores/:storeId/sales`
* **Auth:** `Bearer Token`
* **Request Body:**
  ```json
  {
    "description": "Penjualan Kredit Customer Budi",
    "items": [
      {
        "product_id": 1,
        "quantity": 2
      }
    ],
    "payments": [
      {
        "amount": 70000,
        "payment_method": "cash"
      },
      {
        "amount": 100000,
        "payment_method": "debt",
        "customer_id": 1,
        "due_date": "2026-10-25"
      }
    ]
  }
  ```
* **Success Response (`201 Created`):**
  *Sistem otomatis memotong stok barang dan mendaftarkan buku hutang piutang atas nama customer.*

---

### F. Pengeluaran Operasional (`/api/v1/stores/:storeId/expenses`)

#### 1. Catat Biaya Operasional
* **Endpoint:** `POST /api/v1/stores/:storeId/expenses`
* **Auth:** `Bearer Token`
* **Request Body:**
  ```json
  {
    "category": "utilities",
    "amount": 75000,
    "description": "Tagihan Listrik & WiFi Toko"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": 2,
    "store_id": 1,
    "type": "expense",
    "total_amount": 75000,
    "total_cost": 0,
    "expense_category": "utilities",
    "description": "Tagihan Listrik & WiFi Toko",
    "occurred_at": "2026-09-20T08:15:00Z"
  }
  ```

---

### G. Manajemen Hutang & Cicilan (`/api/v1/stores/:storeId/debts`)

#### 1. Ambil Daftar Hutang Aktif (Eager Loaded)
* **Endpoint:** `GET /api/v1/stores/:storeId/debts`
* **Auth:** `Bearer Token`
* **Success Response (`200 OK`):**
  ```json
  [
    {
      "id": 1,
      "store_id": 1,
      "customer_id": 1,
      "customer": {
        "id": 1,
        "name": "Budi Santoso",
        "phone": "081234567890"
      },
      "original_amount": 100000,
      "remaining_amount": 100000,
      "status": "unpaid",
      "due_date": "2026-10-25T00:00:00Z",
      "payments": []
    }
  ]
  ```

---

#### 2. Bayar Cicilan / Pelunasan Hutang
* **Endpoint:** `POST /api/v1/stores/:storeId/debts/:id/payments`
* **Auth:** `Bearer Token`
* **Request Body:**
  ```json
  {
    "amount": 50000,
    "payment_method": "transfer",
    "notes": "Cicilan ke-1 via transfer BCA"
  }
  ```
* **Success Response (`201 Created`):**
  ```json
  {
    "id": 1,
    "debt_id": 1,
    "amount": 50000,
    "payment_method": "transfer",
    "notes": "Cicilan ke-1 via transfer BCA",
    "paid_at": "2026-09-20T08:20:00Z"
  }
  ```

---

### H. Laporan Finansial & Gudang (`/api/v1/stores/:storeId/reports`)

#### 1. Laporan Laba Rugi (Profit & Loss)
* **Endpoint:** `GET /api/v1/stores/:storeId/reports/profit-loss`
* **Query Params:**
  - `start_date`: format `YYYY-MM-DD` (contoh: `2026-01-01`)
  - `end_date`: format `YYYY-MM-DD` (contoh: `2026-12-31`)
* **Auth:** `Bearer Token`
* **Success Response (`200 OK`):**
  ```json
  {
    "total_sales": 340000,
    "total_cost": 200000,
    "gross_profit": 140000,
    "total_expenses": 75000,
    "net_profit": 65000
  }
  ```

---

#### 2. Laporan Valuasi Aset Stok Gudang
* **Endpoint:** `GET /api/v1/stores/:storeId/reports/stock-valuation`
* **Auth:** `Bearer Token`
* **Success Response (`200 OK`):**
  ```json
  {
    "total_items": 121,
    "total_value": 6050000
  }
  ```

---

### I. WhatsApp Bot & Webhook (`/api/v1/webhooks`)

#### 1. Generate Link / Pairing QR WhatsApp
* **Endpoint:** `POST /api/v1/stores/:storeId/whatsapp/link`
* **Auth:** `Bearer Token`
* **Success Response (`200 OK`):**
  ```json
  {
    "store_id": 1,
    "status": "pending",
    "qr_url": "https://dummyimage.com/200x200/000/fff&text=Scan+Me"
  }
  ```

---

#### 2. Inbound WhatsApp Webhook
* **Endpoint:** `POST /api/v1/webhooks/whatsapp`
* **Auth:** Verifikasi Header HMAC-SHA256 (`X-Hub-Signature-256`)
* **Signature Header:** `X-Hub-Signature-256: sha256=<HMAC_HEX_DIGEST>`
* **Request Body:**
  ```json
  {
    "message": "pesan kopi arabika 2 pack kirim ke budi"
  }
  ```
* **Success Response (`200 OK`):**
  ```json
  {
    "status": "received"
  }
  ```

---

## 5. Ringkasan Keamanan & Arsitektur

1. **Anti-IDOR:** Sistem memvalidasi kepemilikan store pada setiap request tenant.
2. **Anti-Stok Minus:** Mutasi stok dieksekusi dengan atomic conditional update.
3. **Anti-Tamper Harga:** Harga barang pada checkout kasir diambil langsung dari database toko.
4. **Pencegahan N+1:** Seluruh query relasi menggunakan GORM Preload dan bulk batch insert.
