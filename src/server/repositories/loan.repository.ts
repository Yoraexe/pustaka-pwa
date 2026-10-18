/**
 * @file src/server/repositories/loan.repository.ts
 * @description Data access layer untuk sirkulasi peminjaman digital dan fisik.
 * @layer Repository Layer
 * 
 * Tujuan: Menyediakan abstraksi akses basis data untuk transaksi peminjaman (digital/fisik), reservasi, kalkulasi denda, dan auto-expiration.
 * Caller: src/server/services/circulation.service.ts, test suites.
 * Dependensi: src/server/db/index.ts, src/server/db/schema.ts, drizzle-orm, src/shared/types.
 * Main Functions: autoExpireDigitalLoans, autoExpireReservations, findActiveLoan, findActivePhysicalLoanByCopyId, countActiveUserLoans, findUserLoans, create, updateReturn, createReservation, claimReservation, updateRenewLoan, checkUserCirculationSuspension.
 * Side Effects: Membaca dan menulis catatan sirkulasi pada tabel loans dan book_copies di basis data SQLite.
 */

import { db, sqlite } from '../db/index.js';
import { loans, books, users, bookCopies, type LoanTable } from '../db/schema.js';
import { eq, and, or, sql } from 'drizzle-orm';
import type { Loan, LoanType, LoanStatus } from '../../shared/types/index.js';

export class LoanRepository {
  /**
   * Secara otomatis menandai pinjaman e-book yang telah melewati jatuh tempo sebagai RETURNED
   */
  async autoExpireDigitalLoans(): Promise<number> {
    const nowIso = new Date().toISOString();
    const result = await db.update(loans)
      .set({
        status: 'RETURNED',
        returnDate: nowIso
      })
      .where(
        and(
          eq(loans.loanType, 'DIGITAL'),
          eq(loans.status, 'BORROWED'),
          sql`${loans.dueDate} < ${nowIso}`
        )
      );
    return result.changes;
  }

