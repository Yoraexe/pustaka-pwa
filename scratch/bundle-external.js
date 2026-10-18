var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/app.ts
import express from "express";
import cors from "cors";
import path6 from "path";
import fs5 from "fs";

// src/server/controllers/auth.controller.ts
import { Router } from "express";
import multer from "multer";

// src/server/services/auth.service.ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// src/server/db/index.ts
import { drizzle as drizzleLibsql } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

// src/server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bookCopies: () => bookCopies,
  books: () => books,
  categories: () => categories,
  loans: () => loans,
  users: () => users
});
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
var users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  identityNumber: text("identity_number").notNull().unique(),
  // NISN / NIP
  name: text("name").notNull(),
  role: text("role", { enum: ["STUDENT", "TEACHER", "LIBRARIAN", "ADMIN"] }).notNull().default("STUDENT"),
  className: text("class_name"),
  // e.g. "X RPL 1"
  passwordHash: text("password_hash").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var categories = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique()
});
var books = sqliteTable("books", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  publisher: text("publisher").notNull(),
  publicationYear: integer("publication_year").notNull(),
  isbn: text("isbn"),
  bookType: text("book_type", { enum: ["HYBRID", "DIGITAL_ONLY", "PHYSICAL_ONLY"] }).notNull().default("HYBRID"),
  coverUrl: text("cover_url"),
  ebookFilePath: text("ebook_file_path"),
  digitalLicenseCount: integer("digital_license_count").notNull().default(5),
  totalPhysicalCopies: integer("total_physical_copies").notNull().default(1),
  availablePhysicalCopies: integer("available_physical_copies").notNull().default(1),
  shelfLocation: text("shelf_location"),
  // e.g. "RAK-INF-01"
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var bookCopies = sqliteTable("book_copies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }).notNull(),
  barcode: text("barcode").notNull().unique(),
  // e.g. "BK-00101"
  status: text("status", { enum: ["AVAILABLE", "BORROWED", "RESERVED", "DAMAGED", "LOST"] }).notNull().default("AVAILABLE"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var loans = sqliteTable("loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").references(() => users.id).notNull(),
  bookId: integer("book_id").references(() => books.id).notNull(),
  copyId: integer("copy_id").references(() => bookCopies.id),
  // Nullable jika digital
  loanType: text("loan_type", { enum: ["DIGITAL", "PHYSICAL"] }).notNull(),
  borrowDate: text("borrow_date").default(sql`CURRENT_TIMESTAMP`).notNull(),
  dueDate: text("due_date").notNull(),
  returnDate: text("return_date"),
  // null jika sedang dipinjam
  status: text("status", { enum: ["BORROWED", "RETURNED", "OVERDUE", "RESERVED", "CANCELLED"] }).notNull().default("BORROWED"),
  fineAmount: integer("fine_amount").notNull().default(0),
  // dalam Rupiah
  isFinePaid: integer("is_fine_paid", { mode: "boolean" }).notNull().default(false),
  isRenewed: integer("is_renewed", { mode: "boolean" }).notNull().default(false),
  reservationCode: text("reservation_code"),
  reservedUntil: text("reserved_until"),
  createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});

// src/server/config/index.ts
import { z } from "zod";
import dotenv from "dotenv";
import path from "path";
dotenv.config();
var envSchema = z.object({
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  JWT_SECRET: z.string().default("pustaka-sekolah-super-secret-key-2026-astesia"),
  DATABASE_URL: z.string().default("./pustaka.db"),
  UPLOADS_DIR: z.string().default("./uploads/ebooks"),
  STUDENT_LOAN_LIMIT: z.coerce.number().default(2),
  STUDENT_LOAN_DAYS: z.coerce.number().default(7),
  TEACHER_LOAN_LIMIT: z.coerce.number().default(5),
  TEACHER_LOAN_DAYS: z.coerce.number().default(14),
  DAILY_FINE_AMOUNT: z.coerce.number().default(1e3),
  // Rp 1.000 / hari
  TURSO_DATABASE_URL: z.string().optional(),
  TURSO_AUTH_TOKEN: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_BUCKET_COVERS: z.string().default("covers"),
  SUPABASE_BUCKET_EBOOKS: z.string().default("ebooks")
}).refine(
  (data) => {
    if (data.NODE_ENV === "production") {
      return data.JWT_SECRET && data.JWT_SECRET !== "pustaka-sekolah-super-secret-key-2026-astesia" && data.JWT_SECRET.length >= 32;
    }
    return true;
  },
  {
    message: "JWT_SECRET wajib diatur secara eksplisit dan aman (minimal 32 karakter) di lingkungan production.",
    path: ["JWT_SECRET"]
  }
);
var parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  console.error("\u274C Konfigurasi Environment tidak valid:", parsedEnv.error.format());
  process.exit(1);
}
var effectiveDbUrl = parsedEnv.data.NODE_ENV === "test" || Boolean(process.env.VITEST) ? "./pustaka.test.db" : parsedEnv.data.DATABASE_URL;
var isTursoEnabled = parsedEnv.data.NODE_ENV !== "test" && !Boolean(process.env.VITEST) && Boolean(parsedEnv.data.TURSO_DATABASE_URL);
var isSupabaseEnabled = Boolean(parsedEnv.data.SUPABASE_URL && parsedEnv.data.SUPABASE_SERVICE_ROLE_KEY);
var config = {
  ...parsedEnv.data,
  isTursoEnabled,
  isSupabaseEnabled,
  uploadsFullPath: path.resolve(process.cwd(), parsedEnv.data.UPLOADS_DIR),
  databaseFullPath: path.resolve(process.cwd(), effectiveDbUrl)
};

