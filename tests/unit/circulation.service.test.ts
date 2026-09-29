/**
 * @file tests/unit/circulation.service.test.ts
 * @description Unit tests untuk CirculationService (Aturan Bisnis Peminjaman & Pengembalian).
 * @layer Quality Assurance (Shift-Left TDD)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { circulationService } from '../../src/server/services/circulation.service.js';
import { bookRepository } from '../../src/server/repositories/book.repository.js';
import { userRepository } from '../../src/server/repositories/user.repository.js';
import type { User } from '../../src/shared/types/index.js';

describe('CirculationService Unit Tests', () => {
  let studentUser: User;
  let librarianUser: User;
  let hybridBookId: number;
  let physicalOnlyBookId: number;

  beforeAll(async () => {
    const student = await userRepository.findByIdentityNumber('NISN202602');
    if (!student) throw new Error('Student user not found in seed');
    studentUser = student;

    const librarian = await userRepository.findByIdentityNumber('PUSTAKA01');
    if (!librarian) throw new Error('Librarian user not found in seed');
    librarianUser = librarian;

    const allBooks = await bookRepository.findBooks({ bookType: 'ALL' });
    const hybrid = allBooks.find(b => b.bookType === 'HYBRID' && Boolean(b.ebookFilePath));
    const physical = allBooks.find(b => b.bookType === 'PHYSICAL_ONLY');

    if (!hybrid || !physical) throw new Error('Seed books not found');
    hybridBookId = hybrid.id;
    physicalOnlyBookId = physical.id;
  });

  it('harus berhasil meminjam e-book digital yang tersedia', async () => {
    const loan = await circulationService.borrowDigitalBook(studentUser, hybridBookId);
    expect(loan).toBeDefined();
    expect(loan.userId).toBe(studentUser.id);
    expect(loan.bookId).toBe(hybridBookId);
    expect(loan.loanType).toBe('DIGITAL');
    expect(loan.status).toBe('BORROWED');
  });

  it('harus menolak meminjam kembali e-book yang sedang aktif dipinjam oleh user yang sama', async () => {
    await expect(
      circulationService.borrowDigitalBook(studentUser, hybridBookId)
    ).rejects.toThrow('Anda sudah meminjam e-book ini');
  });

  it('harus menolak peminjaman digital jika buku berjenis PHYSICAL_ONLY', async () => {
    await expect(
      circulationService.borrowDigitalBook(studentUser, physicalOnlyBookId)
    ).rejects.toThrow('Buku ini tidak tersedia dalam format digital e-book');
  });

  it('harus berhasil mengembalikan e-book digital', async () => {
    await expect(
      circulationService.returnDigitalBook(studentUser, hybridBookId)
    ).resolves.toBeUndefined();

    // Verifikasi bisa dipinjam kembali setelah dikembalikan
    const reLoan = await circulationService.borrowDigitalBook(studentUser, hybridBookId);
    expect(reLoan.status).toBe('BORROWED');
    // Bersihkan lagi
    await circulationService.returnDigitalBook(studentUser, hybridBookId);
  });

  it('harus menolak peminjaman fisik jika dilakukan oleh siswa (bukan staf/pustakawan)', async () => {
    await expect(
      circulationService.checkOutPhysicalBook(studentUser, studentUser.identityNumber, 'BK-0001-01')
    ).rejects.toThrow('Hanya pustakawan atau admin yang berwenang');
  });

  it('harus berhasil memproses sirkulasi fisik check-out oleh pustakawan', async () => {
    const barcode = 'BK-0001-01';
    const loan = await circulationService.checkOutPhysicalBook(librarianUser, studentUser.identityNumber, barcode);
    expect(loan).toBeDefined();
    expect(loan.loanType).toBe('PHYSICAL');
    expect(loan.status).toBe('BORROWED');

    // Pengembalian buku fisik tepat waktu
    const returnResult = await circulationService.returnPhysicalBook(librarianUser, barcode);
    expect(returnResult.loan.status).toBe('RETURNED');
    expect(returnResult.overdueDays).toBe(0);
    expect(returnResult.fineAmount).toBe(0);
  });

  it('harus secara adil menganggap pengembalian di hari jatuh tempo sebagai 0 hari denda (Fair Calendar Day)', async () => {
    const barcode = 'BK-0001-02';
    // Peminjaman
    await circulationService.checkOutPhysicalBook(librarianUser, studentUser.identityNumber, barcode);
    
    // Pengembalian di hari yang sama
    const returnResult = await circulationService.returnPhysicalBook(librarianUser, barcode);
    expect(returnResult.overdueDays).toBe(0);
    expect(returnResult.fineAmount).toBe(0);
    expect(returnResult.message).toContain('tepat waktu');
  });

  describe('Physical Book Reservation (Option A)', () => {
    let reservationCode: string;
    let reservationLoanId: number;

    beforeAll(async () => {
      // Bersihkan jika ada sisa reservasi dari run sebelumnya
      const activeRes = await circulationService.getAllReservations(true);
      for (const res of activeRes) {
        if (res.userId === studentUser.id) {
          await circulationService.cancelPhysicalReservation(studentUser, res.id);
        }
      }
    });

    it('harus berhasil mereservasi buku fisik dan menerbitkan kode tiket RSV-...', async () => {
      const reservation = await circulationService.reservePhysicalBook(studentUser, physicalOnlyBookId);
      expect(reservation).toBeDefined();
      expect(reservation.status).toBe('RESERVED');
      expect(reservation.loanType).toBe('PHYSICAL');
      expect(reservation.reservationCode).toMatch(/^RSV-[A-Z0-9-]+$/);
      expect(reservation.reservedUntil).toBeDefined();
      expect(reservation.copyBarcode).toBeDefined();

      reservationCode = reservation.reservationCode!;
      reservationLoanId = reservation.id;
    });

    it('harus menolak reservasi ganda untuk buku yang sama oleh pemustaka yang sama', async () => {
      await expect(
        circulationService.reservePhysicalBook(studentUser, physicalOnlyBookId)
      ).rejects.toThrow('Anda sudah memiliki tiket reservasi aktif untuk buku ini');
    });

    it('harus berhasil membatalkan reservasi oleh pemustaka', async () => {
      await expect(
        circulationService.cancelPhysicalReservation(studentUser, reservationLoanId)
      ).resolves.toBeUndefined();

      // Verifikasi bisa reservasi kembali setelah pembatalan
      const reReserve = await circulationService.reservePhysicalBook(studentUser, physicalOnlyBookId);
      expect(reReserve.status).toBe('RESERVED');
      reservationCode = reReserve.reservationCode!;
    });

    it('harus menolak klaim reservasi jika dilakukan oleh siswa (bukan staf/pustakawan)', async () => {
      await expect(
        circulationService.claimPhysicalReservation(studentUser, reservationCode)
      ).rejects.toThrow('Hanya pustakawan atau admin yang berwenang');
    });

    it('harus berhasil klaim reservasi di meja sirkulasi oleh pustakawan menjadi status BORROWED', async () => {
      const claimedLoan = await circulationService.claimPhysicalReservation(librarianUser, reservationCode);
      expect(claimedLoan.status).toBe('BORROWED');
      expect(claimedLoan.loanType).toBe('PHYSICAL');

      // Kembalikan buku untuk merapikan state test
      if (claimedLoan.copyBarcode) {
        await circulationService.returnPhysicalBook(librarianUser, claimedLoan.copyBarcode);
      }
    });
  });

  describe('Physical Loan Renewal & Circulation Suspension Policy', () => {
    let renewalLoanId: number;
    let renewalBarcode: string;

    beforeAll(async () => {
      const available = await bookRepository.findAvailableCopies();
      if (available.length === 0) throw new Error('No available copy for renewal test');
      renewalBarcode = available[0].barcode;
    });

    it('harus berhasil memperpanjang pinjaman fisik 1 kali dan menambah durasi jatuh tempo', async () => {
      // 1. Check out buku fisik oleh pustakawan
      const initialLoan = await circulationService.checkOutPhysicalBook(
        librarianUser,
        studentUser.identityNumber,
        renewalBarcode
      );
      renewalLoanId = initialLoan.id;
      const initialDueDate = new Date(initialLoan.dueDate).getTime();

      // 2. Pemustaka memperpanjang pinjamannya secara mandiri
      const renewedLoan = await circulationService.renewPhysicalLoan(studentUser, renewalLoanId);
      expect(renewedLoan.isRenewed).toBe(true);
      expect(new Date(renewedLoan.dueDate).getTime()).toBeGreaterThan(initialDueDate);
    });

    it('harus menolak perpanjangan kedua untuk pinjaman yang sama (kebijakan maksimal 1 kali)', async () => {
      await expect(
        circulationService.renewPhysicalLoan(studentUser, renewalLoanId)
      ).rejects.toThrow('sudah pernah diperpanjang 1 kali');
    });

    it('harus menolak perpanjangan jika dilakukan oleh pengguna lain yang bukan peminjam', async () => {
      const fakeUser: User = { ...studentUser, id: 9999, identityNumber: 'FAKE999' };
      await expect(
        circulationService.renewPhysicalLoan(fakeUser, renewalLoanId)
      ).rejects.toThrow('tidak memiliki wewenang');
    });

    it('harus memvalidasi status suspensi sirkulasi pemustaka', async () => {
      const suspension = await circulationService.checkUserCirculationSuspension(studentUser.id);
      expect(suspension).toBeDefined();
      expect(typeof suspension.isSuspended).toBe('boolean');
      expect(typeof suspension.overdueCount).toBe('number');
      expect(typeof suspension.unpaidFineAmount).toBe('number');
    });

    afterAll(async () => {
      // Bersihkan buku yang dipinjam dengan mengembalikannya
      if (renewalBarcode) {
        await circulationService.returnPhysicalBook(librarianUser, renewalBarcode);
      }
    });
  });
});

