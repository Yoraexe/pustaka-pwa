/**
 * @file src/client/services/api.ts
 * @description API Client wrapper untuk komunikasi frontend PWA dengan backend Express.
 * @layer Client Service Layer
 * 
 * Tujuan: Menyediakan abstraksi HTTP Client berbasis Fetch dengan penyisipan token JWT, caching offline localStorage, dan error handling terpusat.
 * Caller: Seluruh komponen UI klien (CatalogPage, MyBooksPage, CirculationDesk, SuperAdminPanel, LoginPage, PDFReader, AddBookModal, UserImportModal).
 * Dependensi: shared/types.
 * Main Functions: ApiClient (login, signup, registerUserByAdmin, getUsers, updateUserStatus, resetUserPassword, getCurrentUser, getBooks, getBookDetail, borrowDigitalBook, returnDigitalBook, borrowPhysicalBookSelf, returnPhysicalBookSelf, reservePhysicalBook, claimReservation, cancelReservation, renewPhysicalLoan, importUsersCsv).
 * Side Effects: Melakukan request jaringan HTTP ke backend Express, menulis/membaca token dan cache ke localStorage.
 */

import type {
  ApiResponse, AuthSession, Book, BookCopy, BookFilterInput,
  Category, CreateBookInput, CreateUserInput, SelfRegisterInput, User,
  Loan, LoginInput, CsvImportResult, AvailableCopy
} from '../../shared/types/index.js';

