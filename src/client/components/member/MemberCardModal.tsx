/**
 * @file src/client/components/member/MemberCardModal.tsx
 * @description Modal Kartu Anggota Digital & QR Validasi Siswa/Guru sesuai Layar 10 Wireframes (QRC-01, QRC-02, QRC-03).
 * @layer Presentation Component
 * 
 * Tujuan: Menampilkan kartu anggota virtual resmi dengan QR Code NISN/NIP yang dapat dipindai oleh kamera meja sirkulasi pustakawan serta diunduh sebagai gambar PNG.
 * Caller: src/client/App.tsx, src/client/components/common/Navbar.tsx, src/client/pages/MyBooksPage.tsx
 * Dependensi: react, shared/types, UI components (Dialog, Button, Badge), QrCodeDisplay, qrcode, sonner, lucide-react.
 * Main Functions: MemberCardModal
 * Side Effects: Mengunduh kartu anggota virtual dalam format PNG resolusi tinggi.
 */

import React from 'react';
import type { User } from '../../../shared/types/index.js';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { Badge } from '../ui/badge.js';
import { QrCodeDisplay } from '../common/QrCodeDisplay.js';
import QRCode from 'qrcode';
import { Download, Copy, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface MemberCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Siswa',
  TEACHER: 'Guru',
  LIBRARIAN: 'Pustakawan',
  ADMIN: 'Superadmin',
};

