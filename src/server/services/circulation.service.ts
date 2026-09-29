/**
 * @file src/server/services/circulation.service.ts
 * @description Layanan bisnis sirkulasi peminjaman hybrid (Digital E-book & Buku Fisik Meja Pustakawan).
 * @layer Service Layer (Business Logic)
 */

import { loanRepository, type LoanRepository } from '../repositories/loan.repository.js';
import { bookRepository, type BookRepository } from '../repositories/book.repository.js';
import { userRepository, type UserRepository } from '../repositories/user.repository.js';
import { sqlite } from '../db/index.js';
import { config } from '../config/index.js';
import type { Loan, User } from '../../shared/types/index.js';

export class CirculationService {
  constructor(
    private loanRepo: LoanRepository = loanRepository,
    private bookRepo: BookRepository = bookRepository,
    private userRepo: UserRepository = userRepository
  ) {}

  /**
   * Peminjaman Mandiri E-Book Digital oleh Pengguna (Siswa/Guru)
   */
  async borrowDigitalBook(user: User, bookId: number): Promise<Loan> {
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new Error(`Buku dengan ID ${bookId} tidak ditemukan.`);
    }

    if (book.bookType === 'PHYSICAL_ONLY' || !book.ebookFilePath) {
      throw new Error('Buku ini tidak tersedia dalam format digital e-book.');
    }

    // 1. Cek apakah user sudah meminjam buku ini secara aktif
    const existing = await this.loanRepo.findActiveLoan(user.id, bookId, 'DIGITAL');
    if (existing) {
      throw new Error('Anda sudah meminjam e-book ini. Silakan buka di menu "Rak Buku Saya".');
    }

    // 2. Cek kuota peminjaman aktif berdasarkan role pengguna
    const limit = user.role === 'TEACHER' ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const currentActiveCount = await this.loanRepo.countActiveUserLoans(user.id, 'DIGITAL');
    if (currentActiveCount >= limit) {
      throw new Error(`Batas maksimal peminjaman e-book (${limit} buku) tercapai. Harap kembalikan buku terlebih dahulu.`);
    }

    // 3. Cek ketersediaan lisensi simultan buku digital
    const activeDigitalBorrows = await this.loanRepo.countActiveDigitalLoansForBook(bookId);
    if (activeDigitalBorrows >= book.digitalLicenseCount) {
      throw new Error('Seluruh lisensi digital buku ini sedang dipinjam siswa lain. Silakan coba kembali nanti.');
    }

