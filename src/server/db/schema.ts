/**
 * @file src/server/db/schema.ts
 * @description Definisi tabel database SQLite menggunakan Drizzle ORM.
 * @layer Database Schema Layer
 */

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// 1. Users Table
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  identityNumber: text('identity_number').notNull().unique(), // NISN / NIP
  name: text('name').notNull(),
  role: text('role', { enum: ['STUDENT', 'TEACHER', 'LIBRARIAN', 'ADMIN'] }).notNull().default('STUDENT'),
  className: text('class_name'), // e.g. "X RPL 1"
  passwordHash: text('password_hash').notNull(),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

// 2. Categories Table
export const categories = sqliteTable('categories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique()
});

// 3. Books Table
export const books = sqliteTable('books', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  categoryId: integer('category_id').references(() => categories.id).notNull(),
  title: text('title').notNull(),
  author: text('author').notNull(),
  publisher: text('publisher').notNull(),
  publicationYear: integer('publication_year').notNull(),
  isbn: text('isbn'),
  bookType: text('book_type', { enum: ['HYBRID', 'DIGITAL_ONLY', 'PHYSICAL_ONLY'] }).notNull().default('HYBRID'),
  coverUrl: text('cover_url'),
  ebookFilePath: text('ebook_file_path'),
  digitalLicenseCount: integer('digital_license_count').notNull().default(5),
  totalPhysicalCopies: integer('total_physical_copies').notNull().default(1),
  availablePhysicalCopies: integer('available_physical_copies').notNull().default(1),
  shelfLocation: text('shelf_location'), // e.g. "RAK-INF-01"
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

// 4. Book Copies Table (Fisik)
export const bookCopies = sqliteTable('book_copies', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  bookId: integer('book_id').references(() => books.id, { onDelete: 'cascade' }).notNull(),
  barcode: text('barcode').notNull().unique(), // e.g. "BK-00101"
  status: text('status', { enum: ['AVAILABLE', 'BORROWED', 'DAMAGED', 'LOST'] }).notNull().default('AVAILABLE'),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

// 5. Loans Table (Hybrid: Digital & Physical)
export const loans = sqliteTable('loans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  bookId: integer('book_id').references(() => books.id).notNull(),
  copyId: integer('copy_id').references(() => bookCopies.id), // Nullable jika digital
  loanType: text('loan_type', { enum: ['DIGITAL', 'PHYSICAL'] }).notNull(),
  borrowDate: text('borrow_date').default(sql`CURRENT_TIMESTAMP`).notNull(),
  dueDate: text('due_date').notNull(),
  returnDate: text('return_date'), // null jika sedang dipinjam
  status: text('status', { enum: ['BORROWED', 'RETURNED', 'OVERDUE'] }).notNull().default('BORROWED'),
  fineAmount: integer('fine_amount').notNull().default(0), // dalam Rupiah
  isFinePaid: integer('is_fine_paid', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('created_at').default(sql`CURRENT_TIMESTAMP`).notNull()
});

export type UserTable = typeof users.$inferSelect;
export type CategoryTable = typeof categories.$inferSelect;
export type BookTable = typeof books.$inferSelect;
export type BookCopyTable = typeof bookCopies.$inferSelect;
export type LoanTable = typeof loans.$inferSelect;
