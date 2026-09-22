# Panduan Deployment - Pustaka Sekolah PWA
**Project Name:** Pustaka Sekolah PWA  
**Layer:** Phase 5 (DevOps Layer)  
**Status:** Ready for Production  

---

## 1. Menjalankan di Lingkungan Pengembangan Lokal

Pastikan Node.js (v20+) sudah terinstal di komputer.

```bash
# 1. Masuk ke direktori proyek
cd D:\Workspaces\pustaka-sekolah-pwa

# 2. Jalankan database seed awal (jika database belum ada)
npm run db:seed

# 3. Jalankan server backend (port 3001) dan client Vite PWA (port 5173) secara bersamaan:
npm run dev
```

Aplikasi PWA dapat langsung diakses melalui browser di: `http://localhost:5173`.

---

## 2. Kredensial Pengujian Multi-Peran (Seeded Accounts)

Untuk mempermudah pengujian alur sirkulasi dan hak akses pengguna:

| Peran | Nomor Identitas (Username) | Kata Sandi | Deskripsi Hak Akses |
| :--- | :--- | :--- | :--- |
| **Siswa (RPL 1)** | `NISN202601` | `siswa123` | Pinjam/baca e-book informatika, max 2 buku, 7 hari. |
| **Siswa (RPL 2)** | `NISN202602` | `siswa123` | Akun siswa kedua untuk menguji kuota lisensi buku. |
| **Pustakawan** | `PUSTAKA01` | `pustaka123` | Akses penuh meja sirkulasi fisik, check-out barcode, hitung denda. |
| **Guru TIK** | `GURU001` | `guru123` | Kuota pinjam 5 buku, durasi 14 hari. |
| **Admin** | `ADMIN01` | `admin123` | Master data dan konfigurasi sistem. |

*Catatan: Tombol "Pilih Cepat Akun Demo" tersedia langsung di popup Login untuk kemudahan satu-klik.*

---

## 3. Deployment Server Sekolah Menggunakan Docker

Jika sekolah memiliki server lokal (PC server perpustakaan / NAS / Ubuntu Server):

```bash
# 1. Salin file konfigurasi environment
cp .env.example .env

# 2. Build dan jalankan kontainer di background
docker compose up -d --build

# 3. Periksa status kontainer dan logs
docker compose ps
docker compose logs -f
```

### Penting Terkait HTTPS untuk PWA:
Service Worker dan fitur instalasi PWA di Android/iOS **wajib menggunakan protokol HTTPS**. Jika di-deploy ke IP publik atau domain sekolah (misal: `perpustakaan.sekolah.sch.id`), pasang reverse proxy (seperti Nginx atau Caddy) di depan port `3001` dengan sertifikat SSL Let's Encrypt gratis.

---

## 4. Cara Instalasi PWA di Perangkat Pengguna

1. **Android (Chrome):**
   - Buka URL perpustakaan di Chrome.
   - Ketuk menu tiga titik -> Pilih **"Install app"** atau **"Tambahkan ke Layar Utama"**. Aplikasi akan terinstal sebagai WebAPK dengan icon independen.
2. **iOS iPhone / iPad (Safari):**
   - Buka URL perpustakaan di Safari.
   - Ketuk tombol **Share** di toolbar bawah Safari -> Pilih **"Add to Home Screen"**.
   - Aplikasi akan terbuka fullscreen tanpa bilah alamat Safari.
3. **Komputer Desktop / Laptop (Chrome / Edge):**
   - Muncul ikon install di ujung kanan bilah alamat URL browser -> Klik **"Install Pustaka"**.
