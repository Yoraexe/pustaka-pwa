/**
 * @file tests/unit/auth.service.test.ts
 * @description Unit tests untuk AuthService (Otentikasi & Keamanan Kredensial).
 * @layer Quality Assurance (Shift-Left TDD)
 */

import { describe, it, expect, afterAll } from 'vitest';
import { authService } from '../../src/server/services/auth.service.js';
import { db } from '../../src/server/db/index.js';
import { users } from '../../src/server/db/schema.js';
import { inArray } from 'drizzle-orm';

describe('AuthService Unit Tests', () => {
  it('harus berhasil login dengan kredensial yang benar', async () => {
    const session = await authService.login({
      identityNumber: 'NISN202601',
      password: 'siswa123'
    });

    expect(session).toBeDefined();
    expect(session.token).toBeTruthy();
    expect(session.user.name).toBe('Ahmad Rizky Pratama');
    expect(session.user.role).toBe('STUDENT');
  });

  it('harus menolak login dengan kata sandi yang salah', async () => {
    await expect(
      authService.login({
        identityNumber: 'NISN202601',
        password: 'passwordSalah'
      })
    ).rejects.toThrow('Nomor identitas (NISN/NIP) atau kata sandi tidak cocok.');
  });

  it('harus menolak login jika identitas tidak terdaftar', async () => {
    await expect(
      authService.login({
        identityNumber: 'NISN_TIDAK_ADA',
        password: 'anyPassword'
      })
    ).rejects.toThrow('Nomor identitas (NISN/NIP) atau kata sandi tidak cocok.');
  });

  it('harus berhasil memverifikasi token yang valid', async () => {
    const session = await authService.login({
      identityNumber: 'PUSTAKA01',
      password: 'pustaka123'
    });

    const verifiedUser = await authService.verifyToken(session.token);
    expect(verifiedUser.id).toBe(session.user.id);
    expect(verifiedUser.role).toBe('LIBRARIAN');
  });

  describe('importUsersFromCsv', () => {
    const testIdentities = ['NISN_TEST_9901', 'NISN_TEST_9902', 'NIP_TEST_9903'];

    afterAll(() => {
      db.delete(users).where(inArray(users.identityNumber, testIdentities)).run();
    });

    it('harus berhasil memproses teks CSV dan mengimpor anggota baru', async () => {
      const csvData = [
        'identityNumber,name,role,email,password',
        'NISN_TEST_9901,Budi Santoso,Siswa,budi.test@sekolah.sch.id,budi12345',
        'NISN_TEST_9902,Siti Aminah,STUDENT,siti.test@sekolah.sch.id,siti12345',
        'NIP_TEST_9903,Drs. Suryono,GURU,suryono.test@sekolah.sch.id,guru12345',
      ].join('\n');

      const result = await authService.importUsersFromCsv(csvData);
      expect(result.totalRows).toBe(3);
      expect(result.importedCount).toBe(3);
      expect(result.skippedCount).toBe(0);

      // Login dengan salah satu user baru untuk memastikan password ter-hash dengan benar
      const loginRes = await authService.login({
        identityNumber: 'NISN_TEST_9901',
        password: 'budi12345',
      });
      expect(loginRes.user.name).toBe('Budi Santoso');
      expect(loginRes.user.role).toBe('STUDENT');
    });

    it('harus melompati nomor identitas yang sudah terdaftar (duplikat)', async () => {
      // NISN202601 sudah ada di database awal
      const csvData = [
        'identityNumber,name,role,email,password',
        'NISN202601,Ahmad Duplikat,Siswa,duplikat@sekolah.sch.id,pass123',
      ].join('\n');

      const result = await authService.importUsersFromCsv(csvData);
      expect(result.totalRows).toBe(1);
      expect(result.importedCount).toBe(0);
      expect(result.skippedCount).toBe(1);
    });
  });
});
