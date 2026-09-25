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

import React, { useState, useEffect } from 'react';
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
      setErrorMsg('Lokasi rak wajib diisi untuk koleksi fisik.');
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline">Katalogisasi Staf</Badge>
            <Badge variant={bookType === 'HYBRID' ? 'hybrid' : bookType === 'DIGITAL_ONLY' ? 'ebook' : 'physical'}>
              {bookType === 'HYBRID' ? 'Format Hybrid' : bookType === 'DIGITAL_ONLY' ? 'E-Book Digital' : 'Koleksi Fisik'}
            </Badge>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold">
            Pendaftaran Koleksi Buku Baru
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Daftarkan materi ajar kurikulum, e-book PDF resmi terproteksi, atau eksemplar fisik rak perpustakaan.
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
              <h4 className="font-bold text-sm text-foreground">Buku Berhasil Terdaftar</h4>
              <Badge variant="success">ID: {createdResult.id}</Badge>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              <strong>{createdResult.title}</strong> oleh {createdResult.author} ({createdResult.publicationYear}) telah masuk ke katalog.
            </p>

            {createdResult.copies && createdResult.copies.length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-semibold text-foreground block mb-2">
                  Barcode Eksemplar Fisik yang Dihasilkan:
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
                Daftarkan Koleksi Lainnya
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
                onValueChange={(val) => setBookType(val as BookType)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 h-10 w-full rounded-xl bg-muted/60 p-1">
                  <TabsTrigger value="HYBRID" className="text-xs rounded-lg">
                    Hybrid (Fisik + E-Book)
                  </TabsTrigger>
                  <TabsTrigger value="DIGITAL_ONLY" className="text-xs rounded-lg">
                    E-Book Digital Saja
                  </TabsTrigger>
                  <TabsTrigger value="PHYSICAL_ONLY" className="text-xs rounded-lg">
                    Buku Fisik Saja
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* General Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Judul Buku / Materi Pelajaran *</Label>
                <Input
                  id="title"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Informatika Kelas X Kurikulum Merdeka"
                />
              </div>

              <div>
                <Label htmlFor="author">Nama Penulis / Tim Penyusun *</Label>
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
                <Label htmlFor="category">Kategori Buku</Label>
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
                <Label htmlFor="isbn">Nomor ISBN (Opsional)</Label>
                <Input
                  id="isbn"
                  value={isbn}
                  onChange={(e) => setIsbn(e.target.value)}
                  placeholder="Contoh: 978-602-244-503-6"
                  className="font-mono text-xs"
                />
              </div>

              <div>
                <Label htmlFor="coverUrl">URL Sampul (Opsional)</Label>
                <Input
                  id="coverUrl"
                  type="url"
                  value={coverUrlInput}
                  onChange={(e) => setCoverUrlInput(e.target.value)}
                  placeholder="https://... (atau unggah berkas)"
                />
              </div>
            </div>

            {/* Physical Inventory Settings */}
            {isPhysical && (
              <div className="p-4 bg-muted/30 border border-border rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-foreground uppercase tracking-wider font-mono">
                    Inventaris Koleksi Fisik
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-mono">Auto-Generate Barcode</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="shelfLocation">Lokasi Rak Penyimpanan *</Label>
                    <Input
                      id="shelfLocation"
                      value={shelfLocation}
                      onChange={(e) => setShelfLocation(e.target.value)}
                      placeholder="Contoh: RAK-INF-01"
                      className="font-mono"
                    />
                  </div>

                  <div>
                    <Label htmlFor="totalPhysicalCopies">Jumlah Eksemplar Fisik</Label>
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
                    Hak Akses Digital (E-Book)
                  </h4>
                  <span className="text-[10px] text-muted-foreground font-mono">Watermark Proteksi Siswa</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="digitalLicenseCount">Batas Kuota Pinjam Simultan</Label>
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
                    <Label htmlFor="ebookFile">Unggah Berkas PDF Dokumen</Label>
                    <Input
                      id="ebookFile"
                      type="file"
                      accept=".pdf"
                      onChange={(e) => setEbookFile(e.target.files?.[0] || null)}
                    />
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
                {isSubmitting ? 'Mendaftarkan Buku...' : 'Simpan Koleksi Buku'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
