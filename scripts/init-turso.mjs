import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://pustaka-pwa-yoraexe.aws-ap-northeast-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || ''
});

async function main() {
  await client.executeMultiple(`
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

    CREATE INDEX IF NOT EXISTS idx_loans_user_status ON loans(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_loans_book_status ON loans(book_id, status);
    CREATE INDEX IF NOT EXISTS idx_loans_copy_id ON loans(copy_id);
    CREATE INDEX IF NOT EXISTS idx_loans_res_code ON loans(reservation_code);
    CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
    CREATE INDEX IF NOT EXISTS idx_book_copies_book_id ON book_copies(book_id);
    CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);
    CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

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

  const hash = bcrypt.hashSync('admin123', 10);
  await client.execute({
    sql: 'INSERT OR IGNORE INTO users (identity_number, name, role, password_hash, is_active) VALUES (?, ?, ?, ?, 1)',
    args: ['ADMIN01', 'Super Admin Perpustakaan', 'ADMIN', hash]
  });

  const catResult = await client.execute('SELECT COUNT(*) as count FROM categories');
  const userResult = await client.execute("SELECT identity_number, role FROM users WHERE identity_number = 'ADMIN01'");

  console.log('TURSO_BOOTSTRAP_COMPLETE');
  console.log('Total Categories:', catResult.rows[0].count);
  console.log('Superadmin Seeded:', userResult.rows[0]);
}

main().catch(console.error);
