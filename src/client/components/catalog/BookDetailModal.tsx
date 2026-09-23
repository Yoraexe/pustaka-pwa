/**
 * @file src/client/components/catalog/BookDetailModal.tsx
 * @description Modal detail buku dengan arsitektur Radix UI Dialog Shadcn, bebas icon dekoratif dan fokus pada kejelasan data.
 * @layer Presentation Component
 */

import React from 'react';
import type { Book } from '../../../shared/types/index.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';

interface BookDetailModalProps {
  book: Book;
  onClose: () => void;
  onBorrowDigital?: (book: Book) => void;
  isBorrowed?: boolean;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onBorrowDigital,
  isBorrowed = false,
}) => {
  const isDigital = book.bookType === 'DIGITAL_ONLY' || book.bookType === 'HYBRID';
  const isPhysical = book.bookType === 'PHYSICAL_ONLY' || book.bookType === 'HYBRID';

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline">{book.categoryName || 'Umum'}</Badge>
            {book.bookType === 'HYBRID' && <Badge variant="hybrid">Hybrid</Badge>}
            {book.bookType === 'DIGITAL_ONLY' && <Badge variant="ebook">E-Book</Badge>}
            {book.bookType === 'PHYSICAL_ONLY' && <Badge variant="physical">Fisik</Badge>}
          </div>
          <DialogTitle className="text-xl font-bold">{book.title}</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            {book.author} • {book.publisher} ({book.publicationYear})
            {book.isbn && <span className="block font-mono mt-1 text-foreground/80">ISBN: {book.isbn}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-6 my-3">
          {/* Book Cover */}
          <div className="w-28 sm:w-36 aspect-[3/4] rounded-2xl bg-muted overflow-hidden shrink-0 mx-auto sm:mx-0 shadow-sm border border-border">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 p-3 text-center">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
                  Sampul
                </span>
                <span className="text-xs text-foreground font-semibold line-clamp-3">{book.title}</span>
              </div>
            )}
          </div>

          {/* Availability Breakdown */}
          <div className="flex-1 space-y-3">
            {isPhysical && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">Koleksi Fisik Perpustakaan</h4>
                  <span className="font-mono text-[11px] bg-background/80 px-2 py-0.5 rounded border border-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold">
                    Rak: {book.shelfLocation || 'Utama'}
                  </span>
                </div>
                <p className="text-amber-800 dark:text-amber-300/90 leading-relaxed">
                  Tersedia <strong>{book.availablePhysicalCopies}</strong> dari total {book.totalPhysicalCopies} eksemplar fisik di perpustakaan.
                </p>
              </div>
            )}

            {isDigital && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200">Format Digital (In-App Reader)</h4>
                  <span className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/15 px-2 py-0.5 rounded-full">
                    Akses Luring
                  </span>
                </div>
                <p className="text-blue-800 dark:text-blue-300/90 text-[11px] leading-relaxed">
                  Dapat dibaca langsung di browser atau disimpan luring (IndexedDB) dengan proteksi watermark nama siswa.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4">
          <Button variant="outline" onClick={onClose} className="text-xs">
            Tutup
          </Button>

          {isBorrowed ? (
            <div className="inline-flex items-center px-4 py-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/20">
              Buku Ini Sedang Anda Pinjam
            </div>
          ) : isDigital ? (
            <Button
              variant="default"
              onClick={() => {
                onBorrowDigital?.(book);
                onClose();
              }}
              className="text-xs font-semibold"
            >
              Pinjam E-Book (7 Hari)
            </Button>
          ) : (
            <div className="inline-flex items-center px-4 py-2 bg-muted text-muted-foreground rounded-xl text-xs font-medium">
              Kunjungi meja perpustakaan untuk meminjam fisik
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
