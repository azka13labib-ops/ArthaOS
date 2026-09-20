# Panduan Pengujian API FluxOS via Postman

Panduan ini memandu Anda melakukan pengujian seluruh endpoint API **FluxOS** menggunakan Postman secara berurutan dan otomatis.

---

## 1. Cara Import Collection ke Postman

1. Buka aplikasi **Postman**.
2. Klik tombol **Import** (di pojok kiri atas).
3. Pilih file **`FluxOS_Postman_Collection.json`** yang ada di root project ini:

   ```text
   c:\ngodink\1x\FluxOS_Postman_Collection.json
   ```

4. Klik **Import**. Collection **`FluxOS REST API v1`** akan langsung muncul di sidebar kiri Anda.

---

## 2. Variabel Lingkungan (Collection Variables)

Collection ini sudah dilengkapi dengan **Script Otomatis** (Pre-request & Tests Script). Anda tidak perlu copy-paste token manual.

| Variabel | Default | Keterangan |
| :--- | :--- | :--- |
| `baseUrl` | `http://localhost:3000` | URL root server backend Go Fiber Anda |
| `authToken` | *(Otomatis terisi)* | Disimpan otomatis saat request **1.2 Login** berhasil |
| `storeId` | *(Otomatis terisi)* | Disimpan otomatis saat request **2.1 Create Store** berhasil |
| `productId` | *(Otomatis terisi)* | Disimpan otomatis saat request **3.1 Create Product** berhasil |
| `customerId` | *(Otomatis terisi)* | Disimpan otomatis saat request **4.1 Create Customer** berhasil |
| `debtId` | *(Otomatis terisi)* | Disimpan otomatis saat request **7.1 Get Active Debts** berhasil |

---

## 3. Urutan Pengujian Alur Bisnis (Step-by-Step)

Untuk menguji seluruh siklus bisnis dari nol, jalankan request berikut secara berurutan:

### Langkah 1: Autentikasi

1. **`1.1 Register User`**
   - **Method:** `POST /api/v1/auth/register`
   - Mendaftarkan akun owner baru.
2. **`1.2 Login (Auto Save Token)`**
   - **Method:** `POST /api/v1/auth/login`
   - *Test Script* otomatis menangkap JWT token dan menyimpannya ke `{{authToken}}`.

---

### Langkah 2: Pembuatan Toko (Tenant Multi-Store)

1. **`2.1 Create Store`**
   - **Method:** `POST /api/v1/stores`
   - Membuat store baru, menetapkan user login sebagai `owner`, dan menyimpan ID toko ke `{{storeId}}`.

---

### Langkah 3: Master Produk & Gudang

1. **`3.1 Create Product`**
   - **Method:** `POST /api/v1/stores/{{storeId}}/products`
   - Menambahkan produk: *Kopi Arabika Gayo* (Beli: Rp50.000, Jual: Rp85.000, Stok Awal: 100). ID disimpan ke `{{productId}}`.
2. **`3.2 Adjust Stock (Stock In / Out)`**
   - **Method:** `POST /api/v1/stores/{{storeId}}/products/{{productId}}/adjustments`
   - Menambah stok `+25` dengan alasan "Restock Supplier".
3. **`3.3 Get Stock Movements Audit Log`**
   - **Method:** `GET /api/v1/stores/{{storeId}}/products/{{productId}}/movements`
   - Memeriksa histori mutasi audit trail stok barang.

---

### Langkah 4: Pelanggan

1. **`4.1 Create Customer`**
   - **Method:** `POST /api/v1/stores/{{storeId}}/customers`
   - Mendaftarkan pelanggan bernama *Budi Santoso*. ID disimpan ke `{{customerId}}`.
2. **`4.2 List Customers`**
   - **Method:** `GET /api/v1/stores/{{storeId}}/customers`
   - Melihat seluruh daftar pelanggan di toko ini.

---

### Langkah 5: Transaksi Kasir (POS & Hutang)

1. **`5.1 Cash Sale (POS Checkout)`**
   - **Method:** `POST /api/v1/stores/{{storeId}}/sales`
   - Membeli 2 pcs Kopi Arabika secara Tunai (Rp170.000). Stok otomatis berkurang atomic.
2. **`5.2 Credit / Debt Sale (Kasbon / Hutang)`**
   - **Method:** `POST /api/v1/stores/{{storeId}}/sales`
   - Membeli 2 pcs Kopi Arabika (Total Rp170.000, DP Cash Rp70.000, Sisa Hutang Rp100.000). Sistem otomatis membuat buku piutang.

---

### Langkah 6: Biaya Operasional Toko

1. **`6.1 Log Expense (Biaya Operasional)`**
   - **Method:** `POST /api/v1/stores/{{storeId}}/expenses`
   - Mencatat biaya listrik & wifi sebesar Rp75.000.

---

### Langkah 7: Manajemen Buku Hutang & Pelunasan

1. **`7.1 Get Active Debts (Eager Loaded)`**
   - **Method:** `GET /api/v1/stores/{{storeId}}/debts`
   - Mengambil daftar hutang yang belum lunas beserta relasi *Customer* & *Histori Pembayaran* (Eager loaded). ID hutang disimpan ke `{{debtId}}`.
2. **`7.2 Pay Debt / Cicilan`**
   - **Method:** `POST /api/v1/stores/{{storeId}}/debts/{{debtId}}/payments`
   - Mencicil hutang sebesar Rp50.000 via Transfer Bank. Status hutang otomatis berubah jadi `partially_paid`.

---

### Langkah 8: Laporan Keuangan & Analitik

1. **`8.1 Profit & Loss Report`**
   - **Method:** `GET /api/v1/stores/{{storeId}}/reports/profit-loss`
   - Menghitung Laba Rugi real-time: Omset, HPP/COGS, Biaya Operasional, dan Laba Bersih (*Net Profit*).
2. **`8.2 Stock Valuation Report`**
   - **Method:** `GET /api/v1/stores/{{storeId}}/reports/stock-valuation`
   - Menghitung total unit dan nilai aset barang gudang yang siap jual.

---

### Langkah 9: Integrasi WhatsApp

1. **`9.1 Link WhatsApp Account`**
   - **Method:** `POST /api/v1/stores/{{storeId}}/whatsapp/link`
   - Menghasilkan pairing status / QR code device.
2. **`9.2 WhatsApp Inbound Webhook`**
   - **Method:** `POST /api/v1/webhooks/whatsapp`
   - Menerima webhook pesan masuk dengan verifikasi signature HMAC-SHA256 (`X-Hub-Signature-256`).

---

## 4. Menjalankan Semua Test Otomatis (Postman Collection Runner)

Anda juga bisa menjalankan seluruh tes di atas secara otomatis:

1. Klik titik tiga `...` di samping collection **`FluxOS REST API v1`**.
2. Pilih **Run collection**.
3. Pastikan urutan request sudah sesuai (1.1 sampai 9.2).
4. Klik **Run FluxOS REST API v1**.
5. Postman akan mengeksekusi semua request secara sekuensial dan menampilkan hasil `200 OK` / `201 Created` untuk setiap tes.
