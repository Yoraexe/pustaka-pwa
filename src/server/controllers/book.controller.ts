/**
 * @file src/server/controllers/book.controller.ts
 * @description Thin controller untuk penanganan rute katalog buku dan streaming PDF e-book terproteksi.
 * @layer Controller Layer (HTTP Interface)
 * 
 * Tujuan: Menyediakan antarmuka REST API untuk penelusuran katalog, ketersediaan eksemplar, penambahan buku baru, dan streaming PDF e-book berlisensi.
 * Caller: src/server/app.ts (mounted at /api/books).
 * Dependensi: express, bookService, circulationService, shared/schemas, auth.middleware, upload.middleware, path, fs.
 * Main Functions: bookRouter (GET /categories, GET /, GET /copies/available, GET /:id, POST /, GET /:id/stream-pdf).
 * Side Effects: Membaca berkas PDF dari sistem penyimpanan lokal dan mengalirkannya ke respons HTTP.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { bookService } from '../services/book.service.js';
import { circulationService } from '../services/circulation.service.js';
import { BookFilterSchema, CreateBookSchema } from '../../shared/schemas/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { uploadBookFiles } from '../middleware/upload.middleware.js';
import { storageService } from '../services/storage.service.js';
import path from 'path';
import fs from 'fs';

export const bookRouter = Router();

// GET /api/books/categories
bookRouter.get('/categories', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const categories = await bookService.listCategories();
    res.json({ success: true, data: categories });
  } catch (err) {
    next(err);
  }
});

// GET /api/books (Katalog dengan Filter)
bookRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = BookFilterSchema.parse(req.query);
    const books = await bookService.searchBooks(filters);
    res.json({ success: true, data: books });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/copies/available (Daftar Eksemplar Fisik yang Tersedia untuk Peminjaman)
bookRouter.get('/copies/available', async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const availableCopies = await bookService.getAvailableCopies();
    res.json({ success: true, data: availableCopies });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id
bookRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'ID buku harus berupa bilangan bulat positif.' } });
      return;
    }
    const book = await bookService.getBookDetail(id);
    res.json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
});

// Helper pembersihan berkas biner Multer yang tertulis di disk jika validasi atau penyimpanan gagal (CWE-459)
const cleanupUploadedFiles = (files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[]): void => {
  if (!files) return;
  const fileList: Express.Multer.File[] = Array.isArray(files)
    ? files
    : Object.values(files).flat();

  for (const file of fileList) {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (err) {
      console.error(`[Cleanup Warning] Gagal menghapus berkas orphan ${file.path}:`, err);
    }
  }
};

// POST /api/books (Librarian / Admin - Multipart Upload & JSON)
bookRouter.post('/', authenticateToken, requireRole(['LIBRARIAN', 'ADMIN']), uploadBookFiles, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
  try {
    const rawBody = { ...req.body };

    // Tangani file biner yang diunggah
    if (files) {
      if (files.ebook && files.ebook.length > 0) {
        rawBody.ebookFilePath = await storageService.saveEbook(files.ebook[0]);
      }
      if (files.cover && files.cover.length > 0) {
        rawBody.coverUrl = await storageService.saveCover(files.cover[0]);
      }
    }

    // Validasi pencegahan path traversal manual jika ebookFilePath dikirim via body
    if (rawBody.ebookFilePath && !storageService.isCloudStorage(rawBody.ebookFilePath)) {
      const normalized = path.normalize(rawBody.ebookFilePath).replace(/\\/g, '/');
      if (normalized.includes('..') || (!normalized.startsWith('uploads/ebooks/') && !normalized.startsWith('./uploads/ebooks/'))) {
        cleanupUploadedFiles(files);
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_FILE_PATH', message: 'Jalur file e-book tidak valid atau berada di luar direktori aman.' }
        });
        return;
      }
    }

    const input = CreateBookSchema.parse(rawBody);
    const newBook = await bookService.addNewBook(input);
    res.status(201).json({
      success: true,
      message: 'Buku berhasil ditambahkan ke katalog perpustakaan.',
      data: newBook
    });
  } catch (err) {
    cleanupUploadedFiles(files);
    next(err);
  }
});

// GET /api/books/:id/stream-pdf (Proteksi Streaming E-Book Terautentikasi)
bookRouter.get('/:id/stream-pdf', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'ID buku harus berupa bilangan bulat positif.' } });
      return;
    }
    const book = await bookService.getBookDetail(id);

    // Validasi Otorisasi: Wajib memiliki pinjaman aktif jika role adalah Siswa/Guru (BRD Seksi 3.2 & AC-2.2)
    const hasAccess = await circulationService.hasActiveDigitalAccess(req.user!, id);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Anda belum meminjam e-book ini atau masa peminjaman telah berakhir.'
        }
      });
      return;
    }

    if (!book.ebookFilePath) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File PDF tidak tersedia untuk buku ini.' } });
      return;
    }

    // Dukungan Cloud Storage (Supabase)
    if (storageService.isCloudStorage(book.ebookFilePath)) {
      try {
        const { buffer, size } = await storageService.getEbookData(book.ebookFilePath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
        res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
        res.setHeader('Content-Length', size);
        res.send(buffer);
        return;
      } catch (err: any) {
        res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: err.message || 'File dokumen e-book tidak ditemukan di cloud storage.' } });
        return;
      }
    }

    const ebooksBaseDir = path.resolve(process.cwd(), 'uploads/ebooks');
    const fullPath = path.resolve(process.cwd(), book.ebookFilePath);

    // Sandbox check: Pastikan file berada di dalam uploads/ebooks untuk mencegah Path Traversal / Arbitrary File Read
    if (!fullPath.startsWith(ebooksBaseDir) || !fullPath.toLowerCase().endsWith('.pdf')) {
      res.status(403).json({ success: false, error: { code: 'FORBIDDEN_PATH', message: 'Akses ke jalur berkas ini ditolak demi keamanan sistem.' } });
      return;
    }

    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: { code: 'FILE_NOT_FOUND', message: 'File dokumen e-book tidak ditemukan di server.' } });
      return;
    }

    // Set header agar browser mengizinkan caching offline dan streaming inline
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="document.pdf"');
    res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
    res.setHeader('Content-Length', fs.statSync(fullPath).size);

    const stream = fs.createReadStream(fullPath);

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: { code: 'STREAM_ERROR', message: 'Gagal membaca berkas e-book dari server.' }
        });
      } else {
        res.destroy();
      }
    });

    res.on('close', () => {
      stream.destroy();
    });

    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});
