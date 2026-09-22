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

// Pastikan folder uploads tersedia
[uploadsRoot, ebooksDir, coversDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
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
    const ext = path.extname(file.originalname).toLowerCase();
    const sanitizedBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    cb(null, `${file.fieldname}-${sanitizedBase}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (file.fieldname === 'ebook') {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error('Format file e-book tidak valid. Hanya berkas PDF (.pdf) yang diperbolehkan.'));
    }
  } else if (file.fieldname === 'cover') {
    const isImage = file.mimetype.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.originalname);
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error('Format file sampul tidak valid. Hanya berkas gambar (JPG, PNG, WebP) yang diperbolehkan.'));
    }
  } else {
    cb(null, true);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024 // Batas maksimal 50 MB per file
  }
});

export const uploadBookFiles = upload.fields([
  { name: 'ebook', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]);
