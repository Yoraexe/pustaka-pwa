/**
 * @file src/client/components/catalog/BookDetailModal.tsx
 * @description Modal detail buku dengan komponen Dialog berbasis Radix UI (Shadcn), aksesibilitas keyboard, dan status koleksi.
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
import { MapPin, Tablet, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

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
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">{book.categoryName || 'Umum'}</Badge>
            {book.bookType === 'HYBRID' && <Badge variant="hybrid">Hybrid</Badge>}
            {book.bookType === 'DIGITAL_ONLY' && <Badge variant="ebook">E-Book</Badge>}
            {book.bookType === 'PHYSICAL_ONLY' && <Badge variant="physical">Fisik</Badge>}
          </div>
          <DialogTitle>{book.title}</DialogTitle>
          <DialogDescription>
            {book.author} • {book.publisher} ({book.publicationYear})
            {book.isbn && <span className="block font-mono mt-0.5">ISBN: {book.isbn}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col sm:flex-row gap-5 my-2">
          {/* Book Cover */}
          <div className="w-28 sm:w-32 aspect-[3/4] rounded-2xl bg-muted overflow-hidden shrink-0 mx-auto sm:mx-0 shadow-sm border border-border">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-muted/60 p-2 text-center">
                <BookOpen size={28} className="text-muted-foreground opacity-60 mb-1" />
                <span className="text-[10px] text-muted-foreground font-medium line-clamp-2">{book.title}</span>
              </div>
            )}
          </div>

          {/* Availability Breakdown */}
          <div className="flex-1 space-y-3">
            {isPhysical && (
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3 text-xs">
                <div className="p-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-amber-800 dark:text-amber-200">Koleksi Fisik di Perpustakaan</h4>
                  <div className="mt-1 text-amber-700 dark:text-amber-300/90 space-y-0.5">
                    <p>
                      Lokasi Rak:{' '}
                      <strong className="font-mono bg-background/80 px-1.5 py-0.5 rounded border border-amber-500/20">
                        {book.shelfLocation || 'Meja Pustaka'}
                      </strong>
                    </p>
                    <p>
                      Ketersediaan: <strong>{book.availablePhysicalCopies}</strong> dari {book.totalPhysicalCopies} eks
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isDigital && (
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-start gap-3 text-xs">
                <div className="p-2 rounded-xl bg-blue-500/15 text-blue-700 dark:text-blue-300 shrink-0">
                  <Tablet size={16} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-blue-800 dark:text-blue-200">Format Digital (In-App Reader)</h4>
                  <p className="mt-1 text-blue-700 dark:text-blue-300/90 text-[11px] leading-relaxed">
                    Dapat dibaca langsung di browser atau disimpan luring (IndexedDB) dengan watermark keamanan identitas siswa.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>

          {isBorrowed ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/20">
              <CheckCircle2 size={16} />
              <span>Buku Sedang Anda Pinjam</span>
            </div>
          ) : isDigital ? (
            <Button
              variant="default"
              onClick={() => {
                onBorrowDigital?.(book);
                onClose();
              }}
              className="gap-1.5"
            >
              <Tablet size={15} />
              <span>Pinjam E-Book (7 Hari)</span>
            </Button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-2 bg-muted text-muted-foreground rounded-xl text-xs font-medium">
              <Layers size={14} />
              <span>Kunjungi meja perpustakaan untuk pinjam fisik</span>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
