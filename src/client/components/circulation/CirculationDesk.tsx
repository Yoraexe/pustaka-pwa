/**
 * @file src/client/components/circulation/CirculationDesk.tsx
 * @description Modul Meja Sirkulasi Pustakawan berbasis Shadcn UI (Tabs, Card, Table, Input, Button, Badge) dan ekspor laporan CSV.
 * @layer Presentation Component
 * 
 * Tujuan: Memfasilitasi sirkulasi buku fisik, check-out, pengembalian, kalkulasi denda, dan ekspor data bagi staf perpustakaan.
 * Caller: src/client/App.tsx (Tab Sirkulasi)
 * Dependensi: react, src/client/services/api.ts, shared/types, AddBookModal, UserImportModal, BarcodeScannerModal, lucide-react, Shadcn UI (Tabs, Card, Table, Input, Label, Button, Badge)
 * Main Functions: CirculationDesk
 * Side Effects: Melakukan request peminjaman, pengembalian, dan generate file download CSV.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import { useAuth } from '../../hooks/useAuth.js';
import type { Loan, AvailableCopy, User } from '../../../shared/types/index.js';
import { AddBookModal } from '../catalog/AddBookModal.js';
import { UserImportModal } from '../admin/UserImportModal.js';
import { BarcodeScannerModal } from './BarcodeScannerModal.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.js';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Badge } from '../ui/badge.js';
import { Camera, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export const CirculationDesk: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('checkout');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 15;
  const totalPages = Math.max(1, Math.ceil(loans.length / pageSize));
  const paginatedLoans = loans.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const [availableCopies, setAvailableCopies] = useState<AvailableCopy[]>([]);
  const [members, setMembers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState<boolean>(false);
  const [isUserImportModalOpen, setIsUserImportModalOpen] = useState<boolean>(false);

  // Camera Barcode Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerTarget, setScannerTarget] = useState<'checkout' | 'borrower' | 'claim' | 'return'>('checkout');

  // Form Check-out
  const [borrowerIdentity, setBorrowerIdentity] = useState<string>('');
  const [checkoutBarcode, setCheckoutBarcode] = useState<string>('');
  const [checkoutMsg, setCheckoutMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form Return
  const [returnBarcode, setReturnBarcode] = useState<string>('');
  const [isFinePaid, setIsFinePaid] = useState<boolean>(true);
  const [returnResult, setReturnResult] = useState<{
    overdueDays: number;
    fineAmount: number;
    message: string;
  } | null>(null);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Form & Tab Reservasi
  const [reservations, setReservations] = useState<Loan[]>([]);
  const [claimCode, setClaimCode] = useState<string>('');
  const [claimMsg, setClaimMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchCirculationHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllLoans();
      setLoans(data);
      setCurrentPage((prev) => {
        const nextTotal = Math.max(1, Math.ceil(data.length / pageSize));
        return prev > nextTotal ? nextTotal : prev;
      });
    } catch (err: unknown) {
      console.error(err);
      toast.error('Gagal Memuat Riwayat Sirkulasi');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableCopies = async () => {
    try {
      const data = await api.getAvailableCopies();
      setAvailableCopies(data);
    } catch (err) {
      console.warn('Gagal memuat eksemplar tersedia:', err);
    }
  };

  const fetchReservations = async () => {
    try {
      const data = await api.getReservations(true);
      setReservations(data);
    } catch (err) {
      console.warn('Gagal memuat tiket reservasi:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const data = await api.getUsers();
      setMembers(data.filter((u) => u.isActive !== false));
    } catch (err) {
      console.warn('Gagal memuat daftar anggota:', err);
    }
  };

  useEffect(() => {
    fetchCirculationHistory();
    fetchAvailableCopies();
    fetchReservations();
    fetchMembers();
  }, []);

  const handleProcessClaim = async (codeToClaim?: string) => {
    const targetCode = (codeToClaim || claimCode).trim();
    setClaimMsg(null);

    if (!targetCode) {
      setClaimMsg({ type: 'error', text: 'Kode tiket reservasi wajib diisi.' });
      return;
    }

    try {
      const loan = await api.claimReservation(targetCode);
      const msg = `Reservasi "${targetCode}" berhasil diklaim untuk ${loan.userName || 'Pemustaka'}. Buku resmi dipinjamkan!`;
      setClaimMsg({ type: 'success', text: msg });
      toast.success('Klaim Reservasi Berhasil', { description: msg });
      setClaimCode('');
      fetchCirculationHistory();
      fetchReservations();
      fetchAvailableCopies();
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Gagal memproses klaim reservasi.';
      setClaimMsg({ type: 'error', text: errText });
      toast.error('Gagal Klaim Reservasi', { description: errText });
    }
  };

  const handleOpenScanner = (target: 'checkout' | 'borrower' | 'claim' | 'return') => {
    setScannerTarget(target);
    setIsScannerOpen(true);
  };

  const handleScanResult = (scannedBarcode: string) => {
    if (scannerTarget === 'checkout') {
      setCheckoutBarcode(scannedBarcode);
      toast.info(`QR / Barcode Buku Terpindai: ${scannedBarcode}`);
    } else if (scannerTarget === 'borrower') {
      setBorrowerIdentity(scannedBarcode);
      toast.info(`Identitas Anggota Terpindai: ${scannedBarcode}`);
    } else if (scannerTarget === 'claim') {
      setClaimCode(scannedBarcode.toUpperCase());
      void handleProcessClaim(scannedBarcode.toUpperCase());
    } else {
      setReturnBarcode(scannedBarcode);
      toast.info(`QR / Barcode Pengembalian Terpindai: ${scannedBarcode}`);
    }
  };

  const handleRenewPhysical = async (loanId: number, bookTitle: string) => {
    try {
      await api.renewPhysicalLoan(loanId);
      toast.success('Pinjaman Diperpanjang!', {
        description: `Masa pinjam "${bookTitle}" berhasil diperpanjang 7 hari.`,
      });
      fetchCirculationHistory();
    } catch (err: unknown) {
      toast.error('Gagal Memperpanjang', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat memperpanjang masa pinjam.',
      });
    }
  };

  const handleQuickReturnPhysical = async (barcode: string, bookTitle?: string) => {
    try {
      const res = await api.returnPhysicalBook(barcode, true);
      toast.success('Buku Fisik Dikembalikan!', {
        description:
          res.overdueDays > 0
            ? `"${bookTitle || barcode}" dikembalikan (Terlambat ${res.overdueDays} hari, Denda Rp ${res.fineAmount.toLocaleString('id-ID')} lunas).`
            : `"${bookTitle || barcode}" berhasil dikembalikan tepat waktu dan stok rak dipulihkan.`,
      });
      fetchCirculationHistory();
      fetchAvailableCopies();
    } catch (err: unknown) {
      toast.error('Gagal Mengembalikan Buku', {
        description: err instanceof Error ? err.message : 'Terjadi kendala saat mengembalikan buku fisik.',
      });
    }
  };

  // Filter active physical loans with barcodes for quick return picker
  const activePhysicalLoans = loans.filter((l) => l.status === 'BORROWED' && l.loanType === 'PHYSICAL' && !!l.copyBarcode);

  const handleProcessCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutMsg(null);

    if (!borrowerIdentity.trim() || !checkoutBarcode.trim()) {
      setCheckoutMsg({ type: 'error', text: 'Nomor identitas anggota dan barcode buku wajib diisi.' });
      return;
    }

    try {
      await api.checkOutPhysicalBook(borrowerIdentity.trim(), checkoutBarcode.trim());
      const msg = `Peminjaman eksemplar ${checkoutBarcode} oleh ${borrowerIdentity} berhasil dicatat!`;
      setCheckoutMsg({ type: 'success', text: msg });
      toast.success('Peminjaman Berhasil', { description: msg });
      setCheckoutBarcode('');
      fetchCirculationHistory();
      fetchAvailableCopies();
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Gagal memproses peminjaman.';
      setCheckoutMsg({ type: 'error', text: errText });
      toast.error('Gagal Check-Out', { description: errText });
    }
  };

  const handleProcessReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    setReturnResult(null);
    setReturnError(null);

    if (!returnBarcode.trim()) {
      setReturnError('Harap masukkan barcode eksemplar buku.');
      return;
    }

    try {
      const res = await api.returnPhysicalBook(returnBarcode.trim(), isFinePaid);
      setReturnResult({
        overdueDays: res.overdueDays,
        fineAmount: res.fineAmount,
        message: res.message,
      });
      toast.success('Pengembalian Berhasil', { description: res.message });
      setReturnBarcode('');
      fetchCirculationHistory();
      fetchAvailableCopies();
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : 'Gagal memproses pengembalian.';
      setReturnError(errText);
      toast.error('Gagal Check-In', { description: errText });
    }
  };

  const handleExportCSV = () => {
    if (loans.length === 0) {
      toast.warning('Tidak Ada Data', {
        description: 'Belum ada transaksi sirkulasi untuk diekspor.',
      });
      return;
    }

    const headers = [
      'ID Transaksi',
      'Nama Peminjam',
      'NISN / NIP',
      'Judul Buku',
      'Tipe Sirkulasi',
      'Barcode Eksemplar',
      'Tanggal Pinjam',
      'Jatuh Tempo',
      'Tanggal Kembali',
      'Status',
      'Denda (Rp)',
    ];

    const escapeCSV = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const s = String(val).replace(/"/g, '""');
      return `"${s}"`;
    };

    const rows = loans.map((l) =>
      [
        l.id,
        escapeCSV(l.userName || 'Siswa'),
        escapeCSV(l.userIdentity || '-'),
        escapeCSV(l.bookTitle || '-'),
        l.loanType === 'DIGITAL' ? 'E-Book' : 'Fisik',
        escapeCSV(l.copyBarcode || '-'),
        new Date(l.borrowDate).toISOString().slice(0, 10),
        new Date(l.dueDate).toISOString().slice(0, 10),
        l.returnDate ? new Date(l.returnDate).toISOString().slice(0, 10) : '-',
        l.status === 'BORROWED'
          ? 'Dipinjam'
          : l.status === 'RESERVED'
          ? 'Reservasi'
          : l.status === 'CANCELLED'
          ? 'Dibatalkan'
          : 'Dikembalikan',
        l.fineAmount || 0,
      ].join(',')
    );

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `laporan-sirkulasi-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Ekspor CSV Berhasil', {
      description: `Laporan sirkulasi (${loans.length} transaksi) berhasil diunduh.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Desk Header Card */}
      <Card className="rounded-3xl border-border shadow-xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="secondary" className="font-mono text-[10px]">
                {loans.filter((l) => l.status === 'BORROWED').length} Dipinjam
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold">Meja Sirkulasi</CardTitle>
            <CardDescription className="text-xs mt-1 max-w-2xl">
              Layanan peminjaman dan pengembalian koleksi fisik perpustakaan.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchCirculationHistory();
                fetchAvailableCopies();
              }}
              disabled={isLoading}
              className="text-xs"
            >
              {isLoading ? 'Menyegarkan...' : 'Segarkan'}
            </Button>
            {user?.role === 'ADMIN' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsUserImportModalOpen(true)}
                className="text-xs font-semibold"
              >
                Impor Anggota (CSV)
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => setIsAddBookModalOpen(true)}
              className="text-xs font-semibold"
            >
              + Tambah Buku
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Tabs Operations */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/60 p-1 rounded-2xl h-11 border border-border/80 inline-flex w-full sm:w-auto">
          <TabsTrigger value="checkout" className="rounded-xl px-4 py-1.5 text-xs font-semibold">
            Peminjaman
          </TabsTrigger>
          <TabsTrigger value="reservations" className="rounded-xl px-4 py-1.5 text-xs font-semibold gap-1.5">
            <span>Klaim Reservasi</span>
            {reservations.length > 0 && (
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300 px-1.5 py-0.2 rounded-full border border-amber-500/30">
                {reservations.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="return" className="rounded-xl px-4 py-1.5 text-xs font-semibold">
            Pengembalian
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Check-Out */}
        <TabsContent value="checkout">
          <Card className="rounded-3xl border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Peminjaman Fisik</CardTitle>
              <CardDescription className="text-xs">
                Pindai atau masukkan NISN/NIP dan barcode eksemplar.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {checkoutMsg && (
                <div
                  className={`p-3.5 mb-4 rounded-xl text-xs font-medium border ${
                    checkoutMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  }`}
                >
                  {checkoutMsg.text}
                </div>
              )}

              <form onSubmit={handleProcessCheckout} className="space-y-4 max-w-lg">
                <div>
                  <Label htmlFor="borrowerIdentity">NISN / NIP Peminjam</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Input
                      id="borrowerIdentity"
                      value={borrowerIdentity}
                      onChange={(e) => setBorrowerIdentity(e.target.value)}
                      placeholder="Contoh: NISN202601 atau GURU001"
                      className="font-mono text-xs flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenScanner('borrower')}
                      className="h-9 px-3 gap-1.5 text-xs font-semibold shrink-0"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                      <span>Pindai</span>
                    </Button>
                  </div>
                  {members.length > 0 && (
                    <div className="mt-2">
                      <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block mb-1">
                        Pilih Cepat Anggota Aktif:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-muted/30 border border-border rounded-xl">
                        {members.slice(0, 15).map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setBorrowerIdentity(m.identityNumber)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors border text-left cursor-pointer ${
                              borrowerIdentity === m.identityNumber
                                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                : 'bg-background hover:bg-muted text-foreground border-border'
                            }`}
                            title={`${m.name} (${m.role})`}
                          >
                            <span>{m.identityNumber}</span>
                            <span className="text-[9px] opacity-75 ml-1 truncate max-w-[100px] inline-block align-bottom">
                              {m.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label htmlFor="checkoutBarcode">Barcode Eksemplar</Label>
                    {availableCopies.length > 0 && (
                      <span className="text-[11px] text-muted-foreground font-mono">
                        {availableCopies.length} eksemplar tersedia di rak
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      id="checkoutBarcode"
                      value={checkoutBarcode}
                      onChange={(e) => setCheckoutBarcode(e.target.value)}
                      placeholder="Contoh: BK-0001-01"
                      className="font-mono text-xs flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenScanner('checkout')}
                      className="h-9 px-3 gap-1.5 text-xs font-semibold shrink-0"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                      <span>Pindai</span>
                    </Button>
                  </div>

                  {/* Quick Copy Selector */}
                  {availableCopies.length > 0 && (
                    <div className="mt-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block mb-1">
                        Pilih Cepat dari Rak:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-muted/30 border border-border rounded-xl">
                        {availableCopies.slice(0, 15).map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setCheckoutBarcode(c.barcode)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors border text-left cursor-pointer ${
                              checkoutBarcode === c.barcode
                                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                : 'bg-background hover:bg-muted text-foreground border-border'
                            }`}
                            title={`${c.bookTitle} (Rak: ${c.shelfLocation || '-'})`}
                          >
                            <span>{c.barcode}</span>
                            <span className="text-[9px] opacity-75 ml-1 truncate max-w-[120px] inline-block align-bottom">
                              {c.bookTitle}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <Button type="submit" className="text-xs font-semibold shadow-xs">
                  Proses Peminjaman
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Klaim Reservasi */}
        <TabsContent value="reservations">
          <Card className="rounded-3xl border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Klaim Tiket Reservasi Buku Fisik</CardTitle>
              <CardDescription className="text-xs">
                Masukkan atau pilih kode tiket pemustaka untuk menyerahkan buku fisik secara resmi.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {claimMsg && (
                <div
                  className={`p-3.5 rounded-xl text-xs font-medium border ${
                    claimMsg.type === 'success'
                      ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
                      : 'bg-destructive/10 text-destructive border-destructive/20'
                  }`}
                >
                  {claimMsg.text}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleProcessClaim();
                }}
                className="space-y-4 max-w-lg"
              >
                <div>
                  <Label htmlFor="claimCode">Kode Tiket Reservasi</Label>
                  <div className="flex gap-2 mt-1.5">
                    <Input
                      id="claimCode"
                      value={claimCode}
                      onChange={(e) => setClaimCode(e.target.value.toUpperCase())}
                      placeholder="Contoh: RSV-ABC123XY"
                      className="font-mono text-xs uppercase flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenScanner('claim')}
                      className="h-9 px-3 gap-1.5 text-xs font-semibold shrink-0"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                      <span>Pindai QR</span>
                    </Button>
                    <Button type="submit" className="text-xs font-semibold shrink-0">
                      Klaim & Serahkan
                    </Button>
                  </div>
                </div>
              </form>

              {/* Active Reservations List */}
              <div className="pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 font-mono">
                  Daftar Tiket Aktif Menunggu Pengambilan ({reservations.length})
                </h4>

                {reservations.length > 0 ? (
                  <div className="border border-border rounded-2xl overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kode Tiket</TableHead>
                          <TableHead>Pemustaka</TableHead>
                          <TableHead>Judul Buku</TableHead>
                          <TableHead>Barcode / Lokasi Rak</TableHead>
                          <TableHead>Batas Waktu</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reservations.map((r) => {
                          const reservedUntil = r.reservedUntil ? new Date(r.reservedUntil) : null;
                          const now = new Date();
                          const hoursLeft = reservedUntil
                            ? Math.max(0, Math.ceil((reservedUntil.getTime() - now.getTime()) / (1000 * 60 * 60)))
                            : 0;

                          return (
                            <TableRow key={r.id}>
                              <TableCell className="font-mono font-bold text-primary text-xs">
                                {r.reservationCode}
                              </TableCell>
                              <TableCell>
                                <div className="font-semibold text-foreground text-xs">{r.userName || 'Pemustaka'}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{r.userIdentity || '-'}</div>
                              </TableCell>
                              <TableCell className="font-medium text-xs max-w-xs truncate" title={r.bookTitle}>
                                {r.bookTitle}
                              </TableCell>
                              <TableCell>
                                <div className="font-mono text-xs">{r.copyBarcode || '-'}</div>
                                <div className="text-[10px] text-muted-foreground">Rak: {r.shelfLocation || 'Sirkulasi'}</div>
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                <span className={hoursLeft <= 3 ? 'text-destructive font-bold' : 'text-foreground'}>
                                  {hoursLeft > 0 ? `Sisa ${hoursLeft} jam` : 'Kedaluwarsa'}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  className="h-7 px-3 text-xs font-semibold"
                                  onClick={() => handleProcessClaim(r.reservationCode ?? undefined)}
                                >
                                  Klaim
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 bg-muted/20 border border-dashed border-border rounded-2xl text-xs text-muted-foreground">
                    Tidak ada tiket reservasi yang menunggu pengambilan saat ini.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Check-In */}
        <TabsContent value="return">
          <Card className="rounded-3xl border-border shadow-xs">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Pengembalian Fisik</CardTitle>
              <CardDescription className="text-xs">
                Pindai atau masukkan barcode eksemplar yang dikembalikan.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {returnError && (
                <div className="p-3.5 mb-4 rounded-xl text-xs font-medium border bg-destructive/10 text-destructive border-destructive/20">
                  {returnError}
                </div>
              )}

              {returnResult && (
                <div className="p-4 mb-4 rounded-2xl border bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 border-emerald-500/20 space-y-1 text-xs">
                  <div className="font-bold">{returnResult.message}</div>
                  {returnResult.overdueDays > 0 ? (
                    <div className="text-destructive font-semibold">
                      Terlambat {returnResult.overdueDays} hari. Denda: Rp{' '}
                      {returnResult.fineAmount.toLocaleString('id-ID')}.
                    </div>
                  ) : (
                    <div className="text-emerald-700 dark:text-emerald-300">
                      Buku dikembalikan tepat waktu.
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleProcessReturn} className="space-y-4 max-w-lg">
                <div>
                  <Label htmlFor="returnBarcode">Barcode Eksemplar</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="returnBarcode"
                      value={returnBarcode}
                      onChange={(e) => setReturnBarcode(e.target.value)}
                      placeholder="Contoh: BK-0001-01"
                      className="font-mono text-xs flex-1"
                      required
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenScanner('return')}
                      className="h-9 px-3 gap-1.5 text-xs font-semibold shrink-0"
                    >
                      <Camera className="w-4 h-4 text-primary" />
                      <span>Pindai</span>
                    </Button>
                  </div>

                  {/* Quick Return Selector */}
                  {activePhysicalLoans.length > 0 && (
                    <div className="mt-2.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider block mb-1">
                        Pilih Cepat dari Pinjaman Aktif:
                      </span>
                      <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-muted/30 border border-border rounded-xl">
                        {activePhysicalLoans.map((l) => (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => setReturnBarcode(l.copyBarcode!)}
                            className={`px-2 py-1 rounded-lg text-[11px] font-mono transition-colors border text-left cursor-pointer ${
                              returnBarcode === l.copyBarcode
                                ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                                : 'bg-background hover:bg-muted text-foreground border-border'
                            }`}
                            title={`${l.bookTitle} (${l.userName || l.userIdentity})`}
                          >
                            <span>{l.copyBarcode}</span>
                            <span className="text-[9px] opacity-75 ml-1 truncate max-w-[120px] inline-block align-bottom">
                              {l.bookTitle}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="finePaid"
                    checked={isFinePaid}
                    onChange={(e) => setIsFinePaid(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-primary w-4 h-4 accent-primary cursor-pointer"
                  />
                  <Label htmlFor="finePaid" className="mb-0 cursor-pointer font-medium">
                    Tandai denda lunas
                  </Label>
                </div>

                <Button type="submit" variant="default" className="text-xs font-semibold shadow-xs">
                  Proses Pengembalian
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Circulation Log Table - Authentic Shadcn Table */}
      <Card className="rounded-3xl border-border shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm sm:text-base font-bold">Riwayat Sirkulasi</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {loans.length} transaksi tercatat
            </CardDescription>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="self-start sm:self-auto text-xs font-semibold"
          >
            Ekspor CSV
          </Button>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Peminjam</TableHead>
              <TableHead>Judul Buku</TableHead>
              <TableHead>Format / Barcode</TableHead>
              <TableHead>Tgl Pinjam</TableHead>
              <TableHead>Jatuh Tempo</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Denda</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length > 0 ? (
              paginatedLoans.map((l) => (
                <TableRow key={l.id}>
                  <TableCell>
                    <div className="font-semibold text-foreground">{l.userName || 'Siswa'}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">{l.userIdentity || '-'}</div>
                  </TableCell>
                  <TableCell className="font-medium max-w-xs truncate" title={l.bookTitle}>
                    {l.bookTitle}
                  </TableCell>
                  <TableCell>
                    {l.loanType === 'DIGITAL' ? (
                      <Badge variant="ebook">E-Book</Badge>
                    ) : (
                      <Badge variant="physical" className="font-mono">
                        {l.copyBarcode || 'Fisik'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-[11px]">
                    {new Date(l.borrowDate).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell className="font-medium font-mono text-[11px]">
                    {new Date(l.dueDate).toLocaleDateString('id-ID')}
                  </TableCell>
                  <TableCell>
                    {l.status === 'BORROWED' ? (
                      <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                        Dipinjam
                      </span>
                    ) : l.status === 'RESERVED' ? (
                      <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        Reservasi
                      </span>
                    ) : l.status === 'CANCELLED' ? (
                      <span className="text-[10px] font-medium text-destructive bg-destructive/10 px-2.5 py-0.5 rounded-full border border-destructive/20">
                        Dibatalkan
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
                        Kembali
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {l.fineAmount > 0 ? (
                      <span className="text-destructive font-bold">
                        Rp {l.fineAmount.toLocaleString('id-ID')}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {l.status === 'RESERVED' && l.reservationCode ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-[11px] font-semibold text-amber-600 border-amber-500/30 hover:bg-amber-500 hover:text-white"
                        onClick={() => handleProcessClaim(l.reservationCode!)}
                      >
                        Klaim Tiket
                      </Button>
                    ) : l.status === 'BORROWED' && l.loanType === 'PHYSICAL' && l.copyBarcode ? (
                      <div className="flex items-center justify-end gap-1.5">
                        {!l.isRenewed && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px] font-semibold text-emerald-600 border-emerald-500/30 hover:bg-emerald-500 hover:text-white"
                            onClick={() => handleRenewPhysical(l.id, l.bookTitle || 'Buku Fisik')}
                            title="Perpanjang 7 hari (maks 1x)"
                          >
                            Perpanjang
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2.5 text-[11px] font-semibold text-primary hover:text-primary-foreground hover:bg-primary"
                          onClick={() => handleQuickReturnPhysical(l.copyBarcode!, l.bookTitle)}
                        >
                          Kembalikan
                        </Button>
                      </div>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">-</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Belum ada transaksi tercatat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Pagination Controls */}
        {loans.length > pageSize && (
          <div className="p-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              Menampilkan {Math.min((currentPage - 1) * pageSize + 1, loans.length)} -{' '}
              {Math.min(currentPage * pageSize, loans.length)} dari {loans.length} transaksi
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                Sebelumnya
              </Button>
              <span className="text-xs font-semibold px-2 text-foreground">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                Selanjutnya
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal Pendaftaran Koleksi Buku Baru */}
      <AddBookModal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        onSuccess={() => {
          setIsAddBookModalOpen(false);
          fetchCirculationHistory();
          fetchAvailableCopies();
        }}
      />

      {/* Modal Impor Anggota CSV */}
      <UserImportModal
        isOpen={isUserImportModalOpen}
        onClose={() => setIsUserImportModalOpen(false)}
        onSuccess={() => {
          setIsUserImportModalOpen(false);
          fetchCirculationHistory();
        }}
      />

      {/* Modal Pindai QR / Barcode Kamera & File */}
      <BarcodeScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScanResult}
        title={
          scannerTarget === 'checkout'
            ? 'Pindai QR / Barcode Eksemplar Peminjaman'
            : scannerTarget === 'borrower'
            ? 'Pindai QR Kartu Anggota (NISN / NIP)'
            : scannerTarget === 'claim'
            ? 'Pindai QR Tiket Reservasi (RSV-...)'
            : 'Pindai QR / Barcode Pengembalian Buku'
        }
        quickOptions={
          scannerTarget === 'checkout'
            ? availableCopies.map((c) => ({ code: c.barcode, label: c.bookTitle }))
            : scannerTarget === 'borrower'
            ? members.map((m) => ({ code: m.identityNumber, label: m.name }))
            : scannerTarget === 'claim'
            ? reservations
                .filter((r) => Boolean(r.reservationCode))
                .map((r) => ({ code: r.reservationCode!, label: r.bookTitle || '' }))
            : activePhysicalLoans.map((l) => ({
                code: l.copyBarcode!,
                label: l.bookTitle || '',
              }))
        }
      />
    </div>
  );
};
