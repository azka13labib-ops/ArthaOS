# Changelog

Semua perubahan penting pada proyek ArthaOS akan didokumentasikan di file ini.
Format ini mengacu pada [Keep a Changelog](https://keepachangelog.com/id/1.0.0/).

## [1.2.0] - 2026-11-03

### Ditambahkan
- **Fitur Konten & Auto-Post Instagram**:
  - Generator caption AI dari data produk dan promosi toko dengan sistem retry dan batasan kuota.
  - Render poster otomatis berbasis template HTML/CSS rasio 4:5 (1080x1350 JPEG).
  - Integrasi Instagram Graph API dengan enkripsi token akses AES-256-GCM.
  - Scheduler publikasi otomatis in-process berbasis goroutine worker pool tanpa Redis.
- **Penyempurnaan Laporan Finansial (Laba Rugi, Valuasi Stok, dan Arus Kas)**:
  - Penyelarasan kontrak field backend dan frontend (`gross_sales`, `cogs`, `gross_profit`, `expenses`, `net_profit`).
  - Pencatatan belanja persediaan stok lunas sebagai kas keluar (`stock_purchases`) pada Laporan Arus Kas.
  - Modul pelunasan utang supplier tempo (`supplier_payments`) dan endpoint `POST /purchases/:id/payments`.
  - Perhitungan snapshot modal HPP produk resep dari bahan baku (`raw_materials`) saat transaksi dibuat.
  - Valuasi stok mencakup pemisahan nilai produk jadi (`product_asset_cost`) dan bahan baku (`raw_material_asset_cost`).
  - Konsistensi pengecualian transaksi `voided` pada seluruh kalkulasi laporan keuangan.

### Diubah
- Dokumentasi REST API di `API_DOCUMENTATION.md` diperbarui dengan endpoint arus kas dan skema respons terbaru.
- Penambahan endpoint Laporan Arus Kas pada `ArthaOs_Postman_Collection.json`.
- Perbaikan touch target tombol dan divider border tabel sesuai panduan anti-slop.

## [1.1.0] - 2026-10-29

### Ditambahkan
- Dukungan tema Light Mode dan Dark Mode dengan `ThemeContext`.
- Audit kepatuhan desain anti-slop pada `anti-slop/audit-001-2026-10-29.md`.
- Spesifikasi design system resmi pada `DESIGN.md`.

## [1.0.0] - 2026-09-20

### Ditambahkan
- Rilis perdana platform ArthaOS: Kasir POS, inventori multi-tenant, WhatsApp commerce bot, dan laporan laba rugi real-time.
