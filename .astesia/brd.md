# Business Requirement Document (BRD) - Pustaka Sekolah PWA
**Project Name:** Pustaka Sekolah PWA (Sistem Perpustakaan Digital & Sirkulasi Fisik Hybrid)  
**Version:** 1.0.0  
**Status:** Approved by Product Layer  
**Author:** Astesia Autonomous Orchestrator (Product Agent)  

---

## 1. Executive Summary & Objective

### 1.1 Problem Statement
Perpustakaan sekolah saat ini menghadapi dua kendala utama:
1. Akses bahan bacaan digital (khususnya materi mata pelajaran seperti Informatika dan buku referensi lainnya) terbatas karena belum adanya platform e-library terpadu yang dapat diakses langsung dari gawai siswa (Android, iOS, dan Laptop) tanpa repot menginstal aplikasi dari app store berbayar.
2. Sirkulasi peminjaman buku fisik masih rentan pencatatan manual atau terpisah dari sistem digital, menyulitkan pustakawan dalam melacak ketersediaan stok buku di rak, riwayat peminjam, dan penagihan denda keterlambatan.

### 1.2 Primary Objective
Membangun platform perpustakaan sekolah **Hybrid (Digital & Fisik)** berbasis **Progressive Web App (PWA)** yang memungkinkan:
- Siswa dan guru meminjam serta membaca koleksi e-book (format PDF) langsung di aplikasi secara online maupun offline.
- Pustakawan mengelola sirkulasi peminjaman buku fisik (katalog rak, pencatatan pinjam/kembali, denda keterlambatan, dan pelacakan inventaris).
- Akses lintas platform (Web, Android, iOS) dengan performa ringan, konsumsi data hemat, dan proteksi hak cipta dokumen internal sekolah.

---

## 2. Target Users & Stakeholders

| User Role | Responsibilities / Goals | Permissions Level |
| :--- | :--- | :--- |
| **Siswa (Student)** | Mencari katalog, meminjam buku fisik, meminjam & membaca e-book PDF (online/offline), melihat riwayat pinjaman & notifikasi jatuh tempo. | **Level 1 (User)**: Read katalog, Borrow/Return e-book mandiri, Request pinjam buku fisik, View profil & denda pribadi. |
| **Guru (Teacher)** | Meminjam buku fisik (kuota lebih banyak), membaca e-book materi ajar, merekomendasikan buku untuk siswa. | **Level 2 (Privileged User)**: Read/Borrow dengan durasi lebih panjang (14-30 hari), Akses koleksi referensi khusus guru. |
| **Pustakawan (Librarian)** | Mengoperasikan meja sirkulasi (check-out/check-in buku fisik), manajemen katalog buku fisik & digital, validasi pengembalian & denda. | **Level 3 (Operator)**: CRUD Buku, Sirkulasi Fisik (Check-out, Check-in, Denda), Upload E-book PDF, Cetak barcode buku & kartu anggota. |
| **Administrator (Admin)** | Manajemen pengguna (import massal NISN siswa & NIP guru via CSV), konfigurasi sistem (aturan sirkulasi, tarif denda), audit log. | **Level 4 (Super Admin)**: Full Access ke seluruh master data, pengaturan sistem, dan laporan perpustakaan. |

---

## 3. Core Features & Business Rules

### 3.1 Manajemen Katalog Buku Hybrid (All-Rounder)
* **Description:** Sistem katalog terpadu yang mendukung pengelompokan buku berdasarkan tipe (Digital E-Book vs Buku Fisik) dan taksonomi multi-kategori (Informatika, Sains, Bahasa, Matematika, Fiksi, dll.).
* **Business Rules:**
  1. Setiap buku memiliki metadata wajib: Judul, Pengarang, Penerbit, Tahun Terbit, Kategori, Sub-kategori/Tag, Sinopsis, dan ISBN (opsional).
  2. Buku fisik wajib memiliki `Nomor Panggil (Call Number)`, `Lokasi Rak`, dan `Stok Eksemplar Fisik`.
  3. Buku digital wajib memiliki lampiran file `PDF` dan kuota lisensi peminjaman simultan (default: 5 peminjam bersamaan per judul buku digital).
* **Acceptance Criteria:**
  - *AC-1.1:* Saat pencarian dilakukan dengan kata kunci judul/penulis/kategori, sistem menampilkan hasil yang relevan dalam waktu < 500ms.
  - *AC-1.2:* Sistem menyediakan filter cepat: "Hanya Buku Digital" vs "Hanya Buku Fisik" vs "Tersedia Dipinjam".
  - *AC-1.3:* Detail buku fisik menampilkan ketersediaan stok riil (misal: "3 dari 5 eksemplar tersedia di Rak B-02").
