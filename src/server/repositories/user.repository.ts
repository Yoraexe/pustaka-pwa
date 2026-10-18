/**
 * @file src/server/repositories/user.repository.ts
 * @description Data access layer untuk entitas Pengguna (Siswa, Guru, Pustakawan, Admin).
 * @layer Repository Layer
 * 
 * Tujuan: Menyediakan abstraksi akses basis data SQLite untuk tabel users (pencarian, pendaftaran, pembaruan status, dan reset kata sandi).
 * Caller: src/server/services/auth.service.ts, src/server/services/circulation.service.ts, test suites.
 * Dependensi: src/server/db/index.ts, src/server/db/schema.ts, drizzle-orm, src/shared/types.
 * Main Functions: findById, findByIdentityNumber, findAll, create, updateStatus, updatePassword, countTotal.
 * Side Effects: Membaca dan menulis catatan pengguna pada tabel users di SQLite.
 */

import { db } from '../db/index.js';
import { users, type UserTable } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import type { CreateUserInput, User } from '../../shared/types/index.js';

export class UserRepository {
  async findById(id: number): Promise<User | null> {
    const records = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (records.length === 0) return null;
    return this.mapToDomain(records[0]);
  }

  async findByIdentityNumber(identityNumber: string): Promise<(User & { passwordHash: string }) | null> {
    const records = await db.select().from(users).where(eq(users.identityNumber, identityNumber)).limit(1);
    if (records.length === 0) return null;
    const raw = records[0];
    return {
      ...this.mapToDomain(raw),
      passwordHash: raw.passwordHash
    };
  }

  async findAll(): Promise<User[]> {
    const records = await db.select().from(users).orderBy(desc(users.id));
    return records.map((r) => this.mapToDomain(r));
  }

  async create(data: CreateUserInput & { passwordHash: string }): Promise<User> {
    const result = await db.insert(users).values({
      identityNumber: data.identityNumber,
      name: data.name,
      role: data.role,
      className: data.className || null,
      passwordHash: data.passwordHash,
      isActive: true
    }).returning();

    return this.mapToDomain(result[0]);
  }

  async updateStatus(id: number, isActive: boolean): Promise<User | null> {
    const updated = await db
      .update(users)
      .set({ isActive })
      .where(eq(users.id, id))
      .returning();

    if (updated.length === 0) return null;
    return this.mapToDomain(updated[0]);
  }

  async updatePassword(id: number, passwordHash: string): Promise<boolean> {
    const updated = await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, id))
      .returning({ id: users.id });

    return updated.length > 0;
  }

  async countTotal(): Promise<number> {
    const all = await db.select({ id: users.id }).from(users);
    return all.length;
  }

  private mapToDomain(raw: UserTable): User {
    return {
      id: raw.id,
      identityNumber: raw.identityNumber,
      name: raw.name,
      role: raw.role as User['role'],
      className: raw.className,
      isActive: raw.isActive,
      createdAt: raw.createdAt
    };
  }
}

export const userRepository = new UserRepository();

