/**
 * @file src/server/controllers/auth.controller.ts
 * @description Thin controller untuk penanganan rute otentikasi akun.
 * @layer Controller Layer (HTTP Interface)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { LoginSchema, CreateUserSchema } from '../../shared/schemas/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

export const authRouter = Router();

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = LoginSchema.parse(req.body);
    const session = await authService.login(input);
    res.json({
      success: true,
      message: 'Login berhasil.',
      data: session
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
authRouter.get('/me', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  res.json({
    success: true,
    data: req.user
  });
});

// POST /api/auth/register (Khusus Admin atau inisiasi awal)
authRouter.post('/register', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = CreateUserSchema.parse(req.body);
    const newUser = await authService.registerUser(input);
    res.status(201).json({
      success: true,
      message: 'Pengguna baru berhasil didaftarkan.',
      data: newUser
    });
  } catch (err) {
    next(err);
  }
});
