/**
 * @file src/server/repositories/book.repository.ts
 * @description Data access layer untuk entitas Buku, Kategori, dan Eksemplar Fisik.
 * @layer Repository Layer
 */

import { db } from '../db/index.js';
import { books, categories, bookCopies, type BookTable } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import type { Book, BookCopy, Category, CreateBookInput, BookFilterInput, AvailableCopy } from '../../shared/types/index.js';

export class BookRepository {
  async findAllCategories(): Promise<Category[]> {
    const list = await db.select().from(categories).orderBy(categories.name);
    return list.map(c => ({ id: c.id, name: c.name, slug: c.slug }));
  }

  async findCategoryBySlug(slug: string): Promise<Category | null> {
    const res = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    if (res.length === 0) return null;
    return { id: res[0].id, name: res[0].name, slug: res[0].slug };
  }

  async createCategory(name: string, slug: string): Promise<Category> {
    const res = await db.insert(categories).values({ name, slug }).returning();
    return { id: res[0].id, name: res[0].name, slug: res[0].slug };
  }

  async findBooks(filters: BookFilterInput): Promise<Book[]> {
    let query = db.select({
      book: books,
      categoryName: categories.name
    })
    .from(books)
    .innerJoin(categories, eq(books.categoryId, categories.id))
    .$dynamic();

    const conditions = [];

    if (filters.categoryId) {
      conditions.push(eq(books.categoryId, filters.categoryId));
    }

    if (filters.bookType && filters.bookType !== 'ALL') {
      conditions.push(eq(books.bookType, filters.bookType));
    }

    if (filters.search && filters.search.trim() !== '') {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      conditions.push(
        sql`(LOWER(${books.title}) LIKE ${term} OR LOWER(${books.author}) LIKE ${term} OR LOWER(${categories.name}) LIKE ${term} OR LOWER(COALESCE(${books.isbn}, '')) LIKE ${term})`
      );
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rows = await query.orderBy(sql`${books.id} DESC`);

    let result = rows.map(r => this.mapToDomain(r.book, r.categoryName));

    if (filters.availableOnly) {
      result = result.filter(b => {
        if (b.bookType === 'DIGITAL_ONLY' || b.bookType === 'HYBRID') return true;
        return b.availablePhysicalCopies > 0;
      });
    }

    return result;
  }

  async findById(id: number): Promise<Book | null> {
    const rows = await db.select({
      book: books,
      categoryName: categories.name
    })
    .from(books)
    .innerJoin(categories, eq(books.categoryId, categories.id))
    .where(eq(books.id, id))
    .limit(1);

    if (rows.length === 0) return null;
    const domainBook = this.mapToDomain(rows[0].book, rows[0].categoryName);
    const copies = await this.findCopiesByBookId(id);
    domainBook.copies = copies;
    return domainBook;
  }

  async findCopiesByBookId(bookId: number): Promise<BookCopy[]> {
    const rows = await db.select().from(bookCopies).where(eq(bookCopies.bookId, bookId)).orderBy(bookCopies.id);
    return rows.map(r => ({
      id: r.id,
      bookId: r.bookId,
      barcode: r.barcode,
      status: r.status as BookCopy['status']
    }));
  }

  async findAvailableCopies(): Promise<AvailableCopy[]> {
    const rows = await db.select({
      copy: bookCopies,
      bookTitle: books.title,
      shelfLocation: books.shelfLocation
    })
    .from(bookCopies)
    .innerJoin(books, eq(bookCopies.bookId, books.id))
    .where(eq(bookCopies.status, 'AVAILABLE'))
    .orderBy(bookCopies.barcode);

    return rows.map(r => ({
      id: r.copy.id,
      bookId: r.copy.bookId,
      barcode: r.copy.barcode,
      status: r.copy.status as BookCopy['status'],
      bookTitle: r.bookTitle,
      shelfLocation: r.shelfLocation
    }));
  }

  async create(data: CreateBookInput): Promise<Book> {
    const isDigitalOnly = data.bookType === 'DIGITAL_ONLY';
    const totalCopies = isDigitalOnly ? 0 : (data.totalPhysicalCopies ?? 1);
    const availableCopies = isDigitalOnly ? 0 : totalCopies;

    const inserted = await db.insert(books).values({
      categoryId: data.categoryId,
      title: data.title,
      author: data.author,
      publisher: data.publisher,
      publicationYear: data.publicationYear,
      isbn: data.isbn || null,
      bookType: data.bookType,
      coverUrl: data.coverUrl || null,
      ebookFilePath: data.ebookFilePath || null,
      digitalLicenseCount: data.digitalLicenseCount,
      totalPhysicalCopies: totalCopies,
      availablePhysicalCopies: availableCopies,
      shelfLocation: isDigitalOnly ? null : (data.shelfLocation || null)
    }).returning();


    const cat = await db.select().from(categories).where(eq(categories.id, data.categoryId)).limit(1);
    return this.mapToDomain(inserted[0], cat[0]?.name || 'Umum');
  }

  async createCopy(bookId: number, barcode: string): Promise<BookCopy> {
    const inserted = await db.insert(bookCopies).values({
      bookId,
      barcode,
      status: 'AVAILABLE'
    }).returning();

    return {
      id: inserted[0].id,
      bookId: inserted[0].bookId,
      barcode: inserted[0].barcode,
      status: inserted[0].status as BookCopy['status']
    };
  }

  async findFirstAvailableCopy(bookId: number): Promise<BookCopy | null> {
    const rows = await db.select()
      .from(bookCopies)
      .where(and(eq(bookCopies.bookId, bookId), eq(bookCopies.status, 'AVAILABLE')))
      .limit(1);

    if (rows.length === 0) return null;
    return {
      id: rows[0].id,
      bookId: rows[0].bookId,
      barcode: rows[0].barcode,
      status: rows[0].status as BookCopy['status']
    };
  }

  async findCopyByBarcode(barcode: string): Promise<(BookCopy & { book: Book }) | null> {
    const rows = await db.select({
      copy: bookCopies,
      book: books,
      categoryName: categories.name
    })
    .from(bookCopies)
    .innerJoin(books, eq(bookCopies.bookId, books.id))
    .innerJoin(categories, eq(books.categoryId, categories.id))
    .where(eq(bookCopies.barcode, barcode))
    .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.copy.id,
      bookId: r.copy.bookId,
      barcode: r.copy.barcode,
      status: r.copy.status as BookCopy['status'],
      book: this.mapToDomain(r.book, r.categoryName)
    };
  }

