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
import { authRouter } from './controllers/auth.controller.js';
import { bookRouter } from './controllers/book.controller.js';
import { circulationRouter } from './controllers/circulation.controller.js';
import { errorHandler } from './middleware/error.middleware.js';

export const createApp = () => {
  const app = express();

  // Global Middleware
  app.use(cors({
    origin: true,
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads directory (untuk covers)
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

  // Health check endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'healthy',
      app: 'Pustaka Sekolah PWA',
      timestamp: new Date().toISOString()
    });
  });

  // Mount API Routers
  app.use('/api/auth', authRouter);
  app.use('/api/books', bookRouter);
  app.use('/api/circulation', circulationRouter);

  // Global Centralized Error Handler (Astesia Directive #4)
  app.use(errorHandler);

  return app;
};