// src/server/db/index.ts
import fs from "fs";
import path2 from "path";
var db;
var sqlite;
var DDL_BOOTSTRAP = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    identity_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'STUDENT',
    class_name TEXT,
    password_hash TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    publisher TEXT NOT NULL,
    publication_year INTEGER NOT NULL,
    isbn TEXT,
    book_type TEXT NOT NULL DEFAULT 'HYBRID',
    cover_url TEXT,
    ebook_file_path TEXT,
    digital_license_count INTEGER NOT NULL DEFAULT 5,
    total_physical_copies INTEGER NOT NULL DEFAULT 1,
    available_physical_copies INTEGER NOT NULL DEFAULT 1,
    shelf_location TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS book_copies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    barcode TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    book_id INTEGER NOT NULL REFERENCES books(id),
    copy_id INTEGER REFERENCES book_copies(id),
    loan_type TEXT NOT NULL,
    borrow_date TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL DEFAULT 'BORROWED',
    fine_amount INTEGER NOT NULL DEFAULT 0,
    is_fine_paid INTEGER NOT NULL DEFAULT 0,
    is_renewed INTEGER NOT NULL DEFAULT 0,
    reservation_code TEXT,
    reserved_until TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  -- Performance Indexes (DBA-Grade Standards - Astesia Quality Rule #6)
  CREATE INDEX IF NOT EXISTS idx_loans_user_status ON loans(user_id, status);
  CREATE INDEX IF NOT EXISTS idx_loans_book_status ON loans(book_id, status);
  CREATE INDEX IF NOT EXISTS idx_loans_copy_id ON loans(copy_id);
  CREATE INDEX IF NOT EXISTS idx_loans_res_code ON loans(reservation_code);
  CREATE INDEX IF NOT EXISTS idx_loans_due_date ON loans(due_date);
  CREATE INDEX IF NOT EXISTS idx_book_copies_book_id ON book_copies(book_id);
  CREATE INDEX IF NOT EXISTS idx_books_category_id ON books(category_id);
  CREATE INDEX IF NOT EXISTS idx_books_isbn ON books(isbn);

  INSERT OR IGNORE INTO categories (name, slug) VALUES
    ('Informatika & Komputer', 'informatika'),
    ('Sains & Matematika', 'sains-matematika'),
    ('Bahasa & Sastra', 'bahasa-sastra'),
    ('Ilmu Pengetahuan Sosial & Sejarah', 'ips-sejarah'),
    ('Agama & Budi Pekerti', 'agama-budi-pekerti'),
    ('Seni, Budaya & Prakarya', 'seni-budaya'),
    ('Fiksi, Novel & Literasi', 'fiksi-literasi'),
    ('Pengetahuan Umum & Referensi', 'umum');
`;
if (config.isTursoEnabled && config.TURSO_DATABASE_URL) {
  const client = createClient({
    url: config.TURSO_DATABASE_URL,
    authToken: config.TURSO_AUTH_TOKEN
  });
  db = drizzleLibsql(client, { schema: schema_exports });
  sqlite = {
    exec: (sqlQuery) => {
      client.executeMultiple(sqlQuery).catch(() => {
        client.execute(sqlQuery).catch(() => {
        });
      });
    },
    pragma: (_cmd) => {
    }
  };
  client.executeMultiple(DDL_BOOTSTRAP).catch((err) => {
    console.warn("[Turso DDL Bootstrap Notice]:", err?.message || err);
  });
} else {
  const dbDir = path2.dirname(config.databaseFullPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(config.uploadsFullPath)) {
    fs.mkdirSync(config.uploadsFullPath, { recursive: true });
  }
  const { default: Database } = await import("better-sqlite3");
  const { drizzle: drizzleBetterSqlite } = await import("drizzle-orm/better-sqlite3");
  const localSqlite = new Database(config.databaseFullPath);
  localSqlite.pragma("journal_mode = WAL");
  localSqlite.pragma("foreign_keys = ON");
  localSqlite.exec(DDL_BOOTSTRAP);
  sqlite = localSqlite;
  db = drizzleBetterSqlite(localSqlite, { schema: schema_exports });
}

// src/server/repositories/user.repository.ts
import { eq, desc } from "drizzle-orm";
var UserRepository = class {
  async findById(id) {
    const records = await db.select().from(users).where(eq(users.id, id)).limit(1);
    if (records.length === 0)
      return null;
    return this.mapToDomain(records[0]);
  }
  async findByIdentityNumber(identityNumber) {
    const records = await db.select().from(users).where(eq(users.identityNumber, identityNumber)).limit(1);
    if (records.length === 0)
      return null;
    const raw = records[0];
    return {
      ...this.mapToDomain(raw),
      passwordHash: raw.passwordHash
    };
  }
  async findAll() {
    const records = await db.select().from(users).orderBy(desc(users.id));
    return records.map((r) => this.mapToDomain(r));
  }
  async create(data) {
    const result = await db.insert(users).values({
      identityNumber: data.identityNumber,
      name: data.name,
      role: data.role,
      className: data.className || null,
      passwordHash: data.passwordHash,
      isActive: true
    }).returning();
    return this.mapToDomain(result[0]);
  }
  async updateStatus(id, isActive) {
    const updated = await db.update(users).set({ isActive }).where(eq(users.id, id)).returning();
    if (updated.length === 0)
      return null;
    return this.mapToDomain(updated[0]);
  }
  async updatePassword(id, passwordHash) {
    const updated = await db.update(users).set({ passwordHash }).where(eq(users.id, id)).returning({ id: users.id });
    return updated.length > 0;
  }
  async countTotal() {
    const all = await db.select({ id: users.id }).from(users);
    return all.length;
  }
  mapToDomain(raw) {
    return {
      id: raw.id,
      identityNumber: raw.identityNumber,
      name: raw.name,
      role: raw.role,
      className: raw.className,
      isActive: raw.isActive,
      createdAt: raw.createdAt
    };
  }
};
var userRepository = new UserRepository();

// src/server/services/auth.service.ts
var AuthService = class {
  constructor(userRepo = userRepository) {
    this.userRepo = userRepo;
  }
  async login(input) {
    const userWithHash = await this.userRepo.findByIdentityNumber(input.identityNumber);
    if (!userWithHash) {
      throw new Error("Nomor identitas (NISN/NIP) atau kata sandi tidak cocok.");
    }
    if (!userWithHash.isActive) {
      throw new Error("Akun dinonaktifkan. Silakan hubungi pustakawan atau admin sekolah.");
    }
    const isMatch = await bcrypt.compare(input.password, userWithHash.passwordHash);
    if (!isMatch) {
      throw new Error("Nomor identitas (NISN/NIP) atau kata sandi tidak cocok.");
    }
    const { passwordHash: _, ...safeUser } = userWithHash;
    const token = jwt.sign(
      {
        id: safeUser.id,
        identityNumber: safeUser.identityNumber,
        role: safeUser.role,
        name: safeUser.name
      },
      config.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return { token, user: safeUser };
  }
  async registerUser(input) {
    const existing = await this.userRepo.findByIdentityNumber(input.identityNumber);
    if (existing) {
      throw new Error(`Pengguna dengan identitas ${input.identityNumber} sudah terdaftar.`);
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);
    return this.userRepo.create({
      ...input,
      passwordHash
    });
  }
  /**
   * Pendaftaran Mandiri (Self-Registration) khusus Siswa dan Guru (BRD Seksi 3.4 & AC-4.3)
   */
  async selfRegister(input) {
    const allowedRoles = ["STUDENT", "TEACHER"];
    if (!allowedRoles.includes(input.role)) {
      throw new Error("Pendaftaran mandiri hanya diizinkan untuk peran Siswa dan Guru.");
    }
    const newUser = await this.registerUser({
      identityNumber: input.identityNumber,
      name: input.name,
      role: input.role,
      className: input.className || null,
      password: input.password
    });
    const token = jwt.sign(
      {
        id: newUser.id,
        identityNumber: newUser.identityNumber,
        role: newUser.role,
        name: newUser.name
      },
      config.JWT_SECRET,
      { expiresIn: "7d" }
    );
    return { token, user: newUser };
  }
  /**
   * Daftar seluruh akun pengguna (Superadmin & Pustakawan)
   */
  async getAllUsers(actor) {
    if (actor.role !== "ADMIN" && actor.role !== "LIBRARIAN") {
      throw new Error("Hanya Superadmin atau Pustakawan yang berwenang melihat daftar pengguna.");
    }
    return this.userRepo.findAll();
  }
  /**
   * Mengubah status aktif/nonaktif pengguna (Khusus Superadmin)
   */
  async toggleUserStatus(adminUser, targetUserId, isActive) {
    if (adminUser.role !== "ADMIN") {
      throw new Error("Hanya Superadmin yang berwenang mengubah status akun pengguna.");
    }
    if (adminUser.id === targetUserId && !isActive) {
      throw new Error("Anda tidak dapat menonaktifkan akun Anda sendiri yang sedang aktif.");
    }
    const updated = await this.userRepo.updateStatus(targetUserId, isActive);
    if (!updated) {
      throw new Error("Pengguna tidak ditemukan.");
    }
    return updated;
  }
  /**
   * Reset kata sandi pengguna oleh Superadmin
   */
  async resetUserPassword(adminUser, targetUserId, newPassword) {
    if (adminUser.role !== "ADMIN") {
      throw new Error("Hanya Superadmin yang berwenang mereset kata sandi pengguna.");
    }
    const target = await this.userRepo.findById(targetUserId);
    if (!target) {
      throw new Error("Pengguna tidak ditemukan.");
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);
    await this.userRepo.updatePassword(targetUserId, passwordHash);
  }
  async verifyToken(token) {
    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      const user = await this.userRepo.findById(decoded.id);
      if (!user || !user.isActive) {
        throw new Error("Pengguna tidak valid atau tidak aktif.");
      }
      return user;
    } catch {
      throw new Error("Sesi tidak valid atau telah kedaluwarsa.");
    }
  }
  /**
   * Impor Massal Pengguna via CSV (Admin Only - BRD Section 3.4 & AC-4.2)
   * Format kolom: Nama, NISN/NIP, Role, Kelas/Jurusan, Password (opsional)
   */
  async importUsersFromCsv(csvText) {
    const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);
    if (lines.length === 0) {
      return { totalRows: 0, importedCount: 0, skippedCount: 0, errors: [] };
    }
    const parseCsvLine = (line) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim().replace(/^["']|["']$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      return result;
    };
    let startIndex = 0;
    let nameIdx = 0;
    let identityIdx = 1;
    let roleIdx = 2;
    let classIdx = 3;
    let passwordIdx = 4;
    const firstLineLower = lines[0].toLowerCase();
    if (firstLineLower.includes("nama") || firstLineLower.includes("name") || firstLineLower.includes("nisn") || firstLineLower.includes("nip") || firstLineLower.includes("identity") || firstLineLower.includes("role")) {
      startIndex = 1;
      const headerCols = parseCsvLine(lines[0]).map((c) => c.toLowerCase());
      headerCols.forEach((col, idx) => {
        if (col.includes("nisn") || col.includes("nip") || col.includes("identity")) {
          identityIdx = idx;
        } else if (col.includes("nama") || col.includes("name")) {
          nameIdx = idx;
        } else if (col.includes("role") || col.includes("peran")) {
          roleIdx = idx;
        } else if (col.includes("kelas") || col.includes("class") || col.includes("jurusan")) {
          classIdx = idx;
        } else if (col.includes("password") || col.includes("sandi") || col.includes("pass")) {
          passwordIdx = idx;
        }
      });
    }
    let importedCount = 0;
    let skippedCount = 0;
    const errors = [];
    const salt = await bcrypt.genSalt(10);
    const defaultPasswordHash = await bcrypt.hash("123456", salt);
    const preparedUsers = [];
    for (let i = startIndex; i < lines.length; i++) {
      const rowNum = i + 1;
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 2) {
        errors.push({
          row: rowNum,
          identity: cols[0] || "-",
          reason: "Format baris tidak lengkap (minimal Nama dan NISN/NIP)"
        });
        continue;
      }
      const name = cols[nameIdx] || "";
      const identityNumber = cols[identityIdx] || "";
      const rawRole = (cols[roleIdx] || "STUDENT").toUpperCase();
      const className = cols[classIdx] || null;
      const customPassword = cols[passwordIdx] || null;
      if (!name || !identityNumber) {
        errors.push({
          row: rowNum,
          identity: identityNumber || "-",
          reason: "Nama dan NISN/NIP wajib diisi"
        });
        continue;
      }
      let role = "STUDENT";
      if (rawRole.includes("GURU") || rawRole.includes("TEACHER")) {
        role = "TEACHER";
      } else if (rawRole.includes("PUSTAKA") || rawRole.includes("LIBRARIAN")) {
        role = "LIBRARIAN";
      } else if (rawRole.includes("ADMIN")) {
        role = "ADMIN";
      }
      if (customPassword && customPassword.length < 4) {
        errors.push({
          row: rowNum,
          identity: identityNumber,
          reason: "Password minimal 4 karakter"
        });
        continue;
      }
      const passwordHash = customPassword ? await bcrypt.hash(customPassword, 10) : defaultPasswordHash;
      preparedUsers.push({
        rowNum,
        identityNumber,
        name,
        role,
        className,
        password: customPassword || "123456",
        passwordHash
      });
    }
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      for (const u of preparedUsers) {
        try {
          const existing = await this.userRepo.findByIdentityNumber(u.identityNumber);
          if (existing) {
            skippedCount++;
            continue;
          }
          await this.userRepo.create({
            identityNumber: u.identityNumber,
            name: u.name,
            role: u.role,
            className: u.className,
            password: u.password,
            passwordHash: u.passwordHash
          });
          importedCount++;
        } catch (err) {
          errors.push({
            row: u.rowNum,
            identity: u.identityNumber,
            reason: err instanceof Error ? err.message : "Gagal menyimpan ke basis data"
          });
        }
      }
      sqlite.exec("COMMIT");
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
    return {
      totalRows: lines.length - startIndex,
      importedCount,
      skippedCount,
      errors
    };
  }
};
var authService = new AuthService();

// src/shared/schemas/index.ts
import { z as z2 } from "zod";
var LoginSchema = z2.object({
  identityNumber: z2.string().min(3, "Nomor identitas/NISN minimal 3 karakter").trim(),
  password: z2.string().min(4, "Kata sandi minimal 4 karakter")
});
var CreateUserSchema = z2.object({
  identityNumber: z2.string().min(3, "Nomor identitas/NISN minimal 3 karakter").trim(),
  name: z2.string().min(2, "Nama minimal 2 karakter").trim(),
  role: z2.enum(["STUDENT", "TEACHER", "LIBRARIAN", "ADMIN"]),
  className: z2.string().optional().nullable(),
  password: z2.string().min(4, "Kata sandi minimal 4 karakter").default("123456")
});
var SelfRegisterSchema = z2.object({
  identityNumber: z2.string().min(3, "NISN / NIP minimal 3 karakter").trim(),
  name: z2.string().min(2, "Nama lengkap minimal 2 karakter").trim(),
  role: z2.enum(["STUDENT", "TEACHER"]).default("STUDENT"),
  className: z2.string().optional().nullable(),
  password: z2.string().min(4, "Kata sandi minimal 4 karakter")
});
var UpdateUserStatusSchema = z2.object({
  isActive: z2.boolean()
});
var ResetUserPasswordSchema = z2.object({
  newPassword: z2.string().min(4, "Kata sandi baru minimal 4 karakter")
});
var BookFilterSchema = z2.object({
  search: z2.string().optional(),
  categoryId: z2.coerce.number().optional(),
  bookType: z2.enum(["ALL", "HYBRID", "DIGITAL_ONLY", "PHYSICAL_ONLY"]).optional().default("ALL"),
  availableOnly: z2.coerce.boolean().optional().default(false)
});
var CreateBookSchema = z2.object({
  categoryId: z2.coerce.number(),
  title: z2.string().min(1, "Judul buku wajib diisi").trim(),
  author: z2.string().min(1, "Nama penulis wajib diisi").trim(),
  publisher: z2.string().min(1, "Penerbit wajib diisi").trim(),
  publicationYear: z2.coerce.number().int().min(1900).max(2100),
  isbn: z2.string().optional().nullable(),
  bookType: z2.enum(["HYBRID", "DIGITAL_ONLY", "PHYSICAL_ONLY"]),
  coverUrl: z2.string().trim().refine(
    (val) => !val || /^(https?:\/\/|\/uploads\/covers\/)/i.test(val),
    { message: "URL sampul harus diawali dengan http://, https://, atau /uploads/covers/" }
  ).optional().nullable(),
  ebookFilePath: z2.string().optional().nullable(),
  digitalLicenseCount: z2.coerce.number().int().min(0).default(5),
  totalPhysicalCopies: z2.coerce.number().int().min(0).default(1),
  shelfLocation: z2.string().optional().nullable()
}).superRefine((data, ctx) => {
  if ((data.bookType === "DIGITAL_ONLY" || data.bookType === "HYBRID") && !data.ebookFilePath) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "Berkas e-book PDF wajib dilampirkan untuk buku berjenis E-Book atau Hybrid",
      path: ["ebookFilePath"]
    });
  }
  if ((data.bookType === "PHYSICAL_ONLY" || data.bookType === "HYBRID") && data.totalPhysicalCopies < 1) {
    ctx.addIssue({
      code: z2.ZodIssueCode.custom,
      message: "Jumlah eksemplar fisik minimal 1 untuk buku berjenis Fisik atau Hybrid",
      path: ["totalPhysicalCopies"]
    });
  }
});
var DigitalLoanSchema = z2.object({
  bookId: z2.coerce.number().int().positive("ID Buku tidak valid")
});
var PhysicalLoanSchema = z2.object({
  userIdentity: z2.string().min(3, "NISN/NIP peminjam wajib diisi").trim(),
  copyBarcode: z2.string().min(3, "Barcode eksemplar buku wajib diisi").trim()
});
var ReturnPhysicalLoanSchema = z2.object({
  copyBarcode: z2.string().min(3, "Barcode eksemplar buku wajib diisi").trim(),
  finePaid: z2.boolean().default(false)
});
var BorrowPhysicalSelfSchema = z2.object({
  bookId: z2.coerce.number().int().positive("ID Buku tidak valid").optional(),
  copyBarcode: z2.string().trim().optional()
}).refine((data) => Boolean(data.bookId || data.copyBarcode && data.copyBarcode.length >= 3), {
  message: "ID Buku atau Barcode/QR eksemplar wajib diisi"
});
var ReturnPhysicalSelfSchema = z2.object({
  loanId: z2.coerce.number().int().positive("ID Peminjaman tidak valid")
});
var ReservePhysicalLoanSchema = z2.object({
  bookId: z2.coerce.number().int().positive("ID Buku tidak valid")
});
var ClaimReservationSchema = z2.object({
  reservationCode: z2.string().min(3, "Kode reservasi wajib diisi").trim()
});
var CancelReservationSchema = z2.object({
  loanId: z2.coerce.number().int().positive("ID Peminjaman/Reservasi tidak valid")
});
var RenewLoanSchema = z2.object({
  loanId: z2.coerce.number().int().positive("ID Peminjaman tidak valid")
});
var SettleFineSchema = z2.object({
  loanId: z2.coerce.number().int().positive("ID Peminjaman tidak valid")
});

// src/server/middleware/auth.middleware.ts
var authenticateToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: "UNAUTHORIZED",
        message: "Akses ditolak. Token otentikasi tidak ditemukan."
      }
    });
    return;
  }
  try {
    const user = await authService.verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: err instanceof Error ? err.message : "Sesi tidak valid."
      }
    });
  }
};
var requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "Sesi belum terotentikasi." }
      });
      return;
    }
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: `Peran Anda (${req.user.role}) tidak memiliki izin untuk mengakses resource ini.`
        }
      });
      return;
    }
    next();
  };
};

// src/server/controllers/auth.controller.ts
var ALLOWED_CSV_MIMES = [
  "text/csv",
  "text/plain",
  "application/vnd.ms-excel",
  "application/csv",
  "text/x-csv",
  "application/x-csv"
];
var uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isCsvExt = file.originalname.toLowerCase().endsWith(".csv");
    const isCsvMime = ALLOWED_CSV_MIMES.includes(file.mimetype);
    if (isCsvExt || isCsvMime) {
      cb(null, true);
    } else {
      cb(new Error("Format berkas tidak didukung. Harap unggah berkas berekstensi .csv."));
    }
  }
});
var authRouter = Router();
authRouter.post("/login", async (req, res, next) => {
  try {
    const input = LoginSchema.parse(req.body);
    const session = await authService.login(input);
    res.json({
      success: true,
      message: "Login berhasil.",
      data: session
    });
  } catch (err) {
    next(err);
  }
});
authRouter.post("/signup", async (req, res, next) => {
  try {
    const input = SelfRegisterSchema.parse(req.body);
    const session = await authService.selfRegister(input);
    res.status(201).json({
      success: true,
      message: "Pendaftaran akun berhasil.",
      data: session
    });
  } catch (err) {
    next(err);
  }
});
authRouter.get("/me", authenticateToken, async (req, res) => {
  res.json({
    success: true,
    data: req.user
  });
});
authRouter.get("/users", authenticateToken, requireRole(["ADMIN", "LIBRARIAN"]), async (req, res, next) => {
  try {
    const usersList = await authService.getAllUsers(req.user);
    res.json({
      success: true,
      data: usersList
    });
  } catch (err) {
    next(err);
  }
});
authRouter.post("/register", authenticateToken, requireRole(["ADMIN"]), async (req, res, next) => {
  try {
    const input = CreateUserSchema.parse(req.body);
    const newUser = await authService.registerUser(input);
    res.status(201).json({
      success: true,
      message: "Pengguna baru berhasil didaftarkan oleh Superadmin.",
      data: newUser
    });
  } catch (err) {
    next(err);
  }
});
authRouter.patch("/users/:id/status", authenticateToken, requireRole(["ADMIN"]), async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "ID pengguna harus berupa bilangan bulat positif." } });
      return;
    }
    const input = UpdateUserStatusSchema.parse(req.body);
    const updatedUser = await authService.toggleUserStatus(req.user, targetId, input.isActive);
    res.json({
      success: true,
      message: `Status akun ${updatedUser.name} berhasil diperbarui.`,
      data: updatedUser
    });
  } catch (err) {
    next(err);
  }
});
authRouter.patch("/users/:id/password", authenticateToken, requireRole(["ADMIN"]), async (req, res, next) => {
  try {
    const targetId = Number(req.params.id);
    if (!Number.isInteger(targetId) || targetId <= 0) {
      res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "ID pengguna harus berupa bilangan bulat positif." } });
      return;
    }
    const input = ResetUserPasswordSchema.parse(req.body);
    await authService.resetUserPassword(req.user, targetId, input.newPassword);
    res.json({
      success: true,
      message: "Kata sandi pengguna berhasil direset."
    });
  } catch (err) {
    next(err);
  }
});
authRouter.post("/import-users", authenticateToken, requireRole(["ADMIN"]), uploadCsv.single("file"), async (req, res, next) => {
  try {
    let csvText = "";
    if (req.file) {
      csvText = req.file.buffer.toString("utf-8");
    } else if (req.body.csvText || req.body.csvContent) {
      csvText = req.body.csvText || req.body.csvContent;
    } else {
      res.status(400).json({ success: false, error: { code: "INVALID_INPUT", message: "File CSV atau data csvText wajib disertakan." } });
      return;
    }
    const result = await authService.importUsersFromCsv(csvText);
    res.json({
      success: true,
      message: `Impor CSV selesai. ${result.importedCount} pengguna ditambahkan, ${result.skippedCount} dilewati.`,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// src/server/controllers/book.controller.ts
import { Router as Router2 } from "express";

// src/server/repositories/book.repository.ts
import { eq as eq2, and, sql as sql2 } from "drizzle-orm";
var BookRepository = class {
  async findAllCategories() {
    const list = await db.select().from(categories).orderBy(categories.name);
    return list.map((c) => ({ id: c.id, name: c.name, slug: c.slug }));
  }
  async findCategoryBySlug(slug) {
    const res = await db.select().from(categories).where(eq2(categories.slug, slug)).limit(1);
    if (res.length === 0)
      return null;
    return { id: res[0].id, name: res[0].name, slug: res[0].slug };
  }
  async createCategory(name, slug) {
    const res = await db.insert(categories).values({ name, slug }).returning();
    return { id: res[0].id, name: res[0].name, slug: res[0].slug };
  }
  async findBooks(filters) {
    let query = db.select({
      book: books,
      categoryName: categories.name
    }).from(books).innerJoin(categories, eq2(books.categoryId, categories.id)).$dynamic();
    const conditions = [];
    if (filters.categoryId) {
      conditions.push(eq2(books.categoryId, filters.categoryId));
    }
    if (filters.bookType && filters.bookType !== "ALL") {
      conditions.push(eq2(books.bookType, filters.bookType));
    }
    if (filters.search && filters.search.trim() !== "") {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      conditions.push(
        sql2`(LOWER(${books.title}) LIKE ${term} OR LOWER(${books.author}) LIKE ${term} OR LOWER(${categories.name}) LIKE ${term} OR LOWER(COALESCE(${books.isbn}, '')) LIKE ${term})`
      );
    }
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    const rows = await query.orderBy(sql2`${books.id} DESC`);
    let result = rows.map((r) => this.mapToDomain(r.book, r.categoryName));
    if (filters.availableOnly) {
      result = result.filter((b) => {
        if (b.bookType === "DIGITAL_ONLY" || b.bookType === "HYBRID")
          return true;
        return b.availablePhysicalCopies > 0;
      });
    }
    return result;
  }
  async findById(id) {
    const rows = await db.select({
      book: books,
      categoryName: categories.name
    }).from(books).innerJoin(categories, eq2(books.categoryId, categories.id)).where(eq2(books.id, id)).limit(1);
    if (rows.length === 0)
      return null;
    const domainBook = this.mapToDomain(rows[0].book, rows[0].categoryName);
    const copies = await this.findCopiesByBookId(id);
    domainBook.copies = copies;
    return domainBook;
  }
  async findCopiesByBookId(bookId) {
    const rows = await db.select().from(bookCopies).where(eq2(bookCopies.bookId, bookId)).orderBy(bookCopies.id);
    return rows.map((r) => ({
      id: r.id,
      bookId: r.bookId,
      barcode: r.barcode,
      status: r.status
    }));
  }
  async findAvailableCopies() {
    const rows = await db.select({
      copy: bookCopies,
      bookTitle: books.title,
      shelfLocation: books.shelfLocation
    }).from(bookCopies).innerJoin(books, eq2(bookCopies.bookId, books.id)).where(eq2(bookCopies.status, "AVAILABLE")).orderBy(bookCopies.barcode);
    return rows.map((r) => ({
      id: r.copy.id,
      bookId: r.copy.bookId,
      barcode: r.copy.barcode,
      status: r.copy.status,
      bookTitle: r.bookTitle,
      shelfLocation: r.shelfLocation
    }));
  }
  async create(data) {
    const isDigitalOnly = data.bookType === "DIGITAL_ONLY";
    const totalCopies = isDigitalOnly ? 0 : data.totalPhysicalCopies ?? 1;
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
      digitalLicenseCount: data.bookType === "PHYSICAL_ONLY" ? 0 : data.digitalLicenseCount,
      totalPhysicalCopies: totalCopies,
      availablePhysicalCopies: availableCopies,
      shelfLocation: isDigitalOnly ? null : data.shelfLocation || null
    }).returning();
    const cat = await db.select().from(categories).where(eq2(categories.id, data.categoryId)).limit(1);
    return this.mapToDomain(inserted[0], cat[0]?.name || "Umum");
  }
  async createCopy(bookId, barcode) {
    const inserted = await db.insert(bookCopies).values({
      bookId,
      barcode,
      status: "AVAILABLE"
    }).returning();
    return {
      id: inserted[0].id,
      bookId: inserted[0].bookId,
      barcode: inserted[0].barcode,
      status: inserted[0].status
    };
  }
  async findFirstAvailableCopy(bookId) {
    const rows = await db.select().from(bookCopies).where(and(eq2(bookCopies.bookId, bookId), eq2(bookCopies.status, "AVAILABLE"))).limit(1);
    if (rows.length === 0)
      return null;
    return {
      id: rows[0].id,
      bookId: rows[0].bookId,
      barcode: rows[0].barcode,
      status: rows[0].status
    };
  }
  async findCopyByBarcode(barcode) {
    const rows = await db.select({
      copy: bookCopies,
      book: books,
      categoryName: categories.name
    }).from(bookCopies).innerJoin(books, eq2(bookCopies.bookId, books.id)).innerJoin(categories, eq2(books.categoryId, categories.id)).where(eq2(bookCopies.barcode, barcode)).limit(1);
    if (rows.length === 0)
      return null;
    const r = rows[0];
    return {
      id: r.copy.id,
      bookId: r.copy.bookId,
      barcode: r.copy.barcode,
      status: r.copy.status,
      book: this.mapToDomain(r.book, r.categoryName)
    };
  }
  async updateCopyStatus(copyId, status, expectedStatus) {
    const conditions = [eq2(bookCopies.id, copyId)];
    if (expectedStatus) {
      conditions.push(eq2(bookCopies.status, expectedStatus));
    }
    const res = await db.update(bookCopies).set({ status }).where(and(...conditions));
    return res.changes ?? res.rowsAffected ?? 0;
  }
  async updateAvailableCopies(bookId, delta) {
    await db.update(books).set({
      availablePhysicalCopies: sql2`min(${books.totalPhysicalCopies}, max(0, ${books.availablePhysicalCopies} + ${delta}))`
    }).where(eq2(books.id, bookId));
  }
  mapToDomain(raw, categoryName) {
    return {
      id: raw.id,
      categoryId: raw.categoryId,
      categoryName,
      title: raw.title,
      author: raw.author,
      publisher: raw.publisher,
      publicationYear: raw.publicationYear,
      isbn: raw.isbn,
      bookType: raw.bookType,
      coverUrl: raw.coverUrl,
      ebookFilePath: raw.ebookFilePath,
      digitalLicenseCount: raw.digitalLicenseCount,
      totalPhysicalCopies: raw.totalPhysicalCopies,
      availablePhysicalCopies: raw.availablePhysicalCopies,
      shelfLocation: raw.shelfLocation,
      createdAt: raw.createdAt
    };
  }
};
var bookRepository = new BookRepository();

// src/server/services/book.service.ts
var BookService = class {
  constructor(bookRepo = bookRepository) {
    this.bookRepo = bookRepo;
  }
  async listCategories() {
    return this.bookRepo.findAllCategories();
  }
  async searchBooks(filters) {
    return this.bookRepo.findBooks(filters);
  }
  async getBookDetail(id) {
    const book = await this.bookRepo.findById(id);
    if (!book) {
      throw new Error(`Buku dengan ID ${id} tidak ditemukan.`);
    }
    return book;
  }
  async getBookCopies(id) {
    return this.bookRepo.findCopiesByBookId(id);
  }
  async getAvailableCopies() {
    return this.bookRepo.findAvailableCopies();
  }
  async addNewBook(input) {
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const createdBook = await this.bookRepo.create(input);
      const copies = [];
      if (input.bookType === "HYBRID" || input.bookType === "PHYSICAL_ONLY") {
        const copyCount = input.totalPhysicalCopies || 1;
        for (let i = 1; i <= copyCount; i++) {
          const barcode = `BK-${String(createdBook.id).padStart(4, "0")}-${String(i).padStart(2, "0")}`;
          const copy = await this.bookRepo.createCopy(createdBook.id, barcode);
          copies.push(copy);
        }
      }
      sqlite.exec("COMMIT");
      return {
        ...createdBook,
        copies
      };
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
};
var bookService = new BookService();

// src/server/repositories/loan.repository.ts
import { eq as eq3, and as and2, or, sql as sql3 } from "drizzle-orm";
var LoanRepository = class {
  /**
   * Secara otomatis menandai pinjaman e-book yang telah melewati jatuh tempo sebagai RETURNED
   */
  async autoExpireDigitalLoans() {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const result = await db.update(loans).set({
      status: "RETURNED",
      returnDate: nowIso,
      fineAmount: 0,
      isFinePaid: true
    }).where(
      and2(
        eq3(loans.loanType, "DIGITAL"),
        eq3(loans.status, "BORROWED"),
        sql3`${loans.dueDate} < ${nowIso}`
      )
    );
    return result.changes ?? result.rowsAffected ?? 0;
  }
  async findActiveLoan(userId, bookId, loanType) {
    if (loanType === "DIGITAL") {
      await this.autoExpireDigitalLoans();
    }
    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    }).from(loans).innerJoin(books, eq3(loans.bookId, books.id)).innerJoin(users, eq3(loans.userId, users.id)).leftJoin(bookCopies, eq3(loans.copyId, bookCopies.id)).where(
      and2(
        eq3(loans.userId, userId),
        eq3(loans.bookId, bookId),
        eq3(loans.loanType, loanType),
        eq3(loans.status, "BORROWED")
      )
    ).limit(1);
    if (rows.length === 0)
      return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode);
  }
  async findActivePhysicalLoanByCopyId(copyId) {
    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    }).from(loans).innerJoin(books, eq3(loans.bookId, books.id)).innerJoin(users, eq3(loans.userId, users.id)).innerJoin(bookCopies, eq3(loans.copyId, bookCopies.id)).where(
      and2(
        eq3(loans.copyId, copyId),
        eq3(loans.status, "BORROWED")
      )
    ).limit(1);
    if (rows.length === 0)
      return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode);
  }
  async countActiveUserLoans(userId, loanType) {
    if (loanType === "DIGITAL") {
      await this.autoExpireDigitalLoans();
    }
    const rows = await db.select({ id: loans.id }).from(loans).where(
      and2(
        eq3(loans.userId, userId),
        eq3(loans.loanType, loanType),
        eq3(loans.status, "BORROWED")
      )
    );
    return rows.length;
  }
  async countActiveDigitalLoansForBook(bookId) {
    await this.autoExpireDigitalLoans();
    const rows = await db.select({ id: loans.id }).from(loans).where(
      and2(
        eq3(loans.bookId, bookId),
        eq3(loans.loanType, "DIGITAL"),
        eq3(loans.status, "BORROWED")
      )
    );
    return rows.length;
  }
  /**
   * Secara otomatis membatalkan reservasi yang telah melewati batas reservedUntil dan memulihkan stok eksemplar secara atomik
   */
  async autoExpireReservations() {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const expiredRows = await db.select({
        id: loans.id,
        bookId: loans.bookId,
        copyId: loans.copyId
      }).from(loans).where(
        and2(
          eq3(loans.status, "RESERVED"),
          sql3`${loans.reservedUntil} < ${nowIso}`
        )
      );
      if (expiredRows.length === 0) {
        sqlite.exec("COMMIT");
        return 0;
      }
      let expiredCount = 0;
      for (const r of expiredRows) {
        const updateRes = await db.update(loans).set({ status: "CANCELLED" }).where(
          and2(
            eq3(loans.id, r.id),
            eq3(loans.status, "RESERVED")
          )
        );
        const changes = updateRes.changes ?? updateRes.rowsAffected ?? 0;
        if (changes > 0) {
          expiredCount++;
          if (r.copyId) {
            await db.update(bookCopies).set({ status: "AVAILABLE" }).where(
              and2(
                eq3(bookCopies.id, r.copyId),
                eq3(bookCopies.status, "RESERVED")
              )
            );
          }
          await db.update(books).set({
            availablePhysicalCopies: sql3`min(${books.totalPhysicalCopies}, ${books.availablePhysicalCopies} + 1)`
          }).where(eq3(books.id, r.bookId));
        }
      }
      sqlite.exec("COMMIT");
      return expiredCount;
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
  async findActiveReservation(userId, bookId) {
    await this.autoExpireReservations();
    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    }).from(loans).innerJoin(books, eq3(loans.bookId, books.id)).innerJoin(users, eq3(loans.userId, users.id)).leftJoin(bookCopies, eq3(loans.copyId, bookCopies.id)).where(
      and2(
        eq3(loans.userId, userId),
        eq3(loans.bookId, bookId),
        eq3(loans.status, "RESERVED")
      )
    ).limit(1);
    if (rows.length === 0)
      return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation);
  }
  async findReservationByCode(reservationCode) {
    await this.autoExpireReservations();
    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    }).from(loans).innerJoin(books, eq3(loans.bookId, books.id)).innerJoin(users, eq3(loans.userId, users.id)).leftJoin(bookCopies, eq3(loans.copyId, bookCopies.id)).where(
      and2(
        eq3(loans.reservationCode, reservationCode),
        eq3(loans.status, "RESERVED")
      )
    ).limit(1);
    if (rows.length === 0)
      return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation);
  }
  async findById(loanId) {
    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    }).from(loans).innerJoin(books, eq3(loans.bookId, books.id)).innerJoin(users, eq3(loans.userId, users.id)).leftJoin(bookCopies, eq3(loans.copyId, bookCopies.id)).where(eq3(loans.id, loanId)).limit(1);
    if (rows.length === 0)
      return null;
    const r = rows[0];
    return this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation);
  }
  async countActiveUserPhysicalLoansAndReservations(userId) {
    await this.autoExpireReservations();
    const rows = await db.select({ id: loans.id }).from(loans).where(
      and2(
        eq3(loans.userId, userId),
        eq3(loans.loanType, "PHYSICAL"),
        or(eq3(loans.status, "BORROWED"), eq3(loans.status, "RESERVED"))
      )
    );
    return rows.length;
  }
  async findUserLoans(userId, activeOnly = false) {
    await this.autoExpireDigitalLoans();
    await this.autoExpireReservations();
    let query = db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    }).from(loans).innerJoin(books, eq3(loans.bookId, books.id)).innerJoin(users, eq3(loans.userId, users.id)).leftJoin(bookCopies, eq3(loans.copyId, bookCopies.id)).$dynamic();
    const conditions = [eq3(loans.userId, userId)];
    if (activeOnly) {
      const activeFilter = or(eq3(loans.status, "BORROWED"), eq3(loans.status, "RESERVED"));
      if (activeFilter) {
        conditions.push(activeFilter);
      }
    }
    query = query.where(and2(...conditions)).orderBy(sql3`${loans.borrowDate} DESC`);
    const rows = await query;
    return rows.map((r) => this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation));
  }
  async findAllLoans(limit = 100) {
    await this.autoExpireDigitalLoans();
    await this.autoExpireReservations();
    const rows = await db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    }).from(loans).innerJoin(books, eq3(loans.bookId, books.id)).innerJoin(users, eq3(loans.userId, users.id)).leftJoin(bookCopies, eq3(loans.copyId, bookCopies.id)).orderBy(sql3`${loans.borrowDate} DESC`).limit(limit);
    return rows.map((r) => this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation));
  }
  async findAllReservations(activeOnly = true) {
    await this.autoExpireReservations();
    let query = db.select({
      loan: loans,
      bookTitle: books.title,
      bookCover: books.coverUrl,
      shelfLocation: books.shelfLocation,
      userName: users.name,
      userIdentity: users.identityNumber,
      copyBarcode: bookCopies.barcode
    }).from(loans).innerJoin(books, eq3(loans.bookId, books.id)).innerJoin(users, eq3(loans.userId, users.id)).leftJoin(bookCopies, eq3(loans.copyId, bookCopies.id)).$dynamic();
    if (activeOnly) {
      query = query.where(eq3(loans.status, "RESERVED"));
    }
    query = query.orderBy(sql3`${loans.createdAt} DESC`);
    const rows = await query;
    return rows.map((r) => this.mapToDomain(r.loan, r.bookTitle, r.bookCover, r.userName, r.userIdentity, r.copyBarcode, r.shelfLocation));
  }
  async create(data) {
    const inserted = await db.insert(loans).values({
      userId: data.userId,
      bookId: data.bookId,
      copyId: data.copyId || null,
      loanType: data.loanType,
      dueDate: data.dueDate,
      status: "BORROWED",
      fineAmount: 0,
      isFinePaid: false
    }).returning();
    const raw = inserted[0];
    const b = await db.select().from(books).where(eq3(books.id, raw.bookId)).limit(1);
    const u = await db.select().from(users).where(eq3(users.id, raw.userId)).limit(1);
    const c = raw.copyId ? await db.select().from(bookCopies).where(eq3(bookCopies.id, raw.copyId)).limit(1) : [];
    return this.mapToDomain(raw, b[0]?.title, b[0]?.coverUrl, u[0]?.name, u[0]?.identityNumber, c[0]?.barcode, b[0]?.shelfLocation);
  }
  async createReservation(data) {
    const inserted = await db.insert(loans).values({
      userId: data.userId,
      bookId: data.bookId,
      copyId: data.copyId,
      loanType: "PHYSICAL",
      borrowDate: (/* @__PURE__ */ new Date()).toISOString(),
      dueDate: data.reservedUntil,
      // default temporary date
      status: "RESERVED",
      fineAmount: 0,
      isFinePaid: false,
      reservationCode: data.reservationCode,
      reservedUntil: data.reservedUntil
    }).returning();
    const raw = inserted[0];
    const b = await db.select().from(books).where(eq3(books.id, raw.bookId)).limit(1);
    const u = await db.select().from(users).where(eq3(users.id, raw.userId)).limit(1);
    const c = await db.select().from(bookCopies).where(eq3(bookCopies.id, data.copyId)).limit(1);
    return this.mapToDomain(raw, b[0]?.title, b[0]?.coverUrl, u[0]?.name, u[0]?.identityNumber, c[0]?.barcode, b[0]?.shelfLocation);
  }
  async updateClaimReservation(loanId, borrowDate, dueDate) {
    const res = await db.update(loans).set({
      status: "BORROWED",
      borrowDate,
      dueDate
    }).where(
      and2(
        eq3(loans.id, loanId),
        eq3(loans.status, "RESERVED")
      )
    );
    return res.changes ?? res.rowsAffected ?? 0;
  }
  async updateCancelReservation(loanId) {
    const res = await db.update(loans).set({
      status: "CANCELLED"
    }).where(
      and2(
        eq3(loans.id, loanId),
        eq3(loans.status, "RESERVED")
      )
    );
    return res.changes ?? res.rowsAffected ?? 0;
  }
  async updateReturn(loanId, returnDate, fineAmount, isFinePaid) {
    const res = await db.update(loans).set({
      returnDate,
      status: "RETURNED",
      fineAmount,
      isFinePaid
    }).where(
      and2(
        eq3(loans.id, loanId),
        eq3(loans.status, "BORROWED")
      )
    );
    return res.changes ?? res.rowsAffected ?? 0;
  }
  async updateSettleFine(loanId) {
    const res = await db.update(loans).set({ isFinePaid: true }).where(
      and2(
        eq3(loans.id, loanId),
        eq3(loans.isFinePaid, false)
      )
    );
    return res.changes ?? res.rowsAffected ?? 0;
  }
  /**
   * Perpanjangan masa pinjam fisik 1x (BRD 3.3 Rule 3)
   */
  async updateRenewLoan(loanId, newDueDate) {
    const res = await db.update(loans).set({
      dueDate: newDueDate,
      isRenewed: true
    }).where(
      and2(
        eq3(loans.id, loanId),
        eq3(loans.isRenewed, false),
        eq3(loans.status, "BORROWED")
      )
    );
    return res.changes ?? res.rowsAffected ?? 0;
  }
  /**
   * Memeriksa penangguhan sirkulasi pemustaka karena denda tertunggak atau keterlambatan buku fisik (BRD 3.3 Negative Flow)
   */
  async checkUserCirculationSuspension(userId) {
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    const overdueRows = await db.select({ id: loans.id, bookTitle: books.title, dueDate: loans.dueDate }).from(loans).innerJoin(books, eq3(loans.bookId, books.id)).where(
      and2(
        eq3(loans.userId, userId),
        eq3(loans.loanType, "PHYSICAL"),
        eq3(loans.status, "BORROWED"),
        sql3`${loans.dueDate} < ${nowIso}`
      )
    );
    const unpaidFineRows = await db.select({ id: loans.id, fineAmount: loans.fineAmount }).from(loans).where(
      and2(
        eq3(loans.userId, userId),
        eq3(loans.isFinePaid, false),
        sql3`${loans.fineAmount} > 0`
      )
    );
    const overdueCount = overdueRows.length;
    const unpaidFineAmount = unpaidFineRows.reduce((sum, r) => sum + (r.fineAmount || 0), 0);
    if (overdueCount > 0) {
      return {
        isSuspended: true,
        reason: `Anggota memiliki ${overdueCount} buku yang belum dikembalikan dan telah melewati jatuh tempo. Harap kembalikan buku terlebih dahulu.`,
        overdueCount,
        unpaidFineAmount
      };
    }
    if (unpaidFineAmount > 0) {
      return {
        isSuspended: true,
        reason: `Anggota memiliki penangguhan sirkulasi (Denda tertunggak: Rp ${unpaidFineAmount.toLocaleString("id-ID")}). Harap lunasi denda di meja sirkulasi.`,
        overdueCount,
        unpaidFineAmount
      };
    }
    return {
      isSuspended: false,
      overdueCount: 0,
      unpaidFineAmount: 0
    };
  }
  mapToDomain(raw, bookTitle, bookCover, userName, userIdentity, copyBarcode, shelfLocation) {
    return {
      id: raw.id,
      userId: raw.userId,
      userName,
      userIdentity,
      bookId: raw.bookId,
      bookTitle,
      bookCover,
      shelfLocation,
      copyId: raw.copyId,
      copyBarcode,
      loanType: raw.loanType,
      borrowDate: raw.borrowDate,
      dueDate: raw.dueDate,
      returnDate: raw.returnDate,
      status: raw.status,
      fineAmount: raw.fineAmount,
      isFinePaid: raw.isFinePaid,
      isRenewed: Boolean(raw.isRenewed),
      reservationCode: raw.reservationCode,
      reservedUntil: raw.reservedUntil
    };
  }
};
var loanRepository = new LoanRepository();

// src/server/services/circulation.service.ts
var CirculationService = class {
  constructor(loanRepo = loanRepository, bookRepo = bookRepository, userRepo = userRepository) {
    this.loanRepo = loanRepo;
    this.bookRepo = bookRepo;
    this.userRepo = userRepo;
  }
  /**
   * Validasi Hak Akses Streaming Dokumen E-Book Digital (BRD Seksi 3.2 & AC-2.2)
   */
  async hasActiveDigitalAccess(user, bookId) {
    if (user.role === "LIBRARIAN" || user.role === "ADMIN") {
      return true;
    }
    const activeLoan = await this.loanRepo.findActiveLoan(user.id, bookId, "DIGITAL");
    return Boolean(activeLoan);
  }
  /**
   * Peminjaman Mandiri E-Book Digital oleh Pengguna (Siswa/Guru)
   */
  async borrowDigitalBook(user, bookId) {
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new Error(`Buku dengan ID ${bookId} tidak ditemukan.`);
    }
    if (book.bookType === "PHYSICAL_ONLY" || !book.ebookFilePath) {
      throw new Error("Buku ini tidak tersedia dalam format digital e-book.");
    }
    const existing = await this.loanRepo.findActiveLoan(user.id, bookId, "DIGITAL");
    if (existing) {
      throw new Error('Anda sudah meminjam e-book ini. Silakan buka di menu "Rak Buku Saya".');
    }
    const suspension = await this.loanRepo.checkUserCirculationSuspension(user.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }
    const limit = user.role === "TEACHER" ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const currentActiveCount = await this.loanRepo.countActiveUserLoans(user.id, "DIGITAL");
    if (currentActiveCount >= limit) {
      throw new Error(`Batas maksimal peminjaman e-book (${limit} buku) tercapai. Harap kembalikan buku terlebih dahulu.`);
    }
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const activeDigitalBorrows = await this.loanRepo.countActiveDigitalLoansForBook(bookId);
      if (activeDigitalBorrows >= book.digitalLicenseCount) {
        throw new Error("Seluruh lisensi digital buku ini sedang dipinjam siswa lain. Silakan coba kembali nanti.");
      }
      const loanDays = user.role === "TEACHER" ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
      const dueDate = /* @__PURE__ */ new Date();
      dueDate.setDate(dueDate.getDate() + loanDays);
      dueDate.setHours(23, 59, 59, 999);
      const createdLoan = await this.loanRepo.create({
        userId: user.id,
        bookId: book.id,
        copyId: null,
        loanType: "DIGITAL",
        dueDate: dueDate.toISOString()
      });
      sqlite.exec("COMMIT");
      return createdLoan;
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
  /**
   * Pengembalian E-Book Digital
   */
  async returnDigitalBook(user, bookId) {
    const loan = await this.loanRepo.findActiveLoan(user.id, bookId, "DIGITAL");
    if (!loan) {
      throw new Error("Tidak ditemukan peminjaman aktif untuk e-book ini.");
    }
    const changes = await this.loanRepo.updateReturn(loan.id, (/* @__PURE__ */ new Date()).toISOString(), 0, true);
    if (changes === 0) {
      throw new Error("E-book ini sudah dikembalikan atau tidak dalam status pinjaman aktif.");
    }
  }
  /**
   * Peminjaman Buku Fisik Mandiri (Self-Service Checkout) langsung oleh Pemustaka
   * Mendukung peminjaman via ID Buku maupun langsung via hasil Scan QR / Barcode eksemplar.
   */
  async borrowPhysicalBookSelf(user, bookId, copyBarcode) {
    if (!user.isActive) {
      throw new Error("Akun Anda sedang dinonaktifkan.");
    }
    const cleanBarcode = copyBarcode ? copyBarcode.replace(/^PUSTAKA:(COPY|BOOK):/i, "").trim() : void 0;
    let resolvedBookId = bookId;
    if (!resolvedBookId && cleanBarcode) {
      const scannedCopy = await this.bookRepo.findCopyByBarcode(cleanBarcode);
      if (!scannedCopy) {
        throw new Error(`Kode QR / Barcode eksemplar "${cleanBarcode}" tidak ditemukan di database perpustakaan.`);
      }
      resolvedBookId = scannedCopy.bookId;
    }
    if (!resolvedBookId) {
      throw new Error("ID Buku atau Kode QR/Barcode eksemplar wajib disertakan.");
    }
    const bookIdNum = resolvedBookId;
    const book = await this.bookRepo.findById(bookIdNum);
    if (!book) {
      throw new Error(`Buku dengan ID ${bookIdNum} tidak ditemukan.`);
    }
    if (book.bookType === "DIGITAL_ONLY") {
      throw new Error("Buku ini hanya tersedia dalam format digital e-book.");
    }
    const existingLoan = await this.loanRepo.findActiveLoan(user.id, bookIdNum, "PHYSICAL");
    if (existingLoan) {
      throw new Error('Anda sudah meminjam buku fisik ini. Silakan cek di menu "Rak Buku Saya".');
    }
    const suspension = await this.loanRepo.checkUserCirculationSuspension(user.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }
    const existingRes = await this.loanRepo.findActiveReservation(user.id, bookIdNum);
    const loanDays = user.role === "TEACHER" ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const dueDate = /* @__PURE__ */ new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    dueDate.setHours(23, 59, 59, 999);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    if (existingRes) {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const claimChanges = await this.loanRepo.updateClaimReservation(existingRes.id, nowIso, dueDate.toISOString());
        if (claimChanges === 0) {
          throw new Error("Tiket reservasi sudah diklaim atau sudah tidak aktif.");
        }
        if (existingRes.copyId) {
          await this.bookRepo.updateCopyStatus(existingRes.copyId, "BORROWED", "RESERVED");
        }
        sqlite.exec("COMMIT");
        return {
          ...existingRes,
          borrowDate: nowIso,
          dueDate: dueDate.toISOString(),
          status: "BORROWED"
        };
      } catch (err) {
        sqlite.exec("ROLLBACK");
        throw err;
      }
    }
    const limit = user.role === "TEACHER" ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const activeLoansCount = await this.loanRepo.countActiveUserPhysicalLoansAndReservations(user.id);
    if (activeLoansCount >= limit) {
      throw new Error(`Batas maksimal peminjaman buku fisik (${limit} buku) tercapai. Kembalikan buku fisik yang sedang dipinjam terlebih dahulu.`);
    }
    let targetCopy = null;
    if (cleanBarcode) {
      const byBarcode = await this.bookRepo.findCopyByBarcode(cleanBarcode);
      if (!byBarcode || byBarcode.bookId !== bookIdNum) {
        throw new Error(`Barcode eksemplar ${cleanBarcode} tidak sesuai dengan buku ini.`);
      }
      if (byBarcode.status !== "AVAILABLE") {
        throw new Error(`Eksemplar ${cleanBarcode} sedang tidak tersedia (${byBarcode.status}).`);
      }
      targetCopy = byBarcode;
    } else {
      targetCopy = await this.bookRepo.findFirstAvailableCopy(bookIdNum);
    }
    if (!targetCopy || book.availablePhysicalCopies <= 0) {
      throw new Error("Seluruh eksemplar fisik buku ini sedang dipinjam. Silakan coba kembali nanti.");
    }
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const copyChanges = await this.bookRepo.updateCopyStatus(targetCopy.id, "BORROWED", "AVAILABLE");
      if (copyChanges === 0) {
        throw new Error("Eksemplar fisik ini baru saja dipinjam atau tidak lagi tersedia.");
      }
      await this.bookRepo.updateAvailableCopies(book.id, -1);
      const createdLoan = await this.loanRepo.create({
        userId: user.id,
        bookId: book.id,
        copyId: targetCopy.id,
        loanType: "PHYSICAL",
        dueDate: dueDate.toISOString()
      });
      sqlite.exec("COMMIT");
      return createdLoan;
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
  /**
   * Pengembalian Buku Fisik Instan (Saat Itu Juga) oleh Peminjam atau Staf
   * Tidak mengharuskan masa pinjam habis terlebih dahulu.
   */
  async returnPhysicalBookSelf(actorUser, loanId) {
    const activeLoan = await this.loanRepo.findById(loanId);
    if (!activeLoan) {
      throw new Error("Data peminjaman buku fisik tidak ditemukan.");
    }
    if (activeLoan.loanType !== "PHYSICAL") {
      throw new Error("Transaksi ini bukan peminjaman buku fisik.");
    }
    if (activeLoan.status !== "BORROWED") {
      throw new Error(`Buku ini sudah berstatus ${activeLoan.status}.`);
    }
    const isStaff = actorUser.role === "LIBRARIAN" || actorUser.role === "ADMIN";
    if (!isStaff && activeLoan.userId !== actorUser.id) {
      throw new Error("Anda tidak memiliki wewenang untuk mengembalikan pinjaman milik pengguna lain.");
    }
    const now = /* @__PURE__ */ new Date();
    const dueDate = new Date(activeLoan.dueDate);
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const diffTime = nowDateOnly.getTime() - dueDateOnly.getTime();
    const overdueDays = diffTime > 0 ? Math.round(diffTime / (1e3 * 60 * 60 * 24)) : 0;
    const fineAmount = overdueDays * config.DAILY_FINE_AMOUNT;
    const isFinePaid = fineAmount === 0 || isStaff;
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const returnChanges = await this.loanRepo.updateReturn(activeLoan.id, now.toISOString(), fineAmount, isFinePaid);
      if (returnChanges === 0) {
        throw new Error("Buku fisik ini sudah dikembalikan atau tidak dalam status pinjaman aktif.");
      }
      if (activeLoan.copyId) {
        await this.bookRepo.updateCopyStatus(activeLoan.copyId, "AVAILABLE", "BORROWED");
      }
      await this.bookRepo.updateAvailableCopies(activeLoan.bookId, 1);
      sqlite.exec("COMMIT");
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
    let message = "Buku fisik berhasil dikembalikan tepat waktu.";
    if (overdueDays > 0) {
      message = `Buku dikembalikan dengan keterlambatan ${overdueDays} hari. Denda: Rp ${fineAmount.toLocaleString("id-ID")}.`;
    }
    return {
      loan: {
        ...activeLoan,
        returnDate: now.toISOString(),
        status: "RETURNED",
        fineAmount,
        isFinePaid
      },
      overdueDays,
      fineAmount,
      message
    };
  }
  /**
   * Peminjaman Buku Fisik di Meja Sirkulasi Pustakawan
   */
  async checkOutPhysicalBook(librarianUser, userIdentity, copyBarcode) {
    if (librarianUser.role !== "LIBRARIAN" && librarianUser.role !== "ADMIN") {
      throw new Error("Hanya pustakawan atau admin yang berwenang memproses peminjaman buku fisik.");
    }
    const borrower = await this.userRepo.findByIdentityNumber(userIdentity);
    if (!borrower) {
      throw new Error(`Anggota dengan identitas ${userIdentity} tidak ditemukan.`);
    }
    if (!borrower.isActive) {
      throw new Error("Akun anggota ini sedang dinonaktifkan.");
    }
    const suspension = await this.loanRepo.checkUserCirculationSuspension(borrower.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }
    const copyData = await this.bookRepo.findCopyByBarcode(copyBarcode);
    if (!copyData) {
      throw new Error(`Eksemplar buku dengan barcode ${copyBarcode} tidak terdaftar.`);
    }
    if (copyData.status !== "AVAILABLE") {
      throw new Error(`Eksemplar buku ini berstatus ${copyData.status} (tidak tersedia untuk dipinjam).`);
    }
    const limit = borrower.role === "TEACHER" ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const activeLoans = await this.loanRepo.countActiveUserPhysicalLoansAndReservations(borrower.id);
    if (activeLoans >= limit) {
      throw new Error(`Anggota telah mencapai batas peminjaman fisik (${limit} buku).`);
    }
    const loanDays = borrower.role === "TEACHER" ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const dueDate = /* @__PURE__ */ new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    dueDate.setHours(23, 59, 59, 999);
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const copyChanges = await this.bookRepo.updateCopyStatus(copyData.id, "BORROWED", "AVAILABLE");
      if (copyChanges === 0) {
        throw new Error("Eksemplar buku ini baru saja dipinjam atau tidak lagi tersedia.");
      }
      await this.bookRepo.updateAvailableCopies(copyData.bookId, -1);
      const createdLoan = await this.loanRepo.create({
        userId: borrower.id,
        bookId: copyData.bookId,
        copyId: copyData.id,
        loanType: "PHYSICAL",
        dueDate: dueDate.toISOString()
      });
      sqlite.exec("COMMIT");
      return createdLoan;
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
  /**
   * Pengembalian Buku Fisik & Kalkulasi Denda Otomatis
   */
  async returnPhysicalBook(librarianUser, copyBarcode, finePaid = false) {
    if (librarianUser.role !== "LIBRARIAN" && librarianUser.role !== "ADMIN") {
      throw new Error("Hanya pustakawan atau admin yang berwenang memproses pengembalian buku fisik.");
    }
    const copyData = await this.bookRepo.findCopyByBarcode(copyBarcode);
    if (!copyData) {
      throw new Error(`Eksemplar buku dengan barcode ${copyBarcode} tidak ditemukan.`);
    }
    const activeLoan = await this.loanRepo.findActivePhysicalLoanByCopyId(copyData.id);
    if (!activeLoan) {
      throw new Error(`Tidak ada transaksi peminjaman aktif untuk eksemplar ${copyBarcode}.`);
    }
    const now = /* @__PURE__ */ new Date();
    const dueDate = new Date(activeLoan.dueDate);
    const nowDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dueDateOnly = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
    const diffTime = nowDateOnly.getTime() - dueDateOnly.getTime();
    const overdueDays = diffTime > 0 ? Math.round(diffTime / (1e3 * 60 * 60 * 24)) : 0;
    const fineAmount = overdueDays * config.DAILY_FINE_AMOUNT;
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const returnChanges = await this.loanRepo.updateReturn(activeLoan.id, now.toISOString(), fineAmount, finePaid || fineAmount === 0);
      if (returnChanges === 0) {
        throw new Error("Buku fisik ini sudah dikembalikan atau tidak dalam status pinjaman aktif.");
      }
      await this.bookRepo.updateCopyStatus(copyData.id, "AVAILABLE", "BORROWED");
      await this.bookRepo.updateAvailableCopies(copyData.bookId, 1);
      sqlite.exec("COMMIT");
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
    let message = "Buku fisik berhasil dikembalikan tepat waktu.";
    if (overdueDays > 0) {
      message = `Buku terlambat ${overdueDays} hari. Denda tercatat: Rp ${fineAmount.toLocaleString("id-ID")}.`;
    }
    return {
      loan: {
        ...activeLoan,
        returnDate: now.toISOString(),
        status: "RETURNED",
        fineAmount,
        isFinePaid: finePaid || fineAmount === 0
      },
      overdueDays,
      fineAmount,
      message
    };
  }
  async getUserLoans(userId, activeOnly = false) {
    return this.loanRepo.findUserLoans(userId, activeOnly);
  }
  async getAllCirculationLoans(limit = 100) {
    return this.loanRepo.findAllLoans(limit);
  }
  /**
   * 7. Reservasi Mandiri Buku Fisik oleh Pengguna (Siswa/Guru)
   */
  async reservePhysicalBook(user, bookId) {
    const book = await this.bookRepo.findById(bookId);
    if (!book) {
      throw new Error(`Buku dengan ID ${bookId} tidak ditemukan.`);
    }
    if (book.bookType === "DIGITAL_ONLY") {
      throw new Error("Buku ini hanya tersedia dalam format digital e-book dan tidak dapat direservasi secara fisik.");
    }
    const existingLoan = await this.loanRepo.findActiveLoan(user.id, bookId, "PHYSICAL");
    if (existingLoan) {
      throw new Error("Anda sedang meminjam buku fisik ini. Kembalikan terlebih dahulu sebelum meminjam kembali.");
    }
    const existingRes = await this.loanRepo.findActiveReservation(user.id, bookId);
    if (existingRes) {
      throw new Error(`Anda sudah memiliki tiket reservasi aktif untuk buku ini (Kode: ${existingRes.reservationCode}).`);
    }
    const limit = user.role === "TEACHER" ? config.TEACHER_LOAN_LIMIT : config.STUDENT_LOAN_LIMIT;
    const currentActiveCount = await this.loanRepo.countActiveUserPhysicalLoansAndReservations(user.id);
    if (currentActiveCount >= limit) {
      throw new Error(`Batas maksimal sirkulasi fisik (${limit} buku) tercapai. Anda tidak dapat membuat reservasi baru.`);
    }
    const suspension = await this.loanRepo.checkUserCirculationSuspension(user.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }
    const availableCopy = await this.bookRepo.findFirstAvailableCopy(bookId);
    if (!availableCopy || book.availablePhysicalCopies <= 0) {
      throw new Error("Seluruh eksemplar fisik buku ini sedang dipinjam atau direservasi oleh siswa lain.");
    }
    const reservationCode = `RSV-${Date.now().toString(36).toUpperCase()}-${Math.floor(1e3 + Math.random() * 9e3)}`;
    const reservedUntil = new Date(Date.now() + 24 * 60 * 60 * 1e3);
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const copyChanges = await this.bookRepo.updateCopyStatus(availableCopy.id, "RESERVED", "AVAILABLE");
      if (copyChanges === 0) {
        throw new Error("Eksemplar fisik ini baru saja direservasi atau dipinjam oleh pemustaka lain.");
      }
      await this.bookRepo.updateAvailableCopies(book.id, -1);
      const reservation = await this.loanRepo.createReservation({
        userId: user.id,
        bookId: book.id,
        copyId: availableCopy.id,
        reservationCode,
        reservedUntil: reservedUntil.toISOString()
      });
      sqlite.exec("COMMIT");
      return reservation;
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
  /**
   * 8. Klaim & Serah Terima Buku Fisik di Meja Pustakawan Berdasarkan Kode Reservasi
   */
  async claimPhysicalReservation(librarianUser, reservationCode) {
    if (librarianUser.role !== "LIBRARIAN" && librarianUser.role !== "ADMIN") {
      throw new Error("Hanya pustakawan atau admin yang berwenang memproses serah terima reservasi fisik.");
    }
    const reservation = await this.loanRepo.findReservationByCode(reservationCode.trim().toUpperCase());
    if (!reservation) {
      throw new Error(`Tiket reservasi dengan kode "${reservationCode}" tidak ditemukan atau sudah tidak aktif.`);
    }
    if (reservation.status !== "RESERVED") {
      throw new Error(`Status reservasi ini sudah ${reservation.status}.`);
    }
    if (reservation.reservedUntil && new Date(reservation.reservedUntil) < /* @__PURE__ */ new Date()) {
      throw new Error("Batas waktu pengambilan untuk tiket reservasi ini telah kedaluwarsa.");
    }
    const borrower = await this.userRepo.findById(reservation.userId);
    if (!borrower) {
      throw new Error("Data peminjam untuk tiket reservasi ini tidak ditemukan.");
    }
    if (!borrower.isActive) {
      throw new Error("Akun peminjam tiket reservasi ini sedang dinonaktifkan.");
    }
    const suspension = await this.loanRepo.checkUserCirculationSuspension(borrower.id);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }
    const loanDays = borrower.role === "TEACHER" ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const dueDate = /* @__PURE__ */ new Date();
    dueDate.setDate(dueDate.getDate() + loanDays);
    dueDate.setHours(23, 59, 59, 999);
    const nowIso = (/* @__PURE__ */ new Date()).toISOString();
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const claimChanges = await this.loanRepo.updateClaimReservation(reservation.id, nowIso, dueDate.toISOString());
      if (claimChanges === 0) {
        throw new Error("Tiket reservasi sudah diklaim atau sudah tidak aktif.");
      }
      if (reservation.copyId) {
        await this.bookRepo.updateCopyStatus(reservation.copyId, "BORROWED", "RESERVED");
      }
      sqlite.exec("COMMIT");
      return {
        ...reservation,
        borrowDate: nowIso,
        dueDate: dueDate.toISOString(),
        status: "BORROWED"
      };
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
  /**
   * 9. Pembatalan Tiket Reservasi Fisik (oleh Siswa Pemilik atau Pustakawan)
   */
  async cancelPhysicalReservation(actorUser, loanId) {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan || loan.status !== "RESERVED") {
      throw new Error("Tiket reservasi tidak ditemukan atau sudah tidak aktif.");
    }
    if (actorUser.role !== "LIBRARIAN" && actorUser.role !== "ADMIN" && loan.userId !== actorUser.id) {
      throw new Error("Anda tidak memiliki wewenang untuk membatalkan reservasi ini.");
    }
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const changes = await this.loanRepo.updateCancelReservation(loan.id);
      if (changes === 0) {
        throw new Error("Tiket reservasi sudah tidak aktif atau telah dibatalkan.");
      }
      if (loan.copyId) {
        await this.bookRepo.updateCopyStatus(loan.copyId, "AVAILABLE", "RESERVED");
      }
      await this.bookRepo.updateAvailableCopies(loan.bookId, 1);
      sqlite.exec("COMMIT");
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
  /**
   * 10. Daftar Seluruh Tiket Reservasi Aktif untuk Meja Pustakawan
   */
  async getAllReservations(activeOnly = true) {
    return this.loanRepo.findAllReservations(activeOnly);
  }
  /**
   * 11. Perpanjangan Masa Pinjam Buku Fisik 1 Kali (BRD Seksi 3.3 Aturan 3)
   */
  async renewPhysicalLoan(user, loanId) {
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) {
      throw new Error("Data peminjaman tidak ditemukan.");
    }
    if (loan.loanType !== "PHYSICAL") {
      throw new Error("Hanya peminjaman buku fisik yang dapat diperpanjang.");
    }
    if (loan.status !== "BORROWED") {
      throw new Error(`Peminjaman ini sudah berstatus ${loan.status} dan tidak dapat diperpanjang.`);
    }
    if (user.role !== "LIBRARIAN" && user.role !== "ADMIN" && loan.userId !== user.id) {
      throw new Error("Anda tidak memiliki wewenang untuk memperpanjang peminjaman ini.");
    }
    const suspension = await this.loanRepo.checkUserCirculationSuspension(loan.userId);
    if (suspension.isSuspended) {
      throw new Error(suspension.reason);
    }
    if (loan.isRenewed) {
      throw new Error("Buku ini sudah pernah diperpanjang 1 kali. Perpanjangan kedua tidak diizinkan sesuai aturan perpustakaan.");
    }
    const now = /* @__PURE__ */ new Date();
    const currentDueDate = new Date(loan.dueDate);
    if (now > currentDueDate) {
      throw new Error("Buku ini telah melewati batas jatuh tempo. Harap kembalikan buku ke meja sirkulasi untuk melunasi denda keterlambatan.");
    }
    const allBookReservations = await this.loanRepo.findAllReservations(true);
    const hasQueue = allBookReservations.some((r) => r.bookId === loan.bookId && r.userId !== loan.userId);
    if (hasQueue) {
      throw new Error("Buku ini tidak dapat diperpanjang karena ada antrean reservasi dari pemustaka lain.");
    }
    const borrower = await this.userRepo.findById(loan.userId);
    if (!borrower || !borrower.isActive) {
      throw new Error("Akun peminjam buku ini sedang dinonaktifkan.");
    }
    const loanDays = borrower.role === "TEACHER" ? config.TEACHER_LOAN_DAYS : config.STUDENT_LOAN_DAYS;
    const newDueDate = new Date(currentDueDate);
    newDueDate.setDate(newDueDate.getDate() + loanDays);
    newDueDate.setHours(23, 59, 59, 999);
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const changes = await this.loanRepo.updateRenewLoan(loan.id, newDueDate.toISOString());
      if (changes === 0) {
        throw new Error("Buku ini tidak dapat diperpanjang atau sudah pernah diperpanjang sebelumnya.");
      }
      sqlite.exec("COMMIT");
      return {
        ...loan,
        dueDate: newDueDate.toISOString(),
        isRenewed: true
      };
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
  /**
   * Memeriksa status penangguhan sirkulasi anggota (tunggakan denda / keterlambatan buku fisik).
   */
  async checkUserCirculationSuspension(userId) {
    return this.loanRepo.checkUserCirculationSuspension(userId);
  }
  /**
   * 12. Pelunasan Denda Tertunggak oleh Pustakawan / Admin (BRD 3.3 Fine Settlement)
   */
  async settleLoanFine(librarianUser, loanId) {
    if (librarianUser.role !== "LIBRARIAN" && librarianUser.role !== "ADMIN") {
      throw new Error("Hanya pustakawan atau admin yang berwenang memvalidasi pelunasan denda.");
    }
    const loan = await this.loanRepo.findById(loanId);
    if (!loan) {
      throw new Error(`Data transaksi peminjaman dengan ID ${loanId} tidak ditemukan.`);
    }
    if (loan.fineAmount <= 0) {
      throw new Error("Transaksi ini tidak memiliki tagihan denda.");
    }
    if (loan.isFinePaid) {
      throw new Error("Denda untuk transaksi ini sudah berstatus lunas.");
    }
    sqlite.exec("BEGIN IMMEDIATE");
    try {
      const changes = await this.loanRepo.updateSettleFine(loan.id);
      if (changes === 0) {
        throw new Error("Denda untuk transaksi ini sudah berstatus lunas atau tidak valid.");
      }
      sqlite.exec("COMMIT");
      return {
        ...loan,
        isFinePaid: true
      };
    } catch (err) {
      sqlite.exec("ROLLBACK");
      throw err;
    }
  }
};
var circulationService = new CirculationService();

// src/server/middleware/upload.middleware.ts
import multer2 from "multer";
import path3 from "path";
import fs2 from "fs";
var uploadsRoot = path3.resolve(process.cwd(), "uploads");
var ebooksDir = path3.resolve(uploadsRoot, "ebooks");
var coversDir = path3.resolve(uploadsRoot, "covers");
if (!config.isSupabaseEnabled && !process.env.VERCEL) {
  try {
    [uploadsRoot, ebooksDir, coversDir].forEach((dir) => {
      if (!fs2.existsSync(dir)) {
        fs2.mkdirSync(dir, { recursive: true });
      }
    });
  } catch (err) {
    console.warn("[Upload Directory Notice]:", err);
  }
}
var ALLOWED_COVER_EXTS = [".jpg", ".jpeg", ".png", ".webp"];
var ALLOWED_COVER_MIMES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
var storage = config.isSupabaseEnabled || Boolean(process.env.VERCEL) ? multer2.memoryStorage() : multer2.diskStorage({
  destination: (_req, file, cb) => {
    if (file.fieldname === "ebook") {
      cb(null, ebooksDir);
    } else if (file.fieldname === "cover") {
      cb(null, coversDir);
    } else {
      cb(null, uploadsRoot);
    }
  },
  filename: (_req, file, cb) => {
    const rawExt = path3.extname(file.originalname).toLowerCase();
    const sanitizedBase = path3.basename(file.originalname, rawExt).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    const safeExt = file.fieldname === "ebook" ? ".pdf" : ALLOWED_COVER_EXTS.includes(rawExt) ? rawExt : ".jpg";
    cb(null, `${file.fieldname}-${sanitizedBase}-${uniqueSuffix}${safeExt}`);
  }
});
var fileFilter = (_req, file, cb) => {
  if (file.fieldname === "ebook") {
    const isPdf = file.mimetype === "application/pdf" && file.originalname.toLowerCase().endsWith(".pdf");
    if (isPdf) {
      cb(null, true);
    } else {
      cb(new Error("Format file e-book tidak valid. Hanya berkas PDF (.pdf) dengan MIME application/pdf yang diperbolehkan."));
    }
  } else if (file.fieldname === "cover") {
    const ext = path3.extname(file.originalname).toLowerCase();
    const isImage = ALLOWED_COVER_EXTS.includes(ext) && ALLOWED_COVER_MIMES.includes(file.mimetype.toLowerCase());
    if (isImage) {
      cb(null, true);
    } else {
      cb(new Error("Format file sampul tidak valid. Hanya berkas gambar (JPG, PNG, WebP) yang diperbolehkan."));
    }
  } else {
    cb(new Error("Bidang berkas tidak dikenali."));
  }
};
var upload = multer2({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024
    // Batas maksimal 50 MB per file
  }
});
var uploadBookFiles = upload.fields([
  { name: "ebook", maxCount: 1 },
  { name: "cover", maxCount: 1 }
]);

// src/server/services/storage.service.ts
import { createClient as createClient2 } from "@supabase/supabase-js";
import WebSocket from "ws";
import fs3 from "fs";
import path4 from "path";
var StorageService = class {
  supabase = null;
  constructor() {
    if (config.isSupabaseEnabled && config.SUPABASE_URL && config.SUPABASE_SERVICE_ROLE_KEY) {
      this.supabase = createClient2(config.SUPABASE_URL, config.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
        realtime: { transport: WebSocket }
      });
    }
  }
  isCloud() {
    return this.supabase !== null;
  }
  isCloudStorage(storedPath) {
    return storedPath.startsWith("supabase://") || storedPath.startsWith("http://") || storedPath.startsWith("https://");
  }
  async saveCover(file) {
    const rawExt = path4.extname(file.originalname).toLowerCase() || ".jpg";
    const sanitizedBase = path4.basename(file.originalname, rawExt).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `cover-${sanitizedBase}-${Date.now()}-${Math.round(Math.random() * 1e6)}${rawExt}`;
    if (this.supabase) {
      const buffer = file.buffer || (file.path ? fs3.readFileSync(file.path) : null);
      if (!buffer)
        throw new Error("Buffer berkas tidak ditemukan untuk upload cover.");
      const { error } = await this.supabase.storage.from(config.SUPABASE_BUCKET_COVERS).upload(filename, buffer, {
        contentType: file.mimetype || "image/jpeg",
        upsert: true
      });
      if (error) {
        throw new Error(`Gagal mengunggah cover ke Supabase: ${error.message}`);
      }
      const { data: publicUrlData } = this.supabase.storage.from(config.SUPABASE_BUCKET_COVERS).getPublicUrl(filename);
      if (file.path && fs3.existsSync(file.path)) {
        try {
          fs3.unlinkSync(file.path);
        } catch {
        }
      }
      return publicUrlData.publicUrl;
    }
    if (file.path) {
      return `/uploads/covers/${path4.basename(file.path)}`;
    } else if (file.buffer) {
      const targetPath = path4.resolve(process.cwd(), "uploads/covers", filename);
      fs3.mkdirSync(path4.dirname(targetPath), { recursive: true });
      fs3.writeFileSync(targetPath, file.buffer);
      return `/uploads/covers/${filename}`;
    }
    throw new Error("Data file cover tidak valid.");
  }
  async saveEbook(file) {
    const rawExt = ".pdf";
    const sanitizedBase = path4.basename(file.originalname, path4.extname(file.originalname)).replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `ebook-${sanitizedBase}-${Date.now()}-${Math.round(Math.random() * 1e6)}${rawExt}`;
    if (this.supabase) {
      const buffer = file.buffer || (file.path ? fs3.readFileSync(file.path) : null);
      if (!buffer)
        throw new Error("Buffer berkas tidak ditemukan untuk upload e-book.");
      const { error } = await this.supabase.storage.from(config.SUPABASE_BUCKET_EBOOKS).upload(filename, buffer, {
        contentType: "application/pdf",
        upsert: true
      });
      if (error) {
        throw new Error(`Gagal mengunggah PDF ke Supabase: ${error.message}`);
      }
      if (file.path && fs3.existsSync(file.path)) {
        try {
          fs3.unlinkSync(file.path);
        } catch {
        }
      }
      return `supabase://${config.SUPABASE_BUCKET_EBOOKS}/${filename}`;
    }
    if (file.path) {
      return `./uploads/ebooks/${path4.basename(file.path)}`;
    } else if (file.buffer) {
      const targetPath = path4.resolve(process.cwd(), "uploads/ebooks", filename);
      fs3.mkdirSync(path4.dirname(targetPath), { recursive: true });
      fs3.writeFileSync(targetPath, file.buffer);
      return `./uploads/ebooks/${filename}`;
    }
    throw new Error("Data file e-book tidak valid.");
  }
  async getEbookData(storedPath) {
    if (storedPath.startsWith("supabase://")) {
      if (!this.supabase) {
        throw new Error("Supabase client tidak aktif untuk membaca e-book cloud.");
      }
      const parts = storedPath.replace("supabase://", "").split("/");
      const bucket = parts[0];
      const filename = parts.slice(1).join("/");
      const { data, error } = await this.supabase.storage.from(bucket).download(filename);
      if (error || !data) {
        throw new Error(`Gagal mengunduh e-book dari cloud storage: ${error?.message || "File tidak ditemukan"}`);
      }
      const arrayBuffer = await data.arrayBuffer();
      const buffer2 = Buffer.from(arrayBuffer);
      return { buffer: buffer2, size: buffer2.length };
    }
    const fullPath = path4.resolve(process.cwd(), storedPath);
    if (!fs3.existsSync(fullPath)) {
      throw new Error("File PDF tidak ditemukan di server.");
    }
    const buffer = fs3.readFileSync(fullPath);
    return { buffer, size: buffer.length };
  }
};
var storageService = new StorageService();

