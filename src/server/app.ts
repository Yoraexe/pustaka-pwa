/**
 * @file src/server/app.ts
 * @description Inisialisasi Express application, registrasi middleware global, dan mounting API routes.
 * @layer Server Application Configuration
 * 
 * Tujuan: Mengonfigurasi Express app, middleware CORS/JSON/URLencoded/static, dan me-mount router.
 * Caller: src/server/server.ts, integration test suites.
 * Dependensi: express, cors, path, authRouter, bookRouter, circulationRouter, errorHandler.
 * Main Functions: createApp.
 * Side Effects: Melayani static files di /uploads.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { authRouter } from './controllers/auth.controller.js';
import { bookRouter } from './controllers/book.controller.js';
import { circulationRouter } from './controllers/circulation.controller.js';
import { errorHandler } from './middleware/error.middleware.js';
import { config } from './config/index.js';

export const createApp = () => {
  const app = express();

  // Global Middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));

  // Security Headers Middleware (BUG-804: Protection against MIME-sniffing, clickjacking, and XSS)
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Body Parser with explicit payload limits (Astesia Hardening)
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Static uploads directory terbatas HANYA untuk sampul buku (/uploads/covers)
  // Berkas e-book PDF (/uploads/ebooks) TIDAK BOLEH disajikan statis dan wajib melalui proteksi /stream-pdf
  app.use('/uploads/covers', express.static(path.resolve(process.cwd(), 'uploads/covers')));

  // Health check endpoint (support both /api/health and /health)
  app.get(['/api/health', '/health'], (_req, res) => {
    res.json({
      status: 'healthy',
      app: 'Pustaka Sekolah PWA',
      timestamp: new Date().toISOString(),
      isTursoEnabled: Boolean(config.isTursoEnabled),
      hasTursoUrl: Boolean(config.TURSO_DATABASE_URL)
    });
  });

  // Mount API Routers (support both /api/* and /* for Vercel serverless rewrite compatibility)
  app.use(['/api/auth', '/auth'], authRouter);
  app.use(['/api/books', '/books'], bookRouter);
  app.use(['/api/circulation', '/circulation'], circulationRouter);

  // Serve PWA Frontend Static Build & SPA Routing Fallback (Production)
  const distPath = path.resolve(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
        return next();
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // 404 Not Found for unhandled /api routes
  app.use('/api', (_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Endpoint API tidak ditemukan.'
      }
    });
  });

  // Global Centralized Error Handler (Astesia Directive #4)
  app.use(errorHandler);

  return app;
};
