/**
 * @file src/server/services/book.service.ts
 * @description Layanan bisnis untuk katalog buku hybrid (Digital & Fisik), pembuatan eksemplar ber-barcode otomatis, dan penghapusan buku aman.
 * @layer Service Layer (Business Logic)
 * 
 * Tujuan: Menyediakan logika bisnis untuk penelusuran katalog, detail buku, ketersediaan eksemplar, registrasi buku baru, dan penghapusan buku secara atomik.
 * Caller: src/server/controllers/book.controller.ts, test suites.
 * Dependensi: bookRepository, storageService, sqlite, shared/types.
 * Main Functions: listCategories, searchBooks, getBookDetail, getBookCopies, getAvailableCopies, addNewBook, deleteBook.
 * Side Effects: Membaca, menulis, dan menghapus data katalog buku dan eksemplar di basis data SQLite via BookRepository dalam transaksi atomik; menghapus berkas pada disk/cloud melalui storageService.
 */

import { bookRepository, type BookRepository } from '../repositories/book.repository.js';
import { storageService } from './storage.service.js';
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

  /**
   * Menghapus buku, eksemplar fisik, catatan pinjaman lampau, dan berkas biner (cover & PDF).
   * Menolak jika terdapat peminjaman atau reservasi aktif.
   */
  async deleteBook(id: number): Promise<{ id: number; title: string }> {
    const book = await this.bookRepo.findById(id);
    if (!book) {
      throw new Error(`Buku dengan ID ${id} tidak ditemukan.`);
    }

    // Guardrail: Cek sirkulasi aktif (peminjaman atau reservasi)
    const activeLoans = await this.bookRepo.countActiveLoansAndReservations(id);
    if (activeLoans > 0) {
      throw new Error('Buku tidak dapat dihapus karena sedang dalam masa peminjaman aktif atau reservasi pemustaka.');
    }

    // Eksekusi penghapusan basis data dalam transaksi atomik
    sqlite.exec('BEGIN IMMEDIATE');
    try {
      await this.bookRepo.delete(id);
      sqlite.exec('COMMIT');
    } catch (err) {
      sqlite.exec('ROLLBACK');
      throw err;
    }

    // Pembersihan berkas storage (disk lokal / Supabase Cloud Storage)
    if (book.ebookFilePath) {
      await storageService.deleteFile(book.ebookFilePath).catch((err) => {
        console.error(`[Storage Warning] Gagal membersihkan e-book ${book.ebookFilePath}:`, err);
      });
    }
    if (book.coverUrl) {
      await storageService.deleteFile(book.coverUrl).catch((err) => {
        console.error(`[Storage Warning] Gagal membersihkan cover ${book.coverUrl}:`, err);
      });
    }

    return {
      id: book.id,
      title: book.title
    };
  }
}

export const bookService = new BookService();
