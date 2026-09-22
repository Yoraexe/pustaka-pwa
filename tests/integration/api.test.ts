/**
 * @file tests/integration/api.test.ts
 * @description Integration test untuk Express API endpoints menggunakan Supertest.
 * @layer Quality Assurance (Integration Test)
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';

describe('Pustaka Sekolah API Integration Tests', () => {
  const app = createApp();
  let studentToken = '';

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

  it('GET /api/books/:id/stream-pdf harus mengembalikan binary PDF dengan header ramah offline cache', async () => {
    const booksRes = await request(app).get('/api/books');
    const bookWithPdf = booksRes.body.data.find(
      (b: { ebookFilePath: string | null }) => !!b.ebookFilePath
    );
    expect(bookWithPdf).toBeDefined();

    const pdfRes = await request(app)
      .get(`/api/books/${bookWithPdf.id}/stream-pdf`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(pdfRes.status).toBe(200);
    expect(pdfRes.headers['content-type']).toBe('application/pdf');
    // Memastikan tidak ada 'no-store' agar W3C Cache API browser tidak melempar TypeError saat cache.put()
    expect(pdfRes.headers['cache-control']).not.toContain('no-store');
    expect(pdfRes.headers['cache-control']).toContain('must-revalidate');
    expect(pdfRes.headers['content-length']).toBeDefined();
    expect(Number(pdfRes.headers['content-length'])).toBeGreaterThan(0);
  });
});
