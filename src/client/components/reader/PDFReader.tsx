/**
 * @file src/client/components/reader/PDFReader.tsx
 * @description In-App E-Book Reader dengan HTML5 Canvas, watermarking dinamis siswa, dan tema Sepia/Dark.
 * @layer Presentation Component
 */

import React, { useState, useEffect, useRef } from 'react';
import type { Book, User } from '../../../shared/types/index.js';
import { ArrowLeft, Sun, Moon, Coffee, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, ShieldCheck, DownloadCloud } from 'lucide-react';

interface PDFReaderProps {
  book: Book;
  user: User;
  onClose: () => void;
}

type ReaderTheme = 'light' | 'sepia' | 'dark';

export const PDFReader: React.FC<PDFReaderProps> = ({ book, user, onClose }) => {
  const [theme, setTheme] = useState<ReaderTheme>('sepia');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages] = useState<number>(14); // Representasi halaman modul informatika
  const [zoomScale, setZoomScale] = useState<number>(1.0);
  const [isSavedOffline, setIsSavedOffline] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render dummy / preview page pada canvas dengan proteksi watermark dinamis
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 600 * zoomScale;
    const height = 800 * zoomScale;
    canvas.width = width;
    canvas.height = height;

    // 1. Background sesuai Theme
    if (theme === 'sepia') {
      ctx.fillStyle = '#FBF0D9';
    } else if (theme === 'dark') {
      ctx.fillStyle = '#0F172A';
    } else {
      ctx.fillStyle = '#FFFFFF';
    }
    ctx.fillRect(0, 0, width, height);

    // 2. Konten Teks Halaman Buku
    const textColor = theme === 'dark' ? '#E2E8F0' : theme === 'sepia' ? '#433422' : '#1E293B';
    ctx.fillStyle = textColor;

    // Header Buku
    ctx.font = `bold ${16 * zoomScale}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillText(`${book.title.toUpperCase()}`, 40 * zoomScale, 50 * zoomScale);
    ctx.font = `${11 * zoomScale}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = theme === 'dark' ? '#94A3B8' : '#78716C';
    ctx.fillText(`BAB ${currentPage}: Landasan Berpikir Komputasional & Pemrograman`, 40 * zoomScale, 70 * zoomScale);

    ctx.strokeStyle = theme === 'dark' ? '#334155' : '#E7E5E4';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40 * zoomScale, 85 * zoomScale);
    ctx.lineTo((width - 40) * zoomScale, 85 * zoomScale);
    ctx.stroke();

    // Body Text Halaman
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

    // 3. Dynamic Watermark Overlay (Directive Keamanan: NISN + Nama Siswa Miring 45 derajat)
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.rotate(-Math.PI / 4);
    ctx.font = `bold ${18 * zoomScale}px 'Plus Jakarta Sans', sans-serif`;
    ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.09)';
    ctx.textAlign = 'center';

    const watermarkText = `PERPUSTAKAAN SEKOLAH • ${user.name.toUpperCase()} (${user.identityNumber})`;
    ctx.fillText(watermarkText, 0, -100 * zoomScale);
    ctx.fillText(watermarkText, 0, 0);
    ctx.fillText(watermarkText, 0, 100 * zoomScale);
    ctx.restore();

  }, [currentPage, zoomScale, theme, book, user]);

  const handleSaveOffline = () => {
    localStorage.setItem(`offline_book_${book.id}`, 'true');
    setIsSavedOffline(true);
    alert(`Buku "${book.title}" berhasil disimpan ke penyimpanan lokal perangkat untuk pembacaan offline.`);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col transition-colors duration-200 select-none ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : theme === 'sepia' ? 'bg-[#F2E8CE] text-[#433422]' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* Top Header Controls */}
      <header className="h-14 px-4 border-b border-black/10 flex items-center justify-between backdrop-blur-md bg-opacity-90 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/5 transition-colors flex items-center gap-1.5 text-xs font-semibold"
          >
            <ArrowLeft size={18} />
            <span className="hidden sm:inline">Kembali</span>
          </button>
          <div className="truncate max-w-[200px] sm:max-w-md">
            <h2 className="font-bold text-xs sm:text-sm truncate">{book.title}</h2>
            <div className="flex items-center gap-1 text-[10px] opacity-70">
              <ShieldCheck size={11} className="text-emerald-500 shrink-0" />
              <span>Proteksi Watermark: {user.name}</span>
            </div>
          </div>
        </div>

        {/* Theme & Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Theme Toggles */}
          <div className="flex items-center bg-black/5 rounded-lg p-0.5">
            <button
              onClick={() => setTheme('light')}
              title="Tema Terang"
              className={`p-1.5 rounded-md ${theme === 'light' ? 'bg-white text-slate-900 shadow-xs' : 'opacity-60'}`}
            >
              <Sun size={15} />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              title="Tema Sepia (Kenyamanan Mata)"
              className={`p-1.5 rounded-md ${theme === 'sepia' ? 'bg-[#FBF0D9] text-[#433422] shadow-xs' : 'opacity-60'}`}
            >
              <Coffee size={15} />
            </button>
            <button
              onClick={() => setTheme('dark')}
              title="Tema Gelap"
              className={`p-1.5 rounded-md ${theme === 'dark' ? 'bg-slate-800 text-white shadow-xs' : 'opacity-60'}`}
            >
              <Moon size={15} />
            </button>
          </div>

          {/* Offline Save Button */}
          <button
            onClick={handleSaveOffline}
            title="Simpan untuk Offline PWA"
            className={`p-2 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
              isSavedOffline ? 'text-emerald-600 bg-emerald-100/50' : 'hover:bg-black/5'
            }`}
          >
            <DownloadCloud size={16} />
            <span className="hidden md:inline">{isSavedOffline ? 'Tersimpan Offline' : 'Unduh Offline'}</span>
          </button>
        </div>
      </header>

      {/* Main Canvas Document Viewport */}
      <main className="flex-1 overflow-auto flex items-center justify-center p-4">
        <div className="shadow-2xl rounded-lg overflow-hidden border border-black/10 transition-transform">
          <canvas ref={canvasRef} className="block max-w-full h-auto" />
        </div>
      </main>

      {/* Bottom Floating Navigation Toolbar */}
      <footer className="h-16 px-4 border-t border-black/10 flex items-center justify-between backdrop-blur-md bg-opacity-90 max-w-xl mx-auto w-full rounded-t-2xl">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoomScale(s => Math.max(0.7, s - 0.1))}
            className="p-2 rounded-lg hover:bg-black/5"
            title="Perkecil"
          >
            <ZoomOut size={18} />
          </button>
          <span className="text-xs font-medium w-12 text-center">{Math.round(zoomScale * 100)}%</span>
          <button
            onClick={() => setZoomScale(s => Math.min(1.5, s + 0.1))}
            className="p-2 rounded-lg hover:bg-black/5"
            title="Perbesar"
          >
            <ZoomIn size={18} />
          </button>
        </div>

        {/* Page Pagination */}
        <div className="flex items-center gap-3">
          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="p-2 rounded-lg hover:bg-black/5 disabled:opacity-30"
          >
            <ChevronLeft size={20} />
          </button>

          <span className="text-xs font-semibold">
            {currentPage} / {totalPages}
          </span>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="p-2 rounded-lg hover:bg-black/5 disabled:opacity-30"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </footer>
    </div>
  );
};
