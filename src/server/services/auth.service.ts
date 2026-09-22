/**
 * @file src/server/services/auth.service.ts
 * @description Layanan bisnis untuk otentikasi akun lokal sekolah, hashing kata sandi, dan JWT tokens.
 * @layer Service Layer (Business Logic)
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { userRepository, type UserRepository } from '../repositories/user.repository.js';
import { config } from '../config/index.js';
import type { LoginInput, CreateUserInput, User, AuthSession } from '../../shared/types/index.js';

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
}

export const authService = new AuthService();
