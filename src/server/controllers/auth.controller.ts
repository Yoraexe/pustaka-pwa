/**
 * @file src/server/controllers/auth.controller.ts
 * @description Thin controller untuk penanganan rute otentikasi akun.
 * @layer Controller Layer (HTTP Interface)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { authService } from '../services/auth.service.js';
import { LoginSchema, CreateUserSchema } from '../../shared/schemas/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const uploadCsv = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

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

// POST /api/auth/import-users (Mass user import via CSV - Admin Only)
authRouter.post('/import-users', authenticateToken, requireRole(['ADMIN']), uploadCsv.single('file'), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let csvText = '';
    if (req.file) {
      csvText = req.file.buffer.toString('utf-8');
    } else if (req.body.csvText || req.body.csvContent) {
      csvText = req.body.csvText || req.body.csvContent;
    } else {
      res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'File CSV atau data csvText wajib disertakan.' } });
      return;
    }

    const result = await authService.importUsersFromCsv(csvText);
    res.json({
      success: true,
      message: `Impor CSV selesai. ${result.importedCount} pengguna ditambahkan, ${result.skippedCount} dilewati.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
});
