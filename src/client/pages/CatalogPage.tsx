/**
 * @file src/client/pages/CatalogPage.tsx
 * @description Halaman katalog buku dengan arsitektur tipografi editorial murni, bebas dari icon dekoratif yang berlebihan dan kurasi palsu.
 * @layer Page Component
 * 
 * Tujuan: Menyediakan antarmuka penelusuran, pencarian, dan peminjaman buku sekolah bagi siswa dan guru.
 * Caller: src/client/App.tsx
 * Dependensi: react, src/client/services/api.ts, src/client/hooks/useAuth.ts, shared/types, UI components.
 * Main Functions: CatalogPage
 * Side Effects: Fetch katalog buku dan kategori via HTTP REST API, mutasi peminjaman digital.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import type { Book, Category, BookType } from '../../shared/types/index.js';
import { BookGrid } from '../components/catalog/BookGrid.js';
import { BookDetailModal } from '../components/catalog/BookDetailModal.js';
import { AddBookModal } from '../components/catalog/AddBookModal.js';
import { Button } from '../components/ui/button.js';
import { Spotlight } from '../components/ui/spotlight.js';
import { FlipWords } from '../components/ui/flip-words.js';
import { MovingBorderButton } from '../components/ui/moving-border.js';
import { toast } from 'sonner';

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
      // Unauthenticated
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
    <div className="space-y-10">
      {/* Aceternity UI Spotlight Hero Section (Clean Typography, No Decorative Slop) */}
      <div className="relative rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-12 text-white shadow-xl overflow-hidden">
        {/* Aceternity SVG Spotlight Theater Beam */}
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="#3b82f6"
        />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-slate-300 text-xs font-mono font-medium mb-4 border border-white/10">
            Sistem Informasi Perpustakaan Terpadu
          </div>

          {/* Aceternity FlipWords Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Pusat Literasi Digital &{' '}
            <FlipWords
              words={['Informatika', 'Modul Merdeka', 'Buku Pelajaran', 'Koleksi Rak']}
              className="text-blue-400 font-extrabold px-0"
            />
          </h1>

          <p className="mt-4 text-xs sm:text-sm text-slate-300/90 leading-relaxed max-w-2xl font-normal">
            Akses materi ajar sekolah secara luring, baca e-book resmi terproteksi hak cipta, dan lacak ketersediaan buku fisik di rak perpustakaan sekolah langsung dari peramban Anda.
          </p>

          {/* Action CTAs */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            {onOpenCommand && (
              <MovingBorderButton
                borderRadius="0.875rem"
                duration={3500}
                onClick={onOpenCommand}
                containerClassName="h-11"
                className="bg-slate-950/90 hover:bg-slate-900 text-white font-semibold text-xs px-5 py-2 border-slate-700/60 shadow-sm"
              >
                <span>Pencarian Cepat</span>
                <kbd className="ml-2.5 text-[10px] bg-white/15 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
              </MovingBorderButton>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToMyBooks}
              className="h-11 px-5 rounded-xl border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white text-xs font-semibold"
            >
              Rak Buku Saya
            </Button>
          </div>

          {isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') && (
            <div className="mt-7 pt-5 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Pustakawan: Daftarkan eksemplar fisik atau berkas PDF e-book baru ke basis data.
              </span>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddBookOpen(true)}
                className="self-start sm:self-auto font-semibold text-xs shadow-xs bg-white text-slate-900 hover:bg-slate-100 px-4 py-2"
              >
                Tambah Koleksi Buku
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Main Catalog Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg text-foreground tracking-tight">
            Katalog Buku Lengkap
          </h2>
        </div>

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
      </div>

      {/* Book Detail Modal (Shadcn Dialog) */}
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