const API_BASE = '/api';

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('pustaka_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('pustaka_token', token);
    } else {
      localStorage.removeItem('pustaka_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {};

    // Jangan set Content-Type jika body adalah FormData agar browser menyetel multipart boundary otomatis
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    let json: ApiResponse<T>;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        json = await res.json();
      } catch {
        throw new Error(`Respons server tidak valid (Status HTTP: ${res.status}).`);
      }
    } else {
      if (!res.ok) {
        throw new Error(`Server perpustakaan mengalami kendala teknis (Status HTTP: ${res.status}). Silakan coba sesaat lagi.`);
      }
      throw new Error(`Format respons server tidak didukung (${contentType || 'Unknown'}).`);
    }

    if (!res.ok || !json.success) {
      if (res.status === 401) {
        this.setToken(null);
      }
      const errorMsg = json.error?.message || 'Terjadi kesalahan pada server.';
      throw new Error(errorMsg);
    }

    return json.data as T;
  }


  // --- Auth & User Management Endpoints ---
  async login(input: LoginInput): Promise<AuthSession> {
    const data = await this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    this.setToken(data.token);
    return data;
  }

  async signup(input: SelfRegisterInput): Promise<AuthSession> {
    const data = await this.request<AuthSession>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request<AuthSession['user']>('/auth/me');
  }

  logout(): void {
    this.setToken(null);
  }

  async getUsers(): Promise<User[]> {
    return this.request<User[]>('/auth/users');
  }

  async registerUserByAdmin(input: CreateUserInput): Promise<User> {
    return this.request<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  }

  async updateUserStatus(userId: number, isActive: boolean): Promise<User> {
    return this.request<User>(`/auth/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive })
    });
  }

  async resetUserPassword(userId: number, newPassword: string): Promise<void> {
    return this.request<void>(`/auth/users/${userId}/password`, {
      method: 'PATCH',
      body: JSON.stringify({ newPassword })
    });
  }

  async importUsersCsv(data: FormData | { csvText: string }): Promise<CsvImportResult> {
    const isFormData = data instanceof FormData;
    const body = isFormData ? data : JSON.stringify(data);
    return this.request<CsvImportResult>('/auth/import-users', {
      method: 'POST',
      body
    });
  }


  // --- Books & Catalog ---
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/books/categories');
  }

  async getBookById(id: number): Promise<Book> {
    return this.request<Book>(`/books/${id}`);
  }

  async getAvailableCopies(): Promise<AvailableCopy[]> {
    return this.request<AvailableCopy[]>('/books/copies/available');
  }

  async getBooks(filters: BookFilterInput = {}): Promise<Book[]> {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.categoryId) params.set('categoryId', String(filters.categoryId));
    if (filters.bookType && filters.bookType !== 'ALL') params.set('bookType', filters.bookType);
    if (filters.availableOnly) params.set('availableOnly', 'true');

    const cacheKey = 'pustaka_cached_books';
    try {
      const books = await this.request<Book[]>(`/books?${params.toString()}`);
      if (!filters.search && (!filters.categoryId || filters.categoryId === 0)) {
        localStorage.setItem(cacheKey, JSON.stringify(books));
      }
      return books;
    } catch (err) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      throw err;
    }
  }

  async getBookDetail(id: number): Promise<Book> {
    const cacheKey = `pustaka_book_${id}`;
    try {
      const book = await this.request<Book>(`/books/${id}`);
      localStorage.setItem(cacheKey, JSON.stringify(book));
      return book;
    } catch (err) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      throw err;
    }
  }

  async createBook(data: FormData | CreateBookInput): Promise<Book & { copies?: BookCopy[] }> {
    const isFormData = data instanceof FormData;
    const body = isFormData ? data : JSON.stringify(data);

    return this.request<Book & { copies?: BookCopy[] }>('/books', {
      method: 'POST',
      body
    });
  }

  // --- Circulation ---
  async borrowDigitalBook(bookId: number): Promise<Loan> {
    return this.request<Loan>('/circulation/digital/borrow', {
      method: 'POST',
      body: JSON.stringify({ bookId })
    });
  }

  async returnDigitalBook(bookId: number): Promise<void> {
    return this.request<void>('/circulation/digital/return', {
      method: 'POST',
      body: JSON.stringify({ bookId })
    });
  }

  async getMyLoans(activeOnly = false): Promise<Loan[]> {
    const cacheKey = `pustaka_my_loans_${activeOnly}`;
    try {
      const loans = await this.request<Loan[]>(`/circulation/my-loans?active=${activeOnly}`);
      localStorage.setItem(cacheKey, JSON.stringify(loans));
      return loans;
    } catch (err) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
      throw err;
    }
  }

  async checkOutPhysicalBook(userIdentity: string, copyBarcode: string): Promise<Loan> {
    return this.request<Loan>('/circulation/physical/checkout', {
      method: 'POST',
      body: JSON.stringify({ userIdentity, copyBarcode })
    });
  }

  async borrowPhysicalBookSelf(bookId?: number, copyBarcode?: string): Promise<Loan> {
    return this.request<Loan>('/circulation/physical/borrow-self', {
      method: 'POST',
      body: JSON.stringify({ bookId, copyBarcode })
    });
  }

  async borrowPhysicalByBarcode(copyBarcode: string): Promise<Loan> {
    return this.request<Loan>('/circulation/physical/borrow-self', {
      method: 'POST',
      body: JSON.stringify({ copyBarcode })
    });
  }

  async returnPhysicalBookSelf(loanId: number): Promise<{
    loan: Loan;
    overdueDays: number;
    fineAmount: number;
    message: string;
  }> {
    return this.request('/circulation/physical/return-self', {
      method: 'POST',
      body: JSON.stringify({ loanId })
    });
  }

  async returnPhysicalBook(copyBarcode: string, finePaid = false): Promise<{
    loan: Loan;
    overdueDays: number;
    fineAmount: number;
    message: string;
  }> {
    return this.request('/circulation/physical/return', {
      method: 'POST',
      body: JSON.stringify({ copyBarcode, finePaid })
    });
  }

  async getAllLoans(): Promise<Loan[]> {
    return this.request<Loan[]>('/circulation/all');
  }

  // --- Physical Book Reservation ---
  async reservePhysicalBook(bookId: number): Promise<Loan> {
    return this.request<Loan>('/circulation/physical/reserve', {
      method: 'POST',
      body: JSON.stringify({ bookId })
    });
  }

  async claimReservation(reservationCode: string): Promise<Loan> {
    return this.request<Loan>('/circulation/physical/claim', {
      method: 'POST',
      body: JSON.stringify({ reservationCode })
    });
  }

  async cancelReservation(loanId: number): Promise<void> {
    return this.request<void>('/circulation/physical/cancel-reserve', {
      method: 'POST',
      body: JSON.stringify({ loanId })
    });
  }

  async getReservations(activeOnly = true): Promise<Loan[]> {
    return this.request<Loan[]>(`/circulation/reservations?active=${activeOnly}`);
  }

  async renewPhysicalLoan(loanId: number): Promise<Loan> {
    return this.request<Loan>('/circulation/physical/renew', {
      method: 'POST',
      body: JSON.stringify({ loanId })
    });
  }
}

export const api = new ApiClient();
