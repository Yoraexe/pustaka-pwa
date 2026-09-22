/**
 * @file src/shared/types/index.ts
 * @description Definisi tipe domain perpustakaan digital & sirkulasi fisik hybrid.
 * @layer Shared Domain Types
 */

export type UserRole = 'STUDENT' | 'TEACHER' | 'LIBRARIAN' | 'ADMIN';

export interface User {
  id: number;
  identityNumber: string; // NISN untuk siswa, NIP/Kode untuk guru/staff
  name: string;
  role: UserRole;
  className?: string | null;
  isActive: boolean;
  createdAt: string;
}

export type BookType = 'HYBRID' | 'DIGITAL_ONLY' | 'PHYSICAL_ONLY';

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface Book {
  id: number;
  categoryId: number;
  categoryName?: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  isbn?: string | null;
  bookType: BookType;
  coverUrl?: string | null;
  ebookFilePath?: string | null;
  digitalLicenseCount: number;
  totalPhysicalCopies: number;
  availablePhysicalCopies: number;
  shelfLocation?: string | null;
  createdAt: string;
}

export type CopyStatus = 'AVAILABLE' | 'BORROWED' | 'DAMAGED' | 'LOST';

export interface BookCopy {
  id: number;
  bookId: number;
  barcode: string;
  status: CopyStatus;
}

export type LoanType = 'DIGITAL' | 'PHYSICAL';
export type LoanStatus = 'BORROWED' | 'RETURNED' | 'OVERDUE';

export interface Loan {
  id: number;
  userId: number;
  userName?: string;
  userIdentity?: string;
  bookId: number;
  bookTitle?: string;
  bookCover?: string | null;
  copyId?: number | null;
  copyBarcode?: string | null;
  loanType: LoanType;
  borrowDate: string;
  dueDate: string;
  returnDate?: string | null;
  status: LoanStatus;
  fineAmount: number;
  isFinePaid: boolean;
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

// Re-export input types from schemas
export type {
  LoginInput,
  CreateUserInput,
  BookFilterInput,
  CreateBookInput,
  DigitalLoanInput,
  PhysicalLoanInput,
  ReturnPhysicalLoanInput
} from '../schemas/index.js';

