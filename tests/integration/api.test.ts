/**
 * @file tests/integration/api.test.ts
 * @description Integration test untuk Express API endpoints menggunakan Supertest.
 * @layer Quality Assurance (Integration Test)
 */

import { describe, it, expect, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';
import { db } from '../../src/server/db/index.js';
import { users } from '../../src/server/db/schema.js';
import { inArray } from 'drizzle-orm';

describe('Pustaka Sekolah API Integration Tests', () => {
  const app = createApp();
  let studentToken = '';
  let adminToken = '';
  const testIdentities = ['NISN_API_001', 'NIP_API_002'];

  afterAll(() => {
    db.delete(users).where(inArray(users.identityNumber, testIdentities)).run();
  });

  it('GET /api/health harus mengembalikan status healthy', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.app).toBe('Pustaka Sekolah PWA');
  });

  it('POST /api/auth/login harus berhasil mengembalikan token JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identityNumber: 'NISN202601',
        password: 'siswa123'
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('STUDENT');
    studentToken = res.body.data.token;

    // Login juga sebagai Admin untuk pengujian endpoint terproteksi
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identityNumber: 'ADMIN01',
        password: 'admin123'
      });
    expect(adminLogin.status).toBe(200);
    expect(adminLogin.body.data.user.role).toBe('ADMIN');
    adminToken = adminLogin.body.data.token;
  });

  it('GET /api/books/categories harus mengembalikan daftar kategori buku', async () => {
    const res = await request(app).get('/api/books/categories');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('GET /api/books harus mengembalikan daftar buku hybrid dengan filter', async () => {
    const res = await request(app)
      .get('/api/books')
      .query({ bookType: 'ALL' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('POST /api/circulation/digital/borrow harus mengizinkan siswa meminjam e-book', async () => {
    // Ambil buku pertama yang bertipe HYBRID atau DIGITAL_ONLY
    const booksRes = await request(app).get('/api/books');
    const digitalBook = booksRes.body.data.find(
      (b: { bookType: string }) => b.bookType === 'HYBRID' || b.bookType === 'DIGITAL_ONLY'
    );

    expect(digitalBook).toBeDefined();

    const borrowRes = await request(app)
      .post('/api/circulation/digital/borrow')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookId: digitalBook.id });

    // Status 201 (Created) atau jika sudah pernah dipinjam mengembalikan status 400
    if (borrowRes.status === 201) {
      expect(borrowRes.body.success).toBe(true);
      expect(borrowRes.body.data.loanType).toBe('DIGITAL');
      expect(borrowRes.body.data.status).toBe('BORROWED');

      // Kembalikan lagi agar state bersih
      const returnRes = await request(app)
        .post('/api/circulation/digital/return')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ bookId: digitalBook.id });

      expect(returnRes.status).toBe(200);
      expect(returnRes.body.success).toBe(true);
    } else {
      expect(borrowRes.status).toBe(400);
    }
  });

  it('GET /api/books/:id/stream-pdf harus menerapkan proteksi otorisasi pinjaman digital', async () => {
    const booksRes = await request(app).get('/api/books');
    const bookWithPdf = booksRes.body.data.find(
      (b: { ebookFilePath: string | null }) => !!b.ebookFilePath
    );
    expect(bookWithPdf).toBeDefined();

    // 1. Siswa belum meminjam: Harus ditolak dengan 403 Forbidden
    const forbiddenRes = await request(app)
      .get(`/api/books/${bookWithPdf.id}/stream-pdf`)
      .set('Authorization', `Bearer ${studentToken}`);
    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.error.message).toContain('belum meminjam e-book ini');

    // 2. Admin dapat melakukan preview/stream langsung tanpa meminjam
    const adminRes = await request(app)
      .get(`/api/books/${bookWithPdf.id}/stream-pdf`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminRes.status).toBe(200);
    expect(adminRes.headers['content-type']).toBe('application/pdf');

    // 3. Siswa meminjam buku digital secara resmi
    const borrowRes = await request(app)
      .post('/api/circulation/digital/borrow')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookId: bookWithPdf.id });
    expect(borrowRes.status).toBe(201);

    // 4. Setelah meminjam, siswa berhak streaming PDF dengan header ramah offline cache
    const authorizedRes = await request(app)
      .get(`/api/books/${bookWithPdf.id}/stream-pdf`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(authorizedRes.status).toBe(200);
    expect(authorizedRes.headers['content-type']).toBe('application/pdf');
    expect(authorizedRes.headers['cache-control']).not.toContain('no-store');
    expect(authorizedRes.headers['cache-control']).toContain('must-revalidate');
    expect(Number(authorizedRes.headers['content-length'])).toBeGreaterThan(0);

    // 5. Kembalikan buku digital untuk merapikan state
    await request(app)
      .post('/api/circulation/digital/return')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookId: bookWithPdf.id });
  });

  it('GET /api/books/copies/available harus mengembalikan daftar eksemplar fisik di rak', async () => {
    const res = await request(app).get('/api/books/copies/available');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    if (res.body.data.length > 0) {
      const copy = res.body.data[0];
      expect(copy.barcode).toBeDefined();
      expect(copy.bookTitle).toBeDefined();
      expect(copy.status).toBe('AVAILABLE');
    }
  });

  it('POST /api/auth/import-users harus menolak pengguna non-admin (403 Forbidden)', async () => {
    const csvContent = 'identityNumber,name,role,email,password\nNISN_API_001,Siswa Test,Siswa,,pass123';
    const res = await request(app)
      .post('/api/auth/import-users')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ csvContent });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/import-users harus berhasil mengimpor pengguna jika dipanggil oleh Admin', async () => {
    const csvContent = [
      'identityNumber,name,role,email,password',
      'NISN_API_001,Siswa API Test,Siswa,siswa.api@test.com,rahasia123',
      'NIP_API_002,Guru API Test,Guru,guru.api@test.com,rahasia123',
    ].join('\n');

    const res = await request(app)
      .post('/api/auth/import-users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ csvContent });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalRows).toBe(2);
    expect(res.body.data.importedCount).toBe(2);
  });
});
