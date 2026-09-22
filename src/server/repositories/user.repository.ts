/**
 * @file src/server/repositories/user.repository.ts
 * @description Data access layer untuk entitas Pengguna (Siswa, Guru, Pustakawan, Admin).
 * @layer Repository Layer
 */

import { db } from '../db/index.js';
import { users, type UserTable } from '../db/schema.js';
import { eq } from 'drizzle-orm';
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
