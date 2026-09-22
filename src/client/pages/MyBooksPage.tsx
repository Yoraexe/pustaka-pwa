/**
 * @file src/client/pages/MyBooksPage.tsx
 * @description Halaman 'Rak Buku Saya' menampilkan e-book yang sedang dipinjam dan riwayat peminjaman.
 * @layer Page Component
 */

import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import type { Loan, Book, User } from '../../shared/types/index.js';
import { PDFReader } from '../components/reader/PDFReader.js';
import { BookmarkCheck, Clock, BookOpen, RotateCcw, AlertTriangle } from 'lucide-react';

interface MyBooksPageProps {
  user: User;
}

export const MyBooksPage: React.FC<MyBooksPageProps> = ({ user }) => {
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [readingBook, setReadingBook] = useState<Book | null>(null);

  const fetchMyLoans = async () => {
    setIsLoading(true);
    try {
      const data = await api.getMyLoans(true); // active only
      setActiveLoans(data);
    } catch (err) {
      console.error('Gagal mengambil data buku saya:', err);
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

  const handleOpenReader = async (bookId: number) => {
    try {
      const book = await api.getBookDetail(bookId);
      setReadingBook(book);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal memuat e-book.');
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
                      <span className="bg-blue-50 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        E-Book Digital
                      </span>
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
                        onClick={() => handleOpenReader(loan.bookId)}
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
        <div className="text-center py-16 bg-surface-card rounded-3xl border border-border-subtle p-8">
          <BookmarkCheck size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="font-bold text-base text-text-main">Rak buku Anda masih kosong</h3>
          <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
            Jelajahi Katalog Buku dan pinjam modul informatika atau buku referensi pelajaran lainnya.
          </p>
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
