/**
 * @file tests/helpers/test-fixture.ts
 * @description Utilitas persiapan data fixture terisolasi khusus untuk pengujian otomatis (pustaka.test.db).
 * @layer Quality Assurance (Test Helper)
 *
 * Tujuan: Menyiapkan data uji pada basis data terisolasi (pustaka.test.db) tanpa mengotori basis data utama aplikasi (pustaka.db).
 * Caller: tests/unit/*.test.ts, tests/integration/*.test.ts.
 * Dependensi: authService, bookRepository, bookService, config, fs, path.
 * Main Functions: ensureTestDatabaseSeeded, cleanupTestPdf.
 * Side Effects: Menulis fixture uji ke pustaka.test.db dan membuat berkas PDF sementara khusus pengujian.
 */

import { authService } from '../../src/server/services/auth.service.js';
import { bookRepository } from '../../src/server/repositories/book.repository.js';
import { bookService } from '../../src/server/services/book.service.js';
import { config } from '../../src/server/config/index.js';
import fs from 'fs';
import path from 'path';

export const TEST_PDF_REL_PATH = './uploads/ebooks/test-fixture-ebook.pdf';

export const ensureTestDatabaseSeeded = async () => {
  if (!fs.existsSync(config.uploadsFullPath)) {
    fs.mkdirSync(config.uploadsFullPath, { recursive: true });
  }

  const testPdfFullPath = path.resolve(process.cwd(), TEST_PDF_REL_PATH);
  if (!fs.existsSync(testPdfFullPath)) {
    const minimalPdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 14 Tf 72 700 Td (TEST PDF) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000190 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
285
%%EOF`;
    fs.writeFileSync(testPdfFullPath, minimalPdf, 'utf-8');
  }

  const catInformatika =
    (await bookRepository.findCategoryBySlug('informatika')) ||
    (await bookRepository.createCategory('Informatika & Komputer', 'informatika'));

  const catSains =
    (await bookRepository.findCategoryBySlug('sains-matematika')) ||
    (await bookRepository.createCategory('Sains & Matematika', 'sains-matematika'));

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
    }
  ];

  for (const u of usersToSeed) {
    try {
      await authService.registerUser(u);
    } catch {
      // Sudah ada di test DB
    }
  }

  const existingBooks = await bookRepository.findBooks({ bookType: 'ALL' });
  if (existingBooks.length === 0) {
    await bookService.addNewBook({
      categoryId: catInformatika.id,
      title: 'Buku Uji Hybrid Informatika',
      author: 'Tim Penguji',
      publisher: 'Pustaka Test',
      publicationYear: 2024,
      isbn: '978-602-000-001-1',
      bookType: 'HYBRID',
      coverUrl: null,
      ebookFilePath: TEST_PDF_REL_PATH,
      digitalLicenseCount: 10,
      totalPhysicalCopies: 5,
      shelfLocation: 'RAK-TEST-01'
    });

    await bookService.addNewBook({
      categoryId: catSains.id,
      title: 'Buku Uji Fisik Matematika',
      author: 'Tim Penguji Sains',
      publisher: 'Pustaka Test',
      publicationYear: 2024,
      isbn: '978-602-000-002-8',
      bookType: 'PHYSICAL_ONLY',
      coverUrl: null,
      ebookFilePath: null,
      digitalLicenseCount: 0,
      totalPhysicalCopies: 4,
      shelfLocation: 'RAK-TEST-02'
    });
  }
};

export const cleanupTestPdf = () => {
  const testPdfFullPath = path.resolve(process.cwd(), TEST_PDF_REL_PATH);
  if (fs.existsSync(testPdfFullPath)) {
    try {
      fs.unlinkSync(testPdfFullPath);
    } catch {
      // Abaikan jika gagal hapus
    }
  }
};
