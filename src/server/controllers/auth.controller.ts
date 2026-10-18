/**
 * @file src/server/controllers/auth.controller.ts
 * @description Thin controller untuk penanganan rute otentikasi akun, registrasi mandiri, dan manajemen akun Superadmin.
 * @layer Controller Layer (HTTP Interface)
 * 
 * Tujuan: Menyediakan endpoint HTTP untuk login, registrasi mandiri (signup), pembuatan akun oleh Superadmin, manajemen daftar pengguna, dan impor CSV.
 * Caller: src/server/app.ts (mounted at /api/auth).
 * Dependensi: express, multer, authService, shared/schemas, auth.middleware.
 * Main Functions: authRouter (POST /login, POST /signup, GET /me, GET /users, POST /register, PATCH /users/:id/status, PATCH /users/:id/password, POST /import-users).
 * Side Effects: Memvalidasi request payload dengan Zod dan memanggil AuthService.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { authService } from '../services/auth.service.js';
import {
  LoginSchema,
  CreateUserSchema,
  SelfRegisterSchema,
  UpdateUserStatusSchema,
  ResetUserPasswordSchema
} from '../../shared/schemas/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

const ALLOWED_CSV_MIMES = [
  'text/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/csv',
  'text/x-csv',
  'application/x-csv'
];

const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsvExt = file.originalname.toLowerCase().endsWith('.csv');
    const isCsvMime = ALLOWED_CSV_MIMES.includes(file.mimetype);
    if (isCsvExt || isCsvMime) {
      cb(null, true);
    } else {
      cb(new Error('Format berkas tidak didukung. Harap unggah berkas berekstensi .csv.'));
    }
  }
});

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


// POST /api/auth/signup (Pendaftaran mandiri khusus Siswa & Guru)
authRouter.post('/signup', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = SelfRegisterSchema.parse(req.body);
    const session = await authService.selfRegister(input);
    res.status(201).json({
      success: true,
      message: 'Pendaftaran akun berhasil.',
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

// GET /api/auth/users (Daftar seluruh pengguna untuk Superadmin & Pustakawan)
authRouter.get('/users', authenticateToken, requireRole(['ADMIN', 'LIBRARIAN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const usersList = await authService.getAllUsers(req.user!);
    res.json({
      success: true,
      data: usersList
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register (Khusus Superadmin / ADMIN untuk membuat akun semua role)
authRouter.post('/register', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = CreateUserSchema.parse(req.body);
    const newUser = await authService.registerUser(input);
    res.status(201).json({
      success: true,
      message: 'Pengguna baru berhasil didaftarkan oleh Superadmin.',
      data: newUser
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/users/:id/status (Aktifkan / Nonaktifkan akun oleh Superadmin)
authRouter.patch('/users/:id/status', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'ID pengguna harus berupa bilangan bulat positif.' } });
      return;
    }
    const input = UpdateUserStatusSchema.parse(req.body);
    const updatedUser = await authService.toggleUserStatus(req.user!, targetId, input.isActive);
    res.json({
      success: true,
      message: `Status akun ${updatedUser.name} berhasil diperbarui.`,
      data: updatedUser
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/users/:id/password (Reset kata sandi oleh Superadmin)
authRouter.patch('/users/:id/password', authenticateToken, requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      res.status(400).json({ success: false, error: { code: 'INVALID_ID', message: 'ID pengguna harus berupa bilangan bulat positif.' } });
      return;
    }
    const input = ResetUserPasswordSchema.parse(req.body);
    await authService.resetUserPassword(req.user!, targetId, input.newPassword);
    res.json({
      success: true,
      message: 'Kata sandi pengguna berhasil direset.'
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

