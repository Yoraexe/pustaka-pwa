/**
 * @file src/client/components/catalog/BookCard.tsx
 * @description Kartu buku katalog hybrid dengan tipografi tajam, Aceternity CardSpotlight & BackgroundGradient, bebas dari icon dekoratif.
 * @layer Presentation Component
 */

import React from 'react';
import type { Book } from '../../../shared/types/index.js';
import { CardSpotlight } from '../ui/card-spotlight.js';
import { BackgroundGradient } from '../ui/background-gradient.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';

interface BookCardProps {
  book: Book;
  onBorrowDigital?: (book: Book) => void;
  onSelectDetail?: (book: Book) => void;
  isBorrowedByUser?: boolean;
}

export const BookCard: React.FC<BookCardProps> = ({
  book,
  onBorrowDigital,
  onSelectDetail,
  isBorrowedByUser = false,
}) => {
  const isDigital = book.bookType === 'DIGITAL_ONLY' || book.bookType === 'HYBRID';
  const isPhysical = book.bookType === 'PHYSICAL_ONLY' || book.bookType === 'HYBRID';
  const isHybrid = book.bookType === 'HYBRID';

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
                E-Book Digital Siap Baca
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3.5 pt-2">
          {isBorrowedByUser ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectDetail?.(book)}
              className="w-full text-emerald-700 dark:text-emerald-300 border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100/60 font-semibold text-xs"
            >
              Sudah Dipinjam
            </Button>
          ) : isDigital ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => onBorrowDigital?.(book)}
              className="w-full shadow-xs font-semibold text-xs"
            >
              Pinjam E-Book
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectDetail?.(book)}
              className="w-full text-muted-foreground font-semibold text-xs"
            >
              Pinjam di Perpustakaan
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  if (isHybrid) {
    return (
      <BackgroundGradient
        className="rounded-[22px] p-0.5 bg-card h-full"
        containerClassName="h-full"
      >
        {cardContent}
      </BackgroundGradient>
    );
  }

  return (
    <CardSpotlight
      className="flex flex-col justify-between group hover:shadow-md transition-all duration-200 border-border bg-card h-full"
      radius={240}
      color="rgba(59, 130, 246, 0.12)"
    >
      {cardContent}
    </CardSpotlight>
  );
};
