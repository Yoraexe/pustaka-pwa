/**
 * @file tests/unit/circulation.service.test.ts
 * @description Unit tests untuk CirculationService (Aturan Bisnis Peminjaman & Pengembalian).
 * @layer Quality Assurance (Shift-Left TDD)
 */

import { describe, it, expect, beforeAll } from 'vitest';
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
    const hybrid = allBooks.find(b => b.bookType === 'HYBRID');
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

    // Pengembalian buku fisik
    const returnResult = await circulationService.returnPhysicalBook(librarianUser, barcode);
    expect(returnResult.loan.status).toBe('RETURNED');
    expect(returnResult.overdueDays).toBe(0);
    expect(returnResult.fineAmount).toBe(0);
  });
});
