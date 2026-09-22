/**
 * @file src/server/middleware/error.middleware.ts
 * @description Global error handling middleware dengan format respons JSON seragam.
 * @layer Middleware Layer
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export const errorHandler = (err: unknown, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[Unhandled Error]:', err);

  // 1. Zod Validation Errors
  if (err instanceof ZodError) {
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

  // 2. Business Logic Domain Errors
  if (err instanceof Error) {
    res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: err.message
      }
    });
    return;
  }

  // 3. Fallback Internal Server Error
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Terjadi kesalahan sistem internal.'
    }
  });
};
