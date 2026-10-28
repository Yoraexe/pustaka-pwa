/**
 * @file src/server/middleware/upload.middleware.ts
 * @description Middleware Multer untuk pengunggahan file dokumen e-book PDF dan gambar sampul buku.
 * @layer Infrastructure / Middleware Layer
 * 
 * Tujuan: Menangani multipart/form-data upload untuk buku perpustakaan (PDF & Cover).
 * Caller: src/server/controllers/book.controller.ts (POST /api/books).
 * Dependensi: multer, path, fs.
 * Main Functions: uploadBookFiles.
 * Side Effects: Menulis file biner ke direktori ./uploads/ebooks dan ./uploads/covers.
 */

import multer from 'multer';
import path from 'path';
import fs from 'fs';

const uploadsRoot = path.resolve(process.cwd(), 'uploads');
const ebooksDir = path.resolve(uploadsRoot, 'ebooks');
const coversDir = path.resolve(uploadsRoot, 'covers');

import { config } from '../config/index.js';

// Pastikan folder uploads tersedia jika berjalan di mode disk lokal
if (!config.isSupabaseEnabled && !process.env.VERCEL) {
  try {
    [uploadsRoot, ebooksDir, coversDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  } catch (err) {
    console.warn('[Upload Directory Notice]:', err);
  }
}

const ALLOWED_COVER_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_COVER_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const storage = (config.isSupabaseEnabled || Boolean(process.env.VERCEL))
  ? multer.memoryStorage()
  : multer.diskStorage({
      destination: (_req, file, cb) => {
        if (file.fieldname === 'ebook') {
          cb(null, ebooksDir);
        } else if (file.fieldname === 'cover') {
          cb(null, coversDir);
        } else {
          cb(null, uploadsRoot);
        }
      },
      filename: (_req, file, cb) => {
        const rawExt = path.extname(file.originalname).toLowerCase();
        const sanitizedBase = path.basename(file.originalname, rawExt).replace(/[^a-zA-Z0-9_-]/g, '_');
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;

        // Paksa ekstensi yang aman dan terisolasi
        const safeExt = file.fieldname === 'ebook'
          ? '.pdf'
          : ALLOWED_COVER_EXTS.includes(rawExt) ? rawExt : '.jpg';

        cb(null, `${file.fieldname}-${sanitizedBase}-${uniqueSuffix}${safeExt}`);
      }
    });

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.fieldname === 'ebook') {
    const isPdf = file.mimetype === 'application/pdf' && file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error('Format file e-book tidak valid. Hanya berkas PDF (.pdf) dengan MIME application/pdf yang diperbolehkan.'));
    }
  } else if (file.fieldname === 'cover') {
    const ext = path.extname(file.originalname).toLowerCase();
    const isImage = ALLOWED_COVER_EXTS.includes(ext) && ALLOWED_COVER_MIMES.includes(file.mimetype.toLowerCase());
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error('Format file sampul tidak valid. Hanya berkas gambar (JPG, PNG, WebP) yang diperbolehkan.'));
    }
  } else {
    cb(new Error('Bidang berkas tidak dikenali.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // Batas maksimal 25 MB per file (mendukung hingga 20 MB buku e-book PDF)
  }
});

export const uploadBookFiles = upload.fields([
  { name: 'ebook', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);
