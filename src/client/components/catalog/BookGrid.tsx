/**
 * @file src/client/components/catalog/BookGrid.tsx
 * @description Komponen grid katalog buku dengan filter format, filter ketersediaan stok real-time, pengurutan, dan pencarian efisien.
 * @layer Presentation Component
 * 
 * Tujuan: Menyajikan daftar koleksi buku terfilter dengan kontrol ketersediaan dan opsi sortir editorial.
 * Caller: src/client/pages/CatalogPage.tsx
 * Dependensi: react, shared/types, BookCard, Radix Tabs, Button.
 * Main Functions: BookGrid
 * Side Effects: Render list, trigger callback seleksi detail dan peminjaman digital.
 */

import React, { useState, useMemo } from 'react';
import type { Book, Category, BookType } from '../../../shared/types/index.js';
import { BookCard } from './BookCard.js';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs.js';
import { Button } from '../ui/button.js';
import { Search } from 'lucide-react';

interface BookGridProps {
  books: Book[];
  categories: Category[];
  selectedCategory?: number;
  onSelectCategory: (catId?: number) => void;
  selectedType: BookType | 'ALL';
  onSelectType: (type: BookType | 'ALL') => void;
  searchTerm: string;
  onSearchChange: (val: string) => void;
  onBorrowDigital: (book: Book) => void;
  onBorrowPhysical?: (book: Book) => void;
  onSelectDetail: (book: Book) => void;
  borrowedBookIds: Set<number>;
  borrowedDigitalIds?: Set<number>;
  borrowedPhysicalIds?: Set<number>;
  isLoading: boolean;
}

export const BookGrid: React.FC<BookGridProps> = ({
  books,
  categories,
  selectedCategory,
  onSelectCategory,
  selectedType,
  onSelectType,
  searchTerm,
  onSearchChange,
  onBorrowDigital,
  onBorrowPhysical,
  onSelectDetail,
  borrowedBookIds,
  borrowedDigitalIds,
  borrowedPhysicalIds,
  isLoading,
}) => {
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'latest' | 'title' | 'year'>('latest');

  // Filter & Sortir Buku Real-Time di sisi Klien
  const displayedBooks = useMemo(() => {
    let list = [...books];

    // 1. Filter Ketersediaan Nyata (E-Book selalu tersedia, Buku Fisik memiliki eksemplar > 0)
    if (onlyAvailable) {
      list = list.filter((b) => {
        if (b.bookType === 'DIGITAL_ONLY') return true;
        return b.availablePhysicalCopies > 0;
      });
    }

    // 2. Sortir Berdasarkan Opsi
    list.sort((a, b) => {
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title, 'id');
      }
      if (sortBy === 'year') {
        return b.publicationYear - a.publicationYear;
      }
      return b.id - a.id;
    });

    return list;
  }, [books, onlyAvailable, sortBy]);

  return (
    <div className="space-y-6">
      {/* Search Bar & Fast Filters */}
      <div className="bg-card p-4 sm:p-5 rounded-3xl border border-border shadow-xs space-y-4">
        {/* Search Input Box */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari judul buku, penulis, atau topik pelajaran..."
              className="w-full pl-11 pr-10 py-2.5 bg-muted/40 border border-border/80 rounded-2xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground text-xs rounded-full cursor-pointer transition-colors"
                title="Hapus pencarian"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/60">
          <Tabs
            value={selectedType}
            onValueChange={(val) => onSelectType(val as BookType | 'ALL')}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-4 sm:flex h-9 rounded-xl p-0.5 bg-muted/60">
              <TabsTrigger value="ALL" className="text-[11px] rounded-lg">
                Semua
              </TabsTrigger>
              <TabsTrigger value="DIGITAL_ONLY" className="text-[11px] rounded-lg">
                E-Book
              </TabsTrigger>
              <TabsTrigger value="PHYSICAL_ONLY" className="text-[11px] rounded-lg">
                Fisik
              </TabsTrigger>
              <TabsTrigger value="HYBRID" className="text-[11px] rounded-lg">
                Hybrid
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <span className="text-xs text-muted-foreground hidden md:inline font-mono">
            {displayedBooks.length} Buku
          </span>
        </div>

        {/* Real-time Availability & Sorting Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/60">
          {/* Checkbox Hanya yang Tersedia */}
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-foreground font-medium">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="rounded border-border text-primary focus:ring-primary w-4 h-4 accent-primary cursor-pointer"
            />
            <span>Tersedia saja</span>
          </label>

          {/* Sort Selector */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'latest' | 'title' | 'year')}
              className="bg-muted/50 border border-border/80 rounded-xl px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring font-medium"
            >
              <option value="latest">Terbaru</option>
              <option value="title">Judul (A-Z)</option>
              <option value="year">Tahun Terbit</option>
            </select>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar pt-1">
          <button
            onClick={() => onSelectCategory(undefined)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedCategory === undefined
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            Semua Kategori
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Book Grid Listing */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
            <div key={n} className="bg-card rounded-3xl border border-border p-3 h-72">
              <div className="bg-muted aspect-[3/4] rounded-2xl w-full mb-3" />
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : displayedBooks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {displayedBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onBorrowDigital={onBorrowDigital}
              onBorrowPhysical={onBorrowPhysical}
              onSelectDetail={onSelectDetail}
              isBorrowedByUser={borrowedBookIds.has(book.id)}
              isDigitalBorrowed={borrowedDigitalIds ? borrowedDigitalIds.has(book.id) : borrowedBookIds.has(book.id)}
              isPhysicalBorrowed={borrowedPhysicalIds ? borrowedPhysicalIds.has(book.id) : borrowedBookIds.has(book.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-card rounded-3xl border border-border p-8">
          <h4 className="font-bold text-foreground text-sm">Tidak ada buku ditemukan</h4>
          <p className="text-xs text-muted-foreground mt-1 mb-4">
            Coba sesuaikan kata kunci pencarian atau filter format.
          </p>
          {(searchTerm || selectedCategory !== undefined || selectedType !== 'ALL' || onlyAvailable) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSearchChange('');
                onSelectCategory(undefined);
                onSelectType('ALL');
                setOnlyAvailable(false);
              }}
              className="text-xs"
            >
              Reset Filter
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
