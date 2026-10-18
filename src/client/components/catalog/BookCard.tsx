/**
 * @file src/client/components/catalog/BookCard.tsx
 * @description Kartu buku katalog hybrid dengan tipografi tajam, Aceternity CardSpotlight, serta aksi langsung Pinjam E-Book & Pinjam Fisik.
 * @layer Presentation Component
 * 
 * Tujuan: Menampilkan kartu ringkasan buku di katalog dengan status stok real-time dan tombol peminjaman langsung (Digital & Fisik).
 * Caller: src/client/components/catalog/BookGrid.tsx
 * Dependensi: react, shared/types, CardSpotlight, Badge, Button.
 * Main Functions: BookCard
 * Side Effects: Memicu callback onBorrowDigital, onBorrowPhysical, atau onSelectDetail.
 */

import React from 'react';
import type { Book } from '../../../shared/types/index.js';
import { CardSpotlight } from '../ui/card-spotlight.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';

interface BookCardProps {
  book: Book;
  onBorrowDigital?: (book: Book) => void;
  onBorrowPhysical?: (book: Book) => void;
  onSelectDetail?: (book: Book) => void;
  isBorrowedByUser?: boolean;
  isDigitalBorrowed?: boolean;
  isPhysicalBorrowed?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onBorrowDigital,
  onBorrowPhysical,
  onSelectDetail,
  isBorrowedByUser = false,
  isDigitalBorrowed,
  isPhysicalBorrowed,
}) => {
  const isDigital = book.bookType === 'DIGITAL_ONLY' || book.bookType === 'HYBRID';
  const isPhysical = book.bookType === 'PHYSICAL_ONLY' || book.bookType === 'HYBRID';
  const isHybrid = book.bookType === 'HYBRID';

  const digitalBorrowed = isDigitalBorrowed ?? isBorrowedByUser;
  const physicalBorrowed = isPhysicalBorrowed ?? isBorrowedByUser;

  const cardContent = (
    <div className="flex flex-col justify-between h-full bg-card rounded-[22px] overflow-hidden">
      {/* Cover Image & Badges */}
      <div
        className="relative aspect-[3/4] bg-muted/40 overflow-hidden cursor-pointer select-none"
        onClick={() => onSelectDetail?.(book)}
      >
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-5 bg-gradient-to-br from-primary/5 via-muted/30 to-muted/80 text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/80 mb-2 block">
              Buku Pelajaran
            </span>
            <span className="text-xs font-bold text-foreground line-clamp-3 leading-snug">
              {book.title}
            </span>
            <span className="text-[10px] text-muted-foreground mt-2 block">{book.author}</span>
          </div>
        )}

        {/* Format Badges (Top-Left) */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 z-20">
          {isHybrid && (
            <Badge variant="hybrid" className="shadow-xs font-medium">
              Hybrid
            </Badge>
          )}
          {book.bookType === 'DIGITAL_ONLY' && (
            <Badge variant="ebook" className="shadow-xs font-medium">
              E-Book
            </Badge>
          )}
          {book.bookType === 'PHYSICAL_ONLY' && (
            <Badge variant="physical" className="shadow-xs font-medium">
              Fisik
            </Badge>
          )}
        </div>

        {/* Category Pill (Top-Right) */}
        <div className="absolute top-3 right-3 z-20">
          <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-border/80 shadow-xs">
            {book.categoryName || 'Umum'}
          </span>
        </div>
      </div>

      {/* Book Metadata & Action */}
      <div className="p-4 flex-1 flex flex-col justify-between z-20">
        <div>
          <h3
            onClick={() => onSelectDetail?.(book)}
            className="font-bold text-sm text-foreground line-clamp-2 hover:text-primary cursor-pointer leading-snug transition-colors"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 truncate font-normal">
            {book.author} • {book.publicationYear}
          </p>

          {/* Availability Details */}
          <div className="mt-3 pt-2.5 border-t border-border/60 text-[11px] space-y-1">
            {isPhysical && (
              <div className="text-muted-foreground truncate">
                <span className="font-medium text-foreground">Rak {book.shelfLocation || 'Utama'}</span>
                <span className="ml-1 text-[10px] text-muted-foreground">
                  ({book.availablePhysicalCopies}/{book.totalPhysicalCopies} eks)
                </span>
              </div>
            )}

            {isDigital && (
              <div className="text-primary font-medium truncate text-[11px]">
                E-Book Digital
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-3.5 pt-2">
          {isHybrid ? (
            <div className="grid grid-cols-2 gap-1.5">
              {digitalBorrowed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectDetail?.(book)}
                  className="w-full text-emerald-700 dark:text-emerald-300 border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-950/40 font-semibold text-[11px] px-2"
                >
                  E-Book Aktif
                </Button>
              ) : book.ebookFilePath ? (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => onBorrowDigital?.(book)}
                  className="w-full shadow-xs font-semibold text-[11px] px-2"
                >
                  Pinjam E-Book
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full text-[11px] px-2 opacity-60"
                >
                  PDF Kosong
                </Button>
              )}

              {physicalBorrowed ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelectDetail?.(book)}
                  className="w-full text-blue-700 dark:text-blue-300 border-blue-300/50 bg-blue-50/50 dark:bg-blue-950/40 font-semibold text-[11px] px-2"
                >
                  Fisik Aktif
                </Button>
              ) : book.availablePhysicalCopies > 0 ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => (onBorrowPhysical ? onBorrowPhysical(book) : onSelectDetail?.(book))}
                  className="w-full font-semibold text-[11px] px-2 border border-amber-500/30 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15"
                >
                  Pinjam Fisik
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="w-full text-[11px] px-2 opacity-60"
                >
                  Fisik Habis
                </Button>
              )}
            </div>
          ) : isDigital ? (
            digitalBorrowed ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectDetail?.(book)}
                className="w-full text-emerald-700 dark:text-emerald-300 border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100/60 font-semibold text-xs"
              >
                E-Book Dipinjam
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => onBorrowDigital?.(book)}
                className="w-full shadow-xs font-semibold text-xs"
              >
                Pinjam E-Book
              </Button>
            )
          ) : physicalBorrowed ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectDetail?.(book)}
              className="w-full text-blue-700 dark:text-blue-300 border-blue-300/50 bg-blue-50/50 dark:bg-blue-950/40 font-semibold text-xs"
            >
              Fisik Dipinjam
            </Button>
          ) : book.availablePhysicalCopies > 0 ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => (onBorrowPhysical ? onBorrowPhysical(book) : onSelectDetail?.(book))}
              className="w-full shadow-xs font-semibold text-xs"
            >
              Pinjam Fisik
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled
              className="w-full text-xs opacity-60"
            >
              Stok Fisik Habis
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <CardSpotlight
      className="flex flex-col justify-between group hover:shadow-md transition-all duration-200 border-border bg-card h-full min-w-0"
      radius={240}
      color="rgba(59, 130, 246, 0.12)"
    >
      {cardContent}
    </CardSpotlight>
  );
};

