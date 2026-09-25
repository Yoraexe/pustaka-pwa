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
import { Badge } from '../components/ui/badge.js';
import { Spotlight } from '../components/ui/spotlight.js';
import { FlipWords } from '../components/ui/flip-words.js';
import { MovingBorderButton } from '../components/ui/moving-border.js';
import { BentoGrid, BentoGridItem } from '../components/ui/bento-grid.js';
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
    <div className="space-y-6 sm:space-y-8 w-full min-w-0">
      {/* Aceternity UI Spotlight Hero Section (Clean & Theme-Adaptive) */}
      <div className="relative rounded-3xl border border-border bg-card p-6 sm:p-8 shadow-xs overflow-hidden w-full min-w-0">
        {/* Aceternity SVG Spotlight Subtle Illumination */}
        <Spotlight
          className="-top-24 left-0 md:left-32"
          fill="#3b82f6"
        />

        <div className="relative z-10 max-w-2xl">
          {/* Aceternity FlipWords Headline */}
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight">
            Pusat Literasi &{' '}
            <FlipWords
              words={['Informatika', 'Kurikulum Merdeka', 'Buku Pelajaran', 'Koleksi Rak']}
              className="text-primary font-extrabold px-0"
            />
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-muted-foreground font-normal">
            Katalog terpadu e-book kurikulum luring dan sirkulasi rak fisik sekolah.
          </p>

          {/* Action CTAs */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {onOpenCommand && (
              <MovingBorderButton
                borderRadius="0.75rem"
                duration={3500}
                onClick={onOpenCommand}
                containerClassName="h-10"
                className="bg-card hover:bg-muted text-foreground font-semibold text-xs px-4 py-2 border-border shadow-2xs"
              >
                <span>Cari Buku</span>
                <kbd className="ml-2 text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono border border-border">⌘K</kbd>
              </MovingBorderButton>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={onNavigateToMyBooks}
              className="h-10 px-4 rounded-xl text-xs font-semibold"
            >
              Rak Buku Saya
            </Button>

            {isAuthenticated && (user?.role === 'LIBRARIAN' || user?.role === 'ADMIN') && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsAddBookOpen(true)}
                className="h-10 px-4 rounded-xl text-xs font-semibold"
              >
                + Tambah Buku
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Aceternity UI Bento Grid - Pustaka Feature Highlights (Clean 4-Card Equal Row) */}
      <BentoGrid>
        <BentoGridItem
          badge={<Badge variant="ebook">E-Book</Badge>}
          title="Koleksi Digital"
          description="Akses e-book luring langsung di perangkat tanpa kuota."
          actionText="Buka Digital"
          onClick={() => setSelectedType('DIGITAL_ONLY')}
        />

        <BentoGridItem
          badge={<Badge variant="physical">Fisik</Badge>}
          title="Koleksi Rak"
          description="Pantau ketersediaan eksemplar di rak sekolah."
          actionText="Buka Fisik"
          onClick={() => setSelectedType('PHYSICAL_ONLY')}
        />

        <BentoGridItem
          badge={<Badge variant="outline">Shortcut</Badge>}
          title="Pencarian Cepat"
          description="Temukan buku instan menggunakan tombol pintas."
          actionText="Buka ⌘K"
          onClick={() => onOpenCommand?.()}
        />

        <BentoGridItem
          badge={<Badge variant="hybrid">Kurikulum</Badge>}
          title="Kurikulum Merdeka"
          description="Modul ajar resmi terbitan Kemendikbudristek."
          actionText="Lihat Topik"
          onClick={() => setSearchTerm('Informatika')}
        />
      </BentoGrid>

      {/* Main Catalog Grid */}
      <div className="space-y-4 pt-2">
        <h2 className="font-bold text-lg text-foreground tracking-tight">
          Katalog Buku
        </h2>

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
