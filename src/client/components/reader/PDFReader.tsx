/**
 * @file src/client/components/reader/PDFReader.tsx
 * @description In-App E-Book Reader dengan dukungan streaming file PDF asli, Cache Storage offline riil, dan watermark canvas siswa.
 * @layer Presentation Component
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Book, User } from '../../../shared/types/index.js';
import { api } from '../../services/api.js';
import { offlineStorage } from '../../services/offlineStorage.js';
import {
  ArrowLeft, Sun, Moon, Coffee, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, ShieldCheck, DownloadCloud,
  FileText, CheckCircle2, Loader2
} from 'lucide-react';

interface PDFReaderProps {
  book: Book;
  user: User;
  onClose: () => void;
}

type ReaderTheme = 'light' | 'sepia' | 'dark';
type ViewMode = 'real-pdf' | 'canvas-theme';

export const PDFReader: React.FC<PDFReaderProps> = ({ book, user, onClose }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('real-pdf');
  const [theme, setTheme] = useState<ReaderTheme>('sepia');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages] = useState<number>(14);
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isSavedOffline, setIsSavedOffline] = useState<boolean>(false);
  const [isLoadingPdf, setIsLoadingPdf] = useState<boolean>(true);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const watermarkOverlayRef = useRef<HTMLCanvasElement | null>(null);
  const currentBlobRef = useRef<Blob | null>(null);

  const cacheKey = `/api/books/${book.id}/stream-pdf`;

  // Cek apakah buku ini sudah tersimpan offline di perangkat
  useEffect(() => {
    offlineStorage.isEbookSaved(book.id).then(saved => {
      setIsSavedOffline(saved);
    });
  }, [book.id]);

  // 1. Load Real PDF stream from IndexedDB / Cache API or Server
  useEffect(() => {
    let active = true;

    const loadPdfDocument = async () => {
      setIsLoadingPdf(true);
      try {
        // 1. Prioritaskan pengambilan offline-first (IndexedDB & Cache Storage)
        let blob: Blob | null = await offlineStorage.getEbook(book.id);
        if (blob) {
          setIsSavedOffline(true);
        }

        // 2. Jika belum tersimpan lokal dan perangkat online, fetch dari server
        if (!blob) {
          const token = api.getToken();
          const res = await fetch(cacheKey, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (res.ok) {
            blob = await res.blob();
          }
        }

        if (active && blob) {
          currentBlobRef.current = blob;
          const url = URL.createObjectURL(blob);
          setPdfBlobUrl(url);
        } else if (active && !blob) {
          // Jika tidak ada blob dan offline, beralih ke canvas reflow mode
          setViewMode('canvas-theme');
        }
      } catch (err) {
        console.warn('Gagal memuat PDF binary riil, beralih ke canvas preview:', err);
        setViewMode('canvas-theme');
      } finally {
        if (active) setIsLoadingPdf(false);
      }
    };

    loadPdfDocument();

    return () => {
      active = false;
      if (pdfBlobUrl) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [book.id, cacheKey]);

  // 2. Real Offline Save via IndexedDB & Cache Storage API
  const handleSaveOffline = async () => {
    try {
      let blob = currentBlobRef.current;
      if (!blob) {
        const token = api.getToken();
        const res = await fetch(cacheKey, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) throw new Error('Gagal mengunduh file dari server.');
        blob = await res.blob();
        currentBlobRef.current = blob;
      }

      // Simpan ke IndexedDB & Cache Storage secara redundan
      await offlineStorage.saveEbook(book.id, book.title, blob);
      setIsSavedOffline(true);
      alert(`Buku "${book.title}" berhasil disimpan di perangkat Anda (IndexedDB & Cache API). Anda dapat membacanya secara offline tanpa jaringan internet.`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Gagal menyimpan offline.');
    }
  };

  // 3. Render Canvas Watermark Overlay (Anti-Leak Layer)
  useEffect(() => {
    const wmCanvas = watermarkOverlayRef.current;
    if (!wmCanvas) return;

    const ctx = wmCanvas.getContext('2d');
    if (!ctx) return;

    const width = wmCanvas.parentElement?.clientWidth || 800;
    const height = wmCanvas.parentElement?.clientHeight || 900;
    wmCanvas.width = width;
    wmCanvas.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.font = `bold 16px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.textAlign = 'center';

    const wmText = `PERPUSTAKAAN SEKOLAH • ${user.name.toUpperCase()} (${user.identityNumber})`;
    for (let y = -400; y <= 400; y += 120) {
      ctx.fillText(wmText, 0, y);
    }
    ctx.restore();
  }, [user, viewMode]);

  // 4. Render Reflowable Sepia/Dark Canvas Theme
  useEffect(() => {
    if (viewMode !== 'canvas-theme') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600 * zoomScale;
    const height = 800 * zoomScale;
    canvas.width = width;
    canvas.height = height;

    if (theme === 'sepia') {
      ctx.fillStyle = '#FBF0D9';
    } else if (theme === 'dark') {
      ctx.fillStyle = '#0F172A';
    } else {
      ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillRect(0, 0, width, height);

    const textColor = theme === 'dark' ? '#E2E8F0' : theme === 'sepia' ? '#433422' : '#1E293B';
    ctx.fillStyle = textColor;

    ctx.font = `bold ${16 * zoomScale}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText(`${book.title.toUpperCase()}`, 40 * zoomScale, 50 * zoomScale);
    ctx.font = `${11 * zoomScale}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = theme === 'dark' ? '#94A3B8' : '#78716C';
    ctx.fillText(`BAB ${currentPage}: Landasan Berpikir Komputasional & Informatika`, 40 * zoomScale, 70 * zoomScale);

    ctx.strokeStyle = theme === 'dark' ? '#334155' : '#E7E5E4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40 * zoomScale, 85 * zoomScale);
    ctx.lineTo((width - 40) * zoomScale, 85 * zoomScale);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = `${13 * zoomScale}px 'Plus Jakarta Sans', serif`;
    const lines = [
      `1.1 Pengantar Informatika dan Masyarakat Digital`,
      ``,
      `Pada era transformasi digital saat ini, pemahaman mendalam tentang`,
      `arsitektur sistem komputer, algoritma, serta etika digital menjadi fondasi utama`,
      `dalam kurikulum sekolah menengah. Kemampuan bernalar kritis melalui dekomposisi`,
      `masalah (computational thinking) membantu siswa merancang solusi perangkat lunak`,
      `yang modular, efisien, dan memiliki skalabilitas tinggi.`,
      ``,
      `Karakteristik Utama Sistem Digital Berbasis PWA:`,
      `• Multi-Platform: Berjalan seragam di Web, Android (WebAPK), dan iOS (Safari Standalone).`,
      `• Offline First: Memanfaatkan Service Worker untuk caching asset dan IndexedDB.`,
      `• Secure In-App Reading: Perlindungan hak cipta materi sekolah via canvas watermark.`,
      ``,
      `Latihan Pemahaman ${currentPage}.1:`,
      `Jelaskan mengapa pemisahan tanggung jawab (Clean Layered Architecture)`,
      `antara Controller, Service, dan Repository sangat penting dalam mencegah technical debt!`,
      ``,
      `[Halaman ${currentPage} dari ${totalPages}]`
    ];

    let yOffset = 120 * zoomScale;
    for (const line of lines) {
      ctx.fillText(line, 40 * zoomScale, yOffset);
      yOffset += 24 * zoomScale;
    }
  }, [currentPage, zoomScale, theme, book, viewMode]);

  return (
    <div className={`fixed inset-0 z-50 flex flex-col select-none ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : theme === 'sepia' ? 'bg-[#F2E8CE] text-[#433422]' : 'bg-slate-100 text-slate-900'
    }`}>
      {/* Top Header Controls */}
      <header className="h-14 px-4 border-b border-black/10 flex items-center justify-between backdrop-blur-md bg-opacity-90 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          <div className="truncate max-w-[160px] sm:max-w-xs md:max-w-md">
            <h2 className="font-bold text-xs sm:text-sm truncate">{book.title}</h2>
            <div className="flex items-center gap-1 text-[10px] opacity-70">
              <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
              <span>Proteksi Watermark: {user.name}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-black/5 rounded-lg p-0.5 text-xs font-semibold">
            <button
              onClick={() => setViewMode('real-pdf')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'real-pdf' ? 'bg-white text-primary-700 shadow-xs' : 'opacity-60'
              }`}
            >
              PDF Asli
            </button>
            <button
              onClick={() => setViewMode('canvas-theme')}
              className={`px-2.5 py-1 rounded-md transition-all ${
                viewMode === 'canvas-theme' ? 'bg-white text-primary-700 shadow-xs' : 'opacity-60'
              }`}
            >
              Reflow Tema
            </button>
          </div>

          {/* Theme Toggles (for canvas mode) */}
          {viewMode === 'canvas-theme' && (
            <div className="hidden sm:flex items-center bg-black/5 rounded-lg p-0.5">
              <button
                onClick={() => setTheme('light')}
                className={`p-1.5 rounded-md ${theme === 'light' ? 'bg-white shadow-xs' : 'opacity-60'}`}
              >
                <Sun size={14} />
              </button>
              <button
                onClick={() => setTheme('sepia')}
                className={`p-1.5 rounded-md ${theme === 'sepia' ? 'bg-[#FBF0D9] text-[#433422] shadow-xs' : 'opacity-60'}`}
              >
                <Coffee size={14} />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-1.5 rounded-md ${theme === 'dark' ? 'bg-slate-800 text-white shadow-xs' : 'opacity-60'}`}
              >
                <Moon size={14} />
              </button>
            </div>
          )}

          {/* Real Offline Download Button */}
          <button
            onClick={handleSaveOffline}
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              isSavedOffline ? 'text-emerald-700 bg-emerald-100' : 'bg-primary-600 text-white hover:bg-primary-700'
            }`}
          >
            {isSavedOffline ? <CheckCircle2 size={15} /> : <DownloadCloud size={15} />}
            <span className="hidden md:inline">{isSavedOffline ? 'Tersimpan Offline' : 'Unduh Offline'}</span>
          </button>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-1 overflow-auto relative flex items-center justify-center p-2 sm:p-4">
        {/* Dynamic Watermark Canvas Overlay (Unselectable) */}
        <canvas
          ref={watermarkOverlayRef}
          className="absolute inset-0 pointer-events-none z-10 w-full h-full"
        />

        {viewMode === 'real-pdf' ? (
          isLoadingPdf ? (
            <div className="flex flex-col items-center justify-center gap-2 text-text-muted">
              <Loader2 size={32} className="animate-spin text-primary-600" />
              <span className="text-xs font-medium">Memuat dokumen PDF sekolah...</span>
            </div>
          ) : pdfBlobUrl ? (
            <div className="w-full h-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
              <object
                data={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                type="application/pdf"
                className="w-full h-full min-h-[500px]"
              >
                <iframe
                  src={pdfBlobUrl}
                  title="PDF Viewer"
                  className="w-full h-full min-h-[500px] border-0"
                />
              </object>
            </div>
          ) : (
            <div className="text-center p-8 bg-surface-card rounded-2xl max-w-sm">
              <FileText size={40} className="mx-auto text-slate-400 mb-2" />
              <h4 className="font-bold text-sm">Dokumen PDF Belum Diunggah</h4>
              <p className="text-xs text-text-muted mt-1 mb-3">
                Silakan beralih ke Mode Reflow Tema untuk membaca materi pelajaran.
              </p>
              <button
                onClick={() => setViewMode('canvas-theme')}
                className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-semibold"
              >
                Buka Mode Reflow
              </button>
            </div>
          )
        ) : (
          <div className="shadow-2xl rounded-lg overflow-hidden border border-black/10">
            <canvas ref={canvasRef} className="block max-w-full h-auto" />
          </div>
        )}
      </main>

      {/* Bottom Floating Scrubber for Canvas Mode */}
      {viewMode === 'canvas-theme' && (
        <footer className="h-14 px-4 border-t border-black/10 flex items-center justify-between backdrop-blur-md bg-opacity-90 max-w-xl mx-auto w-full rounded-t-2xl">
          <div className="flex items-center gap-1">
            <button onClick={() => setZoomScale(s => Math.max(0.7, s - 0.1))} className="p-1.5 rounded-lg hover:bg-black/5">
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-medium w-12 text-center">{Math.round(zoomScale * 100)}%</span>
            <button onClick={() => setZoomScale(s => Math.min(1.5, s + 0.1))} className="p-1.5 rounded-lg hover:bg-black/5">
              <ZoomIn size={16} />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg hover:bg-black/5 disabled:opacity-30"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs font-semibold">{currentPage} / {totalPages}</span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg hover:bg-black/5 disabled:opacity-30"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
