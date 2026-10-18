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
import type { Book, Category, BookType, Loan, AvailableCopy } from '../../shared/types/index.js';
import { BookGrid } from '../components/catalog/BookGrid.js';
import { BookDetailModal } from '../components/catalog/BookDetailModal.js';
import { AddBookModal } from '../components/catalog/AddBookModal.js';
import { BarcodeScannerModal } from '../components/circulation/BarcodeScannerModal.js';
import { PDFReader } from '../components/reader/PDFReader.js';
import { Button } from '../components/ui/button.js';
import { Spotlight } from '../components/ui/spotlight.js';
import { FlipWords } from '../components/ui/flip-words.js';
import { MovingBorderButton } from '../components/ui/moving-border.js';
import { QrCode } from 'lucide-react';
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
  const [borrowedDigitalIds, setBorrowedDigitalIds] = useState<Set<number>>(new Set());
  const [borrowedPhysicalIds, setBorrowedPhysicalIds] = useState<Set<number>>(new Set());
  const [userLoans, setUserLoans] = useState<Loan[]>([]);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [isAddBookOpen, setIsAddBookOpen] = useState<boolean>(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [availableCopies, setAvailableCopies] = useState<AvailableCopy[]>([]);

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
      setBorrowedDigitalIds(new Set());
      setBorrowedPhysicalIds(new Set());
      setUserLoans([]);
      return;
    }
    try {
      const myLoans = await api.getMyLoans(true);
      setUserLoans(myLoans);
      const allActiveIds = new Set(myLoans.filter((l) => l.status === 'BORROWED').map((l) => l.bookId));
      const digitalIds = new Set(
        myLoans.filter((l) => l.loanType === 'DIGITAL' && l.status === 'BORROWED').map((l) => l.bookId)
      );
      const physicalIds = new Set(
        myLoans.filter((l) => l.loanType === 'PHYSICAL' && l.status === 'BORROWED').map((l) => l.bookId)
      );
      setBorrowedBookIds(allActiveIds);
      setBorrowedDigitalIds(digitalIds);
      setBorrowedPhysicalIds(physicalIds);
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
      toast.success('Peminjaman E-Book Berhasil', {
        description: `Buku "${book.title}" telah ditambahkan ke Rak Buku Saya. Siap dibaca online & offline.`,
        action: {
          label: 'Buka Rak Saya',
          onClick: onNavigateToMyBooks,
        },
      });
      await fetchUserBorrows();
    } catch (err: unknown) {
      toast.error('Gagal Meminjam E-Book', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat memproses peminjaman e-book.',
      });
    }
  };

  const handleBorrowPhysical = async (book: Book, copyBarcode?: string) => {
    if (!isAuthenticated) {
      toast.warning('Akses Dibatasi', {
        description: 'Silakan masuk terlebih dahulu menggunakan NISN atau NIP untuk meminjam buku fisik.',
        action: {
          label: 'Masuk Sekarang',
          onClick: onOpenLogin,
        },
      });
      return;
    }

    try {
      const loan = await api.borrowPhysicalBookSelf(book.id, copyBarcode);
      toast.success('Peminjaman Buku Fisik Berhasil!', {
        description: `"${book.title}" (Eksemplar: ${loan.copyBarcode || '-'}) resmi dipinjam dan masuk ke Rak Buku Saya.`,
        action: {
          label: 'Buka Rak Saya',
          onClick: onNavigateToMyBooks,
        },
      });
      fetchBooks();
      await fetchUserBorrows();
    } catch (err: unknown) {
      toast.error('Gagal Meminjam Buku Fisik', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat memproses peminjaman fisik.',
      });
    }
  };

  const handleReservePhysical = async (book: Book) => {
    if (!isAuthenticated) {
      toast.warning('Akses Dibatasi', {
        description: 'Silakan masuk terlebih dahulu menggunakan NISN atau NIP untuk mereservasi buku fisik.',
        action: {
          label: 'Masuk Sekarang',
          onClick: onOpenLogin,
        },
      });
      return;
    }

    try {
      const res = await api.reservePhysicalBook(book.id);
      toast.success('Reservasi Berhasil!', {
        description: `Buku "${book.title}" berhasil direservasi (Kode: ${res.reservationCode}). Silakan ambil di perpustakaan dalam 24 jam.`,
        action: {
          label: 'Lihat Tiket',
          onClick: onNavigateToMyBooks,
        },
      });
      fetchBooks();
      await fetchUserBorrows();
    } catch (err: unknown) {
      toast.error('Gagal Reservasi', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat memproses reservasi fisik.',
      });
    }
  };



  const handleOpenQrScanner = async () => {
    if (!isAuthenticated) {
      toast.warning('Akses Dibatasi', {
        description: 'Silakan masuk terlebih dahulu menggunakan NISN atau NIP untuk memindai QR buku fisik.',
        action: {
          label: 'Masuk Sekarang',
          onClick: onOpenLogin,
        },
      });
      return;
    }

    try {
      const copies = await api.getAvailableCopies();
      setAvailableCopies(copies);
    } catch {
      // Abaikan jika gagal memuat daftar saran cepat
    }
    setIsQrScannerOpen(true);
  };

  const handleScanQrBorrow = async (scannedBarcode: string) => {
    try {
      const loan = await api.borrowPhysicalByBarcode(scannedBarcode);
      toast.success('Peminjaman via Scan QR Berhasil!', {
        description: `Eksemplar "${loan.copyBarcode || scannedBarcode}" resmi dipinjam dan masuk ke Rak Buku Saya.`,
        action: {
          label: 'Buka Rak Saya',
          onClick: onNavigateToMyBooks,
        },
      });
      fetchBooks();
      await fetchUserBorrows();
    } catch (err: unknown) {
      toast.error('Gagal Meminjam via Scan QR', {
        description: err instanceof Error ? err.message : 'Kode QR/Barcode tidak ditemukan atau sedang dipinjam.',
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
            {onOpenCommand && books.length > 0 && (
              <MovingBorderButton
                borderRadius="0.75rem"
                duration={3500}
                onClick={onOpenCommand}
                containerClassName="h-10"
                className="bg-card hover:bg-muted text-foreground font-semibold text-xs px-4 py-2 border-border shadow-2xs"
              >
                <span>Cari Buku</span>
              </MovingBorderButton>
            )}

            {!isAuthenticated ? (
              <Button
                variant="default"
                size="sm"
                onClick={onOpenLogin}
                className="h-10 px-4 rounded-xl text-xs font-semibold shadow-xs"
              >
                Masuk / Daftar Akun
              </Button>
            ) : (
              <>
                {books.some((b) => b.bookType !== 'DIGITAL_ONLY' && b.availablePhysicalCopies > 0) && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleOpenQrScanner}
                    className="h-10 px-4 rounded-xl text-xs font-semibold gap-1.5 shadow-xs"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Pindai QR Buku</span>
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onNavigateToMyBooks}
                  className="h-10 px-4 rounded-xl text-xs font-semibold"
                >
                  Rak Buku Saya
                </Button>
              </>
            )}

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

      {/* Main Catalog Grid */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-foreground tracking-tight">
              Katalog Buku
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Jelajahi dan pinjam buku kurikulum resmi, modul ajar, dan koleksi fisik sekolah.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono bg-muted/60 border border-border px-2.5 py-1 rounded-full">
            {books.length} Koleksi
          </span>
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
          onBorrowPhysical={handleBorrowPhysical}
          onSelectDetail={setSelectedDetailBook}
          borrowedBookIds={borrowedBookIds}
          borrowedDigitalIds={borrowedDigitalIds}
          borrowedPhysicalIds={borrowedPhysicalIds}
          isLoading={isLoading}
        />
      </div>

      {/* Book Detail Modal (Shadcn Dialog) */}
      {selectedDetailBook && (() => {
        const digitalLoan = userLoans.find(
          (l) => l.bookId === selectedDetailBook.id && l.loanType === 'DIGITAL' && l.status === 'BORROWED'
        );
        const physicalLoan = userLoans.find(
          (l) => l.bookId === selectedDetailBook.id && l.loanType === 'PHYSICAL' && l.status === 'BORROWED'
        );
        const physicalReservation = userLoans.find(
          (l) => l.bookId === selectedDetailBook.id && l.loanType === 'PHYSICAL' && l.status === 'RESERVED'
        );

        return (
          <BookDetailModal
            book={selectedDetailBook}
            onClose={() => setSelectedDetailBook(null)}
            onBorrowDigital={handleBorrowDigital}
            onBorrowPhysical={handleBorrowPhysical}
            onReservePhysical={handleReservePhysical}
            onOpenReader={(b) => setReadingBook(b)}
            isDigitalBorrowed={!!digitalLoan}
            isPhysicalBorrowed={!!physicalLoan}
            isPhysicalReserved={!!physicalReservation}
            reservationCode={physicalReservation?.reservationCode}
          />
        );
      })()}

      {/* PDF Reader Modal if opened from BookDetailModal */}
      {readingBook && user && (
        <PDFReader
          book={readingBook}
          user={user}
          onClose={() => setReadingBook(null)}
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

      {/* Self-Service QR / Barcode Scanner Modal for Borrowing Physical Books */}
      <BarcodeScannerModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onScan={handleScanQrBorrow}
        title="Pindai QR / Barcode untuk Pinjam Buku Fisik"
        description="Arahkan kamera ke stiker QR eksemplar buku fisik atau unggah gambar stiker QR untuk langsung meminjamnya."
        quickOptions={availableCopies.map((c) => ({
          code: c.barcode,
          label: c.bookTitle,
        }))}
      />
    </div>
  );
};
