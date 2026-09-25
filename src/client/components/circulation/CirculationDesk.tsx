/**
 * @file src/client/components/circulation/CirculationDesk.tsx
 * @description Modul Meja Sirkulasi Pustakawan berbasis Shadcn UI (Tabs, Card, Table, Input, Button, Badge) dan ekspor laporan CSV.
 * @layer Presentation Component
 * 
 * Tujuan: Memfasilitasi sirkulasi buku fisik, check-out, pengembalian, kalkulasi denda, dan ekspor data bagi staf perpustakaan.
 * Caller: src/client/App.tsx (Tab Sirkulasi)
 * Dependensi: react, src/client/services/api.ts, shared/types, AddBookModal, Shadcn UI (Tabs, Card, Table, Input, Label, Button, Badge)
 * Main Functions: CirculationDesk
 * Side Effects: Melakukan request peminjaman, pengembalian, dan generate file download CSV.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import type { Loan } from '../../../shared/types/index.js';
import { AddBookModal } from '../catalog/AddBookModal.js';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs.js';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card.js';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui/table.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Badge } from '../ui/badge.js';
import { toast } from 'sonner';

export const CirculationDesk: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('checkout');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState<boolean>(false);

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

  const fetchCirculationHistory = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllLoans();
      setLoans(data);
    } catch (err: unknown) {
      console.error(err);
      toast.error('Gagal Memuat Riwayat Sirkulasi');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCirculationHistory();
  }, []);

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
        l.status === 'BORROWED' ? 'Dipinjam' : 'Dikembalikan',
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
              onClick={fetchCirculationHistory}
              disabled={isLoading}
              className="text-xs"
            >
              {isLoading ? 'Menyegarkan...' : 'Segarkan'}
            </Button>
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
                  <Input
                    id="borrowerIdentity"
                    value={borrowerIdentity}
                    onChange={(e) => setBorrowerIdentity(e.target.value)}
                    placeholder="Contoh: NISN202601 atau GURU001"
                    className="font-mono text-xs"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="checkoutBarcode">Barcode Eksemplar</Label>
                  <Input
                    id="checkoutBarcode"
                    value={checkoutBarcode}
                    onChange={(e) => setCheckoutBarcode(e.target.value)}
                    placeholder="Contoh: FISIK-1-001"
                    className="font-mono text-xs"
                    required
                  />
                </div>

                <Button type="submit" className="text-xs font-semibold shadow-xs">
                  Proses Peminjaman
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Check-In */}
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
                  <Input
                    id="returnBarcode"
                    value={returnBarcode}
                    onChange={(e) => setReturnBarcode(e.target.value)}
                    placeholder="Contoh: FISIK-1-001"
                    className="font-mono text-xs"
                    required
                  />
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {loans.length > 0 ? (
              loans.slice(0, 20).map((l) => (
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
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Belum ada transaksi tercatat.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Modal Pendaftaran Koleksi Buku Baru */}
      <AddBookModal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        onSuccess={() => {
          setIsAddBookModalOpen(false);
          fetchCirculationHistory();
        }}
      />
    </div>
  );
};
