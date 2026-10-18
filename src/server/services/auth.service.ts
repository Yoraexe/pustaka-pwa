/**
 * @file src/server/services/auth.service.ts
 * @description Layanan bisnis untuk otentikasi akun lokal sekolah, registrasi mandiri, manajemen akun Superadmin, hashing kata sandi, dan JWT tokens.
 * @layer Service Layer (Business Logic)
 * 
 * Tujuan: Mengelola autentikasi pengguna, pendaftaran mandiri (Siswa/Guru), pembuatan/pengelolaan akun oleh Superadmin, dan impor massal CSV.
 * Caller: src/server/controllers/auth.controller.ts, src/server/db/seed.ts, test suites.
 * Dependensi: bcryptjs, jsonwebtoken, userRepository, config, shared/types.
 * Main Functions: login, registerUser, selfRegister, getAllUsers, toggleUserStatus, resetUserPassword, verifyToken, importUsersFromCsv.
 * Side Effects: Membaca/menulis data pengguna via UserRepository dan menandatangani token JWT.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository, type UserRepository } from '../repositories/user.repository.js';
import { sqlite } from '../db/index.js';
import { config } from '../config/index.js';
import type { LoginInput, CreateUserInput, SelfRegisterInput, User, AuthSession, CsvImportResult, UserRole } from '../../shared/types/index.js';

export class AuthService {
  constructor(private userRepo: UserRepository = userRepository) {}

  async login(input: LoginInput): Promise<AuthSession> {
    const userWithHash = await this.userRepo.findByIdentityNumber(input.identityNumber);
    if (!userWithHash) {
      throw new Error('Nomor identitas (NISN/NIP) atau kata sandi tidak cocok.');
    }

    if (!userWithHash.isActive) {
      throw new Error('Akun dinonaktifkan. Silakan hubungi pustakawan atau admin sekolah.');
    }

    const isMatch = await bcrypt.compare(input.password, userWithHash.passwordHash);
    if (!isMatch) {
      throw new Error('Nomor identitas (NISN/NIP) atau kata sandi tidak cocok.');
    }

    const { passwordHash: _, ...safeUser } = userWithHash;

    const token = jwt.sign(
      {
        id: safeUser.id,
        identityNumber: safeUser.identityNumber,
        role: safeUser.role,
        name: safeUser.name
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token, user: safeUser };
  }

  async registerUser(input: CreateUserInput): Promise<User> {
    const existing = await this.userRepo.findByIdentityNumber(input.identityNumber);
    if (existing) {
      throw new Error(`Pengguna dengan identitas ${input.identityNumber} sudah terdaftar.`);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    return this.userRepo.create({
      ...input,
      passwordHash
    });
  }

  /**
   * Pendaftaran Mandiri (Self-Registration) khusus Siswa dan Guru (BRD Seksi 3.4 & AC-4.3)
   */
  async selfRegister(input: SelfRegisterInput): Promise<AuthSession> {
    const allowedRoles: UserRole[] = ['STUDENT', 'TEACHER'];
    if (!allowedRoles.includes(input.role)) {
      throw new Error('Pendaftaran mandiri hanya diizinkan untuk peran Siswa dan Guru.');
    }

    const newUser = await this.registerUser({
      identityNumber: input.identityNumber,
      name: input.name,
      role: input.role,
      className: input.className || null,
      password: input.password
    });

    const token = jwt.sign(
      {
        id: newUser.id,
        identityNumber: newUser.identityNumber,
        role: newUser.role,
        name: newUser.name
      },
      config.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return { token, user: newUser };
  }

  /**
   * Daftar seluruh akun pengguna (Superadmin & Pustakawan)
   */
  async getAllUsers(actor: User): Promise<User[]> {
    if (actor.role !== 'ADMIN' && actor.role !== 'LIBRARIAN') {
      throw new Error('Hanya Superadmin atau Pustakawan yang berwenang melihat daftar pengguna.');
    }
    return this.userRepo.findAll();
  }

  /**
   * Mengubah status aktif/nonaktif pengguna (Khusus Superadmin)
   */
  async toggleUserStatus(adminUser: User, targetUserId: number, isActive: boolean): Promise<User> {
    if (adminUser.role !== 'ADMIN') {
      throw new Error('Hanya Superadmin yang berwenang mengubah status akun pengguna.');
    }

    if (adminUser.id === targetUserId && !isActive) {
      throw new Error('Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif.');
    }

    const updated = await this.userRepo.updateStatus(targetUserId, isActive);
    if (!updated) {
      throw new Error('Pengguna tidak ditemukan.');
    }
    return updated;
  }

  /**
   * Reset kata sandi pengguna oleh Superadmin
   */
  async resetUserPassword(adminUser: User, targetUserId: number, newPassword: string): Promise<void> {
    if (adminUser.role !== 'ADMIN') {
      throw new Error('Hanya Superadmin yang berwenang mereset kata sandi pengguna.');
    }

    const target = await this.userRepo.findById(targetUserId);
    if (!target) {
      throw new Error('Pengguna tidak ditemukan.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await this.userRepo.updatePassword(targetUserId, passwordHash);
  }

  async verifyToken(token: string): Promise<User> {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET) as { id: number };
      const user = await this.userRepo.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new Error('Pengguna tidak valid atau tidak aktif.');
      }
      return user;
    } catch {
      throw new Error('Sesi tidak valid atau telah kedaluwarsa.');
    }
  }


  /**
   * Impor Massal Pengguna via CSV (Admin Only - BRD Section 3.4 & AC-4.2)
   * Format kolom: Nama, NISN/NIP, Role, Kelas/Jurusan, Password (opsional)
   */
  async importUsersFromCsv(csvText: string): Promise<CsvImportResult> {
    const lines = csvText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) {
      return { totalRows: 0, importedCount: 0, skippedCount: 0, errors: [] };
    }

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ''));
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ''));
      return result;
    };

    let startIndex = 0;
    let nameIdx = 0;
    let identityIdx = 1;
    let roleIdx = 2;
    let classIdx = 3;
    let passwordIdx = 4;

    const firstLineLower = lines[0].toLowerCase();
    if (
      firstLineLower.includes('nama') ||
      firstLineLower.includes('name') ||
      firstLineLower.includes('nisn') ||
      firstLineLower.includes('nip') ||
      firstLineLower.includes('identity') ||
      firstLineLower.includes('role')
    ) {
      startIndex = 1;
      const headerCols = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
      headerCols.forEach((col, idx) => {
        if (col.includes('nisn') || col.includes('nip') || col.includes('identity')) {
          identityIdx = idx;
        } else if (col.includes('nama') || col.includes('name')) {
          nameIdx = idx;
        } else if (col.includes('role') || col.includes('peran')) {
          roleIdx = idx;
        } else if (col.includes('kelas') || col.includes('class') || col.includes('jurusan')) {
          classIdx = idx;
        } else if (col.includes('password') || col.includes('sandi') || col.includes('pass')) {
          passwordIdx = idx;
        }
      });
    }

    let importedCount = 0;
    let skippedCount = 0;
    const errors: Array<{ row: number; identity: string; reason: string }> = [];

    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash('123456', salt);

    interface PreparedImportUser {
      rowNum: number;
      identityNumber: string;
      name: string;
      role: UserRole;
      className: string | null;
      password: string;
      passwordHash: string;
    }

    const preparedUsers: PreparedImportUser[] = [];

    // Tahap 1: Validasi dan komputasi hash kata sandi di luar transaksi basis data (CPU-bound, tanpa menahan write lock SQLite)
    for (let i = startIndex; i < lines.length; i++) {
      const rowNum = i + 1;
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 2) {
        errors.push({
          row: rowNum,
          identity: cols[0] || '-',
          reason: 'Format baris tidak lengkap (minimal Nama dan NISN/NIP)'
        });
        continue;
      }

      const name = cols[nameIdx] || '';
      const identityNumber = cols[identityIdx] || '';
      const rawRole = (cols[roleIdx] || 'STUDENT').toUpperCase();
      const className = cols[classIdx] || null;
      const customPassword = cols[passwordIdx] || null;

      if (!name || !identityNumber) {
        errors.push({
          row: rowNum,
          identity: identityNumber || '-',
          reason: 'Nama dan NISN/NIP wajib diisi'
        });
        continue;
      }

      let role: UserRole = 'STUDENT';
      if (rawRole.includes('GURU') || rawRole.includes('TEACHER')) {
        role = 'TEACHER';
      } else if (rawRole.includes('PUSTAKA') || rawRole.includes('LIBRARIAN')) {
        role = 'LIBRARIAN';
      } else if (rawRole.includes('ADMIN')) {
        role = 'ADMIN';
      }

      if (customPassword && customPassword.length < 4) {
        errors.push({
          row: rowNum,
          identity: identityNumber,
          reason: 'Password minimal 4 karakter'
        });
        continue;
      }

      const passwordHash = customPassword ? await bcrypt.hash(customPassword, 10) : defaultPasswordHash;

      preparedUsers.push({
        rowNum,
        identityNumber,
        name,
        role,
        className,
        password: customPassword || '123456',
        passwordHash
      });
    }

    // Tahap 2: Operasi penulisan I/O SQLite secara atomik dan secepat kilat (hanya milidetik, mencegah lock contention)
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      for (const u of preparedUsers) {
        try {
          const existing = await this.userRepo.findByIdentityNumber(u.identityNumber);
          if (existing) {
            skippedCount++;
            continue;
          }

          await this.userRepo.create({
            identityNumber: u.identityNumber,
            name: u.name,
            role: u.role,
            className: u.className,
            password: u.password,
            passwordHash: u.passwordHash
          });

          importedCount++;
        } catch (err: unknown) {
          errors.push({
            row: u.rowNum,
            identity: u.identityNumber,
            reason: err instanceof Error ? err.message : 'Gagal menyimpan ke basis data'
          });
        }
      }
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }

    return {
      totalRows: lines.length - startIndex,
      importedCount,
      skippedCount,
      errors
    };
  }
}

export const authService = new AuthService();
