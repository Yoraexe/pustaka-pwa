/**
 * @file src/client/pages/CatalogPage.tsx
 * @description Halaman utama katalog buku hybrid dengan komponen resmi Aceternity UI (Spotlight, FlipWords, MovingBorder, HoverEffect) dan Shadcn UI.
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
import { Spotlight } from '../components/ui/spotlight.js';
import { FlipWords } from '../components/ui/flip-words.js';
import { MovingBorderButton } from '../components/ui/moving-border.js';
import { HoverEffect } from '../components/ui/card-hover-effect.js';
import { toast } from 'sonner';
import { BookOpen, Tablet, PlusCircle, Command, Library, Sparkles, Code2, BookmarkCheck } from 'lucide-react';

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

  // Curated spotlight features for the Aceternity HoverEffect section
  const curatedCollections = [
    {
      id: 'informatika',
      title: 'Modul Informatika & Coding',
      description: 'Materi struktur data, algoritma komputasional, dan dasar rekayasa perangkat lunak.',
      icon: <Code2 className="h-5 w-5 text-blue-400" />,
      badge: 'Kurikulum Baru',
    },
    {
      id: 'digital',
      title: 'E-Book Siap Offline PWA',
      description: 'Dokumen pelajaran PDF in-app dengan watermark resmi siswa dan cache memori lokal.',
      icon: <Tablet className="h-5 w-5 text-emerald-400" />,
      badge: 'IndexedDB Ready',
    },
    {
      id: 'physical',
      title: 'Sirkulasi Rak Fisik Sekolah',
      description: 'Lacak ketersediaan eksemplar di rak buku perpustakaan untuk peminjaman langsung.',
      icon: <BookOpen className="h-5 w-5 text-amber-400" />,
      badge: 'Lacak Rak',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Aceternity UI Spotlight Hero Section */}
      <div className="relative rounded-3xl border border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6 sm:p-10 text-white shadow-xl overflow-hidden">
        {/* Aceternity SVG Spotlight Theater Beam */}
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill="#3b82f6"
        />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-slate-200 text-xs font-semibold mb-4 border border-white/10 shadow-xs">
            <Library size={14} className="text-amber-300" />
            <span>Katalog Resmi Perpustakaan Sekolah</span>
          </div>

          {/* Aceternity FlipWords Headline */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Pusat Literasi Digital &{' '}
            <FlipWords
              words={['Informatika', 'Modul Merdeka', 'Buku Pelajaran', 'Koleksi Rak']}
              className="text-blue-400 font-extrabold"
            />
          </h1>

          <p className="mt-3 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Akses ribuan materi ajar kurikulum sekolah, baca e-book resmi terproteksi watermark secara luring (offline), dan pantau ketersediaan buku fisik di rak perpustakaan secara real-time.
          </p>

          {/* Aceternity MovingBorder Button CTA */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            {onOpenCommand && (
              <MovingBorderButton
                borderRadius="0.875rem"
                duration={3500}
                onClick={onOpenCommand}
                containerClassName="h-11"
                className="bg-slate-950/90 hover:bg-slate-900 text-white font-semibold text-xs px-4 py-2 border-slate-700/60 shadow-sm"
              >
                <Command size={14} className="mr-2 text-blue-400" />
                <span>Pencarian Cepat Katalog</span>
                <kbd className="ml-2 text-[10px] bg-white/15 px-1.5 py-0.5 rounded font-mono">⌘K</kbd>
              </MovingBorderButton>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToMyBooks}
              className="h-11 px-4 rounded-xl border-slate-700 bg-slate-900/60 text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <BookmarkCheck size={14} className="mr-1.5 text-emerald-400" />
              <span>Buka Rak Buku Saya</span>
            </Button>
          </div>

          {isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') && (
            <div className="mt-6 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs text-slate-400 font-medium">
                Panel Pustakawan: Tambahkan buku cetak fisik atau e-book materi pelajaran baru.
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

      {/* Aceternity UI CardHoverEffect for Featured Collections */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-primary" />
            <h2 className="font-bold text-base text-foreground tracking-tight">
              Eksplorasi Kurasi Perpustakaan
            </h2>
          </div>
          <span className="text-xs text-muted-foreground hidden sm:inline">
            Arahkan kursor untuk melihat kategori unggulan
          </span>
        </div>

        <HoverEffect
          items={curatedCollections}
          onItemClick={(item) => {
            if (item.id === 'digital') {
              setSelectedType('DIGITAL_ONLY');
            } else if (item.id === 'physical') {
              setSelectedType('PHYSICAL_ONLY');
            } else {
              setSearchTerm('Informatika');
            }
          }}
        />
      </div>

      {/* Main Catalog Grid */}
      <div className="space-y-4 pt-2">
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
