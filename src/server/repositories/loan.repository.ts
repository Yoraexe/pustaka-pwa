/**
 * @file src/server/repositories/loan.repository.ts
 * @description Data access layer untuk sirkulasi peminjaman digital dan fisik.
 * @layer Repository Layer
 */

import { db } from '../db/index.js';
import { loans, books, users, bookCopies, type LoanTable } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
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

  async findUserLoans(userId: number, activeOnly = false): Promise<Loan[]> {
    await this.autoExpireDigitalLoans();

    let query = db.select({

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
    .$dynamic();

    const conditions = [eq(loans.userId, userId)];
    if (activeOnly) {
      conditions.push(eq(loans.status, 'BORROWED'));
    }

    query = query.where(and(...conditions)).orderBy(sql`${loans.borrowDate} DESC`);
    const rows = await query;
    return rows.map(r => this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode));
  }

  async findAllLoans(limit = 100): Promise<Loan[]> {
    await this.autoExpireDigitalLoans();

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
    .orderBy(sql`${loans.borrowDate} DESC`)
    .limit(limit);

    return rows.map(r => this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode));
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

    return this.mapToDomain(raw, b[0]?.title, b[0]?.coverUrl, u[0]?.name, u[0]?.identityNumber);
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

  private mapToDomain(
    raw: LoanTable,
    bookTitle?: string,
    bookCover?: string | null,
    userName?: string,
    userIdentity?: string,
    copyBarcode?: string | null
  ): Loan {
    return {
      id: raw.id,
      userId: raw.userId,
      userName,
      userIdentity,
      bookId: raw.bookId,
      bookTitle,
      bookCover,
      copyId: raw.copyId,
      copyBarcode,
      loanType: raw.loanType as LoanType,
      borrowDate: raw.borrowDate,
      dueDate: raw.dueDate,
      returnDate: raw.returnDate,
      status: raw.status as LoanStatus,
      fineAmount: raw.fineAmount,
      isFinePaid: raw.isFinePaid
    };
  }
}

export const loanRepository = new LoanRepository();
