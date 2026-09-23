/**
 * @file src/client/pages/MyBooksPage.tsx
 * @description Halaman 'Rak Buku Saya' dengan arsitektur editorial bersih, Shadcn AlertDialog, bebas dari icon dekoratif.
 * @layer Page Component
 */

import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { offlineStorage } from '../services/offlineStorage.js';
import type { Loan, Book, User } from '../../shared/types/index.js';
import { PDFReader } from '../components/reader/PDFReader.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '../components/ui/alert-dialog.js';
import { toast } from 'sonner';

interface MyBooksPageProps {
  user: User;
}

export const MyBooksPage: React.FC<MyBooksPageProps> = ({ user }) => {
  const [activeLoans, setActiveLoans] = useState<Loan[]>([]);
  const [offlineBooks, setOfflineBooks] = useState<Array<{ id: number; title: string; savedAt: string; size: number }>>([]);
  const [savedOfflineIds, setSavedOfflineIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [readingBook, setReadingBook] = useState<Book | null>(null);

  const [bookToReturn, setBookToReturn] = useState<{ id: number; title: string } | null>(null);
  const [bookToDeleteOffline, setBookToDeleteOffline] = useState<{ id: number; title: string } | null>(null);

  const fetchMyLoans = async () => {
    setIsLoading(true);

    const cachedLoans = localStorage.getItem('pustaka_my_loans_true');
    if (cachedLoans) {
      try {
        setActiveLoans(JSON.parse(cachedLoans));
      } catch {
        // ignore
      }
    }

    try {
      const offlineList = await offlineStorage.getAllOfflineEbooks();
      setOfflineBooks(offlineList);
      setSavedOfflineIds(new Set(offlineList.map((b) => b.id)));
    } catch (err) {
      console.warn('Gagal membaca IndexedDB offline books:', err);
    }

    try {
      const data = await api.getMyLoans(true);
      setActiveLoans(data);

      const offlineIds = new Set<number>();
      for (const loan of data) {
        if (loan.loanType === 'DIGITAL') {
          const isSaved = await offlineStorage.isEbookSaved(loan.bookId);
          if (isSaved) offlineIds.add(loan.bookId);
        }
      }
      setSavedOfflineIds((prev) => new Set([...prev, ...offlineIds]));
    } catch (err) {
      console.warn('Tidak dapat menghubungi server (offline mode):', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyLoans();
  }, []);

  const confirmReturnDigital = async () => {
    if (!bookToReturn) return;
    try {
      await api.returnDigitalBook(bookToReturn.id);
      toast.success('Pengembalian Sukses', {
        description: `E-book "${bookToReturn.title}" berhasil dikembalikan. Kuota peminjaman Anda telah diperbarui.`,
      });
      setBookToReturn(null);
      fetchMyLoans();
    } catch (err: unknown) {
      toast.error('Gagal Mengembalikan', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat mengembalikan e-book.',
      });
    }
  };

  const confirmDeleteOffline = async () => {
    if (!bookToDeleteOffline) return;
    try {
      await offlineStorage.removeEbook(bookToDeleteOffline.id);
      toast.info('Salinan Dihapus', {
        description: `File offline "${bookToDeleteOffline.title}" telah dihapus dari memori perangkat.`,
      });
      setBookToDeleteOffline(null);
      fetchMyLoans();
    } catch {
      toast.error('Gagal Menghapus', {
        description: 'Terjadi kendala saat menghapus data offline dari IndexedDB.',
      });
    }
  };

  const handleOpenReader = async (bookId: number, bookTitle?: string) => {
    try {
      const book = await api.getBookDetail(bookId);
      setReadingBook(book);
    } catch {
      const loan = activeLoans.find((l) => l.bookId === bookId);
      const offlineItem = offlineBooks.find((b) => b.id === bookId);

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
        createdAt: new Date().toISOString(),
      };
      setReadingBook(fallbackBook);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-primary text-[11px] font-mono font-semibold uppercase tracking-wider mb-1">
            Koleksi Aktif Siswa & Guru
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Rak Buku Saya</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Daftar buku digital dan buku fisik yang sedang aktif Anda pinjam dari perpustakaan sekolah.
          </p>
        </div>

        <div className="bg-muted/50 border border-border px-4 py-2.5 rounded-2xl text-right shrink-0">
          <span className="text-[10px] text-muted-foreground block font-medium">Buku Sedang Dipinjam:</span>
          <span className="text-lg font-bold text-foreground font-mono">
            {activeLoans.length} {user.role === 'TEACHER' ? '/ 5' : '/ 2'} Kuota
          </span>
        </div>
      </div>

      {/* Active Borrowed Books Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2].map((n) => (
            <div key={n} className="bg-card rounded-3xl p-5 h-44 border border-border" />
          ))}
        </div>
      ) : activeLoans.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {activeLoans.map((loan) => {
            const dueDate = new Date(loan.dueDate);
            const now = new Date();
            const daysLeft = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            const isOverdue = daysLeft < 0;

            return (
              <div
                key={loan.id}
                className="bg-card rounded-3xl border border-border shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    {loan.loanType === 'DIGITAL' ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="ebook">E-Book Digital</Badge>
                        {savedOfflineIds.has(loan.bookId) && (
                          <Badge variant="success">Tersimpan Offline</Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="physical" className="font-mono">
                        Barcode: {loan.copyBarcode}
                      </Badge>
                    )}

                    <div className="text-[11px] font-medium font-mono">
                      {isOverdue ? (
                        <span className="text-destructive font-bold">
                          Terlambat {Math.abs(daysLeft)} Hari
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                          Sisa {daysLeft} Hari
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                    {loan.bookTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1.5 font-normal">
                    Jatuh Tempo: {dueDate.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-5 pt-3.5 border-t border-border flex items-center gap-2">
                  {loan.loanType === 'DIGITAL' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleOpenReader(loan.bookId, loan.bookTitle)}
                        className="flex-1 text-xs font-semibold"
                      >
                        Baca Sekarang
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setBookToReturn({
                            id: loan.bookId,
                            title: loan.bookTitle || 'E-Book Pelajaran',
                          })
                        }
                        className="text-xs px-3"
                      >
                        Kembalikan
                      </Button>
                    </>
                  ) : (
                    <div className="w-full text-center py-2 text-xs text-muted-foreground bg-muted/50 rounded-xl font-medium">
                      Kembalikan di Meja Pustakawan
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        offlineBooks.length === 0 && (
          <div className="text-center py-16 bg-card rounded-3xl border border-border p-8">
            <h3 className="font-bold text-base text-foreground">Rak buku Anda masih kosong</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Jelajahi Katalog Buku dan pinjam modul informatika atau buku referensi pelajaran lainnya.
            </p>
          </div>
        )
      )}

      {/* Offline Storage Shelf Section */}
      {offlineBooks.length > 0 && (
        <div className="bg-card p-6 sm:p-7 rounded-3xl border border-emerald-500/30 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-foreground">
                Dokumen Tersimpan di Perangkat ({offlineBooks.length})
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Tersimpan di memori browser IndexedDB. Dapat dibaca kapan saja tanpa koneksi internet.
              </p>
            </div>
            <span className="text-[11px] text-emerald-800 dark:text-emerald-200 bg-emerald-500/15 font-semibold px-3 py-1 rounded-full self-start sm:self-auto shrink-0 border border-emerald-500/20 font-mono">
              PWA Offline Siap
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {offlineBooks.map((item) => (
              <div
                key={item.id}
                className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <Badge variant="success">Tersimpan</Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {(item.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-foreground line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-muted-foreground block mt-1.5 font-mono">
                    Disimpan: {new Date(item.savedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </span>
                </div>

                <div className="mt-4 pt-3 border-t border-emerald-500/15 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="emerald"
                    onClick={() => handleOpenReader(item.id, item.title)}
                    className="flex-1 text-xs font-semibold"
                  >
                    Buka Luring
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setBookToDeleteOffline({
                        id: item.id,
                        title: item.title,
                      })
                    }
                    className="text-xs px-3 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                  >
                    Hapus
                  </Button>
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

      {/* Alert Dialog: Return Digital Book Confirmation */}
      <AlertDialog
        open={!!bookToReturn}
        onOpenChange={(open: boolean) => !open && setBookToReturn(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kembalikan E-Book Lebih Awal?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengembalikan e-book <strong>"{bookToReturn?.title}"</strong>?
              Setelah dikembalikan, buku ini akan dilepas dari rak aktif Anda dan kuota peminjaman Anda akan bertambah 1.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReturnDigital}>
              Ya, Kembalikan Buku
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog: Delete Offline Document Confirmation */}
      <AlertDialog
        open={!!bookToDeleteOffline}
        onOpenChange={(open: boolean) => !open && setBookToDeleteOffline(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Salinan Offline?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus file e-book <strong>"{bookToDeleteOffline?.title}"</strong> dari penyimpanan lokal IndexedDB perangkat ini?
              Anda tetap dapat mengunduhnya kembali saat terhubung ke jaringan internet perpustakaan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteOffline}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Hapus dari Perangkat
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
