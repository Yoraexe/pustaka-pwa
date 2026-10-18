/**
 * @file src/client/components/catalog/AddBookModal.tsx
 * @description Modal pendaftaran buku baru perpustakaan berbasis Shadcn UI Dialog, Tabs, Input, Label, dan Button.
 * @layer Presentation Component
 * 
 * Tujuan: Memfasilitasi Pustakawan & Admin menginput buku baru (koleksi fisik, e-book, atau hybrid) dengan upload PDF & cover.
 * Caller: src/client/pages/CatalogPage.tsx, src/client/components/circulation/CirculationDesk.tsx
 * Dependensi: react, src/client/services/api.ts, shared/types, UI components (Dialog, Tabs, Button, Input, Label, Badge)
 * Main Functions: AddBookModal
 * Side Effects: Melakukan multipart HTTP POST ke /api/books untuk menyimpan buku dan file.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../../services/api.js';
import type { Category, Book, BookCopy, BookType } from '../../../shared/types/index.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog.js';
import { Tabs, TabsList, TabsTrigger } from '../ui/tabs.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Badge } from '../ui/badge.js';
import { Camera, Upload, Link as LinkIcon, X, RefreshCw, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [shelfLocation, setShelfLocation] = useState('');
  const [totalPhysicalCopies, setTotalPhysicalCopies] = useState<number>(1);

  // Digital fields
  const [digitalLicenseCount, setDigitalLicenseCount] = useState<number>(5);
  const [ebookFile, setEbookFile] = useState<File | null>(null);

  // Cover fields & Camera capture states
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrlInput, setCoverUrlInput] = useState('');
  const [coverMode, setCoverMode] = useState<'camera' | 'upload' | 'url'>('camera');
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);
  const [coverSourceType, setCoverSourceType] = useState<'camera' | 'upload' | 'url' | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);

  // Status state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [createdResult, setCreatedResult] = useState<(Book & { copies?: BookCopy[] }) | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = async (facing: 'environment' | 'user' = cameraFacingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Kamera tidak dapat diakses:', err);
      toast.error('Tidak Dapat Mengakses Kamera', {
        description: 'Pastikan izin kamera diizinkan oleh browser atau gunakan opsi kamera ponsel / unggah berkas.',
      });
    }
  };

  const switchCamera = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    startCamera(nextFacing);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `cover-buku-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setCoverFile(file);
        setCoverUrlInput('');
        if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
          URL.revokeObjectURL(coverPreviewUrl);
        }
        setCoverPreviewUrl(URL.createObjectURL(file));
        setCoverSourceType('camera');
        stopCamera();
        toast.success('Sampul Buku Berhasil Dipotret!');
      }
    }, 'image/jpeg', 0.9);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (file) {
      setCoverFile(file);
      setCoverUrlInput('');
      if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
      setCoverPreviewUrl(URL.createObjectURL(file));
      setCoverSourceType(coverMode === 'camera' ? 'camera' : 'upload');
      toast.success('File Sampul Terpilih');
    }
  };

  const handleRemoveCover = useCallback(() => {
    if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(coverPreviewUrl);
    }
    setCoverFile(null);
    setCoverUrlInput('');
    setCoverPreviewUrl(null);
    setCoverSourceType(null);
    stopCamera();
  }, [coverPreviewUrl, stopCamera]);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen, stopCamera]);

  useEffect(() => {
    return () => {
      stopCamera();
      if (coverPreviewUrl && coverPreviewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [stopCamera, coverPreviewUrl]);

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
    setCreatedResult(null);
    setErrorMsg(null);
  }, [isOpen]);

  const isPhysical = bookType === 'HYBRID' || bookType === 'PHYSICAL_ONLY';
  const isDigital = bookType === 'HYBRID' || bookType === 'DIGITAL_ONLY';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!title.trim() || !author.trim() || !publisher.trim()) {
      setErrorMsg('Judul, penulis, dan penerbit buku wajib diisi.');
      return;
    }
    if (isPhysical && !shelfLocation.trim()) {
      setErrorMsg('Lokasi rak wajib diisi untuk koleksi fisik atau hybrid.');
      return;
    }
    if (isDigital && !ebookFile) {
      setErrorMsg(
        bookType === 'HYBRID'
          ? 'Dokumen e-book (format PDF) wajib diunggah untuk buku Hybrid (Fisik + E-Book). Jika tidak ada PDF, pilih format "Buku Fisik".'
          : 'Dokumen e-book (format PDF) wajib diunggah untuk buku berjenis E-Book.'
      );
      return;
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

      if (isPhysical) {
        formData.append('shelfLocation', shelfLocation.trim());
        formData.append('totalPhysicalCopies', String(totalPhysicalCopies));
      } else {
        formData.append('totalPhysicalCopies', '0');
      }

      if (isDigital) {
        formData.append('digitalLicenseCount', String(digitalLicenseCount));
        if (ebookFile) {
          formData.append('ebook', ebookFile);
        }
      } else {
        formData.append('digitalLicenseCount', '0');
      }

      if (coverFile) {
        formData.append('cover', coverFile);
      } else if (coverUrlInput.trim()) {
        formData.append('coverUrl', coverUrlInput.trim());
      }

      const result = await api.createBook(formData);
      setCreatedResult(result);
      toast.success('Buku Berhasil Didaftarkan', {
        description: `Koleksi "${result.title}" telah tersimpan di sistem perpustakaan.`,
      });
      onSuccess(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal mendaftarkan buku.';
      setErrorMsg(msg);
      toast.error('Gagal Menyimpan', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setAuthor('');
    setPublisher('');
    setPublicationYear(new Date().getFullYear());
    setIsbn('');
    setShelfLocation('');
    setTotalPhysicalCopies(1);
    setDigitalLicenseCount(5);
    setEbookFile(null);
    handleRemoveCover();
    setCoverMode(isPhysical ? 'camera' : 'upload');
    setCreatedResult(null);
    setErrorMsg(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={bookType === 'HYBRID' ? 'hybrid' : bookType === 'DIGITAL_ONLY' ? 'ebook' : 'physical'}>
              {bookType === 'HYBRID' ? 'Hybrid' : bookType === 'DIGITAL_ONLY' ? 'E-Book' : 'Fisik'}
            </Badge>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            Tambah Buku
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Daftarkan buku fisik atau e-book baru ke katalog.
          </DialogDescription>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-xl text-xs font-medium">
            {errorMsg}
          </div>
        )}

        {createdResult ? (
          <div className="space-y-4 my-2 p-6 bg-muted/30 border border-border rounded-2xl">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-foreground">Buku Terdaftar</h4>
              <Badge variant="success">ID: {createdResult.id}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>{createdResult.title}</strong> ({createdResult.publicationYear}) telah ditambahkan.
            </p>

            {createdResult.copies && createdResult.copies.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-foreground block mb-2">
                  Barcode Eksemplar:
                </span>
                <div className="flex flex-wrap gap-2">
                  {createdResult.copies.map((c) => (
                    <span
                      key={c.id}
                      className="px-2.5 py-1 bg-background border border-border rounded-lg text-xs font-mono font-semibold"
                    >
                      {c.barcode}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
                Tambah Buku Lagi
              </Button>
              <Button size="sm" onClick={onClose} className="text-xs">
                Selesai
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 my-2">
            {/* Format Selector Tabs */}
            <div className="space-y-1.5">
              <Label>Format Koleksi</Label>
              <Tabs
                value={bookType}
                onValueChange={(val) => {
                  const nextType = val as BookType;
                  setBookType(nextType);
                  if (nextType === 'DIGITAL_ONLY' && coverMode === 'camera') {
                    setCoverMode('upload');
                    stopCamera();
                  } else if ((nextType === 'HYBRID' || nextType === 'PHYSICAL_ONLY') && !coverPreviewUrl) {
                    setCoverMode('camera');
                  }
                }}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 h-10 w-full rounded-xl bg-muted/60 p-1">
                  <TabsTrigger value="HYBRID" className="text-xs rounded-lg">
                    Hybrid
                  </TabsTrigger>
                  <TabsTrigger value="DIGITAL_ONLY" className="text-xs rounded-lg">
                    E-Book
                  </TabsTrigger>
                  <TabsTrigger value="PHYSICAL_ONLY" className="text-xs rounded-lg">
                    Buku Fisik
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* General Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Judul Buku *</Label>
                <Input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Informatika Kelas X"
                />
              </div>

              <div>
                <Label htmlFor="author">Penulis *</Label>
                <Input
                  id="author"
                  required
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Contoh: Kemendikbudristek"
                />
              </div>

              <div>
                <Label htmlFor="publisher">Penerbit *</Label>
                <Input
                  id="publisher"
                  required
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="Contoh: Pusat Perbukuan"
                />
              </div>

              <div>
                <Label htmlFor="category">Kategori</Label>
                <select
                  id="category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  className="flex h-10 w-full rounded-xl border border-input bg-background/60 px-3.5 py-2 text-xs sm:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="publicationYear">Tahun Terbit</Label>
                <Input
                  id="publicationYear"
                  type="number"
                  required
                  value={publicationYear}
                  onChange={(e) => setPublicationYear(Number(e.target.value))}
                />
              </div>

              <div>
                <Label htmlFor="isbn">ISBN (Opsional)</Label>
                <Input
                  id="isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="Contoh: 978-602-244-503-6"
                  className="font-mono text-xs"
                />
              </div>

              {/* Cover Selection Section (Pilihan Eksklusif: Kamera / Unggah / URL) */}
              <div className="sm:col-span-2 p-4 bg-muted/20 border border-border rounded-2xl space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div>
                    <Label className="text-xs font-bold text-foreground">
                      Sampul Buku (Opsional)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      Pilih salah satu metode: potret langsung buku di rak, unggah file gambar, atau masukkan URL.
                    </p>
                  </div>
                  {coverPreviewUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCover}
                      className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 self-start sm:self-auto cursor-pointer"
                    >
                      <Trash2 size={13} className="mr-1" />
                      Hapus Sampul
                    </Button>
                  )}
                </div>

                {/* Cover Mode Switcher Tabs */}
                {!coverPreviewUrl && !isCameraActive && (
                  <div className="inline-flex p-1 bg-muted/60 rounded-xl border border-border/80 text-xs w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setCoverMode('camera')}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        coverMode === 'camera'
                          ? 'bg-background text-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Camera size={14} />
                      <span>Potret Kamera</span>
                      {isPhysical && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold">
                          Rak
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverMode('upload')}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        coverMode === 'upload'
                          ? 'bg-background text-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <Upload size={14} />
                      <span>Unggah Berkas</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCoverMode('url')}
                      className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                        coverMode === 'url'
                          ? 'bg-background text-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <LinkIcon size={14} />
                      <span>Tautan URL</span>
                    </button>
                  </div>
                )}

                {/* 1. Mode Potret Kamera */}
                {coverMode === 'camera' && !coverPreviewUrl && (
                  <div className="space-y-3">
                    {isCameraActive ? (
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-[4/3] max-w-md mx-auto border border-border shadow-lg">
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover"
                        />
                        {/* Framing guide overlay for book cover */}
                        <div className="absolute inset-4 sm:inset-6 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col items-center justify-between p-2">
                          <span className="text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-mono backdrop-blur-xs">
                            Posisikan sampul buku di dalam bingkai ini
                          </span>
                        </div>
                        {/* Camera Controls Overlay */}
                        <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-3 px-4">
                          <button
                            type="button"
                            onClick={switchCamera}
                            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer"
                            title="Putar Kamera"
                          >
                            <RefreshCw size={18} />
                          </button>
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="px-5 py-2.5 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs flex items-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
                          >
                            <Camera size={16} />
                            Jepret Sampul
                          </button>
                          <button
                            type="button"
                            onClick={stopCamera}
                            className="p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-colors cursor-pointer"
                            title="Tutup Kamera"
                          >
                            <X size={18} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 border border-dashed border-border rounded-2xl bg-card text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                          <Camera size={24} />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-foreground">
                            Potret Langsung Buku dari Rak Fisik
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm mx-auto">
                            Gunakan kamera perangkat untuk memotret sampul buku fisik yang tersedia di rak perpustakaan secara instan.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => startCamera()}
                            className="text-xs font-semibold"
                          >
                            <Camera size={14} className="mr-1.5" />
                            Buka Kamera
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => nativeCameraInputRef.current?.click()}
                            className="text-xs"
                          >
                            Kamera Ponsel (Bawaan)
                          </Button>
                        </div>
                        {/* Hidden native camera capture input */}
                        <input
                          ref={nativeCameraInputRef}
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Mode Unggah Berkas */}
                {coverMode === 'upload' && !coverPreviewUrl && (
                  <div className="space-y-2">
                    <Input
                      id="coverFileInput"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="cursor-pointer file:cursor-pointer text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Mendukung format JPG, PNG, atau WebP (maksimal 5 MB).
                    </p>
                  </div>
                )}

                {/* 3. Mode Tautan URL */}
                {coverMode === 'url' && !coverPreviewUrl && (
                  <div className="space-y-2">
                    <Input
                      id="coverUrl"
                      type="url"
                      value={coverUrlInput}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCoverUrlInput(val);
                        setCoverFile(null);
                        if (val.trim()) {
                          setCoverPreviewUrl(val.trim());
                          setCoverSourceType('url');
                        } else {
                          setCoverPreviewUrl(null);
                          setCoverSourceType(null);
                        }
                      }}
                      placeholder="https://contoh.com/sampul-buku.jpg"
                      className="text-xs font-mono"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Pastikan URL mengarah langsung ke berkas gambar publik yang valid.
                    </p>
                  </div>
                )}

                {/* Pratinjau Sampul Terpilih */}
                {coverPreviewUrl && (
                  <div className="p-3 bg-card border border-border rounded-xl flex items-center gap-3.5">
                    <div className="w-16 h-22 rounded-lg bg-muted overflow-hidden shrink-0 border border-border/80 shadow-2xs">
                      <img
                        src={coverPreviewUrl}
                        alt="Pratinjau Sampul"
                        className="w-full h-full object-cover"
                        onError={() => {
                          toast.error('Gambar tidak dapat dimuat dari tautan.');
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Badge variant="outline" className="text-[9px] py-0">
                          {coverSourceType === 'camera' && '📸 Hasil Potret Kamera'}
                          {coverSourceType === 'upload' && '📁 File Unggahan'}
                          {coverSourceType === 'url' && '🌐 Tautan URL'}
                        </Badge>
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 size={11} /> Siap Disimpan
                        </span>
                      </div>
                      <p className="text-xs font-medium text-foreground truncate">
                        {coverFile ? coverFile.name : coverUrlInput}
                      </p>
                      {coverFile && (
                        <p className="text-[10px] text-muted-foreground font-mono">
                          Ukuran: {(coverFile.size / 1024).toFixed(0)} KB
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {coverSourceType === 'camera' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleRemoveCover();
                              setCoverMode('camera');
                              startCamera();
                            }}
                            className="h-6 px-2 text-[10px]"
                          >
                            <RefreshCw size={11} className="mr-1" />
                            Foto Ulang
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={handleRemoveCover}
                          className="h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground"
                        >
                          Ganti Metode
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Physical Inventory Settings */}
            {isPhysical && (
              <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider font-mono">
                    Koleksi Fisik
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="shelfLocation">Lokasi Rak *</Label>
                    <Input
                      id="shelfLocation"
                      value={shelfLocation}
                      onChange={(e) => setShelfLocation(e.target.value)}
                      placeholder="Contoh: RAK-INF-01"
                      className="font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="totalPhysicalCopies">Jumlah Eksemplar</Label>
                    <Input
                      id="totalPhysicalCopies"
                      type="number"
                      min={1}
                      max={50}
                      value={totalPhysicalCopies}
                      onChange={(e) => setTotalPhysicalCopies(Number(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Digital License Settings & Upload */}
            {isDigital && (
              <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider font-mono">
                    Akses Digital
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="digitalLicenseCount">Kuota Pinjam Simultan</Label>
                    <Input
                      id="digitalLicenseCount"
                      type="number"
                      min={1}
                      max={100}
                      value={digitalLicenseCount}
                      onChange={(e) => setDigitalLicenseCount(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ebookFile" className="flex items-center gap-1.5 text-xs">
                      <span>Berkas Dokumen PDF</span>
                      <span className="text-destructive font-bold text-[11px]">* (Wajib)</span>
                    </Label>
                    <Input
                      id="ebookFile"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setEbookFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Wajib diunggah agar pemustaka dapat meminjam dan membaca e-book secara daring maupun luring.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Form Footer Actions */}
            <div className="pt-4 border-t border-border flex items-center justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={onClose} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs font-semibold px-5">
                {isSubmitting ? 'Menyimpan...' : 'Simpan Buku'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
