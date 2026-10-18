/**
 * @file src/server/middleware/error.middleware.ts
 * @description Global error handling middleware dengan format respons JSON seragam.
 * @layer Middleware Layer
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  // 1. Zod Validation Errors (400 Bad Request)
  if (err instanceof ZodError) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Validation Warning]:', err.flatten());
    }
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Payload request tidak valid.',
        details: err.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      }
    });
    return;
  }

  // 2. Business Logic Domain Errors (400 Bad Request)
  if (err instanceof Error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Domain Warning]:', err.message);
    }
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: err.message
      }
    });
    return;
  }

  // 3. Fallback Internal Server Error (500 Unexpected)
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan sistem internal.'
    }
  });
};