// src/server/controllers/book.controller.ts
import path5 from "path";
import fs4 from "fs";
var bookRouter = Router2();
bookRouter.get("/categories", async (_req, res, next) => {
  try {
    const categories2 = await bookService.listCategories();
    res.json({ success: true, data: categories2 });
  } catch (err) {
    next(err);
  }
});
bookRouter.get("/", async (req, res, next) => {
  try {
    const filters = BookFilterSchema.parse(req.query);
    const books2 = await bookService.searchBooks(filters);
    res.json({ success: true, data: books2 });
  } catch (err) {
    next(err);
  }
});
bookRouter.get("/copies/available", async (_req, res, next) => {
  try {
    const availableCopies = await bookService.getAvailableCopies();
    res.json({ success: true, data: availableCopies });
  } catch (err) {
    next(err);
  }
});
bookRouter.get("/:id", async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "ID buku harus berupa bilangan bulat positif." } });
      return;
    }
    const book = await bookService.getBookDetail(id);
    res.json({ success: true, data: book });
  } catch (err) {
    next(err);
  }
});
var cleanupUploadedFiles = (files) => {
  if (!files)
    return;
  const fileList = Array.isArray(files) ? files : Object.values(files).flat();
  for (const file of fileList) {
    try {
      if (file.path && fs4.existsSync(file.path)) {
        fs4.unlinkSync(file.path);
      }
    } catch (err) {
      console.error(`[Cleanup Warning] Gagal menghapus berkas orphan ${file.path}:`, err);
    }
  }
};
bookRouter.post("/", authenticateToken, requireRole(["LIBRARIAN", "ADMIN"]), uploadBookFiles, async (req, res, next) => {
  const files = req.files;
  try {
    const rawBody = { ...req.body };
    if (files) {
      if (files.ebook && files.ebook.length > 0) {
        rawBody.ebookFilePath = await storageService.saveEbook(files.ebook[0]);
      }
      if (files.cover && files.cover.length > 0) {
        rawBody.coverUrl = await storageService.saveCover(files.cover[0]);
      }
    }
    if (rawBody.ebookFilePath && !storageService.isCloudStorage(rawBody.ebookFilePath)) {
      const normalized = path5.normalize(rawBody.ebookFilePath).replace(/\\/g, "/");
      if (normalized.includes("..") || !normalized.startsWith("uploads/ebooks/") && !normalized.startsWith("./uploads/ebooks/")) {
        cleanupUploadedFiles(files);
        res.status(400).json({
          success: false,
          error: { code: "INVALID_FILE_PATH", message: "Jalur file e-book tidak valid atau berada di luar direktori aman." }
        });
        return;
      }
    }
    const input = CreateBookSchema.parse(rawBody);
    const newBook = await bookService.addNewBook(input);
    res.status(201).json({
      success: true,
      message: "Buku berhasil ditambahkan ke katalog perpustakaan.",
      data: newBook
    });
  } catch (err) {
    cleanupUploadedFiles(files);
    next(err);
  }
});
bookRouter.get("/:id/stream-pdf", authenticateToken, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ success: false, error: { code: "INVALID_ID", message: "ID buku harus berupa bilangan bulat positif." } });
      return;
    }
    const book = await bookService.getBookDetail(id);
    const hasAccess = await circulationService.hasActiveDigitalAccess(req.user, id);
    if (!hasAccess) {
      res.status(403).json({
        success: false,
        error: {
          code: "FORBIDDEN",
          message: "Anda belum meminjam e-book ini atau masa peminjaman telah berakhir."
        }
      });
      return;
    }
    if (!book.ebookFilePath) {
      res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "File PDF tidak tersedia untuk buku ini." } });
      return;
    }
    if (storageService.isCloudStorage(book.ebookFilePath)) {
      try {
        const { buffer, size } = await storageService.getEbookData(book.ebookFilePath);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", 'inline; filename="document.pdf"');
        res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
        res.setHeader("Content-Length", size);
        res.send(buffer);
        return;
      } catch (err) {
        res.status(404).json({ success: false, error: { code: "FILE_NOT_FOUND", message: err.message || "File dokumen e-book tidak ditemukan di cloud storage." } });
        return;
      }
    }
    const ebooksBaseDir = path5.resolve(process.cwd(), "uploads/ebooks");
    const fullPath = path5.resolve(process.cwd(), book.ebookFilePath);
    if (!fullPath.startsWith(ebooksBaseDir) || !fullPath.toLowerCase().endsWith(".pdf")) {
      res.status(403).json({ success: false, error: { code: "FORBIDDEN_PATH", message: "Akses ke jalur berkas ini ditolak demi keamanan sistem." } });
      return;
    }
    if (!fs4.existsSync(fullPath)) {
      res.status(404).json({ success: false, error: { code: "FILE_NOT_FOUND", message: "File dokumen e-book tidak ditemukan di server." } });
      return;
    }
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="document.pdf"');
    res.setHeader("Cache-Control", "private, max-age=0, must-revalidate");
    res.setHeader("Content-Length", fs4.statSync(fullPath).size);
    const stream = fs4.createReadStream(fullPath);
    stream.on("error", () => {
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          error: { code: "STREAM_ERROR", message: "Gagal membaca berkas e-book dari server." }
        });
      } else {
        res.destroy();
      }
    });
    res.on("close", () => {
      stream.destroy();
    });
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

