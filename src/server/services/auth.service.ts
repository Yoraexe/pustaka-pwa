/**
 * @file src/server/services/auth.service.ts
 * @description Layanan bisnis untuk otentikasi akun lokal sekolah, hashing kata sandi, dan JWT tokens.
 * @layer Service Layer (Business Logic)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository, type UserRepository } from '../repositories/user.repository.js';
import { config } from '../config/index.js';
import type { LoginInput, CreateUserInput, User, AuthSession, CsvImportResult, UserRole } from '../../shared/types/index.js';

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

      try {
        const existing = await this.userRepo.findByIdentityNumber(identityNumber);
        if (existing) {
          skippedCount++;
          continue;
        }

        const passwordHash = customPassword ? await bcrypt.hash(customPassword, 10) : defaultPasswordHash;

        await this.userRepo.create({
          identityNumber,
          name,
          role,
          className,
          password: customPassword || '123456',
          passwordHash
        });

        importedCount++;
      } catch (err: unknown) {
        errors.push({
          row: rowNum,
          identity: identityNumber,
          reason: err instanceof Error ? err.message : 'Gagal menyimpan ke basis data'
        });
      }
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
