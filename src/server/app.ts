/**
 * @file src/server/app.ts
 * @description Inisialisasi Express application, registrasi middleware global, dan mounting API routes.
 * @layer Server Application Configuration
 */

import express from 'express';
import cors from 'cors';
import { authRouter } from './controllers/auth.controller.js';
import { bookRouter } from './controllers/book.controller.js';
import { circulationRouter } from './controllers/circulation.controller.js';
import { errorHandler } from './middleware/error.middleware.js';
import { config } from './config/index.js';

export const createApp = () => {
  const app = express();

  // Global Middleware
  app.use(cors({
    origin: '*',
    credentials: true
  }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Static uploads directory (untuk covers)
  app.use('/uploads', express.static(config.uploadsFullPath));

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