// src/server/controllers/circulation.controller.ts
import { Router as Router3 } from "express";
var circulationRouter = Router3();
circulationRouter.post("/digital/borrow", authenticateToken, async (req, res, next) => {
  try {
    const input = DigitalLoanSchema.parse(req.body);
    const loan = await circulationService.borrowDigitalBook(req.user, input.bookId);
    res.status(201).json({
      success: true,
      message: "E-book berhasil dipinjam. Anda dapat membacanya langsung di aplikasi.",
      data: loan
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/digital/return", authenticateToken, async (req, res, next) => {
  try {
    const input = DigitalLoanSchema.parse(req.body);
    await circulationService.returnDigitalBook(req.user, input.bookId);
    res.json({
      success: true,
      message: "E-book berhasil dikembalikan."
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.get("/my-loans", authenticateToken, async (req, res, next) => {
  try {
    const activeOnly = req.query.active === "true";
    const loans2 = await circulationService.getUserLoans(req.user.id, activeOnly);
    res.json({
      success: true,
      data: loans2
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/physical/borrow-self", authenticateToken, async (req, res, next) => {
  try {
    const input = BorrowPhysicalSelfSchema.parse(req.body);
    const loan = await circulationService.borrowPhysicalBookSelf(req.user, input.bookId, input.copyBarcode);
    res.status(201).json({
      success: true,
      message: `Buku fisik berhasil dipinjam (Barcode: ${loan.copyBarcode || "-"}).`,
      data: loan
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/physical/return-self", authenticateToken, async (req, res, next) => {
  try {
    const input = ReturnPhysicalSelfSchema.parse(req.body);
    const result = await circulationService.returnPhysicalBookSelf(req.user, input.loanId);
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/physical/checkout", authenticateToken, requireRole(["LIBRARIAN", "ADMIN"]), async (req, res, next) => {
  try {
    const input = PhysicalLoanSchema.parse(req.body);
    const loan = await circulationService.checkOutPhysicalBook(req.user, input.userIdentity, input.copyBarcode);
    res.status(201).json({
      success: true,
      message: "Peminjaman buku fisik berhasil dicatat.",
      data: loan
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/physical/return", authenticateToken, requireRole(["LIBRARIAN", "ADMIN"]), async (req, res, next) => {
  try {
    const input = ReturnPhysicalLoanSchema.parse(req.body);
    const result = await circulationService.returnPhysicalBook(req.user, input.copyBarcode, input.finePaid);
    res.json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.get("/all", authenticateToken, requireRole(["LIBRARIAN", "ADMIN"]), async (req, res, next) => {
  try {
    const rawLimit = req.query.limit ? Number(req.query.limit) : 100;
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 500) : 100;
    const loans2 = await circulationService.getAllCirculationLoans(limit);
    res.json({
      success: true,
      data: loans2
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/physical/reserve", authenticateToken, async (req, res, next) => {
  try {
    const input = ReservePhysicalLoanSchema.parse(req.body);
    const reservation = await circulationService.reservePhysicalBook(req.user, input.bookId);
    res.status(201).json({
      success: true,
      message: `Buku berhasil direservasi. Kode tiket Anda: ${reservation.reservationCode}. Tunjukkan ke pustakawan dalam waktu 24 jam.`,
      data: reservation
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/physical/claim", authenticateToken, requireRole(["LIBRARIAN", "ADMIN"]), async (req, res, next) => {
  try {
    const input = ClaimReservationSchema.parse(req.body);
    const loan = await circulationService.claimPhysicalReservation(req.user, input.reservationCode);
    res.json({
      success: true,
      message: `Klaim tiket reservasi ${input.reservationCode} berhasil. Peminjaman fisik telah dicatat.`,
      data: loan
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/physical/cancel-reserve", authenticateToken, async (req, res, next) => {
  try {
    const input = CancelReservationSchema.parse(req.body);
    await circulationService.cancelPhysicalReservation(req.user, input.loanId);
    res.json({
      success: true,
      message: "Tiket reservasi berhasil dibatalkan dan stok eksemplar telah dipulihkan."
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.get("/reservations", authenticateToken, requireRole(["LIBRARIAN", "ADMIN"]), async (req, res, next) => {
  try {
    const activeOnly = req.query.active !== "false";
    const reservations = await circulationService.getAllReservations(activeOnly);
    res.json({
      success: true,
      data: reservations
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/physical/renew", authenticateToken, async (req, res, next) => {
  try {
    const input = RenewLoanSchema.parse(req.body);
    const renewedLoan = await circulationService.renewPhysicalLoan(req.user, input.loanId);
    res.json({
      success: true,
      message: "Masa pinjam buku fisik berhasil diperpanjang 1 kali.",
      data: renewedLoan
    });
  } catch (err) {
    next(err);
  }
});
circulationRouter.post("/fines/settle", authenticateToken, requireRole(["LIBRARIAN", "ADMIN"]), async (req, res, next) => {
  try {
    const input = SettleFineSchema.parse(req.body);
    const settledLoan = await circulationService.settleLoanFine(req.user, input.loanId);
    res.json({
      success: true,
      message: `Denda sebesar Rp ${settledLoan.fineAmount.toLocaleString("id-ID")} untuk peminjam "${settledLoan.userName || settledLoan.userIdentity}" telah berhasil dilunasi.`,
      data: settledLoan
    });
  } catch (err) {
    next(err);
  }
});

// src/server/middleware/error.middleware.ts
import { ZodError } from "zod";
var errorHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Validation Warning]:", err.flatten());
    }
    res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Payload request tidak valid.",
        details: err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message
        }))
      }
    });
    return;
  }
  if (err instanceof Error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Domain Warning]:", err.message);
    }
    res.status(400).json({
      success: false,
      error: {
        code: "BAD_REQUEST",
        message: err.message
      }
    });
    return;
  }
  console.error("[Unhandled Server Error]:", err);
  res.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Terjadi kesalahan sistem internal."
    }
  });
};

// src/server/app.ts
var createApp = () => {
  const app2 = express();
  app2.use(cors({
    origin: true,
    credentials: true
  }));
  app2.use((_req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "SAMEORIGIN");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    next();
  });
  app2.use(express.json({ limit: "10mb" }));
  app2.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app2.use("/uploads/covers", express.static(path6.resolve(process.cwd(), "uploads/covers")));
  app2.get(["/api/health", "/health"], (_req, res) => {
    res.json({
      status: "healthy",
      app: "Pustaka Sekolah PWA",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  });
  app2.use(["/api/auth", "/auth"], authRouter);
  app2.use(["/api/books", "/books"], bookRouter);
  app2.use(["/api/circulation", "/circulation"], circulationRouter);
  const distPath = path6.resolve(process.cwd(), "dist");
  if (fs5.existsSync(distPath)) {
    app2.use(express.static(distPath));
    app2.get("*", (req, res, next) => {
      if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) {
        return next();
      }
      res.sendFile(path6.join(distPath, "index.html"));
    });
  }
  app2.use("/api", (_req, res) => {
    res.status(404).json({
      success: false,
      error: {
        code: "NOT_FOUND",
        message: "Endpoint API tidak ditemukan."
      }
    });
  });
  app2.use(errorHandler);
  return app2;
};

// api/index.ts
var app = createApp();
function handler(req, res) {
  return app(req, res);
}
export {
  handler as default
};
