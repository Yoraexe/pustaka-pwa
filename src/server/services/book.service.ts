/**
 * @file src/server/services/book.service.ts
 * @description Layanan bisnis untuk katalog buku hybrid (Digital & Fisik) dan pembuatan eksemplar ber-barcode otomatis.
 * @layer Service Layer (Business Logic)
 * 
 * Tujuan: Menyediakan logika bisnis untuk penelusuran katalog, detail buku, ketersediaan eksemplar, dan registrasi buku baru secara atomik.
 * Caller: src/server/controllers/book.controller.ts, test suites.
 * Dependensi: bookRepository, sqlite, shared/types.
 * Main Functions: listCategories, searchBooks, getBookDetail, getBookCopies, getAvailableCopies, addNewBook.
 * Side Effects: Membaca dan menulis data katalog buku dan eksemplar fisik ke basis data SQLite via BookRepository dalam transaksi atomik.
 */

import { bookRepository, type BookRepository } from '../repositories/book.repository.js';
import { sqlite } from '../db/index.js';
import type { Book, BookCopy, Category, CreateBookInput, BookFilterInput } from '../../shared/types/index.js';

export class BookService {
  constructor(private bookRepo: BookRepository = bookRepository) {}

  async listCategories(): Promise<Category[]> {
    return this.bookRepo.findAllCategories();
  }

  async searchBooks(filters: BookFilterInput): Promise<Book[]> {
    return this.bookRepo.findBooks(filters);
  }

  async getBookDetail(id: number): Promise<Book> {
    const book = await this.bookRepo.findById(id);
    if (!book) {
      throw new Error(`Buku dengan ID ${id} tidak ditemukan.`);
    }
    return book;
  }

  async getBookCopies(id: number): Promise<BookCopy[]> {
    return this.bookRepo.findCopiesByBookId(id);
  }

  async getAvailableCopies() {
    return this.bookRepo.findAvailableCopies();
  }

  async addNewBook(input: CreateBookInput): Promise<Book & { copies: BookCopy[] }> {
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      const createdBook = await this.bookRepo.create(input);
      const copies: BookCopy[] = [];

      // Jika memiliki eksemplar fisik, generate barcode eksemplar otomatis (BK-ID-INDEX)
      if (input.bookType === 'HYBRID' || input.bookType === 'PHYSICAL_ONLY') {
        const copyCount = input.totalPhysicalCopies || 1;
        for (let i = 1; i <= copyCount; i++) {
          const barcode = `BK-${String(createdBook.id).padStart(4, '0')}-${String(i).padStart(2, '0')}`;
          const copy = await this.bookRepo.createCopy(createdBook.id, barcode);
          copies.push(copy);
        }
      }

      sqlite.exec('COMMIT');
      return {
        ...createdBook,
        copies
      };
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }
  }
}

export const bookService = new BookService();
