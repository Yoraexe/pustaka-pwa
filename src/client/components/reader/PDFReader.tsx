/**
 * @file src/client/components/reader/PDFReader.tsx
 * @description In-App E-Book Reader dengan streaming PDF dokumen resmi, watermark canvas proteksi siswa, cache IndexedDB offline, dan auto-save bookmark progres membaca.
 * @layer Presentation Component
 * 
 * Tujuan: Menyediakan antarmuka pembaca dokumen PDF terproteksi dengan pencatatan progres baca siswa secara persisten.
 * Caller: src/client/pages/MyBooksPage.tsx
 * Dependensi: react, src/client/services/api.ts, src/client/services/offlineStorage.ts, shared/types
 * Main Functions: PDFReader
 * Side Effects: Membaca/menulis localStorage untuk bookmark progres baca, membaca/menulis IndexedDB untuk salinan offline, HTTP GET stream PDF.
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Book, User } from '../../../shared/types/index.js';
import { api } from '../../services/api.js';
import { offlineStorage } from '../../services/offlineStorage.js';
import {
  ArrowLeft, ShieldCheck, DownloadCloud,
  FileText, CheckCircle2, Loader2, Bookmark,
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut
} from 'lucide-react';
import { toast } from 'sonner';

interface PDFReaderProps {
  book: Book;
  user: User;
  onClose: () => void;
}

interface ReadingProgress {
  page: number;
  updatedAt: string;
}

export const PDFReader: React.FC<PDFReaderProps> = ({ book, user, onClose }) => {
  const [isSavedOffline, setIsSavedOffline] = useState<boolean>(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Real Reading Progress & Bookmark
  const storageKey = `pustaka_progress_${user.id}_${book.id}`;
  const [savedProgress, setSavedProgress] = useState<ReadingProgress | null>(null);
  const [currentPageInput, setCurrentPageInput] = useState<number>(1);
  const [activePage, setActivePage] = useState<number>(1);

  const watermarkOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const currentBlobRef = useRef<Blob | null>(null);
  const pdfBlobUrlRef = useRef<string | null>(null);

  const cacheKey = `/api/books/${book.id}/stream-pdf`;

  // 1. Inisialisasi Bookmark Progres Membaca dari localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: ReadingProgress = JSON.parse(stored);
        setSavedProgress(parsed);
        setCurrentPageInput(parsed.page);
        setActivePage(parsed.page);
      }
    } catch {
      // Abaikan jika localStorage tidak valid
    }
  }, [storageKey]);

  // Cek apakah buku sudah tersimpan di IndexedDB perangkat
  useEffect(() => {
    offlineStorage.isEbookSaved(book.id).then(saved => {
      setIsSavedOffline(saved);
    });
  }, [book.id]);

  // 2. Muat Berkas PDF Riil dari IndexedDB atau Server Streaming
  useEffect(() => {
    let active = true;

    const loadPdfDocument = async () => {
      setIsLoadingPdf(true);
      setErrorMessage(null);
      try {
        // Prioritaskan cache offline (IndexedDB & Cache API)
        let blob: Blob | null = await offlineStorage.getEbook(book.id);
        if (blob) {
          setIsSavedOffline(true);
        }

        // Jika belum ada di lokal dan online, unduh dari server streaming
        if (!blob) {
          const token = api.getToken();
          const res = await fetch(cacheKey, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            blob = await res.blob();
          } else {
            if (res.status === 403) {
              setErrorMessage('Akses Ditolak: Anda belum meminjam e-book ini atau masa peminjaman telah berakhir.');
            } else if (res.status === 401) {
              setErrorMessage('Sesi Berakhir: Silakan masuk kembali ke akun Anda untuk membaca e-book.');
            } else if (res.status === 404) {
              setErrorMessage('Berkas PDF e-book belum diunggah atau tidak ditemukan di server perpustakaan.');
            } else {
              setErrorMessage(`Gagal memuat dokumen (Status: ${res.status}).`);
            }
          }
        }

        if (active && blob) {
          currentBlobRef.current = blob;
          const url = URL.createObjectURL(blob);
          pdfBlobUrlRef.current = url;
          setPdfBlobUrl(url);
        }
      } catch (err) {
        console.warn('Gagal memuat PDF stream riil:', err);
        if (active) setErrorMessage('Gagal menghubungi server perpustakaan. Periksa koneksi internet Anda.');
      } finally {
        if (active) setIsLoadingPdf(false);
      }
    };

    loadPdfDocument();

    return () => {
      active = false;
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
        pdfBlobUrlRef.current = null;
      }
    };
  }, [book.id, cacheKey]);

  const goToPage = (page: number) => {
    const target = Math.max(1, page);
    setActivePage(target);
    setCurrentPageInput(target);
  };

  // 3. Simpan Progres Halaman Terakhir ke localStorage
  const handleSaveProgress = (pageToSave: number) => {
    if (pageToSave < 1) return;
    const progressData: ReadingProgress = {
      page: pageToSave,
      updatedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem(storageKey, JSON.stringify(progressData));
      setSavedProgress(progressData);
      setActivePage(pageToSave);
      toast.success('Progres Tersimpan', {
        description: `Posisi baca tersimpan di Halaman ${pageToSave}.`,
      });
    } catch {
      toast.error('Gagal Menyimpan Progres');
    }
  };

  // 4. Unduh & Simpan ke Penyimpanan Offline (IndexedDB)
  const handleSaveOffline = async () => {
    try {
      let blob = currentBlobRef.current;
      if (!blob) {
        const token = api.getToken();
        const res = await fetch(cacheKey, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error('Gagal mengunduh berkas e-book dari server.');
        blob = await res.blob();
        currentBlobRef.current = blob;
      }

      await offlineStorage.saveEbook(book.id, book.title, blob);
      setIsSavedOffline(true);
      toast.success('Buku Tersimpan Luring', {
        description: `"${book.title}" tersimpan di memori perangkat. Anda dapat membacanya tanpa koneksi internet.`,
      });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Gagal menyimpan berkas luring.');
    }
  };

  // 5. Watermark Proteksi Anti-Bocor (Canvas Overlay dengan Adaptasi Resize Responsif)
  useEffect(() => {
    const wmCanvas = watermarkOverlayRef.current;
    if (!wmCanvas) return;

    const parent = wmCanvas.parentElement;

    const renderWatermark = () => {
      const ctx = wmCanvas.getContext('2d');
      if (!ctx) return;

      const width = parent?.clientWidth || 800;
      const height = parent?.clientHeight || 900;
      wmCanvas.width = width;
      wmCanvas.height = height;

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(width / 2, height / 2);
      ctx.rotate(-Math.PI / 4);
      ctx.font = `bold 14px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.06)';
      ctx.textAlign = 'center';

      const wmText = `PERPUSTAKAAN SEKOLAH • ${user.name.toUpperCase()} (${user.identityNumber})`;
      const spread = Math.max(width, height);
      for (let y = -spread; y <= spread; y += 110) {
        ctx.fillText(wmText, 0, y);
      }
      ctx.restore();
    };

    renderWatermark();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && parent) {
      resizeObserver = new ResizeObserver(() => {
        renderWatermark();
      });
      resizeObserver.observe(parent);
    }

    window.addEventListener('resize', renderWatermark);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', renderWatermark);
    };
  }, [user]);

  // 6. Proteksi DRM Shortcut & Klik Kanan (Cegat Ctrl+P, Ctrl+S, dan Klik Kanan) - BRD 3.2 Aturan 4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P' || e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        toast.warning('Proteksi Hak Cipta', {
          description: 'Pencetakan atau penyimpanan dokumen ini dibatasi oleh kebijakan DRM perpustakaan.',
        });
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  // Sembunyikan toolbar native browser (#toolbar=0) untuk mencegah unduhan dokumen asli tanpa watermark (BRD Seksi 3.2 Aturan 4)
  const targetPdfUrl = pdfBlobUrl ? `${pdfBlobUrl}#page=${activePage}&zoom=${zoomLevel}&toolbar=0&navpanes=0` : null;

  return (
    <div
      onContextMenu={(e) => e.preventDefault()}
      className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 select-none"
    >
      {/* Top Header Navigation */}
      <header className="h-14 px-3 sm:px-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 backdrop-blur-md sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-semibold text-slate-200 cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          <div className="truncate max-w-[140px] sm:max-w-xs md:max-w-md">
            <h2 className="font-bold text-xs sm:text-sm truncate text-white">{book.title}</h2>
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <ShieldCheck size={11} className="text-emerald-400 shrink-0" />
              <span className="truncate">{user.name}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-slate-800/80 rounded-xl px-1.5 py-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.max(50, prev - 25))}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Perkecil Tampilan"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-slate-300 min-w-[36px] text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((prev) => Math.min(200, prev + 25))}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Perbesar Tampilan"
            >
              <ZoomIn size={13} />
            </button>
          </div>

          {/* Page Navigation & Bookmark */}
          <div className="flex items-center bg-slate-800/80 rounded-xl px-1.5 py-1 border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => goToPage(activePage - 1)}
              disabled={activePage <= 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-transparent text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Halaman Sebelumnya"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[10px] text-slate-400 mx-1 hidden sm:inline">Hlm:</span>
            <input
              type="number"
              min={1}
              value={currentPageInput}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                if (!isNaN(val)) setCurrentPageInput(val);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  goToPage(currentPageInput);
                }
              }}
              onBlur={() => goToPage(currentPageInput)}
              className="w-10 bg-slate-900 border border-slate-700 rounded px-1 py-0.5 text-center text-xs font-mono text-white focus:outline-none focus:border-primary-500"
            />
            <button
              type="button"
              onClick={() => goToPage(activePage + 1)}
              className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Halaman Selanjutnya"
            >
              <ChevronRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => handleSaveProgress(activePage)}
              className="ml-1 p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Simpan Bookmark Halaman"
            >
              <Bookmark size={14} className={savedProgress?.page === activePage ? 'text-amber-400 fill-amber-400' : ''} />
            </button>
          </div>

          {/* Real Offline Download */}
          <button
            onClick={handleSaveOffline}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              isSavedOffline
                ? 'text-emerald-300 bg-emerald-950/80 border border-emerald-700/60'
                : 'bg-primary-600 text-white hover:bg-primary-500'
            }`}
          >
            {isSavedOffline ? <CheckCircle2 size={14} /> : <DownloadCloud size={14} />}
            <span className="hidden md:inline">{isSavedOffline ? 'Tersimpan' : 'Unduh Luring'}</span>
          </button>
        </div>
      </header>

      {/* Bookmark Resume Notification Strip */}
      {savedProgress && savedProgress.page > 1 && savedProgress.page !== activePage && (
        <div className="bg-primary-950/90 border-b border-primary-800/60 px-4 py-2 flex items-center justify-between text-xs text-primary-200">
          <div className="flex items-center gap-2">
            <Bookmark size={14} className="text-amber-400 fill-amber-400 shrink-0" />
            <span>
              Posisi terakhir: <strong>Halaman {savedProgress.page}</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setActivePage(savedProgress.page);
              setCurrentPageInput(savedProgress.page);
            }}
            className="px-2.5 py-1 rounded bg-primary-600 hover:bg-primary-500 text-white font-semibold text-[11px] transition-colors"
          >
            Lanjut Hlm {savedProgress.page}
          </button>
        </div>
      )}

      {/* Main Viewport */}
      <main className="flex-1 overflow-hidden relative flex items-center justify-center p-2 sm:p-4 bg-slate-950">
        {/* Dynamic Watermark Canvas Overlay (Unselectable) */}
        <canvas
          ref={watermarkOverlayRef}
          className="absolute inset-0 pointer-events-none z-10 w-full h-full"
        />

        {isLoadingPdf ? (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 size={32} className="animate-spin text-primary-500" />
            <span className="text-xs font-medium">Memuat dokumen...</span>
          </div>
        ) : targetPdfUrl ? (
          <div className="w-full h-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-800">
            <object
              data={targetPdfUrl}
              type="application/pdf"
              className="w-full h-full min-h-[500px]"
            >
              <iframe
                src={targetPdfUrl}
                title={book.title}
                className="w-full h-full min-h-[500px] border-0"
              />
            </object>
          </div>
        ) : (
          <div className="text-center p-8 bg-slate-900 border border-slate-800 rounded-3xl max-w-md shadow-xl">
            <FileText size={44} className="mx-auto text-slate-500 mb-3" />
            <h4 className="font-bold text-base text-white">
              {errorMessage ? 'Tidak Dapat Membuka Dokumen' : 'Dokumen Belum Tersedia'}
            </h4>
            <p className="text-xs text-slate-400 mt-2 mb-5 leading-relaxed">
              {errorMessage || 'Berkas PDF buku ini belum diunggah oleh staf perpustakaan.'}
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}
      </main>
    </div>
  );
};