* **Edge Cases & Negative Flow:**
  - Jika stok buku fisik habis (0 eksemplar tersedia), tombol pinjam fisik dinonaktifkan dan diganti opsi "Masuk Daftar Antrean/Reservasi".
  - Jika file PDF yang diunggah pustakawan korup atau bukan format PDF valid, sistem menolak upload dan menampilkan pesan: "Format file tidak valid. Harap unggah dokumen PDF standar".

---

### 3.2 Sirkulasi E-Book Digital & In-App Reader (PWA)
* **Description:** Mekanisme peminjaman e-book secara digital, pembacaan dokumen PDF di dalam aplikasi dengan pembatasan durasi pinjam dan pembacaan offline.
* **Business Rules:**
  1. Siswa dapat meminjam maksimal **2 e-book aktif** secara bersamaan dengan durasi pinjam **7 hari**.
  2. Guru dapat meminjam maksimal **5 e-book aktif** dengan durasi **14 hari**.
  3. Pengembalian e-book terjadi secara otomatis saat waktu jatuh tempo tercapai (revokasi akses baca), atau dapat dikembalikan secara manual lebih awal oleh pengguna.
  4. Untuk mencegah pembajakan dan kebocoran file, viewer e-book **wajib membubuhkan watermark dinamis** (Nama Lengkap + NISN/NIP) secara transparan di atas halaman baca. Tombol download file asli dinonaktifkan.
  5. Buku digital yang sedang dipinjam dapat diunduh ke penyimpanan cache lokal (IndexedDB) untuk dibaca saat perangkat offline.
* **Acceptance Criteria:**
  - *AC-2.1:* Given pengguna memiliki kuota pinjam, When menekan "Pinjam E-Book", Then status buku menjadi "Dipinjam" dan tombol "Baca Sekarang" aktif.
  - *AC-2.2:* Given masa pinjam telah lewat batas waktu (jatuh tempo), When pengguna membuka buku, Then sistem mencabut hak akses baca dan mengembalikan kuota lisensi ke katalog publik.
  - *AC-2.3:* Given perangkat dalam kondisi offline (Airplane Mode), When pengguna membuka e-book yang sudah pernah disimpan luring, Then reader tetap menampilkan isi buku tanpa error koneksi.
  - *AC-2.4:* Halaman pembaca PDF selalu menampilkan watermark identitas pengguna pada setiap halaman.
* **Edge Cases & Negative Flow:**
  - Jika kuota pinjam pengguna sudah penuh (misal: siswa sudah meminjam 2 e-book), sistem menolak peminjaman baru dan menampilkan pesan: "Batas maksimal peminjaman e-book tercapai. Kembalikan salah satu buku terlebih dahulu."
  - Jika lisensi simultan buku digital sedang habis dipakai siswa lain, sistem menampilkan status: "Buku sedang dipinjam penuh. Estimasi tersedia kembali pada [Tanggal]."

---

### 3.3 Sirkulasi Buku Fisik (Self-Service & Meja Pustakawan)
* **Description:** Modul sirkulasi buku fisik terpadu yang mendukung peminjaman langsung mandiri (*Self-Service Checkout*), reservasi tiket 24 jam, serta operasional meja sirkulasi pustakawan dengan pemindaian barcode/ID eksemplar.
* **Business Rules:**
  1. Peminjaman fisik dapat dilakukan melalui dua jalur:
     - **Mandiri (Self-Service):** Siswa/Guru memilih buku fisik/hybrid di Katalog atau Detail Buku dan menekan **"Pinjam Fisik"** (sistem mengalokasikan eksemplar `AVAILABLE` secara otomatis atau sesuai pilihan barcode).
     - **Meja Pustakawan:** Pustakawan memilih/memindai `Nomor Anggota (NISN/NIP)` dan `Barcode Eksemplar Buku`, atau mengklaim tiket reservasi 24 jam.
  2. Batas waktu peminjaman buku fisik: Siswa (7 hari, maks 3 buku), Guru (14 hari, maks 5 buku).
  3. **Pengembalian Instan Tanpa Batas Waktu Minimum:** Buku fisik yang berstatus `BORROWED` dapat dikembalikan **kapan saja saat itu juga** tanpa harus menunggu masa pinjam habis, baik melalui tombol **"Kembalikan Buku"** di halaman *Rak Buku Saya* (oleh peminjam) maupun tombol *1-Klik Kembalikan* di *Meja Sirkulasi* (oleh pustakawan/superadmin).
  4. Perpanjangan masa pinjam diperbolehkan maksimal 1 kali jika tidak ada antrean reservasi dari siswa lain.
  5. Keterlambatan pengembalian buku fisik dikenakan denda administratif (default: Rp 1.000 / hari keterlambatan per buku). Jika dikembalikan sebelum atau tepat tanggal jatuh tempo, denda = Rp 0.