  async updateCopyStatus(copyId: number, status: BookCopy['status']): Promise<void> {
    await db.update(bookCopies)
      .set({ status })
      .where(eq(bookCopies.id, copyId));
  }

  async updateAvailableCopies(bookId: number, delta: number): Promise<void> {
    await db.update(books)
      .set({
        availablePhysicalCopies: sql`min(${books.totalPhysicalCopies}, max(0, ${books.availablePhysicalCopies} + ${delta}))`
      })
      .where(eq(books.id, bookId));
  }

  private mapToDomain(raw: BookTable, categoryName: string): Book {
    return {
      id: raw.id,
      categoryId: raw.categoryId,
      categoryName,
      title: raw.title,
      author: raw.author,
      publisher: raw.publisher,
      publicationYear: raw.publicationYear,
      isbn: raw.isbn,
      bookType: raw.bookType as Book['bookType'],
      coverUrl: raw.coverUrl,
      ebookFilePath: raw.ebookFilePath,
      digitalLicenseCount: raw.digitalLicenseCount,
      totalPhysicalCopies: raw.totalPhysicalCopies,
      availablePhysicalCopies: raw.availablePhysicalCopies,
      shelfLocation: raw.shelfLocation,
      createdAt: raw.createdAt
    };
  }
}

export const bookRepository = new BookRepository();
