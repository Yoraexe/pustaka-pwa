/**
 * @file src/client/components/catalog/BookGrid.tsx
 * @description Komponen grid katalog buku dengan filter format berbasis Tabs Radix UI, pencarian efisien, bebas dari icon dekoratif.
 * @layer Presentation Component
 */

import React from 'react';
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
  onSelectDetail: (book: Book) => void;
  borrowedBookIds: Set<number>;
  isLoading: boolean;
  onOpenCommand?: () => void;
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
  isLoading,
  onOpenCommand,
}) => {
  return (
    <div className="space-y-6">
      {/* Search Bar & Fast Filters */}
      <div className="bg-card p-4 sm:p-5 rounded-3xl border border-border shadow-xs space-y-4">
        {/* Search Input Box */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Cari judul buku, pengarang, kurikulum, topik..."
              className="w-full pl-11 pr-20 py-2.5 bg-muted/40 border border-border/80 rounded-2xl text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-background transition-all"
            />
            {onOpenCommand && (
              <button
                type="button"
                onClick={onOpenCommand}
                className="hidden sm:inline-flex items-center absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-background border border-border text-[10px] text-muted-foreground font-mono shadow-xs hover:text-foreground"
              >
                ⌘K
              </button>
            )}
          </div>

          {onOpenCommand && (
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden shrink-0 rounded-2xl font-mono text-xs px-3"
              onClick={onOpenCommand}
            >
              ⌘K
            </Button>
          )}
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

          <span className="text-[11px] text-muted-foreground hidden md:inline font-mono">
            Total {books.length} Koleksi
          </span>
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
      ) : books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {books.map((book) => (
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
        <div className="text-center py-16 bg-card rounded-3xl border border-border p-8">
          <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground/80 block mb-2">
            Pencarian Nihil
          </span>
          <h4 className="font-bold text-foreground text-base">Tidak ada koleksi buku yang cocok</h4>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto mb-4">
            Coba gunakan kata kunci pencarian yang lain atau reset filter format dan kategori.
          </p>
          {(searchTerm || selectedCategory !== undefined || selectedType !== 'ALL') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                onSearchChange('');
                onSelectCategory(undefined);
                onSelectType('ALL');
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
