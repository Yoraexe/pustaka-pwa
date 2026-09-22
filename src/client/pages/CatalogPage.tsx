/**
 * @file src/client/pages/CatalogPage.tsx
 * @description Halaman utama katalog buku hybrid dengan pencarian, filter, dan dialog peminjaman.
 * @layer Page Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Book, Category, BookType } from '../../shared/types/index.js';
import { BookGrid } from '../components/catalog/BookGrid.js';
import { BookDetailModal } from '../components/catalog/BookDetailModal.js';
import { AddBookModal } from '../components/catalog/AddBookModal.js';
import { BookOpen, Tablet, Sparkles, PlusCircle } from 'lucide-react';

interface CatalogPageProps {
  onOpenLogin: () => void;
  onNavigateToMyBooks: () => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ onOpenLogin, onNavigateToMyBooks }) => {
  const { user, isAuthenticated } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(undefined);
  const [selectedType, setSelectedType] = useState<BookType | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [selectedDetailBook, setSelectedDetailBook] = useState<Book | null>(null);
  const [borrowedBookIds, setBorrowedBookIds] = useState<Set<number>>(new Set());
  const [isAddBookOpen, setIsAddBookOpen] = useState<boolean>(false);

  // Fetch Categories
  useEffect(() => {
    const fetchCats = async () => {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
      } catch (err) {
        console.error('Gagal mengambil kategori:', err);
      }
    };
    fetchCats();
  }, []);

  // Fetch Borrowed Books by current user
  const fetchUserBorrows = useCallback(async () => {
    if (!isAuthenticated) {
      setBorrowedBookIds(new Set());
      return;
    }
    try {
      const myLoans = await api.getMyLoans(true);
      const ids = new Set(myLoans.map(l => l.bookId));
      setBorrowedBookIds(ids);
    } catch {
      // Abaikan jika unauthenticated
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchUserBorrows();
  }, [fetchUserBorrows]);

  // Fetch Books with filters
  const fetchBooks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getBooks({
        categoryId: selectedCategory,
        bookType: selectedType,
        search: searchTerm
      });
      setBooks(data);
    } catch (err) {
      console.error('Gagal memuat buku:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, selectedType, searchTerm]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchBooks();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchBooks]);

  const handleBorrowDigital = async (book: Book) => {
    if (!isAuthenticated) {
      alert('Silakan masuk terlebih dahulu menggunakan NISN/NIP untuk meminjam buku.');
      onOpenLogin();
      return;
    }

    try {
      await api.borrowDigitalBook(book.id);
      alert(`Berhasil meminjam "${book.title}". Buku telah ditambahkan ke "Rak Buku Saya".`);
      await fetchUserBorrows();
      onNavigateToMyBooks();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal meminjam e-book.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Welcome Banner */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-primary-100 text-xs font-semibold mb-3">
            <Sparkles size={14} className="text-amber-300" />
            <span>Perpustakaan Digital Sekolah Masa Depan</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Akses Pengetahuan Tanpa Batas, Online & Offline
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-primary-100 leading-relaxed">
            Temukan modul ajar informatika, buku pelajaran, serta lacak ketersediaan buku fisik di rak perpustakaan sekolah langsung dari gawai Anda.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-xs">
            <div className="bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl flex items-center gap-2">
              <Tablet size={16} className="text-blue-300" />
              <span>Format E-Book & In-App Reader</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm px-3.5 py-1.5 rounded-xl flex items-center gap-2">
              <BookOpen size={16} className="text-amber-300" />
              <span>Sirkulasi Fisik & Lokasi Rak</span>
            </div>
          </div>

          {isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') && (
            <div className="mt-5 pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-primary-100 font-medium">
                Panel Manajemen Pustakawan: Daftarkan buku cetak fisik atau e-book baru.
              </span>
              <button
                onClick={() => setIsAddBookOpen(true)}
                className="px-4 py-2 bg-white hover:bg-primary-50 text-primary-900 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-sm self-start sm:self-auto"
              >
                <PlusCircle size={16} className="text-primary-600" />
                <span>+ Tambah Koleksi Buku Baru</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Catalog View */}
      <BookGrid
        books={books}
        categories={categories}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        selectedType={selectedType}
        onSelectType={setSelectedType}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onBorrowDigital={handleBorrowDigital}
        onSelectDetail={setSelectedDetailBook}
        borrowedBookIds={borrowedBookIds}
        isLoading={isLoading}
      />

      {/* Book Detail Modal */}
      {selectedDetailBook && (
        <BookDetailModal
          book={selectedDetailBook}
          onClose={() => setSelectedDetailBook(null)}
          onBorrowDigital={handleBorrowDigital}
          isBorrowed={borrowedBookIds.has(selectedDetailBook.id)}
        />
      )}

      {/* Add Book Modal (Librarian & Admin) */}
      <AddBookModal
        isOpen={isAddBookOpen}
        onClose={() => setIsAddBookOpen(false)}
        onSuccess={() => {
          fetchBooks();
        }}
      />
    </div>
  );
};
