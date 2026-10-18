/**
 * @file src/server/db/index.ts
 * @description Inisialisasi koneksi SQLite database dengan Drizzle ORM dan bootstrap tabel otomatis.
 * @layer Database Connection Layer
 *
 * Tujuan: Membuka koneksi SQLite WAL mode, memastikan struktur DDL tabel mutakhir, dan menginisialisasi kategori dasar katalog.
 * Caller: Seluruh repository layer, seed script, dan test suite.
 * Dependensi: better-sqlite3, drizzle-orm, src/server/db/schema.ts, src/server/config/index.ts.
 * Main Functions: sqlite, db.
 * Side Effects: Membuat berkas SQLite, tabel-tabel skema, dan kategori dasar jika belum tersedia.
 */

import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';
import { config } from '../config/index.js';
import fs from 'fs';
import path from 'path';

// Pastikan direktori database dan uploads tersedia
const dbDir = path.dirname(config.databaseFullPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

if (!fs.existsSync(config.uploadsFullPath)) {
  fs.mkdirSync(config.uploadsFullPath, { recursive: true });
}

// Inisialisasi better-sqlite3 instance dengan WAL mode
export const sqlite = new Database(config.databaseFullPath);
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('foreign_keys = ON');

// Bootstrap tables jika belum ada
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identity_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT',
    class_name TEXT,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT NOT NULL,
    publication_year INTEGER NOT NULL,
    isbn TEXT,
    book_type TEXT NOT NULL DEFAULT 'HYBRID',
    cover_url TEXT,
    ebook_file_path TEXT,
    digital_license_count INTEGER NOT NULL DEFAULT 5,
    total_physical_copies INTEGER NOT NULL DEFAULT 1,
    available_physical_copies INTEGER NOT NULL DEFAULT 1,
    shelf_location TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS book_copies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    book_id INTEGER NOT NULL REFERENCES books(id),
    copy_id INTEGER REFERENCES book_copies(id),
    loan_type TEXT NOT NULL,
    borrow_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL DEFAULT 'BORROWED',
    fine_amount INTEGER NOT NULL DEFAULT 0,
    is_fine_paid INTEGER NOT NULL DEFAULT 0,
    is_renewed INTEGER NOT NULL DEFAULT 0,
    reservation_code TEXT,
    reserved_until TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Performance Indexes (DBA-Grade Standards - Astesia Quality Rule #6)
  CREATE INDEX IF NOT EXISTS idx_loans_user_status ON loans(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_loans_book_status ON loans(book_id, status);
  CREATE INDEX IF NOT EXISTS idx_loans_copy_id ON loans(copy_id);
  CREATE INDEX IF NOT EXISTS idx_loans_res_code ON loans(reservation_code);
  CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
  CREATE INDEX IF NOT EXISTS idx_book_copies_book_id ON book_copies(book_id);
  CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);

  INSERT OR IGNORE INTO categories (name, slug) VALUES
    ('Informatika & Komputer', 'informatika'),
    ('Sains & Matematika', 'sains-matematika'),
    ('Bahasa & Sastra', 'bahasa-sastra'),
    ('Ilmu Pengetahuan Sosial & Sejarah', 'ips-sejarah'),
    ('Agama & Budi Pekerti', 'agama-budi-pekerti'),
    ('Seni, Budaya & Prakarya', 'seni-budaya'),
    ('Fiksi, Novel & Literasi', 'fiksi-literasi'),
    ('Pengetahuan Umum & Referensi', 'umum');
`);

export const db = drizzle(sqlite, { schema });

