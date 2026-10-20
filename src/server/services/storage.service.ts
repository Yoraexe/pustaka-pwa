/**
 * @file src/server/services/storage.service.ts
 * @description Storage service hybrid untuk menangani berkas sampul dan e-book (Lokal & Supabase Cloud Storage).
 * @layer Service Layer (Storage)
 *
 * Tujuan: Mengabstraksi operasi upload dan download berkas antara disk lokal (pengembangan/on-premise) dan Supabase Storage (produksi Vercel).
 * Caller: src/server/controllers/book.controller.ts.
 * Dependensi: @supabase/supabase-js, src/server/config/index.ts, fs, path.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import WebSocket from 'ws';
import { config } from '../config/index.js';
import fs from 'fs';
import path from 'path';

export class StorageService {
  private supabase: SupabaseClient | null = null;

  constructor() {
    this.getSupabase();
  }

  private getSupabase(): SupabaseClient | null {
    if (this.supabase) return this.supabase;
    const url = process.env.SUPABASE_URL || config.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || config.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.supabase = createClient(url, key, {
        auth: { persistSession: false },
        realtime: { transport: WebSocket as any }
      });
    }
    return this.supabase;
  }

  isCloud(): boolean {
    return this.getSupabase() !== null;
  }

  isCloudStorage(storedPath: string): boolean {
    return storedPath.startsWith('supabase://') || storedPath.startsWith('http://') || storedPath.startsWith('https://');
  }

  async saveCover(file: Express.Multer.File): Promise<string> {
    const rawExt = path.extname(file.originalname).toLowerCase() || '.jpg';
    const sanitizedBase = path.basename(file.originalname, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `cover-${sanitizedBase}-${Date.now()}-${Math.round(Math.random() * 1e6)}${rawExt}`;

    const supabase = this.getSupabase();
    if (supabase) {
      const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
      if (!buffer) throw new Error('Buffer berkas tidak ditemukan untuk upload cover.');

      const bucketName = process.env.SUPABASE_BUCKET_COVERS || config.SUPABASE_BUCKET_COVERS || 'covers';
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filename, buffer, {
          contentType: file.mimetype || 'image/jpeg',
          upsert: true
        });

      if (error) {
        throw new Error(`Gagal mengunggah cover ke Supabase: ${error.message}`);
      }

      const { data: publicUrlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(filename);

      // Bersihkan file disk temporary jika ada
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      }

      return publicUrlData.publicUrl;
    }

    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      throw new Error(
        'Penyimpanan Cloud (Supabase) belum terhubung di Vercel. ' +
        'Silakan tambahkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY pada Environment Variables Vercel agar file sampul & e-book dapat disimpan.'
      );
    }

    // Penyimpanan Lokal Disk
    if (file.path) {
      return `/uploads/covers/${path.basename(file.path)}`;
    } else if (file.buffer) {
      const targetPath = path.resolve(process.cwd(), 'uploads/covers', filename);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, file.buffer);
      return `/uploads/covers/${filename}`;
    }

    throw new Error('Data file cover tidak valid.');
  }

  async saveEbook(file: Express.Multer.File): Promise<string> {
    const rawExt = '.pdf';
    const sanitizedBase = path.basename(file.originalname, path.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `ebook-${sanitizedBase}-${Date.now()}-${Math.round(Math.random() * 1e6)}${rawExt}`;

    const supabase = this.getSupabase();
    if (supabase) {
      const buffer = file.buffer || (file.path ? fs.readFileSync(file.path) : null);
      if (!buffer) throw new Error('Buffer berkas tidak ditemukan untuk upload e-book.');

      const bucketName = process.env.SUPABASE_BUCKET_EBOOKS || config.SUPABASE_BUCKET_EBOOKS || 'ebooks';
      const { error } = await supabase.storage
        .from(bucketName)
        .upload(filename, buffer, {
          contentType: 'application/pdf',
          upsert: true
        });

      if (error) {
        throw new Error(`Gagal mengunggah PDF ke Supabase: ${error.message}`);
      }

      // Bersihkan file disk temporary jika ada
      if (file.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      }

      return `supabase://${bucketName}/${filename}`;
    }

    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      throw new Error(
        'Penyimpanan Cloud (Supabase) belum terhubung di Vercel. ' +
        'Silakan tambahkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY pada Environment Variables Vercel agar file sampul & e-book dapat disimpan.'
      );
    }

    // Penyimpanan Lokal Disk
    if (file.path) {
      return `./uploads/ebooks/${path.basename(file.path)}`;
    } else if (file.buffer) {
      const targetPath = path.resolve(process.cwd(), 'uploads/ebooks', filename);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, file.buffer);
      return `./uploads/ebooks/${filename}`;
    }

    throw new Error('Data file e-book tidak valid.');
  }

  async getEbookData(storedPath: string): Promise<{ buffer: Buffer; size: number }> {
    if (storedPath.startsWith('supabase://')) {
      const supabase = this.getSupabase();
      if (!supabase) {
        throw new Error('Supabase client tidak aktif untuk membaca e-book cloud.');
      }
      const parts = storedPath.replace('supabase://', '').split('/');
      const bucket = parts[0];
      const filename = parts.slice(1).join('/');

      const { data, error } = await supabase.storage.from(bucket).download(filename);
      if (error || !data) {
        throw new Error(`Gagal mengunduh e-book dari cloud storage: ${error?.message || 'File tidak ditemukan'}`);
      }

      const arrayBuffer = await data.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return { buffer, size: buffer.length };
    }

    // Baca dari berkas lokal
    const fullPath = path.resolve(process.cwd(), storedPath);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File PDF tidak ditemukan di server.');
    }
    const buffer = fs.readFileSync(fullPath);
    return { buffer, size: buffer.length };
  }
}

export const storageService = new StorageService();
