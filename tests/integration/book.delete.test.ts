/**
 * @file tests/integration/book.delete.test.ts
 * @description Integration test untuk alur penghapusan koleksi buku (Conditional Deletion) beserta pembersihan storage dan proteksi sirkulasi aktif.
 * @layer Quality Assurance (Integration Test)
 * 
 * Tujuan: Memvalidasi endpoint DELETE /api/books/:id terhadap RBAC (Librarian/Admin only), proteksi pinjaman aktif, transaksi atomik basis data, dan pembersihan file storage.
 * Caller: Vitest runner (npm test).
 * Dependensi: vitest, supertest, src/server/app.ts, src/server/db, fs, path.
 * Main Functions: describe('Book Deletion API Integration Tests').
 * Side Effects: Membuat dan menghapus record buku serta berkas mock di ./uploads/ selama pengujian.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';
import { db } from '../../src/server/db/index.js';
import { books, bookCopies, loans } from '../../src/server/db/schema.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { ensureTestDatabaseSeeded } from '../helpers/test-fixture.js';

describe('Book Deletion API Integration Tests', () => {
  const app = createApp();
  let studentToken = '';
  let librarianToken = '';
  const createdBookIds: number[] = [];
  const createdFilePaths: string[] = [];

  beforeAll(async () => {
    await ensureTestDatabaseSeeded();

    // 1. Login sebagai Siswa
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identityNumber: 'NISN202601',
        password: 'siswa123'
      });
    expect(studentLogin.status).toBe(200);
    studentToken = studentLogin.body.data.token;

    // 2. Login sebagai Pustakawan
    const librarianLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identityNumber: 'PUSTAKA01',
        password: 'pustaka123'
      });
    expect(librarianLogin.status).toBe(200);
    librarianToken = librarianLogin.body.data.token;
  });

  afterAll(async () => {
    for (const bookId of createdBookIds) {
      db.delete(loans).where(eq(loans.bookId, bookId)).run();
      db.delete(bookCopies).where(eq(bookCopies.bookId, bookId)).run();
      db.delete(books).where(eq(books.id, bookId)).run();
    }
    for (const filePath of createdFilePaths) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // Abaikan error pembersihan
      }
    }
  });

  it('DELETE /api/books/:id harus menolak request tanpa token (401 Unauthorized)', async () => {
    const res = await request(app).delete('/api/books/1');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/books/:id harus menolak request dari role Siswa (403 Forbidden)', async () => {
    const res = await request(app)
      .delete('/api/books/1')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('DELETE /api/books/:id harus menolak ID buku non-numerik (400 Bad Request)', async () => {
    const res = await request(app)
      .delete('/api/books/abc')
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ID');
  });

  it('DELETE /api/books/:id harus mengembalikan 404 jika ID buku tidak ditemukan', async () => {
    const res = await request(app)
      .delete('/api/books/999999')
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/books/:id harus menolak penghapusan buku yang sedang dalam peminjaman aktif (400 Conflict)', async () => {
    // 1. Buat buku baru untuk dipinjam (dengan mock ebookFilePath yang valid)
    const createRes = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        title: 'Buku Pinjaman Aktif Test Hapus',
        author: 'Penulis Sirkulasi',
        publisher: 'Penerbit Aktif',
        publicationYear: 2026,
        categoryId: 1,
        bookType: 'HYBRID',
        ebookFilePath: 'uploads/ebooks/test-del-doc.pdf',
        totalPhysicalCopies: 2,
        shelfLocation: 'RAK-TEST-DEL-01'
      });

    expect(createRes.status).toBe(201);
    const bookId = createRes.body.data.id;
    createdBookIds.push(bookId);

    // 2. Siswa meminjam buku ini secara digital
    const borrowRes = await request(app)
      .post('/api/circulation/digital/borrow')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookId });

    expect(borrowRes.status).toBe(201);

    // 3. Pustakawan mencoba menghapus buku saat sedang dipinjam
    const deleteRes = await request(app)
      .delete(`/api/books/${bookId}`)
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(deleteRes.status).toBe(400);
    expect(deleteRes.body.error.code).toBe('ACTIVE_LOAN_CONFLICT');
    expect(deleteRes.body.error.message).toContain('sedang dalam masa peminjaman aktif');

    // Kembalikan pinjaman agar test database bersih
    await request(app)
      .post('/api/circulation/digital/return')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookId });
  });

  it('DELETE /api/books/:id harus berhasil menghapus buku valid beserta eksemplar dan file penyimpanan (200 OK)', async () => {
    // 1. Buat dummy file PDF dan cover di folder uploads lokal
    const mockPdfPath = path.resolve(process.cwd(), 'uploads/ebooks/test-del-doc.pdf');
    const mockCoverPath = path.resolve(process.cwd(), 'uploads/covers/test-del-cover.jpg');

    fs.mkdirSync(path.dirname(mockPdfPath), { recursive: true });
    fs.mkdirSync(path.dirname(mockCoverPath), { recursive: true });
    fs.writeFileSync(mockPdfPath, '%PDF-1.4 mock pdf content');
    fs.writeFileSync(mockCoverPath, 'mock cover image binary');

    createdFilePaths.push(mockPdfPath, mockCoverPath);

    // 2. Buat buku di database dengan mereferensikan file tersebut
    const insertedBooks = await db.insert(books).values({
      title: 'Buku Uji Coba Penghapusan Lengkap',
      author: 'Author Uji',
      publisher: 'Publisher Uji',
      publicationYear: 2026,
      categoryId: 1,
      bookType: 'HYBRID',
      coverUrl: '/uploads/covers/test-del-cover.jpg',
      ebookFilePath: 'uploads/ebooks/test-del-doc.pdf',
      totalPhysicalCopies: 2,
      availablePhysicalCopies: 2,
      shelfLocation: 'RAK-TEST-DEL-02'
    }).returning();

    const bookId = insertedBooks[0].id;
    createdBookIds.push(bookId);

    // Buat 2 eksemplar fisik
    await db.insert(bookCopies).values([
      { bookId, barcode: `BK-TESTDEL-${bookId}-01`, status: 'AVAILABLE' },
      { bookId, barcode: `BK-TESTDEL-${bookId}-02`, status: 'AVAILABLE' }
    ]);

    // Verifikasi sebelum dihapus: berkas ada di disk
    expect(fs.existsSync(mockPdfPath)).toBe(true);
    expect(fs.existsSync(mockCoverPath)).toBe(true);

    // 3. Pustakawan menghapus buku
    const deleteRes = await request(app)
      .delete(`/api/books/${bookId}`)
      .set('Authorization', `Bearer ${librarianToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
    expect(deleteRes.body.data.id).toBe(bookId);

    // 4. Verifikasi di basis data: buku dan eksemplar sudah terhapus
    const bookCheck = await db.select().from(books).where(eq(books.id, bookId));
    expect(bookCheck.length).toBe(0);

    const copiesCheck = await db.select().from(bookCopies).where(eq(bookCopies.bookId, bookId));
    expect(copiesCheck.length).toBe(0);

    // 5. Verifikasi berkas di disk: sudah dibersihkan oleh storageService
    expect(fs.existsSync(mockPdfPath)).toBe(false);
    expect(fs.existsSync(mockCoverPath)).toBe(false);
  });
});
