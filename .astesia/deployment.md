# Panduan Deployment - Pustaka Sekolah PWA
**Project Name:** Pustaka Sekolah PWA  
**Layer:** Phase 5 (DevOps Layer)  
**Status:** Ready for Production  
**Architecture:** Single-Unit Production Container & Unified Express Node.js Server (Port 3001)

---

## 1. Opsi A: Local Server / Windows PC Sekolah + Cloudflare Tunnel (Paling Cepat & Gratis)

Cocok untuk pengujian langsung, operasional perpustakaan berbasis PC sekolah, atau demo ke pimpinan sekolah tanpa perlu menyewa VPS.

### Cara Menjalankan:
1. Pastikan dependensi sudah terinstal:
   ```bash
   cd D:\Workspaces\pustaka-sekolah-pwa
   npm install
   ```
2. Pastikan database lokal ter-seed:
   ```bash
   npm run db:seed
   ```
3. Jalankan server produksi dan public HTTPS tunnel:
   - **Metode 1 (Klik Ganda):** Jalankan file `start-production-public.bat`.
   - **Metode 2 (Terminal):** Jalankan perintah `npm run start:public`.
4. Salin URL HTTPS yang muncul di terminal (contoh: `https://xxxx.trycloudflare.com`).
5. Buka link tersebut di perangkat siswa/guru (Android, iOS, PC). PWA siap di-install langsung.

---

## 2. Opsi B: On-Premise Server Sekolah / NAS (Docker & Docker Compose)

Cocok jika sekolah memiliki PC Server khusus perpustakaan (Ubuntu Server / Debian / Synology NAS).

### Prasyarat:
- Docker Engine (v24+) & Docker Compose v2 terpasang.
- Node environment variables dikonfigurasi di `.env`.

### Langkah Deployment:
1. Siapkan file `.env`:
   ```bash
   cp .env.example .env
   # Edit .env dan pastikan JWT_SECRET diisi acak aman (>32 karakter)
   ```
2. Build dan jalankan container di latar belakang:
   ```bash
   docker compose up -d --build
   ```
3. Periksa status dan kesehatan container:
   ```bash
   docker compose ps
   docker compose logs -f
   ```
4. Kontainer berjalan di port `3001` secara non-root (`appuser`), dengan volume persisten `pustaka_data` (SQLite) dan `pustaka_uploads` (covers & e-books).

---

## 3. Opsi C: Cloud VPS Linux (Ubuntu / Debian - DigitalOcean, Linode, Biznet, dsb.)

Cocok untuk deployment resmi dengan nama domain sekolah (misal: `perpustakaan.sekolah.sch.id`).

### Langkah 1: Setup Node.js & Repository di VPS
```bash
# Update sistem & install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs build-essential

# Clone repository sekolah
git clone <URL_REPO_SEKOLAH> /var/www/pustaka-sekolah-pwa
cd /var/www/pustaka-sekolah-pwa

# Install dependensi & build frontend PWA
npm ci
npm run db:seed
npm run build
```

### Langkah 2: Setup PM2 Process Manager
```bash
# Install PM2 global
sudo npm install -g pm2

# Jalankan service pustaka sekolah
pm2 start "node --import tsx src/server/index.ts" --name "pustaka-pwa"
pm2 save
pm2 startup
```

### Langkah 3: Setup Nginx Reverse Proxy & SSL (Wajib untuk PWA)
Install Nginx dan Certbot:
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Konfigurasi Virtual Host `/etc/nginx/sites-available/pustaka`:
```nginx
server {
    server_name perpustakaan.sekolah.sch.id;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
Aktifkan dan pasang SSL gratis Let's Encrypt:
```bash
sudo ln -s /etc/nginx/sites-available/pustaka /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d perpustakaan.sekolah.sch.id
```

---

## 4. Opsi D: Cloud PaaS (Railway, Render, Fly.io)

Jika menggunakan platform PaaS berbasis container/Git:
- **Build Command:** `npm run build`
- **Start Command:** `npm run start` (menjalankan port 3001 yang melayani Express API + static SPA PWA)
- **PERINGATAN ARSITEKTUR:** Karena basis data menggunakan SQLite (`pustaka.db`) dan upload berkas lokal (`uploads/`), Anda **WAJIB memasang Persistent Disk/Volume** pada mount path:
  - Mount path DB: `/app/data` atau atur `DATABASE_URL` ke direktori persistent disk.
  - Mount path Uploads: atur `UPLOADS_DIR` ke direktori persistent disk.
  *(Jika tanpa persistent volume, data sirkulasi dan buku akan hilang setiap kali kontainer restart/redeploy).*

---

## 5. Kredensial Akun Bawaan (Default Seeded Accounts)

| Peran | Username / No. Identitas | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **Siswa 1** | `NISN202601` | `siswa123` | Akses katalog, baca PDF online/offline, pinjam mandiri, reservasi buku fisik. |
| **Siswa 2** | `NISN202602` | `siswa123` | Akun siswa kedua untuk pengujian kuota & antrean. |
| **Pustakawan** | `PUSTAKA01` | `pustaka123` | Meja sirkulasi fisik, serah terima reservasi, pengembalian buku, denda. |
| **Guru TIK** | `GURU001` | `guru123` | Kuota pinjam 5 buku, durasi 14 hari. |
| **Super Admin** | `ADMIN01` | `admin123` | Master data buku, tambah PDF/cover, manajemen akun pengguna, reset password, import CSV. |

---

## 6. Prosedur Backup & Restore Data Sekolah

Karena SQLite menggunakan single file database, pencadangan (backup) sangat sederhana dan aman:
- **File Database:** `pustaka.db` (disarankan backup berkala via cron job atau copy harian).
- **File Cover & E-Book:** Folder `uploads/covers/` dan `uploads/ebooks/`.
- Perintah backup cepat:
  ```bash
  # Backup database aman menggunakan SQLite CLI .backup
  sqlite3 pustaka.db ".backup 'backup_pustaka_$(date +%Y%m%d).db'"
  # Backup arsip uploads
  tar -czf "backup_uploads_$(date +%Y%m%d).tar.gz" uploads/
  ```
