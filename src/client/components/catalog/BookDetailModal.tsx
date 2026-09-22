/**
 * @file src/client/components/catalog/BookDetailModal.tsx
 * @description Modal detail buku menampilkan spesifikasi lengkap, nomor panggil rak, dan tombol aksi.
 * @layer Presentation Component
 */

import React from 'react';
import type { Book } from '../../../shared/types/index.js';
import { X, MapPin, Tablet, BookOpen, Layers, CheckCircle2 } from 'lucide-react';

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
  isBorrowed = false
}) => {
  const isDigital = book.bookType === 'DIGITAL_ONLY' || book.bookType === 'HYBRID';
  const isPhysical = book.bookType === 'PHYSICAL_ONLY' || book.bookType === 'HYBRID';

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-surface-card rounded-3xl border border-border-subtle shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-main rounded-full hover:bg-slate-100 transition-colors"
          aria-label="Tutup"
        >
          <X size={20} />
        </button>

        <div className="flex flex-col sm:flex-row gap-5">
          {/* Cover */}
          <div className="w-32 aspect-[3/4] rounded-2xl bg-slate-100 overflow-hidden shrink-0 mx-auto sm:mx-0 shadow-md">
            {book.coverUrl ? (
              <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-200">
                <BookOpen size={32} className="text-slate-400" />
              </div>
            )}
          </div>

          {/* Core Info */}
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="bg-primary-50 text-primary-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {book.categoryName || 'Informatika'}
              </span>
              <span className="bg-slate-100 text-text-muted text-[10px] font-medium px-2 py-0.5 rounded-full">
                {book.bookType}
              </span>
            </div>

            <h2 className="font-bold text-base md:text-lg text-text-main leading-tight">{book.title}</h2>
            <p className="text-xs text-text-muted mt-1">Penulis: <strong className="text-text-main">{book.author}</strong></p>
            <p className="text-xs text-text-muted">Penerbit: {book.publisher} ({book.publicationYear})</p>
            {book.isbn && <p className="text-xs text-text-muted font-mono">ISBN: {book.isbn}</p>}
          </div>
        </div>

        {/* Physical & Digital Availability Breakdown */}
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
          {isPhysical && (
            <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl flex items-start gap-3 text-xs">
              <div className="p-2 rounded-xl bg-amber-100 text-amber-800 shrink-0">
                <MapPin size={18} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-amber-900">Koleksi Fisik di Perpustakaan</h4>
                <div className="mt-1 text-amber-800 space-y-0.5">
                  <p>Lokasi Rak: <strong className="font-mono bg-white/80 px-1.5 py-0.5 rounded text-amber-900">{book.shelfLocation || 'Meja Pustaka Utama'}</strong></p>
                  <p>Ketersediaan: <strong>{book.availablePhysicalCopies}</strong> dari {book.totalPhysicalCopies} eksemplar dapat dipinjam.</p>
                </div>
              </div>
            </div>
          )}

          {isDigital && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/70 rounded-2xl flex items-start gap-3 text-xs">
              <div className="p-2 rounded-xl bg-blue-100 text-blue-800 shrink-0">
                <Tablet size={18} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-blue-900">Koleksi Digital (E-Book In-App)</h4>
                <p className="mt-1 text-blue-800">
                  Dapat dibaca langsung di browser atau disimpan untuk dibaca offline. Dilengkapi watermark nama dan nomor identitas siswa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Action Buttons */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-main rounded-xl transition-colors"
          >
            Tutup
          </button>

          {isBorrowed ? (
            <div className="px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl flex items-center gap-1.5">
              <CheckCircle2 size={16} />
              <span>Buku Ini Sedang Anda Pinjam</span>
            </div>
          ) : isDigital ? (
            <button
              onClick={() => {
                onBorrowDigital?.(book);
                onClose();
              }}
              className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <Tablet size={16} />
              <span>Pinjam E-Book (7 Hari)</span>
            </button>
          ) : (
            <div className="px-4 py-2 bg-slate-100 text-text-muted text-xs font-medium rounded-xl flex items-center gap-1.5">
              <Layers size={14} />
              <span>Silakan datang ke perpustakaan sekolah untuk meminjam fisik</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
