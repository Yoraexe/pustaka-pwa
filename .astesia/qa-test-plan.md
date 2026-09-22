# QA Test Plan & Audit Report - Pustaka Sekolah PWA
**Project Name:** Pustaka Sekolah PWA  
**Layer:** Phase 4 (Quality Layer)  
**Status:** PASSED (All criteria satisfied)  
**Date:** 2026-09-22T20:22:30+08:00  

---

## 1. Test Traceability Matrix (BRD Alignment)

| Test File | Test Description | BRD Acceptance Criterion | Status |
| :--- | :--- | :--- | :--- |
| `tests/unit/auth.service.test.ts` | Login dengan NISN & password valid | AC-4.1 (Kredensial valid mengembalikan token & profil) | ✅ PASSED |
| `tests/unit/auth.service.test.ts` | Login ditolak untuk password salah | AC-4.1 (Password salah mengembalikan error ramah) | ✅ PASSED |
| `tests/unit/auth.service.test.ts` | Login ditolak untuk identitas tidak terdaftar | AC-4.1 (NISN tidak dikenal) | ✅ PASSED |
| `tests/unit/auth.service.test.ts` | Verifikasi token JWT kedaluwarsa / valid | AC-4.1 (Keamanan sesi terenkripsi) | ✅ PASSED |
| `tests/unit/circulation.service.test.ts` | Meminjam e-book digital yang tersedia | AC-2.1 (Peminjaman e-book aktif) | ✅ PASSED |
| `tests/unit/circulation.service.test.ts` | Menolak meminjam ulang e-book yang sedang aktif | AC-2.1 (Pencegahan duplikasi pinjam) | ✅ PASSED |
| `tests/unit/circulation.service.test.ts` | Menolak peminjaman digital pada buku PHYSICAL_ONLY | AC-1.2 & AC-2.1 (Validasi tipe koleksi) | ✅ PASSED |
| `tests/unit/circulation.service.test.ts` | Mengembalikan e-book digital & merilis lisensi | AC-2.2 (Pengembalian e-book) | ✅ PASSED |
| `tests/unit/circulation.service.test.ts` | Menolak siswa melakukan sirkulasi fisik mandiri | AC-3.1 (Hanya pustakawan/admin yang berwenang) | ✅ PASSED |
| `tests/unit/circulation.service.test.ts` | Check-out dan pengembalian buku fisik di meja perpus | AC-3.1 & AC-3.2 (Sirkulasi fisik & stok eksemplar) | ✅ PASSED |
| `tests/integration/api.test.ts` | `GET /api/health` healthcheck | NFR-5.1 (Reliability & liveness probe) | ✅ PASSED |
| `tests/integration/api.test.ts` | `POST /api/auth/login` endpoint | AC-4.1 (Endpoint otentikasi) | ✅ PASSED |
| `tests/integration/api.test.ts` | `GET /api/books/categories` | AC-1.1 (Kategori taksonomi buku) | ✅ PASSED |
| `tests/integration/api.test.ts` | `GET /api/books` filter format & kategori | AC-1.1 & AC-1.2 (Pencarian katalog < 500ms) | ✅ PASSED |
| `tests/integration/api.test.ts` | `POST /api/circulation/digital/borrow` flow | CUJ 1 (Alur pinjam siswa via API) | ✅ PASSED |

**Total Tests:** 15 Passing | 0 Failing (100% Success Rate)  
**Test Runner:** Vitest v3.2.7

---

## 2. Architectural Audit (Astesia Directive Compliance)

- [x] **Directive #1 (Layered Architecture):** Controller hanya bertugas mem-parsing request Zod dan memanggil Service Layer. Tidak ada business logic di Controllers.
- [x] **Directive #1.5 (Frontend Architecture):** UI React decoupled dari business logic melalui `useAuth` hook dan API client.
- [x] **Directive #8 (Database Isolation):** Tidak ada SQL/Drizzle query yang dieksekusi di Controller atau Service; seluruh interaksi database terkapsulasi di `UserRepository`, `BookRepository`, dan `LoanRepository`.
- [x] **Directive #19 (Header Docs):** Setiap file baru memiliki JSDoc header lengkap yang menjelaskan layer, purpose, dan dependensi.
- [x] **Directive #21 (DBA Standards):** Parameterized queries via Drizzle ORM; SQLite foreign keys diaktifkan (`PRAGMA foreign_keys = ON`) dan menggunakan WAL mode (`PRAGMA journal_mode = WAL`).

---

## 3. Security Audit (Ruthless Quality Gate)

- [x] **Zero Hardcoded Secrets:** Konfigurasi kredensial dan JWT secret dikelola melalui variabel lingkungan (`src/server/config/index.ts`) dengan validasi Zod.
- [x] **Password Hashing:** Menggunakan `bcryptjs` dengan salt round 10. Tidak ada password plaintext yang tersimpan di database.
- [x] **SQL Injection Protection:** 100% query menggunakan Drizzle ORM query builder dan prepared statement.
- [x] **Anti-Content Leak / DRM Sederhana:** File PDF e-book tidak diekspos melalui link publik statis, melainkan melalui endpoint streaming terautentikasi (`/api/books/:id/stream-pdf`). Reader in-app membubuhkan watermark dinamis (NISN + Nama Siswa) pada canvas 2D.
- [x] **Role-Based Access Control (RBAC):** Rute meja sirkulasi fisik (`/checkout`, `/return`, `/all`) dilindungi middleware `requireRole(['LIBRARIAN', 'ADMIN'])`.

---

## 4. PWA & Offline Verification

- [x] **Web App Manifest:** Terkonfigurasi valid di `vite.config.ts` dengan nama "Pustaka Sekolah PWA", display `standalone`, dan icon maskable.
- [x] **Service Worker Precache:** Menghasilkan precache bundle (HTML, JS, CSS, Font) berukuran 242.69 KiB via Workbox.
- [x] **iOS Safari Accommodations:** Komponen `InstallPromptIOS.tsx` menyediakan modal panduan sentuh ("Share -> Add to Home Screen") bagi pengguna iPhone.
- [x] **Offline Banner:** Komponen `OfflineBanner.tsx` mendeteksi event `offline` secara real-time dan memberitahu siswa bahwa buku di rak tetap dapat dibaca.

---

## 5. Ponytail Review (Anti-Bloat & YAGNI)

- Menghindari ORM berat (Prisma/TypeORM) -> Diganti Drizzle ORM + better-sqlite3 yang ultra-ringan.
- Menghindari library state manajemen kompleks (Redux/Zustand) -> Diganti React Context API native (`useAuth.tsx`).
- Menghindari DRM third-party mahal -> Diganti Canvas HTML5 Watermark overlay native.

**Verdict:** **PASSED**. Pipeline diizinkan bertransisi ke **Phase 5: DevOps Layer**.
