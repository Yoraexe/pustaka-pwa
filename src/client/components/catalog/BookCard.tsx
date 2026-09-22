/**
 * @file src/client/components/catalog/BookCard.tsx
 * @description Kartu buku untuk tampilan katalog hybrid dengan badge status dan aksi peminjaman.
 * @layer Presentation Component
 */

import React from 'react';
import type { Book } from '../../../shared/types/index.js';
import { Tablet, BookOpen, MapPin, CheckCircle, AlertCircle } from 'lucide-react';

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
  isBorrowedByUser = false
}) => {
  const isDigital = book.bookType === 'DIGITAL_ONLY' || book.bookType === 'HYBRID';
  const isPhysical = book.bookType === 'PHYSICAL_ONLY' || book.bookType === 'HYBRID';

  return (
    <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col group">
      {/* Cover Image Container */}
      <div className="relative aspect-[3/4] bg-slate-100 overflow-hidden cursor-pointer" onClick={() => onSelectDetail?.(book)}>
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-50 to-slate-200 text-center">
            <BookOpen size={40} className="text-primary-600 mb-2 opacity-60" />
            <span className="text-xs font-bold text-text-main line-clamp-3">{book.title}</span>
            <span className="text-[10px] text-text-muted mt-1">{book.author}</span>
          </div>
        )}

        {/* Format Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {book.bookType === 'HYBRID' && (
            <span className="bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <span>Hybrid</span>
            </span>
          )}
          {book.bookType === 'DIGITAL_ONLY' && (
            <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <Tablet size={10} />
              <span>E-Book</span>
            </span>
          )}
          {book.bookType === 'PHYSICAL_ONLY' && (
            <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
              <BookOpen size={10} />
              <span>Fisik</span>
            </span>
          )}
        </div>

        {/* Category Pill */}
        <div className="absolute top-2 right-2">
          <span className="bg-white/90 backdrop-blur-sm text-text-main text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm">
            {book.categoryName || 'Umum'}
          </span>
        </div>
      </div>

      {/* Book Metadata */}
      <div className="p-3.5 flex-1 flex flex-col justify-between">
        <div>
          <h3
            onClick={() => onSelectDetail?.(book)}
            className="font-bold text-sm text-text-main line-clamp-2 hover:text-primary-600 cursor-pointer leading-snug"
            title={book.title}
          >
            {book.title}
          </h3>
          <p className="text-xs text-text-muted mt-1 truncate">
            {book.author} • {book.publicationYear}
          </p>

          {/* Availability Details */}
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] space-y-1">
            {isPhysical && (
              <div className="flex items-center gap-1 text-slate-600">
                <MapPin size={12} className="text-amber-600 shrink-0" />
                <span className="truncate">
                  {book.shelfLocation || 'Rak Meja Pustaka'}
                  <span className="ml-1 text-[10px] font-semibold text-text-muted">
                    ({book.availablePhysicalCopies}/{book.totalPhysicalCopies} eks)
                  </span>
                </span>
              </div>
            )}

            {isDigital && (
              <div className="flex items-center gap-1 text-primary-700">
                <CheckCircle size={12} className="shrink-0" />
                <span className="truncate">E-Book Digital Tersedia (In-App)</span>
              </div>
            )}
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-3 pt-2">
          {isBorrowedByUser ? (
            <button
              onClick={() => onSelectDetail?.(book)}
              className="w-full py-1.5 px-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle size={14} />
              <span>Sudah Dipinjam (Buka)</span>
            </button>
          ) : isDigital ? (
            <button
              onClick={() => onBorrowDigital?.(book)}
              className="w-full py-1.5 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
            >
              <Tablet size={14} />
              <span>Pinjam E-Book</span>
            </button>
          ) : (
            <button
              onClick={() => onSelectDetail?.(book)}
              className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-text-main rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <AlertCircle size={14} className="text-amber-600" />
              <span>Pinjam di Meja Perpus</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
