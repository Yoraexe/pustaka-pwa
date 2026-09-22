/**
 * @file src/server/controllers/book.controller.ts
 * @description Thin controller untuk penanganan rute katalog buku dan streaming PDF e-book terproteksi.
 * @layer Controller Layer (HTTP Interface)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { bookService } from '../services/book.service.js';
import { BookFilterSchema, CreateBookSchema } from '../../shared/schemas/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
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

// GET /api/books
bookRouter.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const filters = BookFilterSchema.parse(req.query);
    const books = await bookService.searchBooks(filters);
    res.json({ success: true, data: books });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id
bookRouter.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'ID Buku tidak valid.' } });
      return;
    }
    const book = await bookService.getBookDetail(id);
    res.json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
});

// POST /api/books (Librarian / Admin)
bookRouter.post('/', authenticateToken, requireRole(['LIBRARIAN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = CreateBookSchema.parse(req.body);
    const newBook = await bookService.addNewBook(input);
    res.status(201).json({
      success: true,
      message: 'Buku berhasil ditambahkan ke katalog.',
      data: newBook
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/books/:id/stream-pdf (Proteksi Streaming E-Book Terautentikasi)
bookRouter.get('/:id/stream-pdf', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const book = await bookService.getBookDetail(id);

    if (!book.ebookFilePath) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'File PDF tidak tersedia untuk buku ini.' } });
      return;
    }

    const fullPath = path.resolve(process.cwd(), book.ebookFilePath);
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
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});
