/**
 * @file src/client/pages/MyBooksPage.tsx
 * @description Halaman 'Rak Buku Saya' dengan Shadcn AlertDialog untuk konfirmasi pengembalian, Sonner toast, dan shelf offline.
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
import {
  BookmarkCheck,
  Clock,
  BookOpen,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Trash2,
  Smartphone,
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

  // Alert Dialog State for Return Digital Book
  const [bookToReturn, setBookToReturn] = useState<{ id: number; title: string } | null>(null);
  // Alert Dialog State for Delete Offline Book
  const [bookToDeleteOffline, setBookToDeleteOffline] = useState<{ id: number; title: string } | null>(null);

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
      setSavedOfflineIds(new Set(offlineList.map((b) => b.id)));
    } catch (err) {
      console.warn('Gagal membaca IndexedDB offline books:', err);
    }

    // 3. Jika online, sinkronkan dengan server perpustakaan
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-card p-6 rounded-3xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <BookmarkCheck size={16} />
            <span>Koleksi Aktif Pengguna</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Rak Buku Saya</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Daftar buku digital dan buku fisik yang sedang aktif Anda pinjam dari perpustakaan sekolah.
          </p>
        </div>

        <div className="bg-primary/5 border border-primary/20 px-4 py-2.5 rounded-2xl text-right shrink-0">
          <span className="text-[10px] text-muted-foreground block">Buku Sedang Dipinjam:</span>
          <span className="text-lg font-bold text-primary">
            {activeLoans.length} {user.role === 'TEACHER' ? '/ 5' : '/ 2'} Kuota
          </span>
        </div>
      </div>

      {/* Active Borrowed Books Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2].map((n) => (
            <div key={n} className="bg-card rounded-3xl p-5 h-48 border border-border" />
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
                  <div className="flex items-center justify-between gap-2 mb-2">
                    {loan.loanType === 'DIGITAL' ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="ebook">E-Book Digital</Badge>
                        {savedOfflineIds.has(loan.bookId) && (
                          <Badge variant="success">
                            <CheckCircle2 size={10} className="mr-0.5" />
                            Offline
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="physical" className="font-mono">
                        Fisik: {loan.copyBarcode}
                      </Badge>
                    )}

                    <div className="flex items-center gap-1 text-[11px]">
                      {isOverdue ? (
                        <span className="text-destructive font-bold flex items-center gap-1">
                          <AlertTriangle size={12} />
                          Terlambat {Math.abs(daysLeft)} Hari
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Clock size={12} />
                          Sisa {daysLeft} Hari
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                    {loan.bookTitle}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Jatuh Tempo: {dueDate.toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-4 pt-3 border-t border-border flex items-center gap-2">
                  {loan.loanType === 'DIGITAL' ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => handleOpenReader(loan.bookId, loan.bookTitle)}
                        className="flex-1 gap-1.5 shadow-xs"
                      >
                        <BookOpen size={14} />
                        <span>Baca Sekarang</span>
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
                        title="Kembalikan E-Book"
                        className="px-2.5"
                      >
                        <RotateCcw size={15} />
                      </Button>
                    </>
                  ) : (
                    <div className="w-full text-center py-2 text-xs text-muted-foreground bg-muted/50 rounded-xl">
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
          <div className="text-center py-16 bg-card rounded-3xl border border-border p-8">
            <BookmarkCheck size={48} className="mx-auto text-muted-foreground/40 mb-3" />
            <h3 className="font-bold text-base text-foreground">Rak buku Anda masih kosong</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              Jelajahi Katalog Buku dan pinjam modul informatika atau buku referensi pelajaran lainnya.
            </p>
          </div>
        )
      )}

      {/* Offline Storage Shelf Section */}
      {offlineBooks.length > 0 && (
        <div className="bg-card p-6 rounded-3xl border border-emerald-500/30 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HardDrive size={20} className="text-emerald-600 dark:text-emerald-400" />
              <div>
                <h2 className="font-bold text-sm sm:text-base text-foreground">
                  Koleksi Tersimpan di Perangkat ({offlineBooks.length} Dokumen)
                </h2>
                <p className="text-[11px] text-muted-foreground">
                  Tersimpan di memori lokal IndexedDB browser Anda. Dapat dibuka kapan saja tanpa koneksi internet.
                </p>
              </div>
            </div>
            <span className="text-[11px] text-emerald-800 dark:text-emerald-200 bg-emerald-500/15 font-bold px-3 py-1 rounded-full flex items-center gap-1.5 self-start sm:self-auto shrink-0 border border-emerald-500/20">
              <Smartphone size={13} />
              Akses PWA Luring Siap
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {offlineBooks.map((item) => (
              <div
                key={item.id}
                className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-4 flex flex-col justify-between hover:shadow-xs transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <Badge variant="success">
                      <CheckCircle2 size={11} className="mr-0.5" />
                      Tersimpan Offline
                    </Badge>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {(item.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                  <h4 className="font-bold text-xs text-foreground line-clamp-2 leading-snug">
                    {item.title}
                  </h4>
                  <span className="text-[10px] text-muted-foreground block mt-1.5">
                    Disimpan: {new Date(item.savedAt).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-emerald-500/15 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="emerald"
                    onClick={() => handleOpenReader(item.id, item.title)}
                    className="flex-1 gap-1.5 shadow-xs"
                  >
                    <BookOpen size={14} />
                    <span>Buka Offline</span>
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
                    title="Hapus salinan dari perangkat"
                    className="px-2.5 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                  >
                    <Trash2 size={14} />
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
