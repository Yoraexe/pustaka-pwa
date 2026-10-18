/**
 * @file tests/unit/auth.service.test.ts
 * @description Unit tests untuk AuthService (Otentikasi & Keamanan Kredensial).
 * @layer Quality Assurance (Shift-Left TDD)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { authService } from '../../src/server/services/auth.service.js';
import { db } from '../../src/server/db/index.js';
import { users } from '../../src/server/db/schema.js';
import { inArray } from 'drizzle-orm';
import { ensureTestDatabaseSeeded } from '../helpers/test-fixture.js';

describe('AuthService Unit Tests', () => {
  beforeAll(async () => {
    await ensureTestDatabaseSeeded();
  });

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

  describe('Self-Registration & Superadmin Account Management', () => {
    const createdIdentities = ['NISN_SELF_001', 'NIP_SUPER_001'];

    afterAll(() => {
      db.delete(users).where(inArray(users.identityNumber, createdIdentities)).run();
    });

    it('harus mengizinkan registrasi mandiri (selfRegister) bagi siswa dan langsung mengembalikan sesi JWT', async () => {
      const session = await authService.selfRegister({
        identityNumber: 'NISN_SELF_001',
        name: 'Rina Mandiri',
        role: 'STUDENT',
        className: 'XI IPA 1',
        password: 'mandiri123'
      });

      expect(session.token).toBeTruthy();
      expect(session.user.identityNumber).toBe('NISN_SELF_001');
      expect(session.user.role).toBe('STUDENT');
      expect(session.user.isActive).toBe(true);
    });

    it('harus mengizinkan Superadmin mengelola daftar akun, menonaktifkan/mengaktifkan akun, dan mereset sandi', async () => {
      const adminSession = await authService.login({
        identityNumber: 'ADMIN01',
        password: 'admin123'
      });
      const adminUser = adminSession.user;

      // Buat akun pustakawan baru melalui registerUser
      const created = await authService.registerUser({
        identityNumber: 'NIP_SUPER_001',
        name: 'Pustakawan Baru',
        role: 'LIBRARIAN',
        className: 'Staf Perpustakaan',
        password: 'awal123'
      });
      expect(created.role).toBe('LIBRARIAN');

      // Ambil daftar seluruh pengguna
      const allUsers = await authService.getAllUsers(adminUser);
      expect(allUsers.some(u => u.identityNumber === 'NIP_SUPER_001')).toBe(true);

      // Nonaktifkan akun
      const deactivated = await authService.toggleUserStatus(adminUser, created.id, false);
      expect(deactivated.isActive).toBe(false);

      // Login harus ditolak saat nonaktif
      await expect(
        authService.login({ identityNumber: 'NIP_SUPER_001', password: 'awal123' })
      ).rejects.toThrow('Akun dinonaktifkan');

      // Aktifkan kembali & reset password
      const reactivated = await authService.toggleUserStatus(adminUser, created.id, true);
      expect(reactivated.isActive).toBe(true);

      await authService.resetUserPassword(adminUser, created.id, 'baru456');
      const relogin = await authService.login({
        identityNumber: 'NIP_SUPER_001',
        password: 'baru456'
      });
      expect(relogin.user.id).toBe(created.id);

      // Superadmin tidak boleh menonaktifkan dirinya sendiri
      await expect(
        authService.toggleUserStatus(adminUser, adminUser.id, false)
      ).rejects.toThrow('tidak dapat menonaktifkan akun Anda sendiri');
    });
  });
});

