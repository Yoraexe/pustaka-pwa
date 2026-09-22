/**
 * @file src/shared/schemas/index.ts
 * @description Skema validasi Zod untuk seluruh input API (Auth, Buku, Sirkulasi).
 * @layer Shared Validation Schema
 */

import { z } from 'zod';

export const LoginSchema = z.object({
  identityNumber: z.string().min(3, 'Nomor identitas/NISN minimal 3 karakter').trim(),
  password: z.string().min(4, 'Kata sandi minimal 4 karakter')
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateUserSchema = z.object({
  identityNumber: z.string().min(3).trim(),
  name: z.string().min(2, 'Nama minimal 2 karakter').trim(),
  role: z.enum(['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN']),
  className: z.string().optional().nullable(),
  password: z.string().min(4).default('123456')
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const BookFilterSchema = z.object({
  search: z.string().optional(),
  categoryId: z.coerce.number().optional(),
  bookType: z.enum(['ALL', 'HYBRID', 'DIGITAL_ONLY', 'PHYSICAL_ONLY']).optional().default('ALL'),
  availableOnly: z.coerce.boolean().optional().default(false)
});

export type BookFilterInput = {
  search?: string;
  categoryId?: number;
  bookType?: 'ALL' | 'HYBRID' | 'DIGITAL_ONLY' | 'PHYSICAL_ONLY';
  availableOnly?: boolean;
};


export const CreateBookSchema = z.object({
  categoryId: z.coerce.number(),
  title: z.string().min(1, 'Judul buku wajib diisi').trim(),
  author: z.string().min(1, 'Nama penulis wajib diisi').trim(),
  publisher: z.string().min(1, 'Penerbit wajib diisi').trim(),
  publicationYear: z.coerce.number().int().min(1900).max(2100),
  isbn: z.string().optional().nullable(),
  bookType: z.enum(['HYBRID', 'DIGITAL_ONLY', 'PHYSICAL_ONLY']),
  coverUrl: z.string().optional().nullable(),
  ebookFilePath: z.string().optional().nullable(),
  digitalLicenseCount: z.coerce.number().int().min(0).default(5),
  totalPhysicalCopies: z.coerce.number().int().min(0).default(1),
  shelfLocation: z.string().optional().nullable()
});

export type CreateBookInput = z.infer<typeof CreateBookSchema>;

export const DigitalLoanSchema = z.object({
  bookId: z.coerce.number().int().positive('ID Buku tidak valid')
});

export type DigitalLoanInput = z.infer<typeof DigitalLoanSchema>;

export const PhysicalLoanSchema = z.object({
  userIdentity: z.string().min(3, 'NISN/NIP peminjam wajib diisi').trim(),
  copyBarcode: z.string().min(3, 'Barcode eksemplar buku wajib diisi').trim()
});

export type PhysicalLoanInput = z.infer<typeof PhysicalLoanSchema>;

export const ReturnPhysicalLoanSchema = z.object({
  copyBarcode: z.string().min(3, 'Barcode eksemplar buku wajib diisi').trim(),
  finePaid: z.boolean().default(false)
});

export type ReturnPhysicalLoanInput = z.infer<typeof ReturnPhysicalLoanSchema>;
