/**
 * @file src/client/pages/MyBooksPage.tsx
 * @description Halaman 'Rak Buku Saya' dengan manajemen pinjaman aktif, rekam jejak portofolio literasi (riwayat selesai), dan penyimpanan luring IndexedDB.
 * @layer Page Component
 * 
 * Tujuan: Menyajikan rak buku personal siswa/guru, memantau batas jatuh tempo, mengakses pembaca e-book, dan melihat portofolio riwayat literasi.
 * Caller: src/client/App.tsx
 * Dependensi: react, src/client/services/api.ts, src/client/services/offlineStorage.ts, shared/types, UI components (Tabs, AlertDialog, Button, Badge).
 * Main Functions: MyBooksPage
 * Side Effects: Fetch loans via HTTP API, membaca/menghapus IndexedDB offline ebooks, memanggil modal pembaca PDF.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api.js';
import { offlineStorage } from '../services/offlineStorage.js';
import type { Loan, Book, User } from '../../shared/types/index.js';
import { PDFReader } from '../components/reader/PDFReader.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs.js';
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
  const [historyLoans, setHistoryLoans] = useState<Loan[]>([]);
  const [offlineBooks, setOfflineBooks] = useState<Array<{ id: number; title: string; savedAt: string; size: number }>>([]);
  const [savedOfflineIds, setSavedOfflineIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [readingBook, setReadingBook] = useState<Book | null>(null);

  const [activeTab, setActiveTab] = useState<string>('active');
  const [bookToReturn, setBookToReturn] = useState<{ id: number; title: string } | null>(null);
  const [bookToDeleteOffline, setBookToDeleteOffline] = useState<{ id: number; title: string } | null>(null);
  const [reservations, setReservations] = useState<Loan[]>([]);
  const [reservationToCancel, setReservationToCancel] = useState<{ id: number; title: string; code: string } | null>(null);
  const [loanToRenew, setLoanToRenew] = useState<{ id: number; title: string } | null>(null);

  const maxQuota = user.role === 'TEACHER' ? 5 : 2;

  const fetchMyLoans = useCallback(async () => {
    setIsLoading(true);

    // 1. Muat cache lokal jika ada
    const cachedLoans = localStorage.getItem('pustaka_my_loans_false');
    if (cachedLoans) {
      try {
        const parsed: Loan[] = JSON.parse(cachedLoans);
        setActiveLoans(parsed.filter((l) => l.status === 'BORROWED'));
        setHistoryLoans(parsed.filter((l) => l.status === 'RETURNED'));
        setReservations(parsed.filter((l) => l.status === 'RESERVED'));
      } catch {
        // Abaikan parse error
      }
    }

    // 2. Muat berkas offline dari IndexedDB
    try {
      const offlineList = await offlineStorage.getAllOfflineEbooks();
      setOfflineBooks(offlineList);
      setSavedOfflineIds(new Set(offlineList.map((b) => b.id)));
    } catch (err) {
      console.warn('Gagal membaca IndexedDB offline books:', err);
    }

    // 3. Ambil data sirkulasi riil (aktif, riwayat selesai, dan reservasi) dari server
    try {
      const allLoans = await api.getMyLoans(false);
      const active = allLoans.filter((l) => l.status === 'BORROWED');
      const finished = allLoans.filter((l) => l.status === 'RETURNED');
      const reserved = allLoans.filter((l) => l.status === 'RESERVED');

      setActiveLoans(active);
      setHistoryLoans(finished);
      setReservations(reserved);

      const offlineIds = new Set<number>();
      for (const loan of allLoans) {
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
  }, []);

  const confirmCancelReservation = async () => {
    if (!reservationToCancel) return;
    try {
      await api.cancelReservation(reservationToCancel.id);
      toast.success('Reservasi Dibatalkan', {
        description: `Tiket "${reservationToCancel.code}" telah dibatalkan dan stok dikembalikan.`,
      });
      setReservationToCancel(null);
      fetchMyLoans();
    } catch (err: unknown) {
      toast.error('Gagal Membatalkan Reservasi', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat membatalkan reservasi.',
      });
    }
  };

  useEffect(() => {
    fetchMyLoans();
  }, [fetchMyLoans]);

  const confirmReturnDigital = async () => {
    if (!bookToReturn) return;
    try {
      await api.returnDigitalBook(bookToReturn.id);
      // Evict salinan luring dari IndexedDB & Cache Storage (BRD Seksi 3.2 AC-2.2)
      await offlineStorage.removeEbook(bookToReturn.id);
      setSavedOfflineIds((prev) => {
        const next = new Set(prev);
        next.delete(bookToReturn.id);
        return next;
      });
      toast.success('Pengembalian Berhasil', {
        description: `"${bookToReturn.title}" telah dikembalikan dan salinan luring dibersihkan.`,
      });
      setBookToReturn(null);
      fetchMyLoans();
    } catch (err: unknown) {
      toast.error('Gagal Mengembalikan', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat mengembalikan e-book.',
      });
    }
  };

  const confirmRenewPhysical = async () => {
    if (!loanToRenew) return;
    try {
      await api.renewPhysicalLoan(loanToRenew.id);
      toast.success('Perpanjangan Berhasil!', {
        description: `Masa pinjam "${loanToRenew.title}" berhasil diperpanjang 1 kali.`,
      });
      setLoanToRenew(null);
      fetchMyLoans();
    } catch (err: unknown) {
      toast.error('Gagal Memperpanjang Pinjaman', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat memperpanjang masa pinjam.',
      });
    }
  };

  const confirmDeleteOffline = async () => {
    if (!bookToDeleteOffline) return;
    try {
      await offlineStorage.removeEbook(bookToDeleteOffline.id);
      toast.info('Salinan Dihapus', {
        description: `Berkas "${bookToDeleteOffline.title}" telah dihapus.`,
      });
      setBookToDeleteOffline(null);
      fetchMyLoans();
    } catch {
      toast.error('Gagal Menghapus', {
        description: 'Terjadi kendala saat menghapus data dari penyimpanan perangkat.',
      });
    }
  };

  const handleOpenReader = async (bookId: number, bookTitle?: string) => {
    try {
      const book = await api.getBookDetail(bookId);
      setReadingBook(book);
    } catch {
      const loan = [...activeLoans, ...historyLoans].find((l) => l.bookId === bookId);
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
      {/* Portfolio Header & Reading Metrics */}
      <div className="bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Rak Buku Saya</h1>
          <p className="text-xs text-muted-foreground mt-1 max-w-xl">
            Kelola pinjaman aktif, riwayat bacaan, dan berkas luring.
          </p>
        </div>

        {/* 4 Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 shrink-0">
          <div className="bg-muted/40 border border-border p-3 rounded-2xl text-center">
            <span className="text-[10px] text-muted-foreground block font-medium">Pinjaman Aktif</span>
            <span className="text-base sm:text-lg font-bold text-foreground font-mono">
              {activeLoans.length}/{maxQuota}
            </span>
          </div>

          <div className="bg-muted/40 border border-border p-3 rounded-2xl text-center">
            <span className="text-[10px] text-muted-foreground block font-medium">Reservasi</span>
            <span className="text-base sm:text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
              {reservations.length}
            </span>
          </div>

          <div className="bg-muted/40 border border-border p-3 rounded-2xl text-center">
            <span className="text-[10px] text-muted-foreground block font-medium">Selesai</span>
            <span className="text-base sm:text-lg font-bold text-primary font-mono">
              {historyLoans.length}
            </span>
          </div>

          <div className="bg-muted/40 border border-border p-3 rounded-2xl text-center">
            <span className="text-[10px] text-muted-foreground block font-medium">Luring</span>
            <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {offlineBooks.length}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation: Aktif vs Reservasi vs Riwayat Selesai vs Dokumen Offline */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/60 p-1 rounded-2xl h-11 border border-border/80 inline-flex flex-wrap sm:flex-nowrap">
          <TabsTrigger value="active" className="rounded-xl px-4 py-1.5 text-xs font-semibold gap-2">
            <span>Pinjaman Aktif</span>
            <span className="text-[10px] font-mono bg-background/80 px-1.5 py-0.2 rounded-full border border-border">
              {activeLoans.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="reservations" className="rounded-xl px-4 py-1.5 text-xs font-semibold gap-2">
            <span>Tiket Reservasi</span>
            <span className="text-[10px] font-mono bg-background/80 px-1.5 py-0.2 rounded-full border border-border">
              {reservations.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="history" className="rounded-xl px-4 py-1.5 text-xs font-semibold gap-2">
            <span>Riwayat Selesai</span>
            <span className="text-[10px] font-mono bg-background/80 px-1.5 py-0.2 rounded-full border border-border">
              {historyLoans.length}
            </span>
          </TabsTrigger>

          <TabsTrigger value="offline" className="rounded-xl px-4 py-1.5 text-xs font-semibold gap-2">
            <span>Luring</span>
            <span className="text-[10px] font-mono bg-background/80 px-1.5 py-0.2 rounded-full border border-border">
              {offlineBooks.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Pinjaman Aktif */}
        <TabsContent value="active" className="space-y-4">
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
                            <Badge variant="ebook">E-Book</Badge>
                            {savedOfflineIds.has(loan.bookId) && (
                              <Badge variant="success">Luring</Badge>
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
                        <div className="w-full flex items-center justify-between gap-2">
                          {!loan.isRenewed && !isOverdue ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setLoanToRenew({
                                  id: loan.id,
                                  title: loan.bookTitle || 'Buku Fisik',
                                })
                              }
                              className="flex-1 text-xs font-semibold hover:border-primary hover:text-primary"
                            >
                              Perpanjang (1x)
                            </Button>
                          ) : loan.isRenewed ? (
                            <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground py-1">
                              Sudah Diperpanjang
                            </Badge>
                          ) : null}
                          <span className="text-[11px] text-muted-foreground bg-muted/50 px-2.5 py-1.5 rounded-xl font-medium shrink-0">
                            Kembalikan di Meja
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-3xl border border-border p-8">
              <h3 className="font-semibold text-sm text-foreground">Tidak ada pinjaman aktif</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Koleksi yang sedang dipinjam akan muncul di sini.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB: Tiket Reservasi Buku Fisik */}
        <TabsContent value="reservations" className="space-y-4">
          {reservations.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {reservations.map((loan) => {
                const reservedUntil = loan.reservedUntil ? new Date(loan.reservedUntil) : null;
                const now = new Date();
                const hoursLeft = reservedUntil
                  ? Math.max(0, Math.ceil((reservedUntil.getTime() - now.getTime()) / (1000 * 60 * 60)))
                  : 0;

                return (
                  <div
                    key={loan.id}
                    className="bg-card rounded-3xl border border-amber-500/30 shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full pointer-events-none" />
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <Badge variant="physical" className="text-[10px]">
                          Menunggu Pengambilan
                        </Badge>
                        <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                          {hoursLeft > 0 ? `Sisa ${hoursLeft} Jam` : 'Kedaluwarsa'}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                        {loan.bookTitle}
                      </h3>

                      {/* Ticket Code Box */}
                      <div className="mt-3 p-3 bg-muted/50 rounded-2xl border border-dashed border-border/80 flex items-center justify-between">
                        <div>
                          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono block">
                            Kode Tiket Pengambilan
                          </span>
                          <span className="text-base font-black font-mono tracking-wider text-primary">
                            {loan.reservationCode || `RSV-${loan.id}`}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-semibold"
                          onClick={() => {
                            if (loan.reservationCode) {
                              navigator.clipboard.writeText(loan.reservationCode);
                              toast.success('Kode Disalin!', {
                                description: `Kode ${loan.reservationCode} disalin ke clipboard.`,
                              });
                            }
                          }}
                        >
                          Salin
                        </Button>
                      </div>

                      <div className="mt-3 space-y-1 text-[11px] text-muted-foreground font-mono">
                        <div>Eksemplar: <span className="text-foreground font-semibold">{loan.copyBarcode || '-'}</span></div>
                        <div>Lokasi Rak: <span className="text-foreground font-semibold">{loan.shelfLocation || 'Meja Sirkulasi'}</span></div>
                        <div>
                          Batas Ambil:{' '}
                          <span className="text-foreground">
                            {reservedUntil ? reservedUntil.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-border flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setReservationToCancel({
                            id: loan.id,
                            title: loan.bookTitle || 'Buku Fisik',
                            code: loan.reservationCode || '',
                          })
                        }
                        className="w-full text-xs text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      >
                        Batalkan Reservasi
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-3xl border border-border p-8">
              <h3 className="font-semibold text-sm text-foreground">Tidak ada tiket reservasi aktif</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Pilih buku fisik atau buku hybrid dari katalog, lalu klik "Reservasi Buku Fisik" untuk mengambil tiket.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Riwayat Selesai */}
        <TabsContent value="history" className="space-y-4">
          {historyLoans.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {historyLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-card rounded-3xl border border-border shadow-xs p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <Badge variant="outline">
                        {loan.loanType === 'DIGITAL' ? 'E-Book' : 'Buku Fisik'}
                      </Badge>
                      <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                        Dikembalikan
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug">
                      {loan.bookTitle}
                    </h3>

                    <div className="mt-2 space-y-1 text-[11px] text-muted-foreground font-mono">
                      <div>Dipinjam: {new Date(loan.borrowDate).toLocaleDateString('id-ID')}</div>
                      {loan.returnDate && (
                        <div>Kembali: {new Date(loan.returnDate).toLocaleDateString('id-ID')}</div>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      Denda: {loan.fineAmount > 0 ? `Rp ${loan.fineAmount.toLocaleString('id-ID')} (Lunas)` : 'Nihil'}
                    </span>

                    {loan.loanType === 'DIGITAL' && (
                      <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full border border-border">
                        Akses Selesai
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card rounded-3xl border border-border p-8">
              <h3 className="font-semibold text-sm text-foreground">Belum ada riwayat</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Buku yang sudah dikembalikan akan tercatat di sini.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 3: Tersimpan Luring */}
        <TabsContent value="offline" className="space-y-4">
          {offlineBooks.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {offlineBooks.map((item) => (
                <div
                  key={item.id}
                  className="bg-card border border-emerald-500/30 rounded-3xl p-5 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-2">
                      <Badge variant="success">Luring</Badge>
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
          ) : (
            <div className="text-center py-16 bg-card rounded-3xl border border-border p-8">
              <h3 className="font-semibold text-sm text-foreground">Tidak ada buku luring</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Unduh e-book saat membaca untuk dapat dibaca tanpa internet.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

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
            <AlertDialogTitle>Kembalikan E-Book?</AlertDialogTitle>
            <AlertDialogDescription>
              Kembalikan <strong>"{bookToReturn?.title}"</strong> dan kosongkan kuota pinjaman Anda?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReturnDigital}>
              Kembalikan
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
            <AlertDialogTitle>Hapus Berkas Luring?</AlertDialogTitle>
            <AlertDialogDescription>
              Hapus salinan luring <strong>"{bookToDeleteOffline?.title}"</strong> dari perangkat ini?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteOffline}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog: Cancel Physical Book Reservation Confirmation */}
      <AlertDialog
        open={!!reservationToCancel}
        onOpenChange={(open: boolean) => !open && setReservationToCancel(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan Reservasi Tiket?</AlertDialogTitle>
            <AlertDialogDescription>
              Batalkan tiket reservasi <strong>"{reservationToCancel?.code}"</strong> untuk buku{' '}
              <strong>"{reservationToCancel?.title}"</strong>? Eksemplar buku fisik akan segera dibuka kembali untuk dipinjam pemustaka lain.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmCancelReservation}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Batalkan Tiket
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Alert Dialog: Renew Physical Loan Confirmation */}
      <AlertDialog
        open={!!loanToRenew}
        onOpenChange={(open: boolean) => !open && setLoanToRenew(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Perpanjang Masa Pinjam?</AlertDialogTitle>
            <AlertDialogDescription>
              Perpanjang masa pinjam <strong>"{loanToRenew?.title}"</strong> selama 7 hari ke depan?
              <br />
              <span className="text-xs text-muted-foreground mt-2 block">
                Catatan: Perpanjangan mandiri hanya dapat dilakukan 1 kali dan tidak berlaku jika buku terlambat atau memiliki denda.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRenewPhysical}>
              Perpanjang (7 Hari)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
