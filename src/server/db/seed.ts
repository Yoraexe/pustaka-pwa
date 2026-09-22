/**
 * @file src/server/db/seed.ts
 * @description Seeder untuk inisialisasi data awal (Kategori, Buku Informatika, dan Akun Pengguna).
 * @layer Database Seeder
 */

import { authService } from '../services/auth.service.js';
import { bookRepository } from '../repositories/book.repository.js';
import { bookService } from '../services/book.service.js';
import { config } from '../config/index.js';
import fs from 'fs';
import path from 'path';

export const runSeed = async () => {
  console.log('🌱 Memulai proses seeding data perpustakaan...');

  // 1. Buat direktori dan file dummy sample PDF jika belum ada
  const samplePdfDir = config.uploadsFullPath;
  if (!fs.existsSync(samplePdfDir)) {
    fs.mkdirSync(samplePdfDir, { recursive: true });
  }

  const samplePdfPath = path.join(samplePdfDir, 'sample-informatika-10.pdf');
  if (!fs.existsSync(samplePdfPath)) {
    // Minimal valid 1-page PDF
    const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 134 >>
stream
BT
/F1 24 Tf
72 700 Td
(BUKU INFORMATIKA KELAS X - PUSTAKA SEKOLAH) Tj
0 -36 Td
/F1 14 Tf
(Selamat datang di E-Book Reader PWA Perpustakaan Sekolah.) Tj
ET
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000236 00000 n 
0000000421 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
498
%%EOF`;
    fs.writeFileSync(samplePdfPath, minimalPdf, 'utf-8');
    console.log('📄 Dummy e-book PDF dibuat di:', samplePdfPath);
  }

  // 2. Seeding Kategori
  const catInformatika = await bookRepository.findCategoryBySlug('informatika') ||
    await bookRepository.createCategory('Informatika & Komputer', 'informatika');

  const catSains = await bookRepository.findCategoryBySlug('sains-matematika') ||
    await bookRepository.createCategory('Sains & Matematika', 'sains-matematika');

  const catBahasa = await bookRepository.findCategoryBySlug('bahasa-sastra') ||
    await bookRepository.createCategory('Bahasa & Sastra', 'bahasa-sastra');

  await bookRepository.findCategoryBySlug('umum') ||
    await bookRepository.createCategory('Pengetahuan Umum & Referensi', 'umum');

  console.log('✅ Kategori berhasil diinisialisasi.');

  // 3. Seeding Pengguna Default (Password standard: password123 / peran123)
  const usersToSeed = [
    {
      identityNumber: 'ADMIN01',
      name: 'Administrator Perpustakaan',
      role: 'ADMIN' as const,
      className: null,
      password: 'admin123'
    },
    {
      identityNumber: 'PUSTAKA01',
      name: 'Ibu Siti Rahmawati, S.Ptk',
      role: 'LIBRARIAN' as const,
      className: null,
      password: 'pustaka123'
    },
    {
      identityNumber: 'GURU001',
      name: 'Budi Santoso, S.Kom',
      role: 'TEACHER' as const,
      className: null,
      password: 'guru123'
    },
    {
      identityNumber: 'NISN202601',
      name: 'Ahmad Rizky Pratama',
      role: 'STUDENT' as const,
      className: 'X RPL 1',
      password: 'siswa123'
    },
    {
      identityNumber: 'NISN202602',
      name: 'Nabila Putri Cahyani',
      role: 'STUDENT' as const,
      className: 'X RPL 2',
      password: 'siswa123'
    },
    {
      identityNumber: 'NISN202603',
      name: 'Dimas Arya Wijaya',
      role: 'STUDENT' as const,
      className: 'XI TKJ 1',
      password: 'siswa123'
    }
  ];

  for (const u of usersToSeed) {
    try {
      await authService.registerUser(u);
      console.log(`👤 Akun dibuat: [${u.role}] ${u.name} (${u.identityNumber})`);
    } catch {
      // Lewati jika sudah ada
    }
  }

  // 4. Seeding Koleksi Buku
  const existingBooks = await bookRepository.findBooks({ bookType: 'ALL' });
  if (existingBooks.length === 0) {
    const booksToSeed = [
      {
        categoryId: catInformatika.id,
        title: 'Informatika untuk SMA/MA Kelas X',
        author: 'Pusat Kurikulum dan Perbukuan Kemendikbudristek',
        publisher: 'Kementerian Pendidikan, Kebudayaan, Riset, dan Teknologi',
        publicationYear: 2023,
        isbn: '978-602-244-503-6',
        bookType: 'HYBRID' as const,
        coverUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=500&auto=format&fit=crop&q=60',
        ebookFilePath: './uploads/ebooks/sample-informatika-10.pdf',
        digitalLicenseCount: 10,
        totalPhysicalCopies: 5,
        shelfLocation: 'RAK-INF-01'
      },
      {
        categoryId: catInformatika.id,
        title: 'Algoritma dan Struktur Data Terapan',
        author: 'Dr. Ir. Rinaldi Munir, M.T.',
        publisher: 'Informatika Bandung',
        publicationYear: 2022,
        isbn: '978-623-7131-40-1',
        bookType: 'HYBRID' as const,
        coverUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=500&auto=format&fit=crop&q=60',
        ebookFilePath: './uploads/ebooks/sample-informatika-10.pdf',
        digitalLicenseCount: 5,
        totalPhysicalCopies: 3,
        shelfLocation: 'RAK-INF-02'
      },
      {
        categoryId: catInformatika.id,
        title: 'Rekayasa Perangkat Lunak Modern & DevOps',
        author: 'Eko Kurniawan Khannedy',
        publisher: 'Tech Edu Press',
        publicationYear: 2024,
        isbn: '978-623-9999-12-0',
        bookType: 'DIGITAL_ONLY' as const,
        coverUrl: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=500&auto=format&fit=crop&q=60',
        ebookFilePath: './uploads/ebooks/sample-informatika-10.pdf',
        digitalLicenseCount: 15,
        totalPhysicalCopies: 0,
        shelfLocation: null
      },
      {
        categoryId: catInformatika.id,
        title: 'Jaringan Komputer dan Keamanan Siber',
        author: 'Iwan Sofana',
        publisher: 'Informatika Bandung',
        publicationYear: 2021,
        isbn: '978-602-1514-46-7',
        bookType: 'HYBRID' as const,
        coverUrl: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500&auto=format&fit=crop&q=60',
        ebookFilePath: './uploads/ebooks/sample-informatika-10.pdf',
        digitalLicenseCount: 8,
        totalPhysicalCopies: 4,
        shelfLocation: 'RAK-INF-03'
      },
      {
        categoryId: catSains.id,
        title: 'Matematika Diskrit untuk Ilmu Komputer',
        author: 'Seymour Lipschutz, Ph.D.',
        publisher: 'Erlangga',
        publicationYear: 2021,
        isbn: '978-979-015-888-2',
        bookType: 'PHYSICAL_ONLY' as const,
        coverUrl: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=500&auto=format&fit=crop&q=60',
        ebookFilePath: null,
        digitalLicenseCount: 0,
        totalPhysicalCopies: 4,
        shelfLocation: 'RAK-SNS-01'
      },
      {
        categoryId: catBahasa.id,
        title: 'Bahasa Indonesia untuk Penulisan Ilmiah & Karya Tulis',
        author: 'Prof. Dr. Suparno',
        publisher: 'Gramedia Pustaka Utama',
        publicationYear: 2020,
        isbn: '978-602-03-8822-1',
        bookType: 'HYBRID' as const,
        coverUrl: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?w=500&auto=format&fit=crop&q=60',
        ebookFilePath: './uploads/ebooks/sample-informatika-10.pdf',
        digitalLicenseCount: 10,
        totalPhysicalCopies: 6,
        shelfLocation: 'RAK-BHS-01'
      }
    ];

    for (const b of booksToSeed) {
      const book = await bookService.addNewBook(b);
      console.log(`📖 Buku ditambahkan: ${book.title} [${book.bookType}]`);
    }
  }

  console.log('🎉 Seeding selesai dengan sukses!');
};

runSeed()
  .then(() => {
    console.log('Seeder process completed.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error saat seeding:', err);
    process.exit(1);
  });

