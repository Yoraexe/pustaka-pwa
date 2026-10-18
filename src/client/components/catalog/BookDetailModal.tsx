/**
 * @file src/client/components/catalog/BookDetailModal.tsx
 * @description Modal detail buku dengan arsitektur Radix UI Dialog Shadcn, fitur click-to-copy lokasi rak & ISBN, serta bebas icon dekoratif.
 * @layer Presentation Component
 * 
 * Tujuan: Menampilkan informasi mendalam mengenai ketersediaan buku fisik di rak dan buku digital, disertai aksi pinjam dan salin metadata.
 * Caller: src/client/pages/CatalogPage.tsx, src/client/App.tsx (Command Palette)
 * Dependensi: react, shared/types, Radix UI Dialog, Button, Badge, sonner.
 * Main Functions: BookDetailModal
 * Side Effects: Membaca clipboard API, trigger Sonner toast feedback, memanggil callback onBorrowDigital.
 */

import React, { useState, useEffect } from 'react';
import type { Book, BookCopy } from '../../../shared/types/index.js';
import { api } from '../../services/api.js';
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
import { QrCodeDisplay } from '../common/QrCodeDisplay.js';
import { toast } from 'sonner';

interface BookDetailModalProps {
  book: Book;
  onClose: () => void;
  onBorrowDigital?: (book: Book) => void;
  onBorrowPhysical?: (book: Book, copyBarcode?: string) => void;
  onReservePhysical?: (book: Book) => void;
  onOpenReader?: (book: Book) => void;
  isDigitalBorrowed?: boolean;
  isPhysicalBorrowed?: boolean;
  isPhysicalReserved?: boolean;
  reservationCode?: string | null;
  isBorrowed?: boolean;
}

