# System Architecture - Pustaka Sekolah PWA
**Project Name:** Pustaka Sekolah PWA (Hybrid Digital & Physical School Library)  
**Version:** 1.0.0  
**Pattern:** Modular Monolith (Clean Layered Architecture: `Controller -> Service -> Repository`)  

---

## 1. Overview & Pattern

### 1.1 Core Pattern
Aplikasi dirancang menggunakan pola **Modular Monolith** dengan pemisahan lapisan tanggung jawab yang ketat (*Strict Layer Decoupling*):
* **Presentation / PWA Layer (Client):** Single Page Application reaktif dengan Service Worker (PWA) untuk caching offline dan canvas rendering untuk pembacaan e-book PDF.
* **API / Controller Layer (HTTP):** *Thin Controllers* yang hanya bertugas melakukan validasi payload request (menggunakan Zod) dan memanggil Service Layer.
* **Service Layer (Domain Logic):** Pusat seluruh aturan bisnis perpustakaan (kalkulasi jatuh tempo, validasi kuota peminjaman, aturan perpanjangan, penghitungan denda, dan revokasi akses e-book).
* **Repository / Data Access Layer:** Bertanggung jawab penuh terhadap eksekusi query ke database melalui Drizzle ORM. Controller dilarang keras memanggil Repository atau database secara langsung.

### 1.2 Monolith vs Microservices
* **Keputusan:** **Modular Monolith**.
* **Rasional:** Untuk lingkungan perpustakaan sekolah dengan skala pengguna ratusan hingga beberapa ribu siswa, arsitektur Microservices akan memperkenalkan *over-engineering* dan biaya operasional jaringan yang tidak rasional. Modular Monolith menyatukan kemudahan *single-command deployment* di server sekolah dengan keterpisahan kode (*separation of concerns*) yang bersih.

### 1.3 Scaling & Offline Strategy
* **Read-Heavy Optimization:** Katalog buku dan metadata di-cache pada browser client melalui HTTP caching dan IndexedDB.
* **Offline PWA Resilience:** Service Worker melakukan precache terhadap seluruh static assets (HTML, JS, CSS, Icons), sedangkan file PDF e-book yang sedang dipinjam disimpan ke IndexedDB terenkripsi lokal untuk dibaca tanpa jaringan internet.

---

## 2. Tech Stack

| Layer | Technology | Justifikasi Teknis |
| :--- | :--- | :--- |
| **Frontend / PWA Client** | React 18 + Vite + TypeScript + Tailwind CSS | Fast HMR, bundle size kecil, ekosistem PWA matang melalui `@vite-pwa/vite-plugin-pwa` (Workbox). |
| **E-Book Engine** | PDF.js (Mozilla) + HTML5 Canvas | Standar industri rendering PDF berbasis browser tanpa dependensi plugin eksternal; mendukung injeksi watermark dinamis di layer canvas. |
| **Backend API** | Node.js + Express / Hono + TypeScript | *High throughput*, penanganan streaming file PDF yang efisien, dan dukungan TypeScript end-to-end. |
| **Database & ORM** | SQLite (`better-sqlite3`) + Drizzle ORM | Database embedded tanpa konfigurasi rumit, performa query super cepat (< 1ms), backup mudah (hanya 1 file `pustaka.db`), ideal untuk server lokal sekolah. |
| **Validation** | Zod | Schema-first type-safe validation untuk seluruh request payload dan environment variables. |
| **Authentication** | JWT (JSON Web Tokens) + Password Hashing (bcrypt) | Token terenkripsi dengan masa berlaku terkontrol dan RBAC (*Role-Based Access Control*). |
| **Testing** | Vitest + Supertest | Runner unit test super cepat yang kompatibel penuh dengan pipeline Vite/ESM. |

---

## 3. Data Flow & Sequence Diagram

### 3.1 Alur Peminjaman E-Book Digital
```mermaid
sequenceDiagram
    autonumber
    actor Siswa as Siswa (PWA Client)
    participant Ctrl as LoanController
    participant Svc as CirculationService
    participant Repo as LoanRepository
    participant DB as SQLite Database

    Siswa->>Ctrl: POST /api/loans/digital { bookId: 101 } (Bearer Token)
    Ctrl->>Ctrl: Zod Validate Token & Payload
    Ctrl->>Svc: borrowDigitalBook(userId, bookId)
    Svc->>Repo: countActiveLoans(userId, "DIGITAL")
    Repo->>DB: SELECT count(*) WHERE user_id = ? AND status = 'BORROWED'
    DB-->>Repo: 1
    Note over Svc: Cek kuota: Siswa max 2 (1 < 2 -> Lolos)
    Svc->>Repo: checkDigitalAvailability(bookId)
    Repo->>DB: Query total licenses vs active borrowed
    DB-->>Repo: Available (2 licenses left)
    Svc->>Repo: createLoanRecord(loanData)
    Repo->>DB: INSERT INTO loans (user_id, book_id, type, due_date, status)
    DB-->>Repo: Loan Created (ID: 550)
    Repo-->>Svc: Loan Entity
    Svc-->>Ctrl: Success Response Object
    Ctrl-->>Siswa: 201 Created { success: true, loanId: 550, dueDate: "2026-09-29" }
```

