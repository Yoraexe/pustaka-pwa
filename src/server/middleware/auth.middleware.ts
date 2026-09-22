/**
 * @file src/server/middleware/auth.middleware.ts
 * @description Middleware otentikasi JWT dan otorisasi peran (RBAC) untuk endpoint API.
 * @layer Middleware Layer
 */

import type { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import type { User, UserRole } from '../../shared/types/index.js';

// Extend Express Request untuk membawa entitas user
declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Akses ditolak. Token otentikasi tidak ditemukan.'
      }
    });
    return;
  }

  try {
    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (err: unknown) {
    res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_TOKEN',
        message: err instanceof Error ? err.message : 'Sesi tidak valid.'
      }
    });
  }
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Sesi belum terotentikasi.' }
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Peran Anda (${req.user.role}) tidak memiliki izin untuk mengakses resource ini.`
        }
      });
      return;
    }

    next();
  };
};
