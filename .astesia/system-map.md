# System Map - Pustaka Sekolah PWA
**Project Name:** Pustaka Sekolah PWA  
**Updated:** 2026-09-22T20:22:15+08:00  
**Status:** In-Sync  

---

## 1. Architecture Topology

```mermaid
graph TD
    Client["PWA Client (React + Vite + Tailwind + Workbox)"] -->|HTTP / JSON| App["Express App (src/server/app.ts)"]
    App --> AuthCtrl["auth.controller.ts"]
    App --> BookCtrl["book.controller.ts"]
    App --> CircCtrl["circulation.controller.ts"]

    AuthCtrl --> AuthSvc["auth.service.ts"]
    BookCtrl --> BookSvc["book.service.ts"]
    CircCtrl --> CircSvc["circulation.service.ts"]

    AuthSvc --> UserRepo["user.repository.ts"]
    BookSvc --> BookRepo["book.repository.ts"]
    CircSvc --> LoanRepo["loan.repository.ts"]
    CircSvc --> BookRepo
    CircSvc --> UserRepo

    UserRepo --> SQLite[("SQLite: pustaka.db")]
    BookRepo --> SQLite
    LoanRepo --> SQLite
```

---

## 2. Directory Navigation & Trace-by-Function

| Layer | File Path | Main Exports / Key Functions |
| :--- | :--- | :--- |
| **PWA Presentation** | `src/client/App.tsx` | Root layout, tab routing (`catalog`, `my-books`, `circulation`, `profile`). |
| | `src/client/components/reader/PDFReader.tsx` | In-app canvas PDF reader with dynamic student watermark (NISN + Nama) & Sepia/Dark themes. |
| | `src/client/components/circulation/CirculationDesk.tsx` | Meja sirkulasi pustakawan: check-out fisik, check-in, dan kalkulasi denda otomatis. |
| | `src/client/components/pwa/OfflineBanner.tsx` | Realtime network status & offline notice. |
| | `src/client/components/pwa/InstallPromptIOS.tsx` | Interactive 'Add to Home Screen' modal for iOS Safari. |
| | `src/client/components/catalog/BookCard.tsx` | Hybrid format badge (`[E-Book]`, `[Fisik]`, `[Hybrid]`), stock status, shelf locator. |
| | `src/client/hooks/useAuth.tsx` | Reactive authentication context & user role management. |
| | `src/client/services/api.ts` | Type-safe REST API client wrapper. |
| **Controllers (HTTP)** | `src/server/controllers/auth.controller.ts` | `POST /login`, `GET /me`, `POST /register`. |
| | `src/server/controllers/book.controller.ts` | `GET /categories`, `GET /`, `GET /:id`, `POST /`, `GET /:id/stream-pdf`. |
| | `src/server/controllers/circulation.controller.ts` | `POST /digital/borrow`, `POST /digital/return`, `POST /physical/checkout`, `POST /physical/return`, `GET /my-loans`, `GET /all`. |
| **Services (Business)** | `src/server/services/auth.service.ts` | `login()`, `registerUser()`, `verifyToken()`. |
| | `src/server/services/book.service.ts` | `searchBooks()`, `getBookDetail()`, `addNewBook()`. |
| | `src/server/services/circulation.service.ts` | `borrowDigitalBook()`, `returnDigitalBook()`, `checkOutPhysicalBook()`, `returnPhysicalBook()`. |
| **Repositories (Data)** | `src/server/repositories/user.repository.ts` | `findById()`, `findByIdentityNumber()`, `create()`. |
| | `src/server/repositories/book.repository.ts` | `findBooks()`, `findById()`, `create()`, `findCopyByBarcode()`, `updateAvailableCopies()`. |
| | `src/server/repositories/loan.repository.ts` | `findActiveLoan()`, `countActiveUserLoans()`, `create()`, `updateReturn()`. |
| **Database DDL** | `src/server/db/schema.ts` | Drizzle ORM schema for `users`, `categories`, `books`, `bookCopies`, `loans`. |
| | `src/server/db/index.ts` | SQLite connection with WAL mode & bootstrap DDL. |
| | `src/server/db/seed.ts` | Seeder for categories, sample books (Informatika), demo users, & sample PDF. |

---

## 3. Test Coverage Map

* `tests/unit/auth.service.test.ts` (4 unit tests)
* `tests/unit/circulation.service.test.ts` (6 unit tests)
* `tests/integration/api.test.ts` (5 integration tests)
* Total Tests: **15 passing (100%)**
