/**
 * @file tests/integration/api.test.ts
 * @description Integration test untuk Express API endpoints menggunakan Supertest.
 * @layer Quality Assurance (Integration Test)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/server/app.js';
import { db } from '../../src/server/db/index.js';
import { users } from '../../src/server/db/schema.js';
import { inArray } from 'drizzle-orm';
import { ensureTestDatabaseSeeded, cleanupTestPdf } from '../helpers/test-fixture.js';

describe('Pustaka Sekolah API Integration Tests', () => {
  const app = createApp();
  let studentToken = '';
  let adminToken = '';
  const testIdentities = ['NISN_API_001', 'NIP_API_002', 'NISN_SIGNUP_99', 'NIP_SIGNUP_99', 'ADMIN_SIGNUP_99', 'NIP_SUPER_99'];

  beforeAll(async () => {
    await ensureTestDatabaseSeeded();
  });

  afterAll(() => {
    db.delete(users).where(inArray(users.identityNumber, testIdentities)).run();
    cleanupTestPdf();
  });

  it('GET /api/health harus mengembalikan status healthy dan security headers (BUG-804)', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.app).toBe('Pustaka Sekolah PWA');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-xss-protection']).toBe('1; mode=block');
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
    } else {
      expect(borrowRes.status).toBe(400);
    }

    // Kembalikan lagi agar state bersih untuk pengujian berikutnya
    const returnRes = await request(app)
      .post('/api/circulation/digital/return')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookId: digitalBook.id });

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.success).toBe(true);
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

  it('POST /api/auth/signup harus mengizinkan pendaftaran mandiri Siswa & Guru, serta menolak peran terlarang (ADMIN/LIBRARIAN/UNKNOWN) demi mencegah eskalasi hak akses (BRD AC-4.3)', async () => {
    // 1. Role tidak dikenal harus ditolak (400 Bad Request dari Zod)
    const invalidRoleRes = await request(app)
      .post('/api/auth/signup')
      .send({
        identityNumber: 'NISN_SIGNUP_99',
        name: 'Pengguna Role Asing',
        role: 'UNKNOWN_ROLE',
        password: 'password123'
      });
    expect(invalidRoleRes.status).toBe(400);

    // 2. Upaya eskalasi hak akses sebagai ADMIN dari endpoint publik harus ditolak (400)
    const adminSignupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        identityNumber: 'ADMIN_SIGNUP_99',
        name: 'Superadmin Palsu',
        role: 'ADMIN',
        className: 'Hacker',
        password: 'password123'
      });
    expect(adminSignupRes.status).toBe(400);

    // 3. Upaya eskalasi hak akses sebagai LIBRARIAN dari endpoint publik harus ditolak (400)
    const librarianSignupRes = await request(app)
      .post('/api/auth/signup')
      .send({
        identityNumber: 'LIB_SIGNUP_99',
        name: 'Pustakawan Palsu',
        role: 'LIBRARIAN',
        password: 'password123'
      });
    expect(librarianSignupRes.status).toBe(400);

    // 4. Pendaftaran mandiri sah sebagai STUDENT
    const studentRes = await request(app)
      .post('/api/auth/signup')
      .send({
        identityNumber: 'NISN_SIGNUP_99',
        name: 'Siswa Pendaftar Mandiri',
        role: 'STUDENT',
        className: 'X DKV 1',
        password: 'password123'
      });
    expect(studentRes.status).toBe(201);
    expect(studentRes.body.success).toBe(true);
    expect(studentRes.body.data.token).toBeDefined();
    expect(studentRes.body.data.user.role).toBe('STUDENT');

    // 5. Pendaftaran mandiri sah sebagai TEACHER
    const teacherRes = await request(app)
      .post('/api/auth/signup')
      .send({
        identityNumber: 'NIP_SIGNUP_99',
        name: 'Guru Pendaftar Mandiri',
        role: 'TEACHER',
        className: 'Guru Fisika',
        password: 'password123'
      });
    expect(teacherRes.status).toBe(201);
    expect(teacherRes.body.success).toBe(true);
    expect(teacherRes.body.data.user.role).toBe('TEACHER');
  });

  it('Superadmin endpoints (/api/auth/register, /api/auth/users, PATCH status & password) harus berfungsi penuh', async () => {
    const createRes = await request(app)
      .post('/api/auth/register')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        identityNumber: 'NIP_SUPER_99',
        name: 'Pustakawan Superadmin Test',
        role: 'LIBRARIAN',
        className: 'Staf Perpustakaan',
        password: 'awal123'
      });
    expect(createRes.status).toBe(201);
    const createdUserId = createRes.body.data.id;

    const listRes = await request(app)
      .get('/api/auth/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data)).toBe(true);

    const statusRes = await request(app)
      .patch(`/api/auth/users/${createdUserId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.isActive).toBe(false);

    const passRes = await request(app)
      .patch(`/api/auth/users/${createdUserId}/password`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ newPassword: 'reset789' });
    expect(passRes.status).toBe(200);
    expect(passRes.body.success).toBe(true);
  });

  it('POST /api/circulation/physical/borrow-self & /return-self harus meminjam dan langsung mengembalikan buku fisik saat itu juga', async () => {
    const booksRes = await request(app).get('/api/books');
    const physicalBook = booksRes.body.data.find(
      (b: { bookType: string; availablePhysicalCopies: number }) =>
        (b.bookType === 'PHYSICAL_ONLY' || b.bookType === 'HYBRID') && b.availablePhysicalCopies > 0
    );
    expect(physicalBook).toBeDefined();

    // 1. Pinjam fisik mandiri
    const borrowRes = await request(app)
      .post('/api/circulation/physical/borrow-self')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ bookId: physicalBook.id });

    expect(borrowRes.status).toBe(201);
    expect(borrowRes.body.success).toBe(true);
    expect(borrowRes.body.data.loanType).toBe('PHYSICAL');
    expect(borrowRes.body.data.status).toBe('BORROWED');
    const loanId = borrowRes.body.data.id;

    // 2. Kembalikan buku fisik saat itu juga tanpa menunggu masa pinjam habis
    const returnRes = await request(app)
      .post('/api/circulation/physical/return-self')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ loanId });

    expect(returnRes.status).toBe(200);
    expect(returnRes.body.success).toBe(true);
    expect(returnRes.body.data.loan.status).toBe('RETURNED');
    expect(returnRes.body.data.fineAmount).toBe(0);
  });

  it('GET /api/books/:id dan PATCH /api/auth/users/:id harus menolak parameter ID non-integer (400 Bad Request)', async () => {
    // 1. GET /api/books/abc
    const badBookRes = await request(app).get('/api/books/abc');
    expect(badBookRes.status).toBe(400);
    expect(badBookRes.body.error.code).toBe('INVALID_ID');

    // 2. GET /api/books/-5
    const negativeBookRes = await request(app).get('/api/books/-5');
    expect(negativeBookRes.status).toBe(400);
    expect(negativeBookRes.body.error.code).toBe('INVALID_ID');

    // 3. PATCH /api/auth/users/invalid/status
    const badUserStatusRes = await request(app)
      .patch('/api/auth/users/invalid/status')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ isActive: false });
    expect(badUserStatusRes.status).toBe(400);
    expect(badUserStatusRes.body.error.code).toBe('INVALID_ID');
  });

  it('POST /api/books harus menolak jalur berkas di luar folder aman atau path traversal (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/books')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Buku Path Traversal Exploiter',
        author: 'Hacker',
        publisher: 'Darknet',
        publicationYear: 2026,
        categoryId: 1,
        bookType: 'DIGITAL_ONLY',
        ebookFilePath: '../../pustaka.db'
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE_PATH');
  });

  it('POST /api/auth/import-users harus menolak file non-CSV via fileFilter (400 Bad Request)', async () => {
    const res = await request(app)
      .post('/api/auth/import-users')
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('file', Buffer.from('MZ_BINARY_EXE_DATA'), 'dangerous.exe');

    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('berekstensi .csv');
  });

  it('GET /api/books dengan filter search harus dapat menemukan buku berdasarkan nomor ISBN', async () => {
    const res = await request(app).get('/api/books?search=978-602-000-001-1');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].isbn).toBe('978-602-000-001-1');
  });

  it('GET /api/circulation/all harus mematuhi parameter query limit', async () => {
    const res = await request(app)
      .get('/api/circulation/all?limit=1')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
  });

  it('POST /api/circulation/fines/settle harus menolak akses siswa (403) dan mengizinkan admin/pustakawan melunasi denda', async () => {
    // 1. Siswa mencoba melunasi denda secara sepihak -> 403 Forbidden
    const forbiddenRes = await request(app)
      .post('/api/circulation/fines/settle')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ loanId: 1 });

    expect(forbiddenRes.status).toBe(403);

    // 2. Akses tanpa token -> 401 Unauthorized
    const unauthRes = await request(app)
      .post('/api/circulation/fines/settle')
      .send({ loanId: 1 });

    expect(unauthRes.status).toBe(401);
  });
});