* **Acceptance Criteria:**
  - *AC-3.1:* Saat pemustaka atau pustakawan memproses peminjaman buku fisik, stok eksemplar berkurang 1, status eksemplar menjadi `BORROWED`, dan tanggal jatuh tempo tercatat otomatis.
  - *AC-3.2:* Saat buku fisik dikembalikan (baik langsung di hari/menit yang sama maupun setelah beberapa hari), stok eksemplar langsung bertambah 1 dan status eksemplar kembali `AVAILABLE`.
  - *AC-3.3:* Saat proses pengembalian buku fisik yang terlambat, sistem otomatis mengkalkulasi nominal denda berdasarkan formula: `(Tanggal_Kembali - Tanggal_Jatuh_Tempo) * Tarif_Denda`.
* **Edge Cases & Negative Flow:**
  - Jika siswa memiliki tanggungan denda yang belum dibayar atau buku yang telat belum dikembalikan, sistem memblokir peminjaman buku fisik baru dengan peringatan: "Anggota memiliki penangguhan sirkulasi (Denda tertunggak: Rp X)".

---

### 3.4 Manajemen Akun Lokal, Registrasi Mandiri, & Panel Superadmin
* **Description:** Sistem otentikasi mandiri berbasis database sekolah dengan Panel Superadmin (`ADMIN`) untuk pembuatan/manajemen akun semua peran, fitur impor CSV massal, serta registrasi mandiri bagi Siswa dan Guru.
* **Business Rules:**
  1. **Superadmin (`ADMIN`)** memiliki akses ke **Panel Manajemen Akun** untuk:
     - Membuat akun baru secara manual untuk seluruh peran (`STUDENT`, `TEACHER`, `LIBRARIAN`, `ADMIN`).
     - Melihat daftar seluruh pengguna, memfilter berdasarkan peran/kata kunci, mengubah status aktif/nonaktif akun (`isActive`), dan mereset kata sandi pengguna.
     - Mengimpor data pengguna massal via CSV.
  2. **Registrasi Mandiri (Sign Up):** Siswa (`STUDENT`) dan Guru (`TEACHER`) dapat mendaftarkan akun baru secara mandiri dari halaman Login dan langsung masuk ke aplikasi. Pendaftaran mandiri membatasi peran secara ketat hanya pada `STUDENT` dan `TEACHER` untuk mencegah eskalasi hak akses.
  3. Sesi login menggunakan token JWT terenkripsi yang aman dan mendukung persistensi di PWA.
* **Acceptance Criteria:**
  - *AC-4.1:* Given kredensial yang valid atau setelah registrasi mandiri berhasil, When pengguna masuk/daftar, Then pengguna diarahkan ke antarmuka sesuai perannya.
  - *AC-4.2:* Given Superadmin membuka Panel Manajemen Akun, When Superadmin membuat akun baru atau menonaktifkan/mereset sandi akun, Then perubahan langsung berlaku di basis data.
  - *AC-4.3:* Given pengguna mendaftar mandiri, When mencoba mengirim role `ADMIN` atau `LIBRARIAN` pada endpoint publik, Then sistem menolak request dengan validasi skema Zod.
* **Edge Cases & Negative Flow:**
  - Superadmin tidak dapat menonaktifkan akunnya sendiri yang sedang aktif digunakan.
  - Jika terdapat duplikasi NISN/NIP saat pendaftaran atau impor CSV, sistem menolak/melewati duplikasi dengan pesan informatif.

---

### 3.5 Pengalaman PWA (Instalasi & Mode Offline)
* **Description:** Kemampuan aplikasi untuk bertindak selayaknya aplikasi native (WebAPK di Android, Home Screen App di iOS, Desktop PWA di Windows/Mac).
* **Business Rules:**
  1. Aplikasi wajib memenuhi kriteria PWA modern (Web App Manifest, Service Worker precache, dan status installable).
  2. Pada perangkat iOS, aplikasi menyediakan panduan visual interaktif ("Add to Home Screen") karena keterbatasan prompt otomatis Safari.
  3. Shell aplikasi (UI antarmuka, navigasi, katalog tersimpan) tetap dapat dibuka saat tidak ada jaringan internet.
* **Acceptance Criteria:**
  - *AC-5.1:* Skor PWA pada audit Google Lighthouse mencapai minimal **90/100**.
  - *AC-5.2:* Saat koneksi terputus, aplikasi menampilkan indikator banner non-intrusif: "Mode Offline - Menampilkan koleksi tersimpan".
* **Edge Cases & Negative Flow:**
  - Jika pengguna membuka fitur yang memerlukan koneksi real-time (seperti peminjaman baru buku fisik) saat offline, sistem menampilkan notifikasi: "Fitur ini membutuhkan koneksi internet. Silakan hubungkan kembali perangkat Anda."

