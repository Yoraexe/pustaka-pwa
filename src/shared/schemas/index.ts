/**
 * @file src/shared/schemas/index.ts
 * @description Skema validasi Zod untuk seluruh input API (Auth, Buku, Sirkulasi).
 * @layer Shared Validation Schema
 * 
 * Tujuan: Menyediakan skema validasi runtime dengan Zod untuk input otentikasi, pembuatan buku, dan transaksi sirkulasi.
 * Caller: Controller layer (auth, book, circulation), UI forms, test suites.
 * Dependensi: zod.
 * Main Functions: LoginSchema, CreateUserSchema, SelfRegisterSchema, UpdateUserStatusSchema, ResetUserPasswordSchema, BookFilterSchema, CreateBookSchema, DigitalLoanSchema, PhysicalLoanSchema, ReturnPhysicalLoanSchema, BorrowPhysicalSelfSchema, ReturnPhysicalSelfSchema, ReservePhysicalLoanSchema, ClaimReservationSchema, CancelReservationSchema, RenewLoanSchema.
 * Side Effects: Melakukan parsing dan validasi data masukan klien (melempar ZodError jika schema dilanggar).
 */

import { z } from 'zod';

export const LoginSchema = z.object({
  identityNumber: z.string().min(3, 'Nomor identitas/NISN minimal 3 karakter').trim(),
  password: z.string().min(4, 'Kata sandi minimal 4 karakter')
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const CreateUserSchema = z.object({
  identityNumber: z.string().min(3, 'Nomor identitas/NISN minimal 3 karakter').trim(),
  name: z.string().min(2, 'Nama minimal 2 karakter').trim(),
  role: z.enum(['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN']),
  className: z.string().optional().nullable(),
  password: z.string().min(4, 'Kata sandi minimal 4 karakter').default('123456')
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;

export const SelfRegisterSchema = z.object({
  identityNumber: z.string().min(3, 'NISN / NIP minimal 3 karakter').trim(),
  name: z.string().min(2, 'Nama lengkap minimal 2 karakter').trim(),
  role: z.enum(['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN']).default('STUDENT'),
  className: z.string().optional().nullable(),
  password: z.string().min(4, 'Kata sandi minimal 4 karakter')
});

export type SelfRegisterInput = z.infer<typeof SelfRegisterSchema>;

export const UpdateUserStatusSchema = z.object({
  isActive: z.boolean()
});

export type UpdateUserStatusInput = z.infer<typeof UpdateUserStatusSchema>;

export const ResetUserPasswordSchema = z.object({
  newPassword: z.string().min(4, 'Kata sandi baru minimal 4 karakter')
});

export type ResetUserPasswordInput = z.infer<typeof ResetUserPasswordSchema>;

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
}).superRefine((data, ctx) => {
  if ((data.bookType === 'DIGITAL_ONLY' || data.bookType === 'HYBRID') && !data.ebookFilePath) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Berkas e-book PDF wajib dilampirkan untuk buku berjenis E-Book atau Hybrid',
      path: ['ebookFilePath']
    });
  }
  if ((data.bookType === 'PHYSICAL_ONLY' || data.bookType === 'HYBRID') && data.totalPhysicalCopies < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Jumlah eksemplar fisik minimal 1 untuk buku berjenis Fisik atau Hybrid',
      path: ['totalPhysicalCopies']
    });
  }
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

export const BorrowPhysicalSelfSchema = z.object({
  bookId: z.coerce.number().int().positive('ID Buku tidak valid').optional(),
  copyBarcode: z.string().trim().optional()
}).refine((data) => Boolean(data.bookId || (data.copyBarcode && data.copyBarcode.length >= 3)), {
  message: 'ID Buku atau Barcode/QR eksemplar wajib diisi'
});

export type BorrowPhysicalSelfInput = z.infer<typeof BorrowPhysicalSelfSchema>;

export const ReturnPhysicalSelfSchema = z.object({
  loanId: z.coerce.number().int().positive('ID Peminjaman tidak valid')
});

export type ReturnPhysicalSelfInput = z.infer<typeof ReturnPhysicalSelfSchema>;

export const ReservePhysicalLoanSchema = z.object({
  bookId: z.coerce.number().int().positive('ID Buku tidak valid')
});

export type ReservePhysicalLoanInput = z.infer<typeof ReservePhysicalLoanSchema>;

export const ClaimReservationSchema = z.object({
  reservationCode: z.string().min(3, 'Kode reservasi wajib diisi').trim()
});

export type ClaimReservationInput = z.infer<typeof ClaimReservationSchema>;

export const CancelReservationSchema = z.object({
  loanId: z.coerce.number().int().positive('ID Peminjaman/Reservasi tidak valid')
});

export type CancelReservationInput = z.infer<typeof CancelReservationSchema>;

export const RenewLoanSchema = z.object({
  loanId: z.coerce.number().int().positive('ID Peminjaman tidak valid')
});

export type RenewLoanInput = z.infer<typeof RenewLoanSchema>;