export const MemberCardModal: React.FC<MemberCardModalProps> = ({
  isOpen,
  onClose,
  user,
}) => {
  if (!user) return null;

  const roleLabel = ROLE_LABELS[user.role] || user.role;

  const handleCopyIdentity = () => {
    navigator.clipboard.writeText(user.identityNumber);
    toast.success('Nomor Identitas Disalin', {
      description: `${user.identityNumber} telah disalin ke clipboard.`,
    });
  };

  const handleDownloadFullCard = async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 900;
      canvas.height = 540;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 1. Background Card with Rounded Corners
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Card Header Banner
      const headerGradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      headerGradient.addColorStop(0, '#1e40af');
      headerGradient.addColorStop(1, '#3b82f6');
      ctx.fillStyle = headerGradient;
      ctx.fillRect(0, 0, canvas.width, 130);

      // School Badge Box
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(40, 25, 80, 80, 16);
      ctx.fill();

      // Logo Letter "P"
      ctx.fillStyle = '#1e40af';
      ctx.font = 'bold 44px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('P', 80, 65);

      // Header Texts
      ctx.textAlign = 'left';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 30px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('PUSTAKA SEKOLAH', 145, 55);

      ctx.fillStyle = '#bfdbfe';
      ctx.font = '500 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('KARTU ANGGOTA DIGITAL PERPUSTAKAAN', 145, 90);

      // Card Body Background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 130, canvas.width, canvas.height - 130);

      // Role Pill Badge
      ctx.fillStyle = user.role === 'STUDENT' ? '#0284c7' : '#d97706';
      ctx.beginPath();
      ctx.roundRect(40, 160, 180, 36, 18);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ANGGOTA: ${roleLabel.toUpperCase()}`, 130, 178);

      // Member Name
      ctx.textAlign = 'left';
      ctx.fillStyle = '#f8fafc';
      ctx.font = 'bold 36px "Plus Jakarta Sans", sans-serif';
      const cleanName = user.name.length > 22 ? user.name.slice(0, 22) + '...' : user.name;
      ctx.fillText(cleanName, 40, 240);

      // Member ID & Class
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
      ctx.fillText(user.role === 'STUDENT' ? 'Nomor Induk Siswa (NISN):' : 'Nomor Induk Pegawai (NIP):', 40, 290);

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 30px monospace';
      ctx.fillText(user.identityNumber, 40, 330);

      if (user.className) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 20px "Plus Jakarta Sans", sans-serif';
        ctx.fillText('Kelas / Penugasan:', 40, 380);

        ctx.fillStyle = '#f8fafc';
        ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(user.className, 40, 415);
      }

      // Card Footer Status
      ctx.fillStyle = '#10b981';
      ctx.beginPath();
      ctx.arc(52, 485, 8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#10b981';
      ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('STATUS: TERDAFTAR & AKTIF DI SIRKULASI', 70, 485);

      // 2. Generate Real QR Code for user.identityNumber on Canvas
      const qrDataUrl = await QRCode.toDataURL(user.identityNumber, {
        width: 320,
        margin: 2,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'H',
      });

      const qrImage = new Image();
      qrImage.onload = () => {
        // Draw white frame for QR
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(580, 160, 260, 290, 24);
        ctx.fill();

        // Draw QR code inside frame
        ctx.drawImage(qrImage, 600, 180, 220, 220);

        // QR label text
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(user.identityNumber, 710, 425);

        // Trigger Download
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.setAttribute('download', `Kartu-Anggota-${user.identityNumber}.png`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Kartu Anggota Berhasil Diunduh!', {
          description: `Berkas "Kartu-Anggota-${user.identityNumber}.png" telah tersimpan.`,
        });
      };
      qrImage.src = qrDataUrl;
    } catch (err) {
      console.error('Gagal mengunduh kartu anggota:', err);
      toast.error('Gagal Mengunduh Kartu', {
        description: 'Terjadi kendala saat merender berkas kartu anggota.',
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg p-6 sm:p-7">
        <DialogHeader className="text-left pb-2">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono uppercase tracking-wider">
              {roleLabel}
            </Badge>
            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={13} />
              Aktif
            </span>
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <QrCode className="w-6 h-6 text-primary" />
            <span>Kartu Anggota Digital</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
            Identitas pemustaka resmi untuk sirkulasi buku fisik dan absensi perpustakaan sekolah.
          </DialogDescription>
        </DialogHeader>

        {/* Virtual Card Container (WCAG AA compliant, Modern Academic Aesthetic) */}
        <div className="relative rounded-3xl overflow-hidden border border-border shadow-md bg-card transition-all">
          {/* Card Top Brand Strip */}
          <div className="bg-gradient-to-r from-blue-700 via-primary to-blue-600 p-4 sm:p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white text-primary flex items-center justify-center font-bold text-lg font-mono shadow-xs">
                P
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base leading-tight tracking-tight">
                  Pustaka Sekolah
                </h3>
                <span className="text-[10px] text-blue-100 font-medium block">
                  Kartu Anggota Perpustakaan Resmi
                </span>
              </div>
            </div>
            <ShieldCheck className="w-6 h-6 text-blue-200 opacity-80" />
          </div>

          {/* Card Middle: Profile Details & QR Validation */}
          <div className="p-5 sm:p-6 bg-card flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">
            <div className="flex-1 space-y-3.5 text-center sm:text-left">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block mb-0.5">
                  Nama Pemustaka
                </span>
                <h4 className="text-base sm:text-lg font-bold text-foreground leading-snug">
                  {user.name}
                </h4>
              </div>

              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block mb-0.5">
                  {user.role === 'STUDENT' ? 'Nomor Induk Siswa (NISN)' : 'Nomor Induk (NIP / ID)'}
                </span>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-mono font-bold text-sm text-primary tracking-wider">
                    {user.identityNumber}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyIdentity}
                    className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    title="Salin Nomor Identitas"
                  >
                    <Copy size={13} />
                  </button>
                </div>
              </div>

              {user.className && (
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block mb-0.5">
                    Kelas / Penugasan
                  </span>
                  <span className="text-xs font-semibold text-foreground">
                    {user.className}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code Identification Display */}
            <div className="shrink-0 flex flex-col items-center p-3 bg-muted/30 border border-border rounded-2xl">
              <QrCodeDisplay
                value={user.identityNumber}
                size={110}
                showDownload={false}
              />
              <span className="text-[9px] font-mono text-muted-foreground mt-1.5 font-bold">
                Pindai di Meja Sirkulasi
              </span>
            </div>
          </div>

          {/* Card Bottom: Verification Status */}
          <div className="px-5 py-3 bg-muted/40 border-t border-border flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-mono">
              Peran: <strong className="text-foreground">{roleLabel}</strong>
            </span>
            <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Sirkulasi Siap
            </span>
          </div>
        </div>

        {/* Guidance Tip for Physical Library Circulation */}
        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
          <QrCode className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Cara Pakai di Meja Sirkulasi:</strong> Tunjukkan kode QR di atas kepada pustakawan saat meminjam buku fisik di perpustakaan. Pustakawan akan memindai kartu ini untuk mencatat peminjaman tanpa perlu mengetik NISN/NIP manual.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto text-xs"
          >
            Tutup
          </Button>
          <Button
            type="button"
            onClick={handleDownloadFullCard}
            className="w-full sm:w-auto text-xs font-semibold gap-1.5 shadow-xs"
          >
            <Download size={14} />
            <span>Unduh Kartu Anggota (PNG)</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
