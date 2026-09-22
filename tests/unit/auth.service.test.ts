/**
 * @file tests/unit/auth.service.test.ts
 * @description Unit tests untuk AuthService (Otentikasi & Keamanan Kredensial).
 * @layer Quality Assurance (Shift-Left TDD)
 */

import { describe, it, expect } from 'vitest';
import { authService } from '../../src/server/services/auth.service.js';

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
});
