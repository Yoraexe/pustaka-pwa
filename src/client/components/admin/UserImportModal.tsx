/**
 * @file src/client/components/admin/UserImportModal.tsx
 * @description Modal impor massal pengguna (Siswa & Guru) via file CSV untuk Administrator sekolah sesuai BRD Seksi 3.4 & AC-4.2.
 * @layer Presentation Component
 * 
 * Tujuan: Menyediakan antarmuka bagi Admin untuk mengunggah file CSV data anggota, mengunduh template CSV resmi, dan melihat ringkasan hasil impor.
 * Caller: src/client/components/circulation/CirculationDesk.tsx, src/client/App.tsx
 * Dependensi: react, src/client/services/api.ts, shared/types, UI components (Dialog, Button, Input, Label, Badge), sonner, lucide-react.
 * Main Functions: UserImportModal
 * Side Effects: Memanggil endpoint POST /api/auth/import-users, men-generate unduhan template CSV di browser.
 */

import React, { useState, useRef } from 'react';
import { api } from '../../services/api.js';
import type { CsvImportResult } from '../../../shared/types/index.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { Label } from '../ui/label.js';
import { Badge } from '../ui/badge.js';
import { Download, UploadCloud, Users, CheckCircle2, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { toast } from 'sonner';

interface UserImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const UserImportModal: React.FC<UserImportModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [importResult, setImportResult] = useState<CsvImportResult | null>(null);
  const [mode, setMode] = useState<'file' | 'text'>('file');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDownloadTemplate = () => {
    const templateContent = [
      'Nama,NISN/NIP,Role,Kelas/Jurusan,Password',
      'Ahmad Fauzi,NISN202610,STUDENT,X RPL 1,siswa123',
      'Siti Nurhaliza,NISN202611,STUDENT,X RPL 2,siswa123',
      'Drs. Joko Susilo,GURU002,TEACHER,Guru Bahasa,guru123',
      'Dewi Lestari,PUSTAKA02,LIBRARIAN,Staf Perpus,pustaka123'
    ].join('\r\n');

    const blob = new Blob(['\uFEFF' + templateContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template-impor-anggota.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Template Berhasil Diunduh', {
      description: 'Gunakan template ini untuk mengisi data siswa dan staf sekolah.',
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
        toast.error('Format Tidak Didukung', {
          description: 'Harap pilih file dengan ekstensi .csv standar.',
        });
        return;
      }
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'file' && !selectedFile) {
      toast.error('Pilih File', { description: 'Harap pilih berkas CSV terlebih dahulu.' });
      return;
    }
    if (mode === 'text' && !csvText.trim()) {
      toast.error('Data Kosong', { description: 'Harap masukkan data CSV terlebih dahulu.' });
      return;
    }

    setIsSubmitting(true);
    setImportResult(null);

    try {
      let res: CsvImportResult;
      if (mode === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        res = await api.importUsersCsv(formData);
      } else {
        res = await api.importUsersCsv({ csvText: csvText.trim() });
      }

      setImportResult(res);
      toast.success('Impor Anggota Selesai', {
        description: `${res.importedCount} pengguna berhasil ditambahkan, ${res.skippedCount} dilewati.`,
      });
      onSuccess?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memproses berkas CSV.';
      toast.error('Gagal Mengimpor', { description: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setCsvText('');
    setImportResult(null);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-1.5">
            <Badge variant="outline" className="font-mono text-[10px]">
              ADMIN KHUSUS
            </Badge>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Users size={22} className="text-primary" />
            Impor Massal Anggota (CSV)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Daftarkan siswa baru atau guru sekaligus menggunakan berkas spreadsheet CSV.
          </DialogDescription>
        </DialogHeader>

        {/* Quick Download Template Button */}
        <div className="bg-muted/40 border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <div className="font-semibold text-foreground flex items-center gap-1.5">
              <FileSpreadsheet size={15} className="text-emerald-500" />
              Template Format CSV
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5 font-mono">
              Kolom: Nama, NISN/NIP, Role, Kelas/Jurusan, Password
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="text-xs font-semibold shrink-0 gap-1.5"
          >
            <Download size={14} />
            Unduh Template
          </Button>
        </div>

        {/* Import Results Display if completed */}
        {importResult ? (
          <div className="space-y-4 my-2 p-5 bg-card border border-border rounded-2xl shadow-xs">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-emerald-500" />
                Laporan Hasil Impor
              </h4>
              <Badge variant="success">Selesai</Badge>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-center text-xs">
              <div className="p-3 bg-muted/40 rounded-xl border border-border">
                <span className="text-[10px] text-muted-foreground block">Total Baris</span>
                <span className="text-base font-bold font-mono text-foreground">
                  {importResult.totalRows}
                </span>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                <span className="text-[10px] text-emerald-700 dark:text-emerald-300 block">Berhasil Ditambah</span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
                  {importResult.importedCount}
                </span>
              </div>
              <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <span className="text-[10px] text-amber-700 dark:text-amber-300 block">Dilewati (Duplikat)</span>
                <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-400">
                  {importResult.skippedCount}
                </span>
              </div>
            </div>

            {importResult.errors.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-semibold text-destructive flex items-center gap-1">
                  <AlertTriangle size={13} />
                  Daftar Peringatan/Baris Gagal:
                </span>
                <div className="max-h-32 overflow-y-auto space-y-1 bg-destructive/5 p-2 rounded-xl border border-destructive/20 text-[11px] text-destructive font-mono">
                  {importResult.errors.map((e, idx) => (
                    <div key={idx}>
                      Baris {e.row} ({e.identity}): {e.reason}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={handleReset} className="text-xs">
                Impor Lagi
              </Button>
              <Button size="sm" onClick={onClose} className="text-xs">
                Selesai
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 my-2">
            {/* Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMode('file')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  mode === 'file'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                Unggah File CSV
              </button>
              <button
                type="button"
                onClick={() => setMode('text')}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-xl border transition-all ${
                  mode === 'text'
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-muted/40 text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                Ketik / Tempel Teks CSV
              </button>
            </div>

            {mode === 'file' ? (
              <div className="border-2 border-dashed border-border rounded-2xl p-6 text-center hover:border-primary/50 transition-colors">
                <UploadCloud size={36} className="mx-auto text-muted-foreground mb-2" />
                <Label htmlFor="csvFileInput" className="cursor-pointer font-semibold text-xs text-foreground block mb-1">
                  {selectedFile ? selectedFile.name : 'Klik untuk memilih berkas CSV'}
                </Label>
                <span className="text-[10px] text-muted-foreground block mb-3">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Format .csv (maksimal 5 MB)'}
                </span>
                <input
                  ref={fileInputRef}
                  id="csvFileInput"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs"
                >
                  Pilih Berkas
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label htmlFor="csvTextArea">Tempelkan Data CSV</Label>
                <textarea
                  id="csvTextArea"
                  rows={6}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Nama,NISN/NIP,Role,Kelas/Jurusan&#10;Ahmad Fauzi,NISN202610,STUDENT,X RPL 1"
                  className="w-full rounded-xl border border-input bg-background/60 p-3 text-xs font-mono text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            )}

            <div className="pt-3 border-t border-border flex items-center justify-end gap-2.5">
              <Button type="button" variant="outline" onClick={onClose} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={isSubmitting} className="text-xs font-semibold shadow-xs px-5">
                {isSubmitting ? 'Memproses Impor...' : 'Mulai Impor Anggota'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