  async findActiveLoan(userId: number, bookId: number, loanType: LoanType): Promise<Loan | null> {
    if (loanType === 'DIGITAL') {
      await this.autoExpireDigitalLoans();
    }

    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    })
    .from(loans)
    .innerJoin(books, eq(loans.bookId, books.id))
    .innerJoin(users, eq(loans.userId, users.id))
    .leftJoin(bookCopies, eq(loans.copyId, bookCopies.id))
    .where(
      and(
        eq(loans.userId, userId),
        eq(loans.bookId, bookId),
        eq(loans.loanType, loanType),
        eq(loans.status, 'BORROWED')
      )
    )
    .limit(1);


    if (rows.length === 0) return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode);
  }

  async findActivePhysicalLoanByCopyId(copyId: number): Promise<Loan | null> {
    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    })
    .from(loans)
    .innerJoin(books, eq(loans.bookId, books.id))
    .innerJoin(users, eq(loans.userId, users.id))
    .innerJoin(bookCopies, eq(loans.copyId, bookCopies.id))
    .where(
      and(
        eq(loans.copyId, copyId),
        eq(loans.status, 'BORROWED')
      )
    )
    .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode);
  }

  async countActiveUserLoans(userId: number, loanType: LoanType): Promise<number> {
    if (loanType === 'DIGITAL') {
      await this.autoExpireDigitalLoans();
    }

    const rows = await db.select({ id: loans.id })
      .from(loans)
      .where(
        and(
          eq(loans.userId, userId),
          eq(loans.loanType, loanType),
          eq(loans.status, 'BORROWED')
        )
      );
    return rows.length;
  }

  async countActiveDigitalLoansForBook(bookId: number): Promise<number> {
    await this.autoExpireDigitalLoans();

    const rows = await db.select({ id: loans.id })
      .from(loans)
      .where(
        and(
          eq(loans.bookId, bookId),
          eq(loans.loanType, 'DIGITAL'),
          eq(loans.status, 'BORROWED')
        )
      );
    return rows.length;
  }

  /**
   * Secara otomatis membatalkan reservasi yang telah melewati batas reservedUntil dan memulihkan stok eksemplar secara atomik
   */
  async autoExpireReservations(): Promise<number> {
    const nowIso = new Date().toISOString();

    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const expiredRows = await db.select({
        id: loans.id,
        bookId: loans.bookId,
        copyId: loans.copyId
      })
      .from(loans)
      .where(
        and(
          eq(loans.status, 'RESERVED'),
          sql`${loans.reservedUntil} < ${nowIso}`
        )
      );

      if (expiredRows.length === 0) {
        sqlite.exec('COMMIT');
        return 0;
      }

      let expiredCount = 0;
      for (const r of expiredRows) {
        const updateRes = await db.update(loans)
          .set({ status: 'CANCELLED' })
          .where(
            and(
              eq(loans.id, r.id),
              eq(loans.status, 'RESERVED')
            )
          );

        if (updateRes.changes > 0) {
          expiredCount++;
          if (r.copyId) {
            await db.update(bookCopies).set({ status: 'AVAILABLE' }).where(eq(bookCopies.id, r.copyId));
          }
          await db.update(books)
            .set({
              availablePhysicalCopies: sql`min(${books.totalPhysicalCopies}, ${books.availablePhysicalCopies} + 1)`
            })
            .where(eq(books.id, r.bookId));
        }
      }
      sqlite.exec('COMMIT');
      return expiredCount;
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }

  async findActiveReservation(userId: number, bookId: number): Promise<Loan | null> {
    await this.autoExpireReservations();

    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    })
    .from(loans)
    .innerJoin(books, eq(loans.bookId, books.id))
    .innerJoin(users, eq(loans.userId, users.id))
    .leftJoin(bookCopies, eq(loans.copyId, bookCopies.id))
    .where(
      and(
        eq(loans.userId, userId),
        eq(loans.bookId, bookId),
        eq(loans.status, 'RESERVED')
      )
    )
    .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation);
  }

  async findReservationByCode(reservationCode: string): Promise<Loan | null> {
    await this.autoExpireReservations();

    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    })
    .from(loans)
    .innerJoin(books, eq(loans.bookId, books.id))
    .innerJoin(users, eq(loans.userId, users.id))
    .leftJoin(bookCopies, eq(loans.copyId, bookCopies.id))
    .where(
      and(
        eq(loans.reservationCode, reservationCode),
        eq(loans.status, 'RESERVED')
      )
    )
    .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation);
  }

  async findById(loanId: number): Promise<Loan | null> {
    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    })
    .from(loans)
    .innerJoin(books, eq(loans.bookId, books.id))
    .innerJoin(users, eq(loans.userId, users.id))
    .leftJoin(bookCopies, eq(loans.copyId, bookCopies.id))
    .where(eq(loans.id, loanId))
    .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation);
  }

  async countActiveUserPhysicalLoansAndReservations(userId: number): Promise<number> {
    await this.autoExpireReservations();

    const rows = await db.select({ id: loans.id })
      .from(loans)
      .where(
        and(
          eq(loans.userId, userId),
          eq(loans.loanType, 'PHYSICAL'),
          or(eq(loans.status, 'BORROWED'), eq(loans.status, 'RESERVED'))
        )
      );
    return rows.length;
  }

  async findUserLoans(userId: number, activeOnly = false): Promise<Loan[]> {
    await this.autoExpireDigitalLoans();
    await this.autoExpireReservations();

    let query = db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    })
    .from(loans)
    .innerJoin(books, eq(loans.bookId, books.id))
    .innerJoin(users, eq(loans.userId, users.id))
    .leftJoin(bookCopies, eq(loans.copyId, bookCopies.id))
    .$dynamic();

    const conditions = [eq(loans.userId, userId)];
    if (activeOnly) {
      const activeFilter = or(eq(loans.status, 'BORROWED'), eq(loans.status, 'RESERVED'));
      if (activeFilter) {
        conditions.push(activeFilter);
      }
    }

    query = query.where(and(...conditions)).orderBy(sql`${loans.borrowDate} DESC`);
    const rows = await query;
    return rows.map(r => this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation));
  }

  async findAllLoans(limit = 100): Promise<Loan[]> {
    await this.autoExpireDigitalLoans();
    await this.autoExpireReservations();

    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    })
    .from(loans)
    .innerJoin(books, eq(loans.bookId, books.id))
    .innerJoin(users, eq(loans.userId, users.id))
    .leftJoin(bookCopies, eq(loans.copyId, bookCopies.id))
    .orderBy(sql`${loans.borrowDate} DESC`)
    .limit(limit);

    return rows.map(r => this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation));
  }

  async findAllReservations(activeOnly = true): Promise<Loan[]> {
    await this.autoExpireReservations();

    let query = db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    })
    .from(loans)
    .innerJoin(books, eq(loans.bookId, books.id))
    .innerJoin(users, eq(loans.userId, users.id))
    .leftJoin(bookCopies, eq(loans.copyId, bookCopies.id))
    .$dynamic();

    if (activeOnly) {
      query = query.where(eq(loans.status, 'RESERVED'));
    }

    query = query.orderBy(sql`${loans.createdAt} DESC`);
    const rows = await query;
    return rows.map(r => this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation));
  }

  async create(data: {
    userId: number;
    bookId: number;
    copyId?: number | null;
    loanType: LoanType;
    dueDate: string;
  }): Promise<Loan> {
    const inserted = await db.insert(loans).values({
      userId: data.userId,
      bookId: data.bookId,
      copyId: data.copyId || null,
      loanType: data.loanType,
      dueDate: data.dueDate,
      status: 'BORROWED',
      fineAmount: 0,
      isFinePaid: false
    }).returning();

    const raw = inserted[0];
    const b = await db.select().from(books).where(eq(books.id, raw.bookId)).limit(1);
    const u = await db.select().from(users).where(eq(users.id, raw.userId)).limit(1);
    const c = raw.copyId ? await db.select().from(bookCopies).where(eq(bookCopies.id, raw.copyId)).limit(1) : [];

    return this.mapToDomain(raw, b[0]?.title, b[0]?.coverUrl, u[0]?.name, u[0]?.identityNumber, c[0]?.barcode, b[0]?.shelfLocation);
  }

  async createReservation(data: {
    userId: number;
    bookId: number;
    copyId: number;
    reservationCode: string;
    reservedUntil: string;
  }): Promise<Loan> {
    const inserted = await db.insert(loans).values({
      userId: data.userId,
      bookId: data.bookId,
      copyId: data.copyId,
      loanType: 'PHYSICAL',
      borrowDate: new Date().toISOString(),
      dueDate: data.reservedUntil, // default temporary date
      status: 'RESERVED',
      fineAmount: 0,
      isFinePaid: false,
      reservationCode: data.reservationCode,
      reservedUntil: data.reservedUntil
    }).returning();

    const raw = inserted[0];
    const b = await db.select().from(books).where(eq(books.id, raw.bookId)).limit(1);
    const u = await db.select().from(users).where(eq(users.id, raw.userId)).limit(1);
    const c = await db.select().from(bookCopies).where(eq(bookCopies.id, data.copyId)).limit(1);

    return this.mapToDomain(raw, b[0]?.title, b[0]?.coverUrl, u[0]?.name, u[0]?.identityNumber, c[0]?.barcode, b[0]?.shelfLocation);
  }

  async updateClaimReservation(loanId: number, borrowDate: string, dueDate: string): Promise<void> {
    await db.update(loans)
      .set({
        status: 'BORROWED',
        borrowDate,
        dueDate
      })
      .where(eq(loans.id, loanId));
  }

  async updateCancelReservation(loanId: number): Promise<void> {
    await db.update(loans)
      .set({
        status: 'CANCELLED'
      })
      .where(eq(loans.id, loanId));
  }

  async updateReturn(loanId: number, returnDate: string, fineAmount: number, isFinePaid: boolean): Promise<void> {
    await db.update(loans)
      .set({
        returnDate,
        status: 'RETURNED',
        fineAmount,
        isFinePaid
      })
      .where(eq(loans.id, loanId));
  }

  async updateSettleFine(loanId: number): Promise<void> {
    await db.update(loans)
      .set({ isFinePaid: true })
      .where(eq(loans.id, loanId));
  }

  /**
   * Perpanjangan masa pinjam fisik 1x (BRD 3.3 Rule 3)
   */
  async updateRenewLoan(loanId: number, newDueDate: string): Promise<number> {
    const res = await db.update(loans)
      .set({
        dueDate: newDueDate,
        isRenewed: true
      })
      .where(
        and(
          eq(loans.id, loanId),
          eq(loans.isRenewed, false),
          eq(loans.status, 'BORROWED')
        )
      );
    return res.changes;
  }

  /**
   * Memeriksa penangguhan sirkulasi pemustaka karena denda tertunggak atau keterlambatan buku fisik (BRD 3.3 Negative Flow)
   */
  async checkUserCirculationSuspension(userId: number): Promise<{
    isSuspended: boolean;
    reason?: string;
    overdueCount: number;
    unpaidFineAmount: number;
  }> {
    const nowIso = new Date().toISOString();

    // 1. Cek apakah ada pinjaman fisik yang aktif dan melewati batas tanggal jatuh tempo
    const overdueRows = await db.select({ id: loans.id, bookTitle: books.title, dueDate: loans.dueDate })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(
        and(
          eq(loans.userId, userId),
          eq(loans.loanType, 'PHYSICAL'),
          eq(loans.status, 'BORROWED'),
          sql`${loans.dueDate} < ${nowIso}`
        )
      );

    // 2. Cek apakah ada denda yang belum dilunasi
    const unpaidFineRows = await db.select({ id: loans.id, fineAmount: loans.fineAmount })
      .from(loans)
      .where(
        and(
          eq(loans.userId, userId),
          eq(loans.isFinePaid, false),
          sql`${loans.fineAmount} > 0`
        )
      );

    const overdueCount = overdueRows.length;
    const unpaidFineAmount = unpaidFineRows.reduce((sum, r) => sum + (r.fineAmount || 0), 0);

    if (overdueCount > 0) {
      return {
        isSuspended: true,
        reason: `Anggota memiliki ${overdueCount} buku yang belum dikembalikan dan telah melewati jatuh tempo. Harap kembalikan buku terlebih dahulu.`,
        overdueCount,
        unpaidFineAmount
      };
    }

    if (unpaidFineAmount > 0) {
      return {
        isSuspended: true,
        reason: `Anggota memiliki penangguhan sirkulasi (Denda tertunggak: Rp ${unpaidFineAmount.toLocaleString('id-ID')}). Harap lunasi denda di meja sirkulasi.`,
        overdueCount,
        unpaidFineAmount
      };
    }

    return {
      isSuspended: false,
      overdueCount: 0,
      unpaidFineAmount: 0
    };
  }

  private mapToDomain(
    raw: LoanTable,
    bookTitle?: string,
    bookCover?: string | null,
    userName?: string,
    userIdentity?: string,
    copyBarcode?: string | null,
    shelfLocation?: string | null
  ): Loan {
    return {
      id: raw.id,
      userId: raw.userId,
      userName,
      userIdentity,
      bookId: raw.bookId,
      bookTitle,
      bookCover,
      shelfLocation,
      copyId: raw.copyId,
      copyBarcode,
      loanType: raw.loanType as LoanType,
      borrowDate: raw.borrowDate,
      dueDate: raw.dueDate,
      returnDate: raw.returnDate,
      status: raw.status as LoanStatus,
      fineAmount: raw.fineAmount,
      isFinePaid: raw.isFinePaid,
      isRenewed: Boolean(raw.isRenewed),
      reservationCode: raw.reservationCode,
      reservedUntil: raw.reservedUntil
    };
  }
}

export const loanRepository = new LoanRepository();
