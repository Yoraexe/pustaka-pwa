/**
 * @file src/client/components/catalog/BookGrid.tsx
 * @description Komponen grid katalog buku dengan filter pencarian, kategori, dan format koleksi.
 * @layer Presentation Component
 */

import React from 'react';
import type { Book, Category, BookType } from '../../../shared/types/index.js';
import { BookCard } from './BookCard.js';
import { Search, SlidersHorizontal, BookOpen } from 'lucide-react';

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
  onSelectDetail: (book: Book) => void;
  borrowedBookIds: Set<number>;
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
  onSelectDetail,
  borrowedBookIds,
  isLoading
}) => {
  return (
    <div className="space-y-6">
      {/* Search Bar & Fast Filters */}
      <div className="bg-surface-card p-4 rounded-2xl border border-border-subtle shadow-sm space-y-4">
        {/* Search Input Box */}
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Cari judul buku, penulis (contoh: Informatika, Python, Algoritma)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
          />
        </div>

        {/* Format Selector Pills (All vs Digital vs Fisik) */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mr-1 font-semibold">
            <SlidersHorizontal size={14} />
            <span>Format:</span>
          </div>

          {[
            { label: 'Semua Format', value: 'ALL' },
            { label: 'E-Book Digital', value: 'DIGITAL_ONLY' },
            { label: 'Buku Fisik', value: 'PHYSICAL_ONLY' },
            { label: 'Hybrid (Digital & Fisik)', value: 'HYBRID' }
          ].map(f => (
            <button
              key={f.value}
              onClick={() => onSelectType(f.value as BookType | 'ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedType === f.value
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-slate-100 text-text-muted hover:text-text-main hover:bg-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => onSelectCategory(undefined)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedCategory === undefined
                ? 'bg-primary-100 text-primary-700 font-bold'
                : 'bg-slate-100 text-text-muted hover:bg-slate-200'
            }`}
          >
            Semua Kategori
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-primary-100 text-primary-700 font-bold'
                  : 'bg-slate-100 text-text-muted hover:bg-slate-200'
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
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="bg-surface-card rounded-2xl border border-slate-200 p-3 h-72">
              <div className="bg-slate-200 aspect-[3/4] rounded-xl w-full mb-3" />
              <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-slate-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {books.map(book => (
            <BookCard
              key={book.id}
              book={book}
              onBorrowDigital={onBorrowDigital}
              onSelectDetail={onSelectDetail}
              isBorrowedByUser={borrowedBookIds.has(book.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-surface-card rounded-2xl border border-border-subtle p-8">
          <BookOpen size={48} className="mx-auto text-slate-300 mb-3" />
          <h4 className="font-semibold text-text-main text-base">Tidak ada koleksi buku yang cocok</h4>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Coba gunakan kata kunci pencarian yang lain atau ubah filter format dan kategori.
          </p>
        </div>
      )}
    </div>
  );
};
