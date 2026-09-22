/**
 * @file src/server/services/book.service.ts
 * @description Layanan bisnis untuk katalog buku hybrid (Digital & Fisik).
 * @layer Service Layer (Business Logic)
 */

import { bookRepository, type BookRepository } from '../repositories/book.repository.js';
import type { Book, Category, CreateBookInput, BookFilterInput } from '../../shared/types/index.js';

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

  async addNewBook(input: CreateBookInput): Promise<Book> {
    const createdBook = await this.bookRepo.create(input);

    // Jika memiliki eksemplar fisik, generate barcode eksemplar otomatis (BK-ID-INDEX)
    if (input.bookType === 'HYBRID' || input.bookType === 'PHYSICAL_ONLY') {
      const copyCount = input.totalPhysicalCopies || 1;
      for (let i = 1; i <= copyCount; i++) {
        const barcode = `BK-${String(createdBook.id).padStart(4, '0')}-${String(i).padStart(2, '0')}`;
        await this.bookRepo.createCopy(createdBook.id, barcode);
      }
    }

    return createdBook;
  }
}

export const bookService = new BookService();
