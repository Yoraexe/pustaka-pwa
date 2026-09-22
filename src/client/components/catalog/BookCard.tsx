/**
 * @file src/client/components/catalog/BookCard.tsx
 * @description Kartu buku katalog hybrid dengan CardSpotlight dan BackgroundGradient resmi Aceternity UI, dipadu Shadcn UI Badge & Button.
 * @layer Presentation Component
 */

import React from 'react';
import type { Book } from '../../../shared/types/index.js';
import { CardSpotlight } from '../ui/card-spotlight.js';
import { BackgroundGradient } from '../ui/background-gradient.js';
import { Badge } from '../ui/badge.js';
import { Button } from '../ui/button.js';
import { Tablet, BookOpen, MapPin, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';

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
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-muted/40 to-muted/80 text-center">
            <BookOpen size={36} className="text-primary mb-2 opacity-80" />
            <span className="text-xs font-bold text-foreground line-clamp-3 leading-snug">
              {book.title}
            </span>
            <span className="text-[10px] text-muted-foreground mt-1">{book.author}</span>
          </div>
        )}

        {/* Format Badges (Top-Left) */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 z-20">
          {isHybrid && (
            <Badge variant="hybrid" className="shadow-xs">
              <Sparkles size={10} className="mr-0.5 text-indigo-600" />
              Hybrid
            </Badge>
          )}
          {book.bookType === 'DIGITAL_ONLY' && (
            <Badge variant="ebook" className="shadow-xs">
              <Tablet size={10} className="mr-0.5 text-blue-600" />
              E-Book
            </Badge>
          )}
          {book.bookType === 'PHYSICAL_ONLY' && (
            <Badge variant="physical" className="shadow-xs">
              <BookOpen size={10} className="mr-0.5 text-amber-600" />
              Fisik
            </Badge>
          )}
        </div>

        {/* Category Pill (Top-Right) */}
        <div className="absolute top-2.5 right-2.5 z-20">
          <span className="bg-background/90 backdrop-blur-md text-foreground text-[10px] font-medium px-2 py-0.5 rounded-full border border-border/80 shadow-xs">
            {book.categoryName || 'Umum'}
          </span>
        </div>
      </div>

      {/* Book Metadata & Action */}
      <div className="p-3.5 flex-1 flex flex-col justify-between z-20">
        <div>
          <h3
            onClick={() => onSelectDetail?.(book)}
            className="font-bold text-sm text-foreground line-clamp-2 hover:text-primary cursor-pointer leading-snug transition-colors"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 truncate">
            {book.author} • {book.publicationYear}
          </p>

          {/* Availability Details */}
          <div className="mt-2.5 pt-2 border-t border-border/60 text-[11px] space-y-1">
            {isPhysical && (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <MapPin size={12} className="text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="truncate">
                  {book.shelfLocation || 'Rak Meja Pustaka'}
                  <span className="ml-1 text-[10px] font-semibold text-muted-foreground">
                    ({book.availablePhysicalCopies}/{book.totalPhysicalCopies} eks)
                  </span>
                </span>
              </div>
            )}

            {isDigital && (
              <div className="flex items-center gap-1.5 text-primary font-medium">
                <CheckCircle size={12} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="truncate">E-Book Digital Siap Baca</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-2">
          {isBorrowedByUser ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSelectDetail?.(book)}
              className="w-full text-emerald-700 dark:text-emerald-300 border-emerald-300/50 bg-emerald-50/50 dark:bg-emerald-950/40 hover:bg-emerald-100/60"
            >
              <CheckCircle size={13} className="mr-1 text-emerald-600" />
              Sudah Dipinjam (Buka)
            </Button>
          ) : isDigital ? (
            <Button
              variant="default"
              size="sm"
              onClick={() => onBorrowDigital?.(book)}
              className="w-full shadow-xs"
            >
              <Tablet size={13} className="mr-1.5" />
              Pinjam E-Book
            </Button>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onSelectDetail?.(book)}
              className="w-full text-muted-foreground"
            >
              <AlertCircle size={13} className="mr-1 text-amber-600" />
              Pinjam di Meja Perpus
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  // Use Aceternity BackgroundGradient for Hybrid books, and CardSpotlight for others
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
