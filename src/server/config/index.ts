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
  DAILY_FINE_AMOUNT: z.coerce.number().default(1000), // Rp 1.000 / hari
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET_COVERS: z.string().default('covers'),
  SUPABASE_BUCKET_EBOOKS: z.string().default('ebooks')
}).refine(
  (data) => {
    if (data.NODE_ENV === 'production' && !process.env.VERCEL) {
      return (
        data.JWT_SECRET &&
        data.JWT_SECRET !== 'pustaka-sekolah-super-secret-key-2026-astesia' &&
        data.JWT_SECRET.length >= 32
      );
    }
    return true;
  },
  {
    message: 'JWT_SECRET wajib diatur secara eksplisit dan aman (minimal 32 karakter) di lingkungan production.',
    path: ['JWT_SECRET']
  }
);

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const errMsg = `Konfigurasi Environment tidak valid: ${JSON.stringify(parsedEnv.error.format())}`;
  console.error('❌', errMsg);
  throw new Error(errMsg);
}

const effectiveDbUrl =
  parsedEnv.data.NODE_ENV === 'test' || Boolean(process.env.VITEST)
    ? './pustaka.test.db'
    : parsedEnv.data.DATABASE_URL;

const isTursoEnabled =
  parsedEnv.data.NODE_ENV !== 'test' &&
  !Boolean(process.env.VITEST) &&
  Boolean(parsedEnv.data.TURSO_DATABASE_URL);

const isSupabaseEnabled =
  Boolean(parsedEnv.data.SUPABASE_URL && parsedEnv.data.SUPABASE_SERVICE_ROLE_KEY);

export const config = {
  ...parsedEnv.data,
  isTursoEnabled,
  isSupabaseEnabled,
  uploadsFullPath: path.resolve(process.cwd(), parsedEnv.data.UPLOADS_DIR),
  databaseFullPath: path.resolve(process.cwd(), effectiveDbUrl)
};

