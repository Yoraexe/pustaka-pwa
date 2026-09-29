/**
 * @file src/server/services/book.service.ts
 * @description Layanan bisnis untuk katalog buku hybrid (Digital & Fisik).
 * @layer Service Layer (Business Logic)
 */

import { bookRepository, type BookRepository } from '../repositories/book.repository.js';
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

    return {
      ...createdBook,
      copies
    };
  }
}

export const bookService = new BookService();