    // 4. Kalkulasi tanggal jatuh tempo (Durasi pinjam)
    const loanDays = user.role === 'TEACHER' ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);

    return this.loanRepo.create({
      userId: user.id,
      bookId: book.id,
      copyId: null,
      loanType: 'DIGITAL',
      dueDate: dueDate.toISOString()
    });
  }

  /**
   * Pengembalian E-Book Digital
   */
  async returnDigitalBook(user: User, bookId: number): Promise<void> {
    const loan = await this.loanRepo.findActiveLoan(user.id, bookId, 'DIGITAL');
    if (!loan) {
      throw new Error('Tidak ditemukan peminjaman aktif untuk e-book ini.');
    }

    await this.loanRepo.updateReturn(loan.id, new Date().toISOString(), 0, true);
  }

  /**
   * Peminjaman Buku Fisik di Meja Sirkulasi Pustakawan
   */
  async checkOutPhysicalBook(librarianUser: User, userIdentity: string, copyBarcode: string): Promise<Loan> {
    if (librarianUser.role !== 'LIBRARIAN' && librarianUser.role !== 'ADMIN') {
      throw new Error('Hanya pustakawan atau admin yang berwenang memproses peminjaman buku fisik.');
    }

    // 1. Validasi Anggota Peminjam
    const borrower = await this.userRepo.findByIdentityNumber(userIdentity);
    if (!borrower) {
      throw new Error(`Anggota dengan identitas ${userIdentity} tidak ditemukan.`);
    }

    if (!borrower.isActive) {
      throw new Error('Akun anggota ini sedang dinonaktifkan.');
    }

    // 2. Validasi Eksemplar Buku Fisik
    const copyData = await this.bookRepo.findCopyByBarcode(copyBarcode);
    if (!copyData) {
      throw new Error(`Eksemplar buku dengan barcode ${copyBarcode} tidak terdaftar.`);
    }

    if (copyData.status !== 'AVAILABLE') {
      throw new Error(`Eksemplar buku ini berstatus ${copyData.status} (tidak tersedia untuk dipinjam).`);
    }

    // 3. Cek kuota peminjaman fisik
    const limit = borrower.role === 'TEACHER' ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const activeLoans = await this.loanRepo.countActiveUserLoans(borrower.id, 'PHYSICAL');
    if (activeLoans >= limit) {
      throw new Error(`Anggota telah mencapai batas peminjaman fisik (${limit} buku).`);
    }

    // 4. Update status eksemplar & stok buku dan catat peminjaman secara atomik
    const loanDays = borrower.role === 'TEACHER' ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    // Set batas jatuh tempo hingga akhir hari (23:59:59) agar siswa dapat mengembalikan kapan saja di hari tersebut
    dueDate.setHours(23, 59, 59, 999);

    sqlite.exec('BEGIN IMMEDIATE');
    try {
      await this.bookRepo.updateCopyStatus(copyData.id, 'BORROWED');
      await this.bookRepo.updateAvailableCopies(copyData.bookId, -1);

      const createdLoan = await this.loanRepo.create({
        userId: borrower.id,
        bookId: copyData.bookId,
        copyId: copyData.id,
        loanType: 'PHYSICAL',
        dueDate: dueDate.toISOString()
      });

      sqlite.exec('COMMIT');
      return createdLoan;
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Pengembalian Buku Fisik & Kalkulasi Denda Otomatis
   */
  async returnPhysicalBook(librarianUser: User, copyBarcode: string, finePaid = false): Promise<{
    loan: Loan;
    overdueDays: number;
    fineAmount: number;
    message: string;
  }> {
    if (librarianUser.role !== 'LIBRARIAN' && librarianUser.role !== 'ADMIN') {
      throw new Error('Hanya pustakawan atau admin yang berwenang memproses pengembalian buku fisik.');
    }

    const copyData = await this.bookRepo.findCopyByBarcode(copyBarcode);
    if (!copyData) {
      throw new Error(`Eksemplar buku dengan barcode ${copyBarcode} tidak ditemukan.`);
    }

    const activeLoan = await this.loanRepo.findActivePhysicalLoanByCopyId(copyData.id);
    if (!activeLoan) {
      throw new Error(`Tidak ada transaksi peminjaman aktif untuk eksemplar ${copyBarcode}.`);
    }

    // Hitung keterlambatan berdasarkan batas hari kalender (Fair Calendar Day Overdue)
    const now = new Date();
    const dueDate = new Date(activeLoan.dueDate);

    // Normalisasi ke tanggal kalender (midnight) waktu lokal
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const diffTime = nowDateOnly.getTime() - dueDateOnly.getTime();
    const overdueDays = diffTime > 0 ? Math.round(diffTime / (1000 * 60 * 60 * 24)) : 0;
    const fineAmount = overdueDays * config.DAILY_FINE_AMOUNT;

    // Mutasi status pengembalian secara atomik
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      await this.loanRepo.updateReturn(activeLoan.id, now.toISOString(), fineAmount, finePaid || fineAmount === 0);
      await this.bookRepo.updateCopyStatus(copyData.id, 'AVAILABLE');
      await this.bookRepo.updateAvailableCopies(copyData.bookId, 1);
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }

    let message = 'Buku fisik berhasil dikembalikan tepat waktu.';
    if (overdueDays > 0) {
      message = `Buku terlambat ${overdueDays} hari. Denda tercatat: Rp ${fineAmount.toLocaleString('id-ID')}.`;
    }

    return {
      loan: {
        ...activeLoan,
        returnDate: now.toISOString(),
        status: 'RETURNED',
        fineAmount,
        isFinePaid: finePaid || fineAmount === 0
      },
      overdueDays,
      fineAmount,
      message
    };
  }


  async getUserLoans(userId: number, activeOnly = false): Promise<Loan[]> {
    return this.loanRepo.findUserLoans(userId, activeOnly);
  }

  async getAllCirculationLoans(limit = 100): Promise<Loan[]> {
    return this.loanRepo.findAllLoans(limit);
  }

  /**
   * 7. Reservasi Mandiri Buku Fisik oleh Pengguna (Siswa/Guru)
   */
  async reservePhysicalBook(user: User, bookId: number): Promise<Loan> {
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new Error(`Buku dengan ID ${bookId} tidak ditemukan.`);
    }

    if (book.bookType === 'DIGITAL_ONLY') {
      throw new Error('Buku ini hanya tersedia dalam format digital e-book dan tidak dapat direservasi secara fisik.');
    }

    // 1. Cek apakah user sudah meminjam buku fisik ini secara aktif
    const existingLoan = await this.loanRepo.findActiveLoan(user.id, bookId, 'PHYSICAL');
    if (existingLoan) {
      throw new Error('Anda sedang meminjam buku fisik ini. Kembalikan terlebih dahulu sebelum meminjam kembali.');
    }

    // 2. Cek apakah user sudah memiliki tiket reservasi aktif untuk buku ini
    const existingRes = await this.loanRepo.findActiveReservation(user.id, bookId);
    if (existingRes) {
      throw new Error(`Anda sudah memiliki tiket reservasi aktif untuk buku ini (Kode: ${existingRes.reservationCode}).`);
    }

    // 3. Cek kuota peminjaman dan reservasi fisik aktif pengguna
    const limit = user.role === 'TEACHER' ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const currentActiveCount = await this.loanRepo.countActiveUserPhysicalLoansAndReservations(user.id);
    if (currentActiveCount >= limit) {
      throw new Error(`Batas maksimal sirkulasi fisik (${limit} buku) tercapai. Anda tidak dapat membuat reservasi baru.`);
    }

    // 4. Cari eksemplar fisik yang tersedia
    const availableCopy = await this.bookRepo.findFirstAvailableCopy(bookId);
    if (!availableCopy || book.availablePhysicalCopies <= 0) {
      throw new Error('Seluruh eksemplar fisik buku ini sedang dipinjam atau direservasi oleh siswa lain.');
    }

    // 5. Buat kode reservasi unik & batas waktu pengambilan (24 jam)
    const reservationCode = `RSV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // 6. Kunci eksemplar fisik dan kurangi stok tersedia secara atomik
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      await this.bookRepo.updateCopyStatus(availableCopy.id, 'RESERVED');
      await this.bookRepo.updateAvailableCopies(book.id, -1);

      const reservation = await this.loanRepo.createReservation({
        userId: user.id,
        bookId: book.id,
        copyId: availableCopy.id,
        reservationCode,
        reservedUntil: reservedUntil.toISOString()
      });

      sqlite.exec('COMMIT');
      return reservation;
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * 8. Klaim & Serah Terima Buku Fisik di Meja Pustakawan Berdasarkan Kode Reservasi
   */
  async claimPhysicalReservation(librarianUser: User, reservationCode: string): Promise<Loan> {
    if (librarianUser.role !== 'LIBRARIAN' && librarianUser.role !== 'ADMIN') {
      throw new Error('Hanya pustakawan atau admin yang berwenang memproses serah terima reservasi fisik.');
    }

    const reservation = await this.loanRepo.findReservationByCode(reservationCode.trim().toUpperCase());
    if (!reservation) {
      throw new Error(`Tiket reservasi dengan kode "${reservationCode}" tidak ditemukan atau sudah tidak aktif.`);
    }

    if (reservation.status !== 'RESERVED') {
      throw new Error(`Status reservasi ini sudah ${reservation.status}.`);
    }

    if (reservation.reservedUntil && new Date(reservation.reservedUntil) < new Date()) {
      throw new Error('Batas waktu pengambilan untuk tiket reservasi ini telah kedaluwarsa.');
    }

    const borrower = await this.userRepo.findById(reservation.userId);
    const loanDays = borrower?.role === 'TEACHER' ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    dueDate.setHours(23, 59, 59, 999);

    const nowIso = new Date().toISOString();

    sqlite.exec('BEGIN IMMEDIATE');
    try {
      if (reservation.copyId) {
        await this.bookRepo.updateCopyStatus(reservation.copyId, 'BORROWED');
      }
      await this.loanRepo.updateClaimReservation(reservation.id, nowIso, dueDate.toISOString());
      sqlite.exec('COMMIT');

      return {
        ...reservation,
        borrowDate: nowIso,
        dueDate: dueDate.toISOString(),
        status: 'BORROWED'
      };
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * 9. Pembatalan Tiket Reservasi Fisik (oleh Siswa Pemilik atau Pustakawan)
   */
  async cancelPhysicalReservation(actorUser: User, loanId: number): Promise<void> {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan || loan.status !== 'RESERVED') {
      throw new Error('Tiket reservasi tidak ditemukan atau sudah tidak aktif.');
    }

    if (actorUser.role !== 'LIBRARIAN' && actorUser.role !== 'ADMIN' && loan.userId !== actorUser.id) {
      throw new Error('Anda tidak memiliki wewenang untuk membatalkan reservasi ini.');
    }

    sqlite.exec('BEGIN IMMEDIATE');
    try {
      await this.loanRepo.updateCancelReservation(loan.id);
      if (loan.copyId) {
        await this.bookRepo.updateCopyStatus(loan.copyId, 'AVAILABLE');
      }
      await this.bookRepo.updateAvailableCopies(loan.bookId, 1);
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * 10. Daftar Seluruh Tiket Reservasi Aktif untuk Meja Pustakawan
   */
  async getAllReservations(activeOnly = true): Promise<Loan[]> {
    return this.loanRepo.findAllReservations(activeOnly);
  }
}

export const circulationService = new CirculationService();
