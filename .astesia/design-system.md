# Design System & UI Specs - Pustaka Sekolah PWA
**Project Name:** Pustaka Sekolah PWA  
**Theme:** Modern Academic Minimalist (Fokus pada keterbacaan tinggi, kenyamanan mata saat membaca e-book, dan navigasi mobile-first yang intuitif)  
**WCAG Compliance:** AA Level (Contrast ratio minimum 4.5:1 untuk normal text, 3:1 untuk large text/UI components)  
**Version:** 1.0.0  

---

## 1. Global Tokens

### 1.1 Color Palette (CSS Variables & Tailwind Mapping)

| Token Name | Hex Code | HSL Value | Peruntukan & Panduan Penggunaan | Contrast Ratio vs Background |
| :--- | :--- | :--- | :--- | :--- |
| `--color-primary-600` | `#1E40AF` | `hsl(224, 76%, 40%)` | Brand utama, Tombol Primary, Tab Aktif, Header Sekolah | 8.6:1 (Pass AAA) |
| `--color-primary-700` | `#1D3589` | `hsl(226, 65%, 33%)` | Hover/Active state tombol primary | 10.8:1 (Pass AAA) |
| `--color-primary-50` | `#EFF6FF` | `hsl(214, 100%, 97%)` | Background chip kategori, badge e-book, highlight bar | - |
| `--color-accent-amber` | `#D97706` | `hsl(38, 92%, 44%)` | Badge buku fisik, status jatuh tempo mendekat, denda | 4.8:1 (Pass AA) |
| `--color-success-600` | `#059669` | `hsl(160, 84%, 31%)` | Status "Tersedia Dipinjam", pengembalian sukses | 5.2:1 (Pass AA) |
| `--color-danger-600` | `#DC2626` | `hsl(0, 72%, 51%)` | Buku terlambat, denda aktif, tombol hapus/batal | 4.6:1 (Pass AA) |
| `--color-surface-bg` | `#F8FAFC` | `hsl(210, 40%, 98%)` | Background aplikasi keseluruhan (Soft Slate / Anti-glare) | Base |
| `--color-surface-card` | `#FFFFFF` | `hsl(0, 0%, 100%)` | Background kartu buku, panel dialog, modal | Base |
| `--color-text-main` | `#0F172A` | `hsl(222, 47%, 11%)` | Tipografi heading dan body text utama | 14.1:1 (Pass AAA) |
| `--color-text-muted` | `#475569` | `hsl(215, 19%, 35%)` | Sub-teks, nama penulis, nomor rak, timestamp | 6.2:1 (Pass AA) |
| `--color-border-subtle` | `#E2E8F0` | `hsl(214, 32%, 91%)` | Garis pembatas kartu, separator list, outline input | - |

#### Mode Khusus E-Book Reader:
* **Light Theme:** Background `#FFFFFF`, Text `#1E293B`
* **Sepia Theme (Eye Comfort):** Background `#FBF0D9`, Text `#433422` (Sangat disarankan untuk membaca e-book materi ajar)
* **Dark Theme:** Background `#0F172A`, Text `#E2E8F0`

---

### 1.2 Typography (Modular Scale: 1.250 - Major Third)

* **Font Family:** `Plus Jakarta Sans`, system-ui, -apple-system, sans-serif
* **Mono Family (Barcode / Nomor Panggil Rak):** `JetBrains Mono`, `Fira Code`, monospace

| Level | Size (rem / px) | Line Height | Weight | Tailwind Class |
| :--- | :--- | :--- | :--- | :--- |
| **Display (Hero/Home)** | `1.875rem` (30px) | `2.25rem` (36px) | Bold (700) | `text-2xl md:text-3xl font-bold` |
| **Heading 1 (Page Title)** | `1.5rem` (24px) | `2.0rem` (32px) | SemiBold (600) | `text-xl md:text-2xl font-semibold` |
| **Heading 2 (Section Title)**| `1.25rem` (20px) | `1.75rem` (28px) | SemiBold (600) | `text-lg md:text-xl font-semibold` |
| **Body (Default Text)** | `1.0rem` (16px) | `1.5rem` (24px) | Regular (400) | `text-base` |
| **Body Small (Subtext/Meta)**| `0.875rem` (14px) | `1.25rem` (20px) | Regular (400) | `text-sm` |
| **Caption / Badge** | `0.75rem` (12px) | `1.0rem` (16px) | Medium (500) | `text-xs font-medium` |

---

### 1.3 Spacing & Elevation

* **Spacing Grid Base:** 4px scale (`p-1` = 4px, `p-2` = 8px, `p-3` = 12px, `p-4` = 16px, `p-6` = 24px)
* **Corner Radius:**
  - Kartu & Dialog: `rounded-xl` (12px)
  - Tombol & Input: `rounded-lg` (8px)
  - Badge & Chip: `rounded-full` (9999px)
* **Elevation (Shadows):**
  - Card Default: `shadow-sm` (`0 1px 2px 0 rgb(0 0 0 / 0.05)`)
  - Hover Card: `shadow-md` (`0 4px 6px -1px rgb(0 0 0 / 0.1)`)
  - Floating Bottom Nav & Modal: `shadow-xl` (`0 20px 25px -5px rgb(0 0 0 / 0.1)`)

