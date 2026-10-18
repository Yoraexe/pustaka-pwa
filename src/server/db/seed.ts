/**
 * @file src/server/db/seed.ts
 * @description Utilitas inisialisasi bersih basis data (Tanpa Data Dummy Buku/Akun) untuk input mandiri.
 * @layer Database Seeder
 *
 * Tujuan: Membersihkan seluruh data dummy (loans, book_copies, books, users, dan file sampel PDF) serta memastikan kategori dasar tersedia.
 * Caller: CLI script `npm run db:seed`.
 * Dependensi: src/server/db/index.ts, src/server/config/index.ts, fs, path.
 * Main Functions: runSeed.
 * Side Effects: Menghapus data dummy dari tabel aplikasi dan mereset sequence SQLite agar siap diisi manual oleh pengguna.
 */

import { sqlite } from './index.js';
import { authService } from '../services/auth.service.js';
import { config } from '../config/index.js';
import fs from 'fs';
import path from 'path';

export const runSeed = async () => {
  console.log('🧹 Memulai pembersihan seluruh data dummy & inisialisasi basis data bersih...');

  // 1. Bersihkan berkas tersisa di uploads/ebooks dan uploads/covers (kecuali .gitkeep)
  const dirsToClean = [
    config.uploadsFullPath,
    path.resolve(process.cwd(), './uploads/covers')
  ];
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      for (const file of fs.readdirSync(dir)) {
        if (file !== '.gitkeep') {
          try {
            fs.unlinkSync(path.join(dir, file));
          } catch {
            // Abaikan jika gagal hapus
          }
        }
      }
    }
  }

  // 2. Bersihkan seluruh tabel transaksi, buku, eksemplar, dan akun dummy
  sqlite.exec(`
    DELETE FROM loans;
    DELETE FROM book_copies;
    DELETE FROM books;
    DELETE FROM users;
    DELETE FROM sqlite_sequence WHERE name IN ('loans', 'book_copies', 'books', 'users');
  `);

  // 3. Pastikan kategori dasar katalog tersedia untuk dropdown Tambah Buku
  sqlite.exec(`
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

  // 4. Buat 1 Akun Utama Superadmin agar aplikasi langsung siap diuji
  await authService.registerUser({
    identityNumber: 'ADMIN01',
    name: 'Superadmin Perpustakaan',
    role: 'ADMIN',
    className: 'Administrator Utama',
    password: 'admin123'
  });

  console.log('✅ Basis data bersih! (0 buku, 0 eksemplar, 0 pinjaman, 1 akun Superadmin utama: ADMIN01).');
  console.log('🎉 Aplikasi siap untuk diinput data buku dan akun secara mandiri.');
};

runSeed()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error saat inisialisasi basis data:', err);
    process.exit(1);
  });

