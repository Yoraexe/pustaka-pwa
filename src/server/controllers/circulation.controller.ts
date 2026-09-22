/**
 * @file src/server/controllers/circulation.controller.ts
 * @description Thin controller untuk penanganan rute sirkulasi digital & fisik.
 * @layer Controller Layer (HTTP Interface)
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { circulationService } from '../services/circulation.service.js';
import { DigitalLoanSchema, PhysicalLoanSchema, ReturnPhysicalLoanSchema } from '../../shared/schemas/index.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';

export const circulationRouter = Router();

// 1. Digital Loan - Borrow
circulationRouter.post('/digital/borrow', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = DigitalLoanSchema.parse(req.body);
    const loan = await circulationService.borrowDigitalBook(req.user!, input.bookId);
    res.status(201).json({
      success: true,
      message: 'E-book berhasil dipinjam. Anda dapat membacanya langsung di aplikasi.',
      data: loan
    });
  } catch (err) {
    next(err);
  }
});

// 2. Digital Loan - Return
circulationRouter.post('/digital/return', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = DigitalLoanSchema.parse(req.body);
    await circulationService.returnDigitalBook(req.user!, input.bookId);
    res.json({
      success: true,
      message: 'E-book berhasil dikembalikan.'
    });
  } catch (err) {
    next(err);
  }
});

// 3. User's Own Loans
circulationRouter.get('/my-loans', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeOnly = req.query.active === 'true';
    const loans = await circulationService.getUserLoans(req.user!.id, activeOnly);
    res.json({
      success: true,
      data: loans
    });
  } catch (err) {
    next(err);
  }
});

// 4. Physical Loan - Check-out (Meja Pustakawan)
circulationRouter.post('/physical/checkout', authenticateToken, requireRole(['LIBRARIAN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = PhysicalLoanSchema.parse(req.body);
    const loan = await circulationService.checkOutPhysicalBook(req.user!, input.userIdentity, input.copyBarcode);
    res.status(201).json({
      success: true,
      message: 'Peminjaman buku fisik berhasil dicatat.',
      data: loan
    });
  } catch (err) {
    next(err);
  }
});

// 5. Physical Loan - Return (Meja Pustakawan)
circulationRouter.post('/physical/return', authenticateToken, requireRole(['LIBRARIAN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = ReturnPhysicalLoanSchema.parse(req.body);
    const result = await circulationService.returnPhysicalBook(req.user!, input.copyBarcode, input.finePaid);
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// 6. All Loans List (Meja Pustakawan & Audit)
circulationRouter.get('/all', authenticateToken, requireRole(['LIBRARIAN', 'ADMIN']), async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const loans = await circulationService.getAllCirculationLoans();
    res.json({
      success: true,
      data: loans
    });
  } catch (err) {
    next(err);
  }
});
