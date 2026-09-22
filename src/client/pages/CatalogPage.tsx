/**
 * @file src/client/pages/CatalogPage.tsx
 * @description Halaman utama katalog buku hybrid dengan pencarian, filter, Sonner toast, dan hero modern academic bebas AI slop.
 * @layer Page Component
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Book, Category, BookType } from '../../shared/types/index.js';
import { BookGrid } from '../components/catalog/BookGrid.js';
import { BookDetailModal } from '../components/catalog/BookDetailModal.js';
import { AddBookModal } from '../components/catalog/AddBookModal.js';
import { Button } from '../components/ui/button.js';
import { toast } from 'sonner';
import { BookOpen, Tablet, PlusCircle, Command, Library } from 'lucide-react';

interface CatalogPageProps {
  onOpenLogin: () => void;
  onNavigateToMyBooks: () => void;
  onOpenCommand?: () => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  onOpenLogin,
  onNavigateToMyBooks,
  onOpenCommand,
}) => {
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
      const ids = new Set(myLoans.map((l) => l.bookId));
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
        search: searchTerm,
      });
      setBooks(data);
    } catch (err) {
      console.error('Gagal memuat buku:', err);
      toast.error('Gagal memuat katalog buku dari server.');
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
      toast.warning('Akses Dibatasi', {
        description: 'Silakan masuk terlebih dahulu menggunakan NISN atau NIP untuk meminjam e-book.',
        action: {
          label: 'Masuk Sekarang',
          onClick: onOpenLogin,
        },
      });
      return;
    }

    try {
      await api.borrowDigitalBook(book.id);
      toast.success('Peminjaman Berhasil', {
        description: `Buku "${book.title}" telah ditambahkan ke Rak Buku Saya. Siap dibaca online & offline.`,
        action: {
          label: 'Buka Rak Saya',
          onClick: onNavigateToMyBooks,
        },
      });
      await fetchUserBorrows();
    } catch (err: unknown) {
      toast.error('Gagal Meminjam', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat memproses peminjaman e-book.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Modern Academic Hero Section (Clean, Tactile, Anti-AI Slop) */}
      <div className="relative rounded-3xl border border-border bg-gradient-to-br from-primary via-primary/95 to-slate-900 p-6 sm:p-8 text-primary-foreground shadow-sm overflow-hidden">
        {/* Subtle Ambient Glow (Non-blocking, CSS-only) */}
        <div className="pointer-events-none absolute -right-20 -top-20 w-80 h-80 rounded-full bg-white/5 blur-3xl" />
        <div className="pointer-events-none absolute left-1/3 -bottom-20 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-xs text-white/90 text-[11px] font-semibold mb-3 border border-white/10">
            <Library size={13} className="text-amber-300" />
            <span>Katalog Resmi Perpustakaan Sekolah</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-tight">
            Akses Sumber Belajar & Buku Pelajaran Digital
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-primary-foreground/80 leading-relaxed max-w-2xl">
            Jelajahi modul kurikulum, materi informatika, serta pantau ketersediaan fisik buku di rak perpustakaan sekolah. Dilengkapi pembacaan offline PWA dan proteksi watermark.
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 text-xs">
            <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl flex items-center gap-2 text-white/90 font-medium">
              <Tablet size={14} className="text-blue-300" />
              <span>E-Book In-App & IndexedDB</span>
            </div>
            <div className="bg-white/10 border border-white/15 px-3 py-1.5 rounded-xl flex items-center gap-2 text-white/90 font-medium">
              <BookOpen size={14} className="text-amber-300" />
              <span>Sirkulasi Buku Fisik Sekolah</span>
            </div>

            {onOpenCommand && (
              <button
                onClick={onOpenCommand}
                className="bg-white/15 hover:bg-white/20 border border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-white/95 font-medium transition-colors cursor-pointer select-none"
              >
                <Command size={13} />
                <span>Pencarian Cepat</span>
                <kbd className="ml-1 text-[10px] bg-black/20 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
              </button>
            )}
          </div>

          {isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') && (
            <div className="mt-5 pt-4 border-t border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-primary-foreground/80 font-medium">
                Panel Pustakawan: Tambahkan buku pelajaran, referensi rak, atau file PDF e-book baru.
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddBookOpen(true)}
                className="self-start sm:self-auto gap-1.5 font-bold shadow-xs bg-white text-slate-900 hover:bg-slate-100"
              >
                <PlusCircle size={15} className="text-primary" />
                <span>+ Tambah Koleksi Buku</span>
              </Button>
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
        onOpenCommand={onOpenCommand}
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
          toast.success('Koleksi Berhasil Disimpan', {
            description: 'Buku baru telah masuk ke katalog perpustakaan sekolah.',
          });
        }}
      />
    </div>
  );
};