---

## 4. Critical User Journeys (CUJ)

### CUJ 1: Siswa Meminjam dan Membaca E-Book Pelajaran Informatika Secara Offline
1. Siswa membuka PWA Pustaka Sekolah dari Home Screen smartphone (Android/iOS).
2. Siswa login menggunakan NISN dan kata sandi lokal.
3. Di halaman Beranda, siswa mencari "Informatika Kelas X" menggunakan kotak pencarian.
4. Siswa memilih buku, melihat detail ringkasan, dan menekan tombol **"Pinjam E-Book (7 Hari)"**.
5. Sistem memverifikasi kuota pinjam siswa dan lisensi buku, lalu menambahkan buku ke rak pribadi **"Buku Saya"**.
6. Siswa menekan tombol **"Download untuk Baca Offline"**. Service Worker mengunduh dan menyimpan cache PDF ke penyimpanan terisolasi (IndexedDB).
7. Siswa beralih ke Airplane Mode (tanpa internet).
8. Siswa membuka kembali aplikasi, masuk ke menu "Buku Saya", menekan buku tersebut. E-book terbuka di reader in-app dengan watermark transparan NISN siswa.

### CUJ 2: Pustakawan Memproses Pengembalian Buku Fisik & Kalkulasi Denda
1. Siswa mendatangi meja perpustakaan membawa buku cetak fisik yang dipinjam.
2. Pustakawan membuka menu **"Meja Sirkulasi"** di PWA desktop perpustakaan.
3. Pustakawan memindai barcode buku menggunakan barcode scanner (atau kamera perangkat).
4. Sistem langsung memuat data peminjam, tanggal pinjam, dan tanggal jatuh tempo.
5. Jika tanggal pengembalian melewati jatuh tempo (misal telat 3 hari):
   - Sistem menampilkan alert denda otomatis: Rp 3.000 (3 hari x Rp 1.000).
   - Pustakawan memilih status pembayaran: "Dibayar Lunas" atau "Ditangguhkan".
6. Pustakawan menekan tombol **"Konfirmasi Pengembalian"**.
7. Stok eksemplar buku otomatis bertambah 1 dan status peminjaman di akun siswa diperbarui menjadi "Selesai".

---

## 5. Non-Functional Requirements (NFR)

### 5.1 Performance
* **First Contentful Paint (FCP):** < 1.5 detik pada jaringan 4G standar.
* **Lighthouse Performance Score:** >= 85 pada perangkat mobile.
* **PDF Reader Rendering:** Halaman pertama PDF harus tampil dalam waktu < 1.2 detik setelah buku dibuka.

### 5.2 Security
* **Data Protection:** Seluruh transmisi data wajib melalui HTTPS (enkripsi TLS 1.3).
* **Credential Safety:** Password wajib di-hash menggunakan algoritma modern (Argon2id atau bcrypt) dengan salt yang unik. Password plaintext tidak boleh tersimpan dalam database.
* **Anti-Direct Scraping / Content Leak:** File PDF e-book tidak boleh di-expose secara publik melalui URL statis langsung (Direct S3/Storage Link). File disajikan melalui stream endpoint terautentikasi dengan token temporer.
* **RBAC Enforcement:** Validasi hak akses (Role-Based Access Control) diwajibkan pada setiap endpoint API, bukan hanya di sisi frontend.

### 5.3 Reliability & Storage
* **Graceful Degradation:** Jika IndexedDB gagal atau storage Safari dibersihkan oleh sistem operasi, aplikasi tetap dapat membaca online dengan melakukan re-fetch secara transparan.

---

## 6. Out of Scope (Explicitly Excluded from MVP)

Untuk menjaga ketepatan waktu pengiriman dan mencegah *scope creep*, fitur-fitur berikut **TIDAK TERMASUK** dalam versi MVP v1.0:
1. **DRM Kriptografis Tingkat Militer (Widevine/FairPlay):** Proteksi buku mengandalkan authenticated stream & dynamic watermark canvas; enkripsi DRM berbayar di luar lingkup sekolah.
2. **Format EPUB Reflowable Reader:** MVP berfokus secara ketat pada format **PDF** standar.
3. **Integrasi Payment Gateway Online (Midtrans/Xendit):** Pembayaran denda buku fisik dilakukan secara tunai/manual di meja pustakawan sekolah.
4. **Single Sign-On (SSO) Google / LDAP:** MVP menggunakan otentikasi akun lokal sekolah berbasis NISN/NIP dengan fitur import CSV.
5. **Aplikasi Native Kompilasi App Store (APK/IPA standalone):** Proyek murni berfokus pada standar PWA WebAPK / Add-to-Home-Screen.
