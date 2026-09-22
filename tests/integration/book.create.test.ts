/**
 * @file tests/integration/book.create.test.ts
 * @description Integration test untuk alur pendaftaran koleksi buku baru (Fisik, E-Book Digital, & Hybrid).
 * @layer Quality Assurance (Integration Test)
 * 
 * Tujuan: Memvalidasi endpoint POST /api/books dengan role RBAC, upload multipart PDF/Cover, dan auto-barcode eksemplar fisik.
 * Caller: Vitest runner (npm run test).
 * Dependensi: vitest, supertest, src/server/app.ts, Buffer.
 * Main Functions: describe('Book Creation & Ingestion API Integration Tests').
 * Side Effects: Membuat record buku dan file mock di ./uploads/ saat pengujian berjalan.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';

describe('Book Creation & Ingestion API Integration Tests', () => {
  const app = createApp();
  let studentToken = '';
  let librarianToken = '';

  beforeAll(async () => {
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
    expect(librarianLogin.body.data.user.role).toBe('LIBRARIAN');
    librarianToken = librarianLogin.body.data.token;
  });

  it('POST /api/books harus menolak request tanpa token (401 Unauthorized)', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({
        title: 'Buku Ilegal Tanpa Autentikasi',
        author: 'Anonim',
        publisher: 'Penerbit Liar',
        publicationYear: 2026,
        categoryId: 1,
        bookType: 'PHYSICAL_ONLY'
      });

    expect(res.status).toBe(401);
  });

  it('POST /api/books harus menolak siswa biasa dengan status 403 Forbidden', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'Buku oleh Siswa',
        author: 'Siswa Rajin',
        publisher: 'Sekolah',
        publicationYear: 2026,
        categoryId: 1,
        bookType: 'PHYSICAL_ONLY',
        totalPhysicalCopies: 2,
        shelfLocation: 'RAK-01'
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/books harus berhasil mendaftarkan buku PHYSICAL_ONLY dan membuat barcode eksemplar otomatis', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${librarianToken}`)
      .send({
        title: 'Fisika Kuantum Eksperimental',
        author: 'Dr. Ahmad Subagja',
        publisher: 'Pustaka Sains ITB',
        publicationYear: 2025,
        categoryId: 1,
        isbn: '978-602-0001-99-1',
        bookType: 'PHYSICAL_ONLY',
        totalPhysicalCopies: 3,
        shelfLocation: 'RAK-FIS-05'
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const createdBook = res.body.data;
    expect(createdBook.title).toBe('Fisika Kuantum Eksperimental');
    expect(createdBook.bookType).toBe('PHYSICAL_ONLY');
    expect(createdBook.totalPhysicalCopies).toBe(3);
    expect(createdBook.availablePhysicalCopies).toBe(3);
    expect(createdBook.shelfLocation).toBe('RAK-FIS-05');
    expect(createdBook.copies).toBeDefined();
    expect(createdBook.copies.length).toBe(3);
    expect(createdBook.copies[0].barcode).toMatch(/^BK-\d+-01$/);
    expect(createdBook.copies[1].barcode).toMatch(/^BK-\d+-02$/);
    expect(createdBook.copies[2].barcode).toMatch(/^BK-\d+-03$/);
  });

  it('POST /api/books harus berhasil mengunggah berkas PDF untuk DIGITAL_ONLY dan dapat langsung di-stream', async () => {
    const mockPdfBuffer = Buffer.from('%PDF-1.4 Mocking PDF binary content for testing digital reader stream');

    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${librarianToken}`)
      .field('title', 'Kumpulan Esai Sains Digital')
      .field('author', 'Tim Guru Digital', )
      .field('publisher', 'SMAN 1 Merdeka Cyber', )
      .field('publicationYear', '2026')
      .field('categoryId', '1')
      .field('bookType', 'DIGITAL_ONLY')
      .field('digitalLicenseCount', '15')
      .attach('ebook', mockPdfBuffer, 'esai-sains.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const digitalBook = res.body.data;
    expect(digitalBook.bookType).toBe('DIGITAL_ONLY');
    expect(digitalBook.totalPhysicalCopies).toBe(0);
    expect(digitalBook.availablePhysicalCopies).toBe(0);
    expect(digitalBook.digitalLicenseCount).toBe(15);
    expect(digitalBook.ebookFilePath).toBeDefined();
    expect(digitalBook.ebookFilePath).toContain('.pdf');

    // Verifikasi bahwa berkas PDF yang baru diunggah dapat di-stream oleh siswa
    const streamRes = await request(app)
      .get(`/api/books/${digitalBook.id}/stream-pdf`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(streamRes.status).toBe(200);
    expect(streamRes.headers['content-type']).toContain('application/pdf');
  });

  it('POST /api/books harus berhasil mendaftarkan buku HYBRID dengan eksemplar fisik dan e-book PDF', async () => {
    const mockPdfBuffer = Buffer.from('%PDF-1.4 Hybrid book ebook binary data');
    const mockCoverBuffer = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46]); // JPEG magic header

    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${librarianToken}`)
      .field('title', 'Biologi Molekuler Modern: Edisi Hybrid')
      .field('author', 'Prof. Siti Nurhaliza')
      .field('publisher', 'Graha Sains')
      .field('publicationYear', '2025')
      .field('categoryId', '1')
      .field('isbn', '978-623-1111-22-3')
      .field('bookType', 'HYBRID')
      .field('totalPhysicalCopies', '2')
      .field('shelfLocation', 'RAK-BIO-02')
      .field('digitalLicenseCount', '10')
      .attach('ebook', mockPdfBuffer, 'biologi-molekuler.pdf')
      .attach('cover', mockCoverBuffer, 'cover-biologi.jpg');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const hybridBook = res.body.data;
    expect(hybridBook.bookType).toBe('HYBRID');
    expect(hybridBook.totalPhysicalCopies).toBe(2);
    expect(hybridBook.shelfLocation).toBe('RAK-BIO-02');
    expect(hybridBook.digitalLicenseCount).toBe(10);
    expect(hybridBook.copies).toBeDefined();
    expect(hybridBook.copies.length).toBe(2);
    expect(hybridBook.coverUrl).toBeDefined();
    expect(hybridBook.ebookFilePath).toBeDefined();
  });
});