export const BookDetailModal: React.FC<BookDetailModalProps> = ({
  book,
  onClose,
  onBorrowDigital,
  onBorrowPhysical,
  onReservePhysical,
  onOpenReader,
  isDigitalBorrowed,
  isPhysicalBorrowed,
  isPhysicalReserved,
  reservationCode,
  isBorrowed = false,
}) => {
  const hasEbook = Boolean(book.ebookFilePath);
  const isDigital = book.bookType === 'DIGITAL_ONLY' || book.bookType === 'HYBRID';
  const isPhysical = book.bookType === 'PHYSICAL_ONLY' || book.bookType === 'HYBRID';
  const [copies, setCopies] = useState<BookCopy[]>(book.copies || []);
  const [selectedBarcode, setSelectedBarcode] = useState<string | undefined>(undefined);

  const digitalActive = isDigitalBorrowed ?? isBorrowed;
  const physicalActive = isPhysicalBorrowed ?? isBorrowed;
  const physicalReserved = isPhysicalReserved ?? false;

  useEffect(() => {
    if (isPhysical && (!book.copies || book.copies.length === 0)) {
      api.getBookById(book.id)
        .then((b: Book) => {
          if (b.copies) {
            setCopies(b.copies);
            const firstAvail = b.copies.find((c) => c.status === 'AVAILABLE');
            if (firstAvail) setSelectedBarcode(firstAvail.barcode);
          }
        })
        .catch((err: unknown) => console.error('Failed to load copies', err));
    } else if (book.copies) {
      setCopies(book.copies);
      const firstAvail = book.copies.find((c) => c.status === 'AVAILABLE');
      if (firstAvail) setSelectedBarcode(firstAvail.barcode);
    }
  }, [book.id, isPhysical, book.copies]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} Disalin`, {
        description: `Teks "${text}" telah disalin ke papan klip perangkat.`,
      });
    }).catch(() => {
      toast.info(text);
    });
  };

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
            {book.isbn && (
              <span className="block font-mono mt-1 text-foreground/80">
                ISBN:{' '}
                <button
                  type="button"
                  onClick={() => handleCopy(book.isbn!, 'Nomor ISBN')}
                  className="hover:underline hover:text-primary transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold"
                  title="Klik untuk menyalin nomor ISBN"
                >
                  {book.isbn}
                  <span className="text-[10px] text-muted-foreground font-normal">(Salin)</span>
                </button>
              </span>
            )}
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
                  <h4 className="font-bold text-amber-900 dark:text-amber-200">Koleksi Fisik</h4>
                  <button
                    type="button"
                    onClick={() => handleCopy(book.shelfLocation || 'Utama', 'Kode Lokasi Rak')}
                    className="font-mono text-[11px] bg-background/80 hover:bg-background px-2 py-0.5 rounded border border-amber-500/30 text-amber-900 dark:text-amber-200 font-semibold cursor-pointer transition-colors shadow-xs"
                    title="Klik untuk menyalin kode rak"
                  >
                    Rak: {book.shelfLocation || 'Utama'} (Salin)
                  </button>
                </div>
                <p className="text-amber-800 dark:text-amber-300/90">
                  Tersedia <strong>{book.availablePhysicalCopies}</strong> dari {book.totalPhysicalCopies} eksemplar.
                </p>

                {/* Daftar Barcode Eksemplar (Bisa dipilih untuk Pinjam Fisik) & QR Code */}
                {copies.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex-1">
                      <span className="text-[10px] text-amber-900/80 dark:text-amber-300/80 font-mono uppercase tracking-wider block mb-1.5 font-semibold">
                        Pilih / Salin Barcode Eksemplar ({copies.length}):
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                        {copies.map((c) => {
                          const isSelected = selectedBarcode === c.barcode && c.status === 'AVAILABLE';
                          return (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setSelectedBarcode(c.barcode);
                                handleCopy(c.barcode, 'Barcode Eksemplar');
                              }}
                              className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-colors flex items-center gap-1.5 cursor-pointer ${
                                isSelected
                                  ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                  : c.status === 'AVAILABLE'
                                  ? 'bg-background hover:bg-emerald-500/10 border-emerald-500/30 text-foreground font-semibold shadow-2xs'
                                  : 'bg-muted/70 border-border text-muted-foreground line-through opacity-70'
                              }`}
                              title={`Barcode: ${c.barcode} (${c.status === 'AVAILABLE' ? 'Tersedia - Klik untuk pilih & salin' : 'Sedang dipinjam'})`}
                            >
                              <span>{c.barcode}</span>
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  isSelected
                                    ? 'bg-primary-foreground'
                                    : c.status === 'AVAILABLE'
                                    ? 'bg-emerald-500'
                                    : 'bg-muted-foreground'
                                }`}
                              />
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Stiker QR Code Nyata yang Dapat Dipindai / Diunduh */}
                    {(selectedBarcode || copies[0]?.barcode) && (
                      <div className="shrink-0 flex flex-col items-center bg-background/70 p-2 rounded-xl border border-amber-500/20">
                        <QrCodeDisplay
                          value={selectedBarcode || copies[0].barcode}
                          label={selectedBarcode || copies[0].barcode}
                          size={76}
                          showDownload={true}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {isDigital && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-blue-900 dark:text-blue-200">Format Digital</h4>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      hasEbook
                        ? 'text-blue-700 dark:text-blue-300 bg-blue-500/15'
                        : 'text-amber-700 dark:text-amber-300 bg-amber-500/15'
                    }`}
                  >
                    {hasEbook ? 'Akses Luring & Daring' : 'Dokumen PDF Menunggu'}
                  </span>
                </div>
                <p className="text-blue-800 dark:text-blue-300/90 text-xs">
                  {hasEbook
                    ? 'Dapat dibaca langsung di browser atau disimpan untuk akses luring tanpa internet.'
                    : 'Berkas e-book belum diunggah oleh staf perpustakaan.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-4 flex-wrap gap-2">
          <Button variant="outline" onClick={onClose} className="text-xs">
            Tutup
          </Button>

          {/* Opsi Pinjam / Baca E-Book Digital */}
          {isDigital && (
            digitalActive ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-semibold border border-emerald-500/20">
                  E-Book Dipinjam
                </span>
                {onOpenReader && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onOpenReader(book);
                      onClose();
                    }}
                    className="text-xs font-semibold"
                  >
                    Baca Sekarang
                  </Button>
                )}
              </div>
            ) : hasEbook ? (
              <Button
                variant={book.bookType === 'DIGITAL_ONLY' ? 'default' : 'secondary'}
                onClick={() => {
                  onBorrowDigital?.(book);
                  onClose();
                }}
                className="text-xs font-semibold"
              >
                Pinjam E-Book
              </Button>
            ) : (
              <div className="inline-flex items-center px-3 py-1.5 bg-muted text-muted-foreground rounded-xl text-xs font-medium">
                E-Book Belum Tersedia
              </div>
            )
          )}

          {/* Opsi Pinjam Fisik Langsung & Reservasi Buku Fisik */}
          {isPhysical && (
            physicalActive ? (
              <div className="inline-flex items-center px-3 py-1.5 bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded-xl text-xs font-semibold border border-blue-500/20">
                Buku Fisik Dipinjam
              </div>
            ) : physicalReserved ? (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1.5 bg-amber-500/10 text-amber-700 dark:text-amber-300 rounded-xl text-xs font-semibold border border-amber-500/20">
                  Tiket: {reservationCode || 'Aktif'}
                </span>
                {onBorrowPhysical && (
                  <Button
                    size="sm"
                    onClick={() => {
                      onBorrowPhysical(book, selectedBarcode);
                      onClose();
                    }}
                    className="text-xs font-semibold"
                  >
                    Pinjam Fisik Sekarang
                  </Button>
                )}
              </div>
            ) : book.availablePhysicalCopies > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {onReservePhysical && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onReservePhysical(book);
                      onClose();
                    }}
                    className="text-xs font-semibold border-amber-500/40 hover:bg-amber-500/10 text-amber-900 dark:text-amber-200"
                  >
                    Reservasi Tiket (24 Jam)
                  </Button>
                )}
                {onBorrowPhysical && (
                  <Button
                    variant="default"
                    onClick={() => {
                      onBorrowPhysical(book, selectedBarcode);
                      onClose();
                    }}
                    className="text-xs font-semibold shadow-xs"
                  >
                    Pinjam Buku Fisik {selectedBarcode ? `(${selectedBarcode})` : ''}
                  </Button>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center px-3 py-1.5 bg-muted text-muted-foreground rounded-xl text-xs font-medium">
                Stok Fisik Habis
              </div>
            )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

