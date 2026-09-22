/**
 * @file src/client/pages/MyBooksPage.tsx
 * @description Halaman 'Rak Buku Saya' menampilkan e-book yang sedang dipinjam dan riwayat peminjaman.
 * @layer Page Component
 */

import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { offlineStorage } from '../services/offlineStorage.js';
import type { Loan, Book, User } from '../../shared/types/index.js';
import { PDFReader } from '../components/reader/PDFReader.js';
import {
  BookmarkCheck, Clock, BookOpen, RotateCcw, AlertTriangle,
  CheckCircle2, HardDrive, Trash2, Smartphone
} from 'lucide-react';

interface MyBooksPageProps {
  user: User;
}

export const MyBooksPage: React.FC<MyBooksPageProps> = ({ user }) => {
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [offlineBooks, setOfflineBooks] = useState<Array<{ id: number; title: string; savedAt: string; size: number }>>([]);
  const [savedOfflineIds, setSavedOfflineIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [readingBook, setReadingBook] = useState<Book | null>(null);

  const fetchMyLoans = async () => {
    setIsLoading(true);

    // 1. Muat data instan dari cache lokal (localStorage)
    const cachedLoans = localStorage.getItem('pustaka_my_loans_true');
    if (cachedLoans) {
      try {
        setActiveLoans(JSON.parse(cachedLoans));
      } catch {
        // ignore
      }
    }

    // 2. Muat daftar buku offline dari IndexedDB
    try {
      const offlineList = await offlineStorage.getAllOfflineEbooks();
      setOfflineBooks(offlineList);
      setSavedOfflineIds(new Set(offlineList.map(b => b.id)));
    } catch (err) {
      console.warn('Gagal membaca IndexedDB offline books:', err);
    }

    // 3. Jika online, sinkronkan dengan server perpustakaan
    try {
      const data = await api.getMyLoans(true);
      setActiveLoans(data);

      // Periksa status offline untuk setiap buku pinjaman
      const offlineIds = new Set<number>();
      for (const loan of data) {
        if (loan.loanType === 'DIGITAL') {
          const isSaved = await offlineStorage.isEbookSaved(loan.bookId);
          if (isSaved) offlineIds.add(loan.bookId);
        }
      }
      setSavedOfflineIds(prev => new Set([...prev, ...offlineIds]));
    } catch (err) {
      console.warn('Tidak dapat menghubungi server (offline mode):', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLoans();
  }, []);

  const handleReturnDigital = async (bookId: number) => {
    if (!confirm('Apakah Anda yakin ingin mengembalikan e-book ini lebih awal?')) return;
    try {
      await api.returnDigitalBook(bookId);
      alert('E-book berhasil dikembalikan.');
      fetchMyLoans();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal mengembalikan buku.');
    }
  };

  const handleRemoveOfflineBook = async (bookId: number, title: string) => {
    if (!confirm(`Hapus salinan offline "${title}" dari perangkat ini?`)) return;
    await offlineStorage.removeEbook(bookId);
    fetchMyLoans();
  };

  const handleOpenReader = async (bookId: number, bookTitle?: string) => {
    try {
      const book = await api.getBookDetail(bookId);
      setReadingBook(book);
    } catch {
      // Fallback offline jika detail buku belum tercache dari server
      const loan = activeLoans.find(l => l.bookId === bookId);
      const offlineItem = offlineBooks.find(b => b.id === bookId);

      const fallbackBook: Book = {
        id: bookId,
        categoryId: 1,
        title: loan?.bookTitle || offlineItem?.title || bookTitle || 'E-Book Pelajaran',
        author: 'Penulis Buku',
        publisher: 'Perpustakaan Sekolah',
        publicationYear: new Date().getFullYear(),
        bookType: 'DIGITAL_ONLY',
        digitalLicenseCount: 1,
        totalPhysicalCopies: 0,
        availablePhysicalCopies: 0,
        coverUrl: loan?.bookCover || null,
        createdAt: new Date().toISOString()
      };
      setReadingBook(fallbackBook);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-surface-card p-6 rounded-3xl border border-border-subtle shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-600 text-xs font-bold uppercase tracking-wider mb-1">
            <BookmarkCheck size={16} />
            <span>Koleksi Aktif Pengguna</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-text-main">Rak Buku Saya</h1>
          <p className="text-xs text-text-muted mt-1">
            Daftar buku digital dan buku fisik yang sedang aktif Anda pinjam dari perpustakaan sekolah.
          </p>
        </div>

        <div className="bg-primary-50 border border-primary-100 px-4 py-2.5 rounded-2xl text-right shrink-0">
          <span className="text-[10px] text-text-muted block">Buku Sedang Dipinjam:</span>
          <span className="text-lg font-bold text-primary-700">
            {activeLoans.length} {user.role === 'TEACHER' ? '/ 5' : '/ 2'} Kuota
          </span>
        </div>
      </div>

      {/* Active Borrowed Books Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2].map(n => (
            <div key={n} className="bg-surface-card rounded-2xl p-4 h-48 border border-slate-200" />
          ))}
        </div>
      ) : activeLoans.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {activeLoans.map(loan => {
            const dueDate = new Date(loan.dueDate);
            const now = new Date();
            const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysLeft < 0;

            return (
              <div
                key={loan.id}
                className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm p-4 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {loan.loanType === 'DIGITAL' ? (
                      <div className="flex items-center gap-1.5">
                        <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          E-Book Digital
                        </span>
                        {savedOfflineIds.has(loan.bookId) && (
                          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle2 size={10} />
                            Offline
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                        Fisik: {loan.copyBarcode}
                      </span>
                    )}

                    <div className="flex items-center gap-1 text-[11px]">
                      {isOverdue ? (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Terlambat {Math.abs(daysLeft)} Hari
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-semibold flex items-center gap-1">
                          <Clock size={12} />
                          Sisa {daysLeft} Hari
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-text-main line-clamp-2 leading-snug">
                    {loan.bookTitle}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    Jatuh Tempo: {dueDate.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                  {loan.loanType === 'DIGITAL' ? (
                    <>
                      <button
                        onClick={() => handleOpenReader(loan.bookId, loan.bookTitle)}
                        className="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                      >
                        <BookOpen size={14} />
                        <span>Baca Sekarang</span>
                      </button>

                      <button
                        onClick={() => handleReturnDigital(loan.bookId)}
                        title="Kembalikan E-Book"
                        className="p-2 border border-slate-200 hover:bg-slate-50 text-text-muted hover:text-text-main rounded-xl transition-colors"
                      >
                        <RotateCcw size={16} />
                      </button>
                    </>
                  ) : (
                    <div className="w-full text-center py-1.5 text-xs text-text-muted bg-slate-50 rounded-xl">
                      Kembalikan di Meja Pustakawan Sekolah
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        offlineBooks.length === 0 && (
          <div className="text-center py-16 bg-surface-card rounded-3xl border border-border-subtle p-8">
            <BookmarkCheck size={48} className="mx-auto text-slate-300 mb-3" />
            <h3 className="font-bold text-base text-text-main">Rak buku Anda masih kosong</h3>
            <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
              Jelajahi Katalog Buku dan pinjam modul informatika atau buku referensi pelajaran lainnya.
            </p>
          </div>
        )
      )}

      {/* Offline Storage Shelf Section */}
      {offlineBooks.length > 0 && (
        <div className="bg-surface-card p-6 rounded-3xl border border-emerald-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HardDrive size={20} className="text-emerald-600" />
              <div>
                <h2 className="font-bold text-sm sm:text-base text-text-main">
                  Koleksi Tersimpan di Perangkat ({offlineBooks.length} Dokumen)
                </h2>
                <p className="text-[11px] text-text-muted">
                  Tersimpan di memori lokal IndexedDB browser Anda. Dapat dibuka kapan saja tanpa koneksi internet.
                </p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-800 bg-emerald-100/80 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto shrink-0">
              <Smartphone size={13} />
              Akses PWA Luring Siap
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {offlineBooks.map(item => (
              <div
                key={item.id}
                className="bg-emerald-50/50 border border-emerald-200/80 rounded-2xl p-4 flex flex-col justify-between hover:shadow-sm transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 size={11} />
                      Tersimpan Offline
                    </span>
                    <span className="text-[10px] text-text-muted font-mono">
                      {(item.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-text-main line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-text-muted block mt-1.5">
                    Disimpan: {new Date(item.savedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-emerald-100 flex items-center gap-2">
                  <button
                    onClick={() => handleOpenReader(item.id, item.title)}
                    className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <BookOpen size={14} />
                    <span>Buka Offline</span>
                  </button>
                  <button
                    onClick={() => handleRemoveOfflineBook(item.id, item.title)}
                    title="Hapus salinan dari perangkat"
                    className="p-1.5 border border-emerald-200 hover:bg-red-50 hover:text-red-600 text-text-muted rounded-xl transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fullscreen Reader Modal if opened */}
      {readingBook && (
        <PDFReader
          book={readingBook}
          user={user}
          onClose={() => setReadingBook(null)}
        />
      )}
    </div>
  );
};