### 3.2 Alur Meja Sirkulasi Buku Fisik & Pengembalian (Pustakawan)
```mermaid
sequenceDiagram
    autonumber
    actor Pustakawan as Pustakawan (Desk PWA)
    participant Ctrl as CirculationController
    participant Svc as CirculationService
    participant Repo as BookRepository
    participant DB as SQLite Database

    Pustakawan->>Ctrl: POST /api/circulation/return { copyBarcode: "BK-00912" }
    Ctrl->>Svc: returnPhysicalBook(barcode)
    Svc->>Repo: findActiveLoanByBarcode(barcode)
    Repo->>DB: SELECT * FROM loans JOIN book_copies ...
    DB-->>Repo: Loan Found (DueDate: 2026-09-18, Today: 2026-09-22)
    Note over Svc: Keterlambatan: 4 hari.<br/>Denda: 4 x Rp 1.000 = Rp 4.000
    Svc->>Repo: updateLoanReturn(loanId, fineAmount)
    Repo->>DB: UPDATE loans SET status = 'RETURNED', fine_amount = 4000
    Svc->>Repo: incrementAvailableStock(bookId)
    Repo->>DB: UPDATE books SET available_copies = available_copies + 1
    DB-->>Repo: OK
    Repo-->>Svc: Return Summary
    Svc-->>Ctrl: Result { overdueDays: 4, fine: 4000 }
    Ctrl-->>Pustakawan: 200 OK { success: true, message: "Buku berhasil dikembalikan", fine: 4000 }
```

---

## 4. Database Schema Specification (Drizzle ORM)

```mermaid
erDiagram
    USERS ||--o{ LOANS : borrows
    USERS {
        int id PK
        string identity_number "NISN / NIP (Unique)"
        string name
        string role "STUDENT, TEACHER, LIBRARIAN, ADMIN"
        string class_name "Kelas/Jurusan (khusus siswa)"
        string password_hash
        boolean is_active
        timestamp created_at
    }
    CATEGORIES ||--o{ BOOKS : categorizes
    CATEGORIES {
        int id PK
        string name "Informatika, Sains, Bahasa, dll"
        string slug
    }
    BOOKS ||--o{ BOOK_COPIES : contains
    BOOKS ||--o{ LOANS : recorded_in
    BOOKS {
        int id PK
        int category_id FK
        string title
        string author
        string publisher
        int publication_year
        string isbn
        string book_type "HYBRID, DIGITAL_ONLY, PHYSICAL_ONLY"
        string cover_url
        string ebook_file_path "Path file PDF internal"
        int digital_license_count "Batas peminjaman digital simultan"
        int total_physical_copies "Total eksemplar fisik"
        int available_physical_copies "Eksemplar fisik di rak"
        string shelf_location "Nomor rak (contoh: RAK-IF-01)"
        timestamp created_at
    }
    BOOK_COPIES {
        int id PK
        int book_id FK
        string barcode "Barcode unik eksemplar (BK-XXXX)"
        string status "AVAILABLE, BORROWED, DAMAGED, LOST"
    }
    LOANS {
        int id PK
        int user_id FK
        int book_id FK
        int copy_id FK "Nullable untuk peminjaman digital"
        string loan_type "DIGITAL, PHYSICAL"
        timestamp borrow_date
        timestamp due_date
        timestamp return_date "Nullable jika masih dipinjam"
        string status "BORROWED, RETURNED, OVERDUE"
        int fine_amount "Nominal denda dalam Rupiah"
        boolean is_fine_paid
    }
```

---

## 5. Directory & Folder Layout (Modular Clean Architecture)

