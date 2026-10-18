/**
 * @file src/server/config/index.ts
 * @description Konfigurasi server dan validasi variabel lingkungan dengan Zod.
 * @layer Server Configuration
 *
 * Tujuan: Memvalidasi environment variables dan menentukan lokasi database serta direktori penyimpanan berkas.
 * Caller: Seluruh modul backend (db, services, controllers, app).
 * Dependensi: zod, dotenv, path.
 * Main Functions: config.
 * Side Effects: Menghentikan proses jika variabel environment tidak valid.
 */

import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().default('pustaka-sekolah-super-secret-key-2026-astesia'),
  DATABASE_URL: z.string().default('./pustaka.db'),
  UPLOADS_DIR: z.string().default('./uploads/ebooks'),
  STUDENT_LOAN_LIMIT: z.coerce.number().default(2),
  STUDENT_LOAN_DAYS: z.coerce.number().default(7),
  TEACHER_LOAN_LIMIT: z.coerce.number().default(5),
  TEACHER_LOAN_DAYS: z.coerce.number().default(14),
  DAILY_FINE_AMOUNT: z.coerce.number().default(1000) // Rp 1.000 / hari
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Konfigurasi Environment tidak valid:', parsedEnv.error.format());
  process.exit(1);
}

const effectiveDbUrl =
  parsedEnv.data.NODE_ENV === 'test' || Boolean(process.env.VITEST)
    ? './pustaka.test.db'
    : parsedEnv.data.DATABASE_URL;

export const config = {
  ...parsedEnv.data,
  uploadsFullPath: path.resolve(process.cwd(), parsedEnv.data.UPLOADS_DIR),
  databaseFullPath: path.resolve(process.cwd(), effectiveDbUrl)
};

