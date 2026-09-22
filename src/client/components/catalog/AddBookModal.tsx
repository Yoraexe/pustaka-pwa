/**
 * @file src/client/components/catalog/AddBookModal.tsx
 * @description Modal interaktif formulir pendaftaran buku baru (Koleksi Fisik, E-Book Digital, & Hybrid) lengkap dengan upload file dan auto-barcode.
 * @layer Presentation Component
 * 
 * Tujuan: Memfasilitasi Pustakawan & Admin menginput buku baru ke katalog perpustakaan sekolah.
 * Caller: src/client/pages/CatalogPage.tsx & src/client/components/circulation/CirculationDesk.tsx.
 * Dependensi: react, lucide-react, src/client/services/api.ts, shared/types.
 * Main Functions: AddBookModal.
 * Side Effects: Melakukan multipart HTTP POST ke /api/books untuk menyimpan buku dan file.
 */

import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.js';
import type { Category, Book, BookCopy, BookType } from '../../../shared/types/index.js';
import {
  X, PlusCircle, BookOpen, Tablet, Layers, MapPin,
  Upload, FileText, CheckCircle2, AlertTriangle, Loader2, Sparkles
} from 'lucide-react';

interface AddBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBook: Book & { copies?: BookCopy[] }) => void;
}

export const AddBookModal: React.FC<AddBookModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [bookType, setBookType] = useState<BookType>('HYBRID');
  
  // Form fields
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [publisher, setPublisher] = useState('');
  const [publicationYear, setPublicationYear] = useState<number>(new Date().getFullYear());
  const [categoryId, setCategoryId] = useState<number>(1);
  const [isbn, setIsbn] = useState('');
  
  // Physical fields
  const [shelfLocation, setShelfLocation] = useState('RAK-INF-01');
  const [totalPhysicalCopies, setTotalPhysicalCopies] = useState<number>(3);
  
  // Digital fields
  const [digitalLicenseCount, setDigitalLicenseCount] = useState<number>(5);
  const [ebookFile, setEbookFile] = useState<File | null>(null);
  
  // Cover field
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  
  // Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<(Book & { copies?: BookCopy[] }) | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const loadCategories = async () => {
      try {
        const cats = await api.getCategories();
        setCategories(cats);
        if (cats.length > 0) {
          setCategoryId(cats[0].id);
        }
      } catch (err) {
        console.warn('Gagal memuat kategori:', err);
      }
    };
    loadCategories();
    // Reset state saat modal dibuka
    setCreatedResult(null);
    setErrorMsg(null);
  }, [isOpen]);

  if (!isOpen) return null;

  const isPhysical = bookType === 'HYBRID' || bookType === 'PHYSICAL_ONLY';
  const isDigital = bookType === 'HYBRID' || bookType === 'DIGITAL_ONLY';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validasi dasar
    if (!title.trim()) {
      setErrorMsg('Judul buku wajib diisi.');
      return;
    }
    if (!author.trim()) {
      setErrorMsg('Nama penulis wajib diisi.');
      return;
    }
    if (!publisher.trim()) {
      setErrorMsg('Nama penerbit wajib diisi.');
      return;
    }
    if (isPhysical && !shelfLocation.trim()) {
      setErrorMsg('Lokasi rak wajib diisi untuk koleksi fisik.');
      return;
    }
    if (isDigital && bookType === 'DIGITAL_ONLY' && !ebookFile && !coverUrlInput) {
      // Optional check
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('author', author.trim());
      formData.append('publisher', publisher.trim());
      formData.append('publicationYear', String(publicationYear));
      formData.append('categoryId', String(categoryId));
      formData.append('bookType', bookType);
      if (isbn.trim()) formData.append('isbn', isbn.trim());

      // Atribut fisik
      if (isPhysical) {
        formData.append('shelfLocation', shelfLocation.trim());
        formData.append('totalPhysicalCopies', String(totalPhysicalCopies));
      } else {
        formData.append('totalPhysicalCopies', '0');
      }

      // Atribut digital
      if (isDigital) {
        formData.append('digitalLicenseCount', String(digitalLicenseCount));
        if (ebookFile) {
          formData.append('ebook', ebookFile);
        }
      } else {
        formData.append('digitalLicenseCount', '0');
      }

      // Sampul buku
      if (coverFile) {
        formData.append('cover', coverFile);
      } else if (coverUrlInput.trim()) {
        formData.append('coverUrl', coverUrlInput.trim());
      }

      const result = await api.createBook(formData);
      setCreatedResult(result);
      onSuccess(result);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal mendaftarkan buku.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setTitle('');
    setAuthor('');
    setPublisher('');
    setPublicationYear(new Date().getFullYear());
    setIsbn('');
    setShelfLocation('RAK-INF-01');
    setTotalPhysicalCopies(3);
    setDigitalLicenseCount(5);
    setEbookFile(null);
    setCoverFile(null);
    setCoverUrlInput('');
    setCreatedResult(null);
    setErrorMsg(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-surface-card w-full max-w-2xl rounded-3xl border border-border-subtle shadow-2xl overflow-hidden my-auto">
        {/* Header Modal */}
        <div className="p-5 sm:p-6 border-b border-border-subtle flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary-600 text-white flex items-center justify-center shadow-sm">
              <PlusCircle size={22} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-main leading-tight">
                Pendaftaran Buku Baru
              </h2>
              <p className="text-xs text-text-muted">
                Katalog perpustakaan hybrid: fisik dengan barcode otomatis & e-book digital.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-text-muted hover:text-text-main hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[75vh] overflow-y-auto">
          {createdResult ? (
            /* Tampilan Sukses dengan Daftar Barcode */
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs animate-bounce">
                <CheckCircle2 size={36} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-text-main">Buku Berhasil Didaftarkan!</h3>
                <p className="text-xs text-text-muted mt-1 max-w-md mx-auto">
                  Buku <strong>"{createdResult.title}"</strong> telah terdaftar di katalog perpustakaan sekolah.
                </p>
              </div>

              {/* Rincian Eksemplar Fisik & Barcode Terbit */}
              {createdResult.copies && createdResult.copies.length > 0 && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-left">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs mb-2">
                    <Sparkles size={14} className="text-amber-600" />
                    <span>{createdResult.copies.length} Barcode Eksemplar Fisik Otomatis Diterbitkan:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 mb-3">
                    Lokasi Rak: <strong>{createdResult.shelfLocation || 'Rak Meja Pustaka'}</strong>. Cetak atau catat barcode berikut pada fisik buku:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {createdResult.copies.map((copy) => (
                      <div
                        key={copy.id}
                        className="bg-white border border-amber-300 px-2.5 py-1.5 rounded-lg text-center font-mono text-xs font-bold text-amber-950 shadow-xs"
                      >
                        {copy.barcode}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rincian E-Book Digital */}
              {(createdResult.bookType === 'DIGITAL_ONLY' || createdResult.bookType === 'HYBRID') && (
                <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 text-left text-xs">
                  <div className="flex items-center gap-2 text-blue-900 font-bold mb-1">
                    <Tablet size={14} className="text-blue-600" />
                    <span>Layanan E-Book Digital Siap Digunakan</span>
                  </div>
                  <p className="text-blue-800 text-[11px]">
                    Kuota Lisensi Simultan: <strong>{createdResult.digitalLicenseCount} siswa</strong>. Siswa dapat langsung meminjam dan membaca melalui aplikasi dengan watermark dinamis.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-text-main rounded-xl text-xs font-semibold transition-colors"
                >
                  Tambah Buku Lainnya
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                >
                  Selesai & Lihat Katalog
                </button>
              </div>
            </div>
          ) : (
            /* Formulir Pendaftaran Buku */
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* 1. Format Buku Switcher */}
              <div>
                <label className="block text-xs font-bold text-text-main uppercase tracking-wider mb-2">
                  Tipe Format Koleksi Perpustakaan
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setBookType('HYBRID')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      bookType === 'HYBRID'
                        ? 'bg-white text-primary-700 shadow-xs'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    <Layers size={14} />
                    <span>Hybrid (Keduanya)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookType('PHYSICAL_ONLY')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      bookType === 'PHYSICAL_ONLY'
                        ? 'bg-white text-amber-700 shadow-xs'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    <BookOpen size={14} />
                    <span>Fisik Saja</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBookType('DIGITAL_ONLY')}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      bookType === 'DIGITAL_ONLY'
                        ? 'bg-white text-blue-700 shadow-xs'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    <Tablet size={14} />
                    <span>E-Book Digital</span>
                  </button>
                </div>
              </div>

              {/* 2. Informasi Utama Buku */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-main mb-1">
                    Judul Buku <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Contoh: Pemrograman Web Lanjut dengan React & TypeScript"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">
                    Nama Penulis <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    placeholder="Contoh: Sandhika Galih"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">
                    Penerbit <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={publisher}
                    onChange={e => setPublisher(e.target.value)}
                    placeholder="Contoh: Informatika Bandung"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    value={publicationYear}
                    onChange={e => setPublicationYear(Number(e.target.value))}
                    min={1950}
                    max={2030}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">
                    Kategori Pelajaran
                  </label>
                  <select
                    value={categoryId}
                    onChange={e => setCategoryId(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-text-main mb-1">
                    Nomor ISBN (Opsional)
                  </label>
                  <input
                    type="text"
                    value={isbn}
                    onChange={e => setIsbn(e.target.value)}
                    placeholder="Contoh: 978-623-7131-40-1"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                  />
                </div>
              </div>

              {/* 3. Konfigurasi Sirkulasi Fisik (Jika HYBRID atau PHYSICAL_ONLY) */}
              {isPhysical && (
                <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <MapPin size={15} className="text-amber-700" />
                    <span>Konfigurasi Sirkulasi Fisik & Rak</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                        Nomor Lokasi Rak Fisik <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required={isPhysical}
                        value={shelfLocation}
                        onChange={e => setShelfLocation(e.target.value)}
                        placeholder="Contoh: RAK-INF-04"
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-amber-950 mb-1">
                        Jumlah Eksemplar Fisik
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={totalPhysicalCopies}
                        onChange={e => setTotalPhysicalCopies(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 bg-white border border-amber-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  <p className="text-[11px] text-amber-800 italic">
                    💡 Sistem akan otomatis membuat {totalPhysicalCopies} barcode unik untuk ditempelkan pada fisik buku.
                  </p>
                </div>
              )}

              {/* 4. Konfigurasi E-Book Digital (Jika HYBRID atau DIGITAL_ONLY) */}
              {isDigital && (
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
                    <Tablet size={15} className="text-blue-700" />
                    <span>Konfigurasi E-Book Digital & Berkas PDF</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-950 mb-1">
                        Kuota Lisensi Simultan
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={digitalLicenseCount}
                        onChange={e => setDigitalLicenseCount(Math.max(1, Number(e.target.value)))}
                        className="w-full px-3 py-1.5 bg-white border border-blue-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-[10px] text-blue-700">Maks. siswa yang dapat membaca bersamaan</span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-blue-950 mb-1">
                        Unggah Dokumen PDF E-Book
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          onChange={e => {
                            if (e.target.files && e.target.files[0]) {
                              setEbookFile(e.target.files[0]);
                            }
                          }}
                          className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                        />
                      </div>
                      {ebookFile ? (
                        <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1 mt-1">
                          <FileText size={11} />
                          {ebookFile.name} ({(ebookFile.size / 1024 / 1024).toFixed(1)} MB)
                        </span>
                      ) : (
                        <span className="text-[10px] text-text-muted mt-1 block">
                          Opsional jika ingin membaca via Reflow Canvas atau unggah nanti.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 5. Gambar Sampul Buku */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="block text-xs font-semibold text-text-main">
                  Gambar Sampul Buku (Opsional)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-text-muted block mb-1">Unggah Berkas Gambar (JPG, PNG, WebP):</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          setCoverFile(e.target.files[0]);
                          setCoverUrlInput('');
                        }
                      }}
                      className="w-full text-xs text-slate-500 file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-800 cursor-pointer"
                    />
                  </div>

                  <div>
                    <span className="text-[11px] text-text-muted block mb-1">Atau Masukkan URL Gambar Sampul:</span>
                    <input
                      type="url"
                      value={coverUrlInput}
                      onChange={e => {
                        setCoverUrlInput(e.target.value);
                        setCoverFile(null);
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-text-muted hover:text-text-main hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Menyimpan Buku...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Daftarkan Buku ke Perpustakaan</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