Sesuai `skills/architecture/layered-architecture`:
```
pustaka-sekolah-pwa/
├── .astesia/                         # Astesia context, state, and pipeline artifacts
│   ├── astesia-state.json
│   ├── brd.md
│   ├── design-system.md
│   └── architecture.md
├── uploads/                          # Direktori penyimpanan privat file e-book PDF
│   └── ebooks/
├── src/
│   ├── client/                       # Frontend PWA (React + Tailwind + Vite)
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/               # Button, Input, Modal, Badge
│   │   │   ├── catalog/              # BookCard, BookGrid, SearchFilter
│   │   │   ├── reader/               # PDFViewer, WatermarkOverlay, ReaderControls
│   │   │   ├── circulation/          # BarcodeScanner, LoanTable, FineModal
│   │   │   └── pwa/                  # OfflineBanner, InstallPromptIOS
│   │   ├── hooks/                    # useAuth, useOfflineCatalog, usePWA
│   │   ├── pages/                    # Home, Catalog, BookDetail, MyBooks, Reader, AdminCirculation
│   │   ├── services/                 # API client wrapper
│   │   ├── styles/                   # Tailwind CSS tokens
│   │   └── main.tsx
│   ├── server/                       # Backend Clean Architecture (Node.js/Express)
│   │   ├── config/                   # Env validation (Zod), App constants
│   │   ├── db/
│   │   │   ├── schema.ts             # Drizzle ORM Table Definitions
│   │   │   ├── index.ts              # SQLite database connection pool
│   │   │   └── seed.ts               # Sample data buku informatika & akun awal
│   │   ├── controllers/              # Thin Controllers (Request -> Service -> JSON)
│   │   │   ├── auth.controller.ts
│   │   │   ├── book.controller.ts
│   │   │   ├── loan.controller.ts
│   │   │   └── circulation.controller.ts
│   │   ├── services/                 # Pure Business Logic
│   │   │   ├── auth.service.ts
│   │   │   ├── book.service.ts
│   │   │   ├── loan.service.ts
│   │   │   └── circulation.service.ts
│   │   ├── repositories/             # Data Access Layer (Drizzle Queries)
│   │   │   ├── user.repository.ts
│   │   │   ├── book.repository.ts
│   │   │   └── loan.repository.ts
│   │   ├── middleware/               # Auth, RBAC, Error Handler, Rate Limiting
│   │   └── app.ts                    # Express app definition & route mapping
│   └── shared/                       # Shared Types & Zod Schemas (Contract)
│       ├── types/
│       └── schemas/
├── tests/                            # Unit & Integration Tests (Vitest)
│   ├── unit/
│   └── integration/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

---

## 6. Minimalist Execution Strategy (Ponytail Protocol)

* **Dependensi yang Ditolak (Anti-Bloat):**
  - Menolak *Heavy ORMs* seperti TypeORM/Prisma (terlalu banyak file `node_modules` dan overhead kompilasi) -> Menggunakan **Drizzle ORM** yang sangat tipis dan zero-runtime-overhead.
  - Menolak *Heavy DRM frameworks* berbayar -> Menggunakan **In-App PDF Canvas Watermark** yang 100% native browser tanpa biaya lisensi.
  - Menolak *Redux Toolkit* -> Menggunakan state management native React context / lightweight store.
* **Native / Stdlib yang Digunakan:**
  - `crypto.subtle` / native Node.js `crypto` untuk hashing dan token signing.
  - Native HTML5 Canvas 2D API untuk rendering watermark.
  - `localStorage` dan `IndexedDB` standar browser untuk caching offline.

---

## 7. Architecture Decision Records (ADR)

### ADR 001: SQLite (`better-sqlite3`) sebagai Mesin Database Utama
* **Konteks:** Perpustakaan sekolah membutuhkan sistem yang mandiri, mudah di-backup, dan tidak memerlukan tim DevOps khusus untuk maintenance server DB.
* **Keputusan:** Menggunakan SQLite dengan driver `better-sqlite3` dan WAL (Write-Ahead Logging) mode.
* **Konsekuensi:** Performa baca luar biasa cepat (< 1ms). Backup data semudah menyalin satu file `pustaka.db`. Skalabilitas mencukupi hingga 50.000 buku dan ribuan transaksi harian sekolah.

### ADR 002: In-App PDF Canvas Rendering dengan Dynamic Watermark
* **Konteks:** Menghindari pembajakan atau penyebaran bebas file e-book sekolah oleh siswa ke luar lingkungan sekolah.
* **Keputusan:** Dokumen PDF dibaca secara eksklusif menggunakan viewer in-app berbasis canvas. Setiap halaman di-overlay watermark transparan berisi Nama Lengkap dan NISN peminjam.
* **Konsekuensi:** Siswa tidak memiliki akses ke URL langsung file `.pdf`. Jika siswa melakukan screenshot, identitas pemilik akun langsung terpampang pada gambar hasil tangkapan layar.

### ADR 003: PWA Service Worker Cache Strategy (Stale-While-Revalidate + Cache-First)
* **Konteks:** Memenuhi kebutuhan akses multi-platform (Android/iOS) dan dapat membaca buku saat perangkat offline.
* **Keputusan:**
  - Asset statis aplikasi (UI, JS, CSS, Font) menggunakan strategi **Cache-First**.
  - Metadata katalog buku menggunakan strategi **Stale-While-Revalidate**.
  - Dokumen e-book yang dipinjam disimpan dalam **IndexedDB Blob Storage** dengan verifikasi jatuh tempo saat aplikasi kembali online.
