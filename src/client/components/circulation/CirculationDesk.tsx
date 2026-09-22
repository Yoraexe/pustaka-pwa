/**
 * @file src/client/components/circulation/CirculationDesk.tsx
 * @description Modul Meja Sirkulasi Pustakawan untuk check-out, pengembalian buku fisik, kalkulasi denda, dan pendaftaran koleksi baru.
 * @layer Presentation Component
 * 
 * Tujuan: Memfasilitasi sirkulasi buku fisik dan pendaftaran koleksi fisik/digital bagi staf perpustakaan.
 * Caller: src/client/pages/AdminDashboardPage.tsx / Pustakawan Workspace.
 * Dependensi: react, lucide-react, src/client/services/api.ts, shared/types, AddBookModal.
 * Main Functions: CirculationDesk.
 * Side Effects: Melakukan request peminjaman, pengembalian, dan pemanggilan modal pendaftaran buku.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import type { Loan, Book, BookCopy } from '../../../shared/types/index.js';
import { AddBookModal } from '../catalog/AddBookModal.js';
import {
  QrCode, CheckCircle2, AlertTriangle, ArrowRightLeft, DollarSign,
  Clock, RefreshCw, PlusCircle, BookOpen, Layers, Tablet, MapPin
} from 'lucide-react';

export const CirculationDesk: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'checkout' | 'return' | 'new-book'>('checkout');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAddBookModalOpen, setIsAddBookModalOpen] = useState<boolean>(false);
  const [lastAddedBook, setLastAddedBook] = useState<(Book & { copies?: BookCopy[] }) | null>(null);

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
      setCheckoutMsg({
        type: 'success',
        text: `Peminjaman eksemplar ${checkoutBarcode} oleh ${borrowerIdentity} berhasil dicatat!`
      });
      setCheckoutBarcode('');
      fetchCirculationHistory();
    } catch (err: unknown) {
      setCheckoutMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Gagal memproses peminjaman.'
      });
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
        message: res.message
      });
      setReturnBarcode('');
      fetchCirculationHistory();
    } catch (err: unknown) {
      setReturnError(err instanceof Error ? err.message : 'Gagal memproses pengembalian.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Desk Header Banner */}
      <div className="bg-gradient-to-r from-primary-700 to-primary-900 text-white p-6 rounded-3xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-primary-200 text-xs font-semibold uppercase tracking-wider mb-1">
              <QrCode size={16} />
              <span>Operasional Perpustakaan</span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold">Meja Sirkulasi Buku Fisik</h2>
            <p className="text-xs text-primary-100 mt-1 max-w-xl">
              Catat transaksi peminjaman eksemplar fisik, proses pengembalian buku tepat waktu maupun terlambat, serta verifikasi pembayaran denda administratif.
            </p>
          </div>

          <button
            onClick={fetchCirculationHistory}
            className="self-start md:self-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            <span>Segarkan Data</span>
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => {
              setActiveSubTab('checkout');
              setCheckoutMsg(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'checkout'
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-100 hover:bg-white/10'
            }`}
          >
            1. Peminjaman Buku (Check-Out)
          </button>

          <button
            onClick={() => {
              setActiveSubTab('return');
              setReturnResult(null);
              setReturnError(null);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'return'
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-100 hover:bg-white/10'
            }`}
          >
            2. Pengembalian & Denda (Check-In)
          </button>

          <button
            onClick={() => {
              setActiveSubTab('new-book');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'new-book'
                ? 'bg-white text-primary-900 shadow-sm'
                : 'text-primary-100 hover:bg-white/10'
            }`}
          >
            <PlusCircle size={14} />
            <span>3. Input Koleksi Baru</span>
          </button>
        </div>
      </div>

      {/* Action Form Panel */}
      <div className="bg-surface-card p-6 rounded-2xl border border-border-subtle shadow-sm">
        {activeSubTab === 'checkout' ? (
          <div>
            <h3 className="font-bold text-base text-text-main flex items-center gap-2">
              <ArrowRightLeft size={18} className="text-primary-600" />
              <span>Formulir Peminjaman Eksemplar Fisik</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Gunakan barcode scanner atau masukkan kode barcode yang tertera pada label buku fisik sekolah.
            </p>

            <form onSubmit={handleProcessCheckout} className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">
                  Nomor Identitas Anggota (NISN / NIP)
                </label>
                <input
                  type="text"
                  value={borrowerIdentity}
                  onChange={(e) => setBorrowerIdentity(e.target.value)}
                  placeholder="Contoh: NISN202601 atau GURU001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">
                  Barcode Eksemplar Buku Fisik
                </label>
                <input
                  type="text"
                  value={checkoutBarcode}
                  onChange={(e) => setCheckoutBarcode(e.target.value)}
                  placeholder="Contoh: BK-0001-01 atau BK-0002-01"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
                >
                  Proses Peminjaman
                </button>
              </div>
            </form>

            {checkoutMsg && (
              <div
                className={`mt-4 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                  checkoutMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
              >
                {checkoutMsg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                <span>{checkoutMsg.text}</span>
              </div>
            )}
          </div>
        ) : activeSubTab === 'return' ? (
          <div>
            <h3 className="font-bold text-base text-text-main flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-600" />
              <span>Formulir Pengembalian & Kalkulasi Denda</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              Sistem secara otomatis menghitung selisih hari jatuh tempo dan formula denda (Rp 1.000 / hari).
            </p>

            <form onSubmit={handleProcessReturn} className="mt-4 space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">
                  Barcode Eksemplar yang Dikembalikan
                </label>
                <input
                  type="text"
                  value={returnBarcode}
                  onChange={(e) => setReturnBarcode(e.target.value)}
                  placeholder="Contoh: BK-0001-01"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="fineCheck"
                  checked={isFinePaid}
                  onChange={(e) => setIsFinePaid(e.target.checked)}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <label htmlFor="fineCheck" className="text-xs text-text-main cursor-pointer font-medium">
                  Tandai denda (jika ada) langsung dilunasi di meja kasir
                </label>
              </div>

              <button
                type="submit"
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                Konfirmasi Pengembalian Buku
              </button>
            </form>

            {returnError && (
              <div className="mt-4 p-3.5 rounded-xl text-xs font-medium bg-red-50 text-red-800 border border-red-200 flex items-center gap-2">
                <AlertTriangle size={16} />
                <span>{returnError}</span>
              </div>
            )}

            {returnResult && (
              <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center gap-2 text-sm font-bold text-text-main">
                  <CheckCircle2 size={18} className="text-emerald-600" />
                  <span>{returnResult.message}</span>
                </div>
                {returnResult.overdueDays > 0 && (
                  <div className="flex items-center gap-3 text-xs pt-2 border-t border-slate-200">
                    <span className="flex items-center gap-1 text-amber-700 font-medium">
                      <Clock size={14} /> Terlambat: {returnResult.overdueDays} Hari
                    </span>
                    <span className="flex items-center gap-1 text-red-600 font-bold">
                      <DollarSign size={14} /> Denda: Rp {returnResult.fineAmount.toLocaleString('id-ID')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-subtle">
              <div>
                <h3 className="font-bold text-base text-text-main flex items-center gap-2">
                  <PlusCircle size={18} className="text-primary-600" />
                  <span>Pendaftaran Koleksi & Inventaris Buku Baru</span>
                </h3>
                <p className="text-xs text-text-muted mt-0.5">
                  Tambahkan buku fisik dengan auto-generate barcode eksemplar, atau unggah buku digital (PDF) dengan alokasi lisensi peminjaman daring.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAddBookModalOpen(true)}
                className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <PlusCircle size={15} />
                <span>Buka Formulir Input Koleksi</span>
              </button>
            </div>

            {/* Banner Quick Actions */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-1">
                  <BookOpen size={16} className="text-amber-700" />
                  <span>Koleksi Buku Fisik</span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed">
                  Input judul, nomor ISBN, lokasi rak, serta jumlah eksemplar. Barcode eksemplar (<span className="font-mono font-semibold">BK-...</span>) dibuat otomatis dan siap ditempel pada fisik buku.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-200/80">
                <div className="flex items-center gap-2 text-indigo-900 font-bold text-xs mb-1">
                  <Tablet size={16} className="text-indigo-700" />
                  <span>Koleksi E-Book Digital</span>
                </div>
                <p className="text-xs text-indigo-800 leading-relaxed">
                  Unggah berkas PDF materi sekolah, atur kuota lisensi peminjaman digital bersamaan, dan buku langsung dapat dibaca online maupun offline di PWA.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs mb-1">
                  <Layers size={16} className="text-emerald-700" />
                  <span>Koleksi Hybrid</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Satu judul memiliki eksemplar fisik di perpustakaan sekaligus berkas PDF yang dapat dipinjam siswa secara digital melalui aplikasi PWA.
                </p>
              </div>
            </div>

            {/* Last Added Book Card */}
            {lastAddedBook && (
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 mb-2">
                  <CheckCircle2 size={16} />
                  <span>Koleksi Terakhir Berhasil Didaftarkan ke Sistem:</span>
                </div>
                <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h5 className="text-sm font-bold text-slate-800">{lastAddedBook.title}</h5>
                      <p className="text-xs text-slate-500">{lastAddedBook.author} &bull; {lastAddedBook.publisher} ({lastAddedBook.publicationYear})</p>
                    </div>
                    <span className="px-2.5 py-1 bg-primary-100 text-primary-800 text-[10px] font-bold rounded-lg uppercase">
                      {lastAddedBook.bookType}
                    </span>
                  </div>

                  {lastAddedBook.shelfLocation && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <MapPin size={13} className="text-slate-400" />
                      <span>Lokasi Rak: <strong className="font-semibold text-slate-800">{lastAddedBook.shelfLocation}</strong></span>
                    </div>
                  )}

                  {lastAddedBook.copies && lastAddedBook.copies.length > 0 && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-[11px] font-semibold text-slate-600 block mb-1.5">
                        Barcode Eksemplar Fisik ({lastAddedBook.copies.length} eksemplar):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {lastAddedBook.copies.map(c => (
                          <span key={c.id} className="font-mono text-[11px] bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-200 font-medium">
                            {c.barcode}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setIsAddBookModalOpen(true)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-800 flex items-center gap-1"
                    >
                      <PlusCircle size={13} />
                      <span>Input Koleksi Lainnya</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Circulation Log Table */}
      <div className="bg-surface-card rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between">
          <h4 className="font-bold text-sm text-text-main">Riwayat Sirkulasi Terbaru</h4>
          <span className="text-xs text-text-muted font-medium">{loans.length} Transaksi Tercatat</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-text-muted font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Peminjam</th>
                <th className="py-3 px-4">Judul Buku</th>
                <th className="py-3 px-4">Format / Barcode</th>
                <th className="py-3 px-4">Tgl Pinjam</th>
                <th className="py-3 px-4">Jatuh Tempo</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Denda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loans.length > 0 ? (
                loans.slice(0, 15).map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-text-main">{l.userName}</div>
                      <div className="text-[10px] text-text-muted font-mono">{l.userIdentity}</div>
                    </td>
                    <td className="py-3 px-4 font-medium max-w-xs truncate" title={l.bookTitle}>
                      {l.bookTitle}
                    </td>
                    <td className="py-3 px-4">
                      {l.loanType === 'DIGITAL' ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          E-Book
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold">
                          {l.copyBarcode || 'Fisik'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-text-muted">
                      {new Date(l.borrowDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {new Date(l.dueDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="py-3 px-4">
                      {l.status === 'BORROWED' ? (
                        <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                          Dipinjam
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          Kembali
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {l.fineAmount > 0 ? (
                        <span className="text-red-600 font-bold">
                          Rp {l.fineAmount.toLocaleString('id-ID')}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-text-muted">
                    Belum ada transaksi peminjaman yang tercatat.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Pendaftaran Koleksi Buku Baru */}
      <AddBookModal
        isOpen={isAddBookModalOpen}
        onClose={() => setIsAddBookModalOpen(false)}
        onSuccess={(newBook) => {
          setLastAddedBook(newBook);
          setIsAddBookModalOpen(false);
        }}
      />
    </div>
  );
};