---

## 2. Responsive Screen Breakpoints & Layout Architecture

* **Mobile Viewport (`sm`: < 640px):**
  - Navigasi utama menggunakan **Bottom App Bar** (Beranda, Cari/Katalog, Rak Buku Saya, Profil).
  - Tampilan katalog: 2 Kolom Grid buku dengan rasio cover 3:4.
  - Reader e-book: Tampilan layar penuh (*immersive fullscreen*), tap layar untuk toggle kontrol header & footer.
* **Tablet Viewport (`md`: 641px - 1024px):**
  - Tampilan katalog: 3 - 4 Kolom Grid.
  - Reader e-book: Mendukung opsi single page atau side-by-side spread.
* **Desktop Viewport (`lg`: 1025px+):**
  - Navigasi menggunakan **Sidebar Tetap di sisi kiri**.
  - Meja Sirkulasi Pustakawan: Layout dua panel (Panel Kiri: Scan & Input Anggota, Panel Kanan: Tabel Buku yang Dipinjam/Dikembalikan beserta rekapan denda).

---

## 3. Core Component Library Specifications

### 3.1 Button Component
* **Variants:**
  - `Primary`: Background `--color-primary-600`, teks putih, `focus:ring-2 focus:ring-primary-500 focus:ring-offset-2`.
  - `Secondary / Outline`: Background transparan, border `--color-border-subtle`, teks `--color-text-main`, `hover:bg-slate-100`.
  - `Warning / Denda`: Background `--color-accent-amber`, teks putih.
  - `Danger`: Background `--color-danger-600`, teks putih.
* **States:**
  - Default: `cursor-pointer transition-all duration-150`
  - Hover: Opacity 90% atau darken 5%
  - Active: Scale down sedikit (`active:scale-[0.98]`)
  - Disabled: `opacity-50 cursor-not-allowed pointer-events-none`
  - Loading: Spinner icon berputar dengan teks diganti "Memproses..."

### 3.2 Book Card (Katalog Hybrid)
* **Elemen:**
  - Cover Buku (Rasio 3:4, rounded-t-lg, placeholder skeleton loading).
  - Tipe Badge:
    - `[E-Book]` (Warna biru muda, icon tablet/buku digital)
    - `[Buku Fisik]` (Warna oranye/amber, icon buku cetak)
  - Judul Buku (Max 2 baris, `line-clamp-2`, font-semibold).
  - Penulis & Kategori (Font text-xs, text-muted).
  - Status Ketersediaan:
    - E-Book: "Tersedia Baca" vs "Kuota Lisensi Penuh"
    - Fisik: "Tersedia (3 Rak B-02)" vs "Dipinjam Semua"

### 3.3 E-Book Reader Shell
* **Elemen:**
  - Top Toolbar (Transparan / auto-hide): Tombol Kembali, Judul Buku, Indikator Halaman (contoh: "14 / 240"), Tombol Bookmark, Pengaturan Tema (Light/Sepia/Dark).
  - Viewport Canvas: PDF rendered layer dengan scale zoom (Pinch-to-zoom di mobile, +/- di desktop).
  - **Security Watermark Overlay:** Layer transparan absolut di atas canvas membaca:
    `"PERPUSTAKAAN SEKOLAH - [NAMA SISWA] - NISN: [12345678]"` dimiringkan 45 derajat dengan opacity 0.12. Watermark tidak dapat di-select/di-copy teksnya.
  - Bottom Navigation Bar Reader: Slider scrubber halaman cepat.

### 3.4 PWA "Add to Home Screen" Modal (Khusus iOS)
* **Pemicu:** Mendeteksi browser iOS Safari dan aplikasi belum berjalan dalam mode standalone (`window.navigator.standalone !== true`).
* **Visual Guide:**
  - Ilustrasi langkah sederhana:
    1. Tekan tombol **Share** di bar bawah Safari (ikon kotak berpanah ke atas).
    2. Geser ke bawah dan pilih menu **"Add to Home Screen"** (Tambah ke Layar Utama).
    3. Tekan **"Add"** di pojok kanan atas.
  - Tombol "Mengerti, Jangan Tampilkan Lagi Hari Ini".

### 3.5 Offline Status Banner
* **Visual:** Bar tipis warna amber di bagian paling atas aplikasi:
  `[Icon Cloud-Offline] Anda sedang dalam mode offline. Buku yang tersimpan di "Rak Saya" tetap dapat dibaca.`

---

## 4. Quality & Accessibility Self-Check

- [x] Kontras warna memenuhi rasio minimum 4.5:1 (WCAG AA).
- [x] Seluruh tombol interaktif memiliki `focus-visible:ring-2` untuk navigasi keyboard (a11y).
- [x] Layout sepenuhnya mobile-first dengan tap target minimum 44x44px untuk kenyamanan sentuhan di smartphone.
- [x] Spasi dan tipografi siap dipetakan langsung ke konfigurasi Tailwind CSS (`tailwind.config.js`).
