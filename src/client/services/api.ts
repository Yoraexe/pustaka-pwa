/**
 * @file src/client/services/api.ts
 * @description API Client wrapper untuk komunikasi frontend PWA dengan backend Express.
 * @layer Client Service Layer
 */

import type { ApiResponse, AuthSession, Book, BookFilterInput, Category, Loan, LoginInput } from '../../shared/types/index.js';

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
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const json: ApiResponse<T> = await res.json();

    if (!res.ok || !json.success) {
      if (res.status === 401) {
        this.setToken(null);
      }
      const errorMsg = json.error?.message || 'Terjadi kesalahan pada server.';
      throw new Error(errorMsg);
    }

    return json.data as T;
  }


  // --- Auth Endpoints ---
  async login(input: LoginInput): Promise<AuthSession> {
    const data = await this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input)
    });
    this.setToken(data.token);
    return data;
  }

  async getCurrentUser() {
    return this.request<AuthSession['user']>('/auth/me');
  }

  logout() {
    this.setToken(null);
  }

  // --- Books & Catalog ---
  async getCategories(): Promise<Category[]> {
    return this.request<Category[]>('/books/categories');
  }

  async getBooks(filters: BookFilterInput = {}): Promise<Book[]> {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.categoryId) params.set('categoryId', String(filters.categoryId));
    if (filters.bookType && filters.bookType !== 'ALL') params.set('bookType', filters.bookType);
    if (filters.availableOnly) params.set('availableOnly', 'true');

    return this.request<Book[]>(`/books?${params.toString()}`);
  }

  async getBookDetail(id: number): Promise<Book> {
    return this.request<Book>(`/books/${id}`);
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
    return this.request<Loan[]>(`/circulation/my-loans?active=${activeOnly}`);
  }

  async checkOutPhysicalBook(userIdentity: string, copyBarcode: string): Promise<Loan> {
    return this.request<Loan>('/circulation/physical/checkout', {
      method: 'POST',
      body: JSON.stringify({ userIdentity, copyBarcode })
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
}

export const api = new ApiClient();
