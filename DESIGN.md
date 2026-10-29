# ArthaOS Design System & Visual Guidelines

**Dokumen Panduan Desain Resmi ArthaOS**  
*Anti-Slop Compliant (R-37)*

---

## 1. Identitas Produk & Filosofi

- **Nama Produk:** ArthaOS
- **Kategori:** Enterprise Retail & F&B Operating System untuk UMKM dan Bisnis Berkembang Indonesia.
- **Tone & Mood:** Ringkas, fokus, profesional, fungsional tanpa ornamen grafis AI yang berlebihan (*matte, grounded, no endless pulse/glow*).
- **Inspirasi Visual:** Kalibra / Modern Clean Scandinavian Dashboard.

---

## 2. Token Warna & Palet (R-01, R-29)

Palet warna dibatasi pada 2 warna inti netral + 1 aksen ungu (Kalibra Purple) + status semantik standar.

### Palet Inti (Design Tokens)
- **Background:** `bg-background` (Light: `oklch(0.98 0 0)`, Dark: `oklch(0.12 0 0)`)
- **Card / Surface:** `bg-card`, `text-card-foreground`, border `border-border`
- **Primary Accent:** `bg-primary` (`oklch(0.6 0.2 290)` — Kalibra Purple #A855F7), text `text-primary-foreground`
- **Secondary:** `bg-secondary`, `text-secondary-foreground`
- **Muted Elements:** `bg-muted`, `text-muted-foreground`

### Warna Status Semantik
- **Destructive / Error:** `bg-destructive`, `text-destructive` (Merah bata `oklch(0.6 0.2 25)`)
- **Success:** Hijau fungsional (`emerald-500` / status badge)
- **Warning / Pending:** Amber fungsional (`amber-500`)

> **Aturan Palet:** Dilarang menggunakan kelas warna Tailwind acak (misal `rose-700`, `blue-600`, `violet-400`, `purple-500`) di luar token semantik.

---

## 3. Tipografi & Hierarki Judul (R-06, R-11)

- **Font Family:** Inter (`font-sans`), dengan `font-feature-settings: "cv02", "cv03", "cv04", "cv11"`.
- **Judul Utama H1:** `text-2xl font-bold tracking-tight text-foreground` (konsisten di seluruh halaman).
- **Sub-judul H2 / Section:** `text-lg font-semibold text-foreground`.
- **Label / Micro-copy:** `text-xs font-medium text-muted-foreground uppercase tracking-wider`.
- **Body Text:** `text-sm text-foreground leading-relaxed`.

---

## 4. Sistem Border Radius & Elevasi (R-11, R-12)

- **Default Button & Input:** `rounded-lg` (`0.5rem`).
- **Cards & Containers:** `rounded-xl` (`0.75rem`).
- **Modals & Dialogs:** `rounded-2xl` (`1rem`).
- **Badges:** `rounded-md` atau `rounded-full` (khusus status singkat).
- **Shadows:** Dibatasi hanya pada modal popup dan dropdown aktif (`shadow-lg`). Card dan tabel menggunakan border flat `border border-border`.

---

## 5. Tata Letak Mobile & Touch Target (R-03 Mobile)

- **Minimum Touch Target:** Semua tombol aksi interaktif wajib berukuran minimal **44x44px** (atau memiliki padding hit area minimal 44px).
- **Tabel Responsif:** Tabel di mobile harus dapat digeser horizontal tanpa memotong halaman, atau menyajikan kartu ringkas.
- **Padding:** Halaman tidak boleh menambahkan padding ganda di dalam wrapper `AppLayout`.

---

## 6. Integritas Data & Honest UI (R-17, R-18, R-26, R-36, R-38)

- Dilarang keras menampilkan tren grafik (sparkline) atau skor numerik (seperti "Kesehatan Bisnis: 95/100") dari data acak / mock statis tanpa sumber riil.
- Fitur yang belum terhubung ke backend wajib diberi tanda jelas (misal: badge `Segera Hadir` atau dialog informatif), tidak boleh menggunakan delay palsu (`setTimeout`).
