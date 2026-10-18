/**
 * @file src/server/services/circulation.service.ts
 * @description Layanan bisnis sirkulasi peminjaman hybrid (Digital E-book & Buku Fisik Meja Pustakawan).
 * @layer Service Layer (Business Logic)
 * 
 * Tujuan: Menyediakan logika bisnis untuk sirkulasi buku digital, peminjaman fisik mandiri & meja pustakawan, pengembalian fisik instan, reservasi 24 jam, perpanjangan, dan validasi hak akses streaming.
 * Caller: src/server/controllers/circulation.controller.ts, src/server/controllers/book.controller.ts, test suites.
 * Dependensi: loanRepository, bookRepository, userRepository, sqlite, config, shared/types.
 * Main Functions: borrowDigitalBook, returnDigitalBook, borrowPhysicalBookSelf, returnPhysicalBookSelf, checkOutPhysicalBook, returnPhysicalBook, reservePhysicalBook, claimPhysicalReservation, cancelPhysicalReservation, renewPhysicalLoan, hasActiveDigitalAccess.
 * Side Effects: Mutasi transaksi database SQLite secara atomik (BEGIN IMMEDIATE/COMMIT/ROLLBACK).
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
   * Validasi Hak Akses Streaming Dokumen E-Book Digital (BRD Seksi 3.2 & AC-2.2)
   */
  async hasActiveDigitalAccess(user: User, bookId: number): Promise<boolean> {
    if (user.role === 'LIBRARIAN' || user.role === 'ADMIN') {
      return true;
    }
    const activeLoan = await this.loanRepo.findActiveLoan(user.id, bookId, 'DIGITAL');
    return Boolean(activeLoan);
  }

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

    // 1b. Validasi Penangguhan Sirkulasi (Denda tertunggak / Keterlambatan buku fisik, BRD 3.3 Negative Flow)
    const suspension = await this.loanRepo.checkUserCirculationSuspension(user.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }

    // 2. Cek kuota peminjaman aktif berdasarkan role pengguna
    const limit = user.role === 'TEACHER' ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const currentActiveCount = await this.loanRepo.countActiveUserLoans(user.id, 'DIGITAL');
    if (currentActiveCount >= limit) {
      throw new Error(`Batas maksimal peminjaman e-book (${limit} buku) tercapai. Harap kembalikan buku terlebih dahulu.`);
    }

    sqlite.exec('BEGIN IMMEDIATE');
    try {
      // 3. Cek ketersediaan lisensi simultan buku digital di dalam transaksi
      const activeDigitalBorrows = await this.loanRepo.countActiveDigitalLoansForBook(bookId);
      if (activeDigitalBorrows >= book.digitalLicenseCount) {
        throw new Error('Seluruh lisensi digital buku ini sedang dipinjam siswa lain. Silakan coba kembali nanti.');
      }

      // 4. Kalkulasi tanggal jatuh tempo (Durasi pinjam dinormalisasi ke akhir hari 23:59:59)
      const loanDays = user.role === 'TEACHER' ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + loanDays);
      dueDate.setHours(23, 59, 59, 999);

      const createdLoan = await this.loanRepo.create({
        userId: user.id,
        bookId: book.id,
        copyId: null,
        loanType: 'DIGITAL',
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
   * Pengembalian E-Book Digital
   */
  async returnDigitalBook(user: User, bookId: number): Promise<void> {
    const loan = await this.loanRepo.findActiveLoan(user.id, bookId, 'DIGITAL');
    if (!loan) {
      throw new Error('Tidak ditemukan peminjaman aktif untuk e-book ini.');
    }

    const changes = await this.loanRepo.updateReturn(loan.id, new Date().toISOString(), 0, true);
    if (changes === 0) {
      throw new Error('E-book ini sudah dikembalikan atau tidak dalam status pinjaman aktif.');
    }
  }

  /**
   * Peminjaman Buku Fisik Mandiri (Self-Service Checkout) langsung oleh Pemustaka
   * Mendukung peminjaman via ID Buku maupun langsung via hasil Scan QR / Barcode eksemplar.
   */
  async borrowPhysicalBookSelf(user: User, bookId?: number, copyBarcode?: string): Promise<Loan> {
    if (!user.isActive) {
      throw new Error('Akun Anda sedang dinonaktifkan.');
    }

    const cleanBarcode = copyBarcode
      ? copyBarcode.replace(/^PUSTAKA:(COPY|BOOK):/i, '').trim()
      : undefined;

    let resolvedBookId = bookId;
    if (!resolvedBookId && cleanBarcode) {
      const scannedCopy = await this.bookRepo.findCopyByBarcode(cleanBarcode);
      if (!scannedCopy) {
        throw new Error(`Kode QR / Barcode eksemplar "${cleanBarcode}" tidak ditemukan di database perpustakaan.`);
      }
      resolvedBookId = scannedCopy.bookId;
    }

    if (!resolvedBookId) {
      throw new Error('ID Buku atau Kode QR/Barcode eksemplar wajib disertakan.');
    }

    const bookIdNum = resolvedBookId;
    const book = await this.bookRepo.findById(bookIdNum);
    if (!book) {
      throw new Error(`Buku dengan ID ${bookIdNum} tidak ditemukan.`);
    }

    if (book.bookType === 'DIGITAL_ONLY') {
      throw new Error('Buku ini hanya tersedia dalam format digital e-book.');
    }

    // 1. Cek apakah user sudah meminjam buku fisik ini secara aktif
    const existingLoan = await this.loanRepo.findActiveLoan(user.id, bookIdNum, 'PHYSICAL');
    if (existingLoan) {
      throw new Error('Anda sudah meminjam buku fisik ini. Silakan cek di menu "Rak Buku Saya".');
    }

    // 2. Validasi Penangguhan Sirkulasi (Denda tertunggak / Keterlambatan buku fisik)
    const suspension = await this.loanRepo.checkUserCirculationSuspension(user.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }

    // 3. Jika user sudah punya tiket reservasi aktif untuk buku ini, langsung konversi menjadi BORROWED
    const existingRes = await this.loanRepo.findActiveReservation(user.id, bookIdNum);
    const loanDays = user.role === 'TEACHER' ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    dueDate.setHours(23, 59, 59, 999);
    const nowIso = new Date().toISOString();

    if (existingRes) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const claimChanges = await this.loanRepo.updateClaimReservation(existingRes.id, nowIso, dueDate.toISOString());
        if (claimChanges === 0) {
          throw new Error('Tiket reservasi sudah diklaim atau sudah tidak aktif.');
        }
        if (existingRes.copyId) {
          await this.bookRepo.updateCopyStatus(existingRes.copyId, 'BORROWED');
        }
        sqlite.exec('COMMIT');
        return {
          ...existingRes,
          borrowDate: nowIso,
          dueDate: dueDate.toISOString(),
          status: 'BORROWED'
        };
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    }

    // 4. Cek kuota peminjaman fisik aktif pengguna
    const limit = user.role === 'TEACHER' ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const activeLoansCount = await this.loanRepo.countActiveUserPhysicalLoansAndReservations(user.id);
    if (activeLoansCount >= limit) {
      throw new Error(`Batas maksimal peminjaman buku fisik (${limit} buku) tercapai. Kembalikan buku fisik yang sedang dipinjam terlebih dahulu.`);
    }

    // 5. Tentukan eksemplar fisik yang akan dipinjam
    let targetCopy = null;
    if (cleanBarcode) {
      const byBarcode = await this.bookRepo.findCopyByBarcode(cleanBarcode);
      if (!byBarcode || byBarcode.bookId !== bookIdNum) {
        throw new Error(`Barcode eksemplar ${cleanBarcode} tidak sesuai dengan buku ini.`);
      }
      if (byBarcode.status !== 'AVAILABLE') {
        throw new Error(`Eksemplar ${cleanBarcode} sedang tidak tersedia (${byBarcode.status}).`);
      }
      targetCopy = byBarcode;
    } else {
      targetCopy = await this.bookRepo.findFirstAvailableCopy(bookIdNum);
    }

    if (!targetCopy || book.availablePhysicalCopies <= 0) {
      throw new Error('Seluruh eksemplar fisik buku ini sedang dipinjam. Silakan coba kembali nanti.');
    }

    // 6. Catat peminjaman fisik secara atomik
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const copyChanges = await this.bookRepo.updateCopyStatus(targetCopy.id, 'BORROWED', 'AVAILABLE');
      if (copyChanges === 0) {
        throw new Error('Eksemplar fisik ini baru saja dipinjam atau tidak lagi tersedia.');
      }
      await this.bookRepo.updateAvailableCopies(book.id, -1);

      const createdLoan = await this.loanRepo.create({
        userId: user.id,
        bookId: book.id,
        copyId: targetCopy.id,
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
   * Pengembalian Buku Fisik Instan (Saat Itu Juga) oleh Peminjam atau Staf
   * Tidak mengharuskan masa pinjam habis terlebih dahulu.
   */
  async returnPhysicalBookSelf(actorUser: User, loanId: number): Promise<{
    loan: Loan;
    overdueDays: number;
    fineAmount: number;
    message: string;
  }> {
    const activeLoan = await this.loanRepo.findById(loanId);
    if (!activeLoan) {
      throw new Error('Data peminjaman buku fisik tidak ditemukan.');
    }

    if (activeLoan.loanType !== 'PHYSICAL') {
      throw new Error('Transaksi ini bukan peminjaman buku fisik.');
    }

    if (activeLoan.status !== 'BORROWED') {
      throw new Error(`Buku ini sudah berstatus ${activeLoan.status}.`);
    }

    const isStaff = actorUser.role === 'LIBRARIAN' || actorUser.role === 'ADMIN';
    if (!isStaff && activeLoan.userId !== actorUser.id) {
      throw new Error('Anda tidak memiliki wewenang untuk mengembalikan pinjaman milik pengguna lain.');
    }

    // Hitung keterlambatan berdasarkan hari kalender (0 hari jika dikembalikan sebelum/pada hari jatuh tempo)
    const now = new Date();
    const dueDate = new Date(activeLoan.dueDate);
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const diffTime = nowDateOnly.getTime() - dueDateOnly.getTime();
    const overdueDays = diffTime > 0 ? Math.round(diffTime / (1000 * 60 * 60 * 24)) : 0;
    const fineAmount = overdueDays * config.DAILY_FINE_AMOUNT;
    const isFinePaid = fineAmount === 0 || isStaff;

    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const returnChanges = await this.loanRepo.updateReturn(activeLoan.id, now.toISOString(), fineAmount, isFinePaid);
      if (returnChanges === 0) {
        throw new Error('Buku fisik ini sudah dikembalikan atau tidak dalam status pinjaman aktif.');
      }
      if (activeLoan.copyId) {
        await this.bookRepo.updateCopyStatus(activeLoan.copyId, 'AVAILABLE');
      }
      await this.bookRepo.updateAvailableCopies(activeLoan.bookId, 1);
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }

    let message = 'Buku fisik berhasil dikembalikan tepat waktu.';
    if (overdueDays > 0) {
      message = `Buku dikembalikan dengan keterlambatan ${overdueDays} hari. Denda: Rp ${fineAmount.toLocaleString('id-ID')}.`;
    }

    return {
      loan: {
        ...activeLoan,
        returnDate: now.toISOString(),
        status: 'RETURNED',
        fineAmount,
        isFinePaid
      },
      overdueDays,
      fineAmount,
      message
    };
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

    // 1b. Validasi Penangguhan Sirkulasi (Denda tertunggak / Keterlambatan buku fisik, BRD 3.3 Negative Flow)
    const suspension = await this.loanRepo.checkUserCirculationSuspension(borrower.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }

    // 2. Validasi Eksemplar Buku Fisik
    const copyData = await this.bookRepo.findCopyByBarcode(copyBarcode);
    if (!copyData) {
      throw new Error(`Eksemplar buku dengan barcode ${copyBarcode} tidak terdaftar.`);
    }

    if (copyData.status !== 'AVAILABLE') {
      throw new Error(`Eksemplar buku ini berstatus ${copyData.status} (tidak tersedia untuk dipinjam).`);
    }

    // 3. Cek kuota peminjaman fisik (termasuk tiket reservasi aktif yang mengunci kuota)
    const limit = borrower.role === 'TEACHER' ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const activeLoans = await this.loanRepo.countActiveUserPhysicalLoansAndReservations(borrower.id);
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
      const copyChanges = await this.bookRepo.updateCopyStatus(copyData.id, 'BORROWED', 'AVAILABLE');
      if (copyChanges === 0) {
        throw new Error('Eksemplar buku ini baru saja dipinjam atau tidak lagi tersedia.');
      }
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
      const returnChanges = await this.loanRepo.updateReturn(activeLoan.id, now.toISOString(), fineAmount, finePaid || fineAmount === 0);
      if (returnChanges === 0) {
        throw new Error('Buku fisik ini sudah dikembalikan atau tidak dalam status pinjaman aktif.');
      }
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

    // 3b. Validasi Penangguhan Sirkulasi (Denda tertunggak / Keterlambatan buku fisik, BRD 3.3 Negative Flow)
    const suspension = await this.loanRepo.checkUserCirculationSuspension(user.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
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
      const copyChanges = await this.bookRepo.updateCopyStatus(availableCopy.id, 'RESERVED', 'AVAILABLE');
      if (copyChanges === 0) {
        throw new Error('Eksemplar fisik ini baru saja direservasi atau dipinjam oleh pemustaka lain.');
      }
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
    if (!borrower) {
      throw new Error('Data peminjam untuk tiket reservasi ini tidak ditemukan.');
    }

    if (!borrower.isActive) {
      throw new Error('Akun peminjam tiket reservasi ini sedang dinonaktifkan.');
    }

    // Validasi Penangguhan Sirkulasi (Denda tertunggak / Keterlambatan buku fisik lain, BRD 3.3 Negative Flow)
    const suspension = await this.loanRepo.checkUserCirculationSuspension(borrower.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }

    const loanDays = borrower.role === 'TEACHER' ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    dueDate.setHours(23, 59, 59, 999);

    const nowIso = new Date().toISOString();

    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const claimChanges = await this.loanRepo.updateClaimReservation(reservation.id, nowIso, dueDate.toISOString());
      if (claimChanges === 0) {
        throw new Error('Tiket reservasi sudah diklaim atau sudah tidak aktif.');
      }
      if (reservation.copyId) {
        await this.bookRepo.updateCopyStatus(reservation.copyId, 'BORROWED');
      }
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
      const changes = await this.loanRepo.updateCancelReservation(loan.id);
      if (changes === 0) {
        throw new Error('Tiket reservasi sudah tidak aktif atau telah dibatalkan.');
      }
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

  /**
   * 11. Perpanjangan Masa Pinjam Buku Fisik 1 Kali (BRD Seksi 3.3 Aturan 3)
   */
  async renewPhysicalLoan(user: User, loanId: number): Promise<Loan> {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) {
      throw new Error('Data peminjaman tidak ditemukan.');
    }

    if (loan.loanType !== 'PHYSICAL') {
      throw new Error('Hanya peminjaman buku fisik yang dapat diperpanjang.');
    }

    if (loan.status !== 'BORROWED') {
      throw new Error(`Peminjaman ini sudah berstatus ${loan.status} dan tidak dapat diperpanjang.`);
    }

    // Otorisasi: Siswa/guru peminjam atau pustakawan/admin
    if (user.role !== 'LIBRARIAN' && user.role !== 'ADMIN' && loan.userId !== user.id) {
      throw new Error('Anda tidak memiliki wewenang untuk memperpanjang peminjaman ini.');
    }

    // Validasi Penangguhan Sirkulasi (Denda tertunggak / Keterlambatan buku fisik lain, BRD 3.3 Negative Flow)
    const suspension = await this.loanRepo.checkUserCirculationSuspension(loan.userId);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }

    // Perpanjangan hanya diizinkan maksimal 1 kali
    if (loan.isRenewed) {
      throw new Error('Buku ini sudah pernah diperpanjang 1 kali. Perpanjangan kedua tidak diizinkan sesuai aturan perpustakaan.');
    }

    // Tidak boleh diperpanjang jika sudah melewati batas jatuh tempo (overdue)
    const now = new Date();
    const currentDueDate = new Date(loan.dueDate);
    if (now > currentDueDate) {
      throw new Error('Buku ini telah melewati batas jatuh tempo. Harap kembalikan buku ke meja sirkulasi untuk melunasi denda keterlambatan.');
    }

    // Cek antrean reservasi dari siswa lain untuk buku ini
    const allBookReservations = await this.loanRepo.findAllReservations(true);
    const hasQueue = allBookReservations.some(r => r.bookId === loan.bookId && r.userId !== loan.userId);
    if (hasQueue) {
      throw new Error('Buku ini tidak dapat diperpanjang karena ada antrean reservasi dari pemustaka lain.');
    }

    // Hitung perpanjangan tanggal jatuh tempo baru
    const borrower = await this.userRepo.findById(loan.userId);
    if (!borrower || !borrower.isActive) {
      throw new Error('Akun peminjam buku ini sedang dinonaktifkan.');
    }
    const loanDays = borrower.role === 'TEACHER' ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const newDueDate = new Date(currentDueDate);
    newDueDate.setDate(newDueDate.getDate() + loanDays);
    newDueDate.setHours(23, 59, 59, 999);

    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const changes = await this.loanRepo.updateRenewLoan(loan.id, newDueDate.toISOString());
      if (changes === 0) {
        throw new Error('Buku ini tidak dapat diperpanjang atau sudah pernah diperpanjang sebelumnya.');
      }
      sqlite.exec('COMMIT');

      return {
        ...loan,
        dueDate: newDueDate.toISOString(),
        isRenewed: true
      };
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }

  /**
   * Memeriksa status penangguhan sirkulasi anggota (tunggakan denda / keterlambatan buku fisik).
   */
  async checkUserCirculationSuspension(userId: number) {
    return this.loanRepo.checkUserCirculationSuspension(userId);
  }

  /**
   * 12. Pelunasan Denda Tertunggak oleh Pustakawan / Admin (BRD 3.3 Fine Settlement)
   */
  async settleLoanFine(librarianUser: User, loanId: number): Promise<Loan> {
    if (librarianUser.role !== 'LIBRARIAN' && librarianUser.role !== 'ADMIN') {
      throw new Error('Hanya pustakawan atau admin yang berwenang memvalidasi pelunasan denda.');
    }

    const loan = await this.loanRepo.findById(loanId);
    if (!loan) {
      throw new Error(`Data transaksi peminjaman dengan ID ${loanId} tidak ditemukan.`);
    }

    if (loan.fineAmount <= 0) {
      throw new Error('Transaksi ini tidak memiliki tagihan denda.');
    }

    if (loan.isFinePaid) {
      throw new Error('Denda untuk transaksi ini sudah berstatus lunas.');
    }

    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const changes = await this.loanRepo.updateSettleFine(loan.id);
      if (changes === 0) {
        throw new Error('Denda untuk transaksi ini sudah berstatus lunas atau tidak valid.');
      }
      sqlite.exec('COMMIT');

      return {
        ...loan,
        isFinePaid: true
      };
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }
}

export const circulationService = new CirculationService();
