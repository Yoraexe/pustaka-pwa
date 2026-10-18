/**
 * @file src/server/controllers/circulation.controller.ts
 * @description Thin controller untuk penanganan rute sirkulasi digital & fisik.
 * @layer Controller Layer (HTTP Interface)
 * 
 * Tujuan: Menyediakan antarmuka REST API tipis untuk peminjaman/pengembalian buku digital & fisik, reservasi 24 jam, dan perpanjangan masa pinjam.
 * Caller: src/server/app.ts (mounted at /api/circulation).
 * Dependensi: express, circulationService, shared/schemas, auth.middleware.
 * Main Functions: circulationRouter (POST /digital/borrow, POST /digital/return, GET /my-loans, POST /physical/borrow-self, POST /physical/return-self, POST /physical/checkout, POST /physical/return, GET /all, POST /physical/reserve, POST /physical/claim, POST /physical/cancel-reserve, GET /reservations, POST /physical/renew).
 * Side Effects: Meneruskan input ke service layer dan mengembalikan respons HTTP terstruktur.
 */

import { Router, type Request, type Response, type NextFunction } from 'express';
import { circulationService } from '../services/circulation.service.js';
import {
  DigitalLoanSchema,
  PhysicalLoanSchema,
  ReturnPhysicalLoanSchema,
  BorrowPhysicalSelfSchema,
  ReturnPhysicalSelfSchema,
  ReservePhysicalLoanSchema,
  ClaimReservationSchema,
  CancelReservationSchema,
  RenewLoanSchema
} from '../../shared/schemas/index.js';
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

// 3b. Physical Loan - Self-Service Borrow (Pemustaka langsung meminjam buku fisik)
circulationRouter.post('/physical/borrow-self', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = BorrowPhysicalSelfSchema.parse(req.body);
    const loan = await circulationService.borrowPhysicalBookSelf(req.user!, input.bookId, input.copyBarcode);
    res.status(201).json({
      success: true,
      message: `Buku fisik berhasil dipinjam (Barcode: ${loan.copyBarcode || '-'}).`,
      data: loan
    });
  } catch (err) {
    next(err);
  }
});

// 3c. Physical Loan - Instant Self-Return (Pemustaka atau Staf mengembalikan buku fisik saat itu juga)
circulationRouter.post('/physical/return-self', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = ReturnPhysicalSelfSchema.parse(req.body);
    const result = await circulationService.returnPhysicalBookSelf(req.user!, input.loanId);
    res.json({
      success: true,
      message: result.message,
      data: result
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

// 7. Physical Loan - Reserve (Siswa / Guru)
circulationRouter.post('/physical/reserve', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = ReservePhysicalLoanSchema.parse(req.body);
    const reservation = await circulationService.reservePhysicalBook(req.user!, input.bookId);
    res.status(201).json({
      success: true,
      message: `Buku berhasil direservasi. Kode tiket Anda: ${reservation.reservationCode}. Tunjukkan ke pustakawan dalam waktu 24 jam.`,
      data: reservation
    });
  } catch (err) {
    next(err);
  }
});

// 8. Physical Loan - Claim Reservation (Meja Pustakawan)
circulationRouter.post('/physical/claim', authenticateToken, requireRole(['LIBRARIAN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = ClaimReservationSchema.parse(req.body);
    const loan = await circulationService.claimPhysicalReservation(req.user!, input.reservationCode);
    res.json({
      success: true,
      message: `Klaim tiket reservasi ${input.reservationCode} berhasil. Peminjaman fisik telah dicatat.`,
      data: loan
    });
  } catch (err) {
    next(err);
  }
});

// 9. Physical Loan - Cancel Reservation (Siswa atau Pustakawan)
circulationRouter.post('/physical/cancel-reserve', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = CancelReservationSchema.parse(req.body);
    await circulationService.cancelPhysicalReservation(req.user!, input.loanId);
    res.json({
      success: true,
      message: 'Tiket reservasi berhasil dibatalkan dan stok eksemplar telah dipulihkan.'
    });
  } catch (err) {
    next(err);
  }
});

// 10. Physical Loan - All Reservations List (Meja Pustakawan)
circulationRouter.get('/reservations', authenticateToken, requireRole(['LIBRARIAN', 'ADMIN']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const activeOnly = req.query.active !== 'false';
    const reservations = await circulationService.getAllReservations(activeOnly);
    res.json({
      success: true,
      data: reservations
    });
  } catch (err) {
    next(err);
  }
});

// 11. Physical Loan - Renew 1-time (Siswa/Guru atau Pustakawan, BRD 3.3 Rule 3)
circulationRouter.post('/physical/renew', authenticateToken, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const input = RenewLoanSchema.parse(req.body);
    const renewedLoan = await circulationService.renewPhysicalLoan(req.user!, input.loanId);
    res.json({
      success: true,
      message: 'Masa pinjam buku fisik berhasil diperpanjang 1 kali.',
      data: renewedLoan
    });
  } catch (err) {
    next(err);
  }
});


