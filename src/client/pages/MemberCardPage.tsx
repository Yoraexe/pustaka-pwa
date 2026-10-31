/**
 * @file src/client/pages/MemberCardPage.tsx
 * @description Halaman utama Kartu Anggota Digital & QR Validasi Sirkulasi (Layar 10 Wireframes QRC-01, QRC-02, QRC-03).
 * @layer Presentation Page
 *
 * Tujuan: Menyediakan halaman menu khusus bagi anggota (Siswa, Guru, Staff, Admin) untuk melihat kartu anggota digital, menyalin ID, dan mengunduh berkas PNG untuk sirkulasi fisik.
 * Caller: src/client/App.tsx
 * Dependensi: react, shared/types, QrCodeDisplay, qrcode, sonner, lucide-react, Shadcn UI (Card, Button, Badge)
 * Main Functions: MemberCardPage
 * Side Effects: Merender canvas dan mengunduh berkas kartu anggota PNG (900x540 px).
 */

import React from 'react';
import type { User } from '../../shared/types/index.js';
import { Card, CardHeader, CardTitle, CardDescription } from '../components/ui/card.js';
import { Button } from '../components/ui/button.js';
import { Badge } from '../components/ui/badge.js';
import { QrCodeDisplay } from '../components/common/QrCodeDisplay.js';
import QRCode from 'qrcode';
import { Download, Copy, CheckCircle2, ShieldCheck, QrCode, BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

interface MemberCardPageProps {
  user: User;
  onNavigateToCatalog?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  STUDENT: 'Siswa',
  TEACHER: 'Guru',
  LIBRARIAN: 'Pustakawan',
  ADMIN: 'Superadmin',
};

export const MemberCardPage: React.FC<MemberCardPageProps> = ({ user, onNavigateToCatalog }) => {
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

      // 1. Background Card
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
      ctx.fillText(user.role === 'STUDENT' ? 'Nomor Induk Siswa (NISN):' : 'Nomor Induk (NIP / ID):', 40, 290);

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

      // 2. Generate Real QR Code for user.identityNumber
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
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.roundRect(580, 160, 260, 290, 24);
        ctx.fill();

        ctx.drawImage(qrImage, 600, 180, 220, 220);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 16px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(user.identityNumber, 710, 425);

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
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <Card className="rounded-3xl border-border shadow-xs bg-gradient-to-r from-card via-card to-primary/5">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {roleLabel}
              </Badge>
              <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={13} />
                Aktif di Sirkulasi
              </span>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-bold flex items-center gap-2.5">
              <QrCode className="w-6 h-6 text-primary" />
              <span>Kartu Anggota Perpustakaan</span>
            </CardTitle>
            <CardDescription className="text-xs mt-1 max-w-xl leading-relaxed">
              Identitas resmi pemustaka untuk verifikasi sirkulasi peminjaman buku fisik dan absensi perpustakaan.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyIdentity}
              className="text-xs font-semibold gap-1.5"
            >
              <Copy size={14} />
              <span>Salin ID</span>
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadFullCard}
              className="text-xs font-semibold gap-1.5 shadow-xs"
            >
              <Download size={14} />
              <span>Unduh PNG</span>
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Main Virtual Card Preview Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Card Component (2 Columns on Desktop) */}
        <div className="md:col-span-2">
          <div className="relative rounded-3xl overflow-hidden border border-border shadow-lg bg-card transition-all">
            {/* Card Top Brand Strip */}
            <div className="bg-gradient-to-r from-blue-700 via-primary to-blue-600 p-5 sm:p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-white text-primary flex items-center justify-center font-bold text-xl font-mono shadow-xs">
                  P
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg leading-tight tracking-tight">
                    Pustaka Sekolah
                  </h3>
                  <span className="text-xs text-blue-100 font-medium block mt-0.5">
                    Kartu Anggota Digital Perpustakaan
                  </span>
                </div>
              </div>
              <ShieldCheck className="w-7 h-7 text-blue-200 opacity-80" />
            </div>

            {/* Card Body: Details & QR */}
            <div className="p-6 sm:p-7 bg-card flex flex-col sm:flex-row items-center sm:items-start justify-between gap-6">
              <div className="flex-1 space-y-4 text-center sm:text-left w-full">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block mb-1">
                    Nama Pemustaka
                  </span>
                  <h4 className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                    {user.name}
                  </h4>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block mb-1">
                    {user.role === 'STUDENT' ? 'Nomor Induk Siswa (NISN)' : 'Nomor Induk (NIP / ID)'}
                  </span>
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <span className="font-mono font-bold text-base text-primary tracking-wider">
                      {user.identityNumber}
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyIdentity}
                      className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Salin Nomor Identitas"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>

                {user.className && (
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground block mb-1">
                      Kelas / Penugasan
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {user.className}
                    </span>
                  </div>
                )}
              </div>

              {/* QR Code Identification Display */}
              <div className="shrink-0 flex flex-col items-center p-3.5 bg-muted/40 border border-border rounded-2xl shadow-2xs">
                <QrCodeDisplay
                  value={user.identityNumber}
                  size={128}
                  showDownload={false}
                />
                <span className="text-[10px] font-mono text-muted-foreground mt-2 font-bold tracking-tight">
                  Pindai di Meja Sirkulasi
                </span>
              </div>
            </div>

            {/* Card Bottom Status */}
            <div className="px-6 py-3.5 bg-muted/40 border-t border-border flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-mono">
                Peran: <strong className="text-foreground">{roleLabel}</strong>
              </span>
              <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                Sirkulasi Siap
              </span>
            </div>
          </div>
        </div>

        {/* Side Panel: Guidance & Instructions (1 Column on Desktop) */}
        <div className="space-y-4">
          <Card className="rounded-3xl border-border shadow-xs p-5">
            <div className="flex items-center gap-2 mb-3 text-primary">
              <Sparkles size={18} />
              <h4 className="font-bold text-sm">Petunjuk Penggunaan</h4>
            </div>
            <ul className="space-y-3 text-xs text-muted-foreground leading-relaxed">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  <strong>Bawa ke Perpustakaan:</strong> Buka halaman ini pada ponsel Anda saat ingin meminjam buku fisik di meja sirkulasi.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>Pindai QR Code:</strong> Tunjukkan kode QR di samping kepada pustakawan untuk dipindai dengan kamera meja sirkulasi.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <span>
                  <strong>Cetak Kartu Fisik:</strong> Klik tombol <em>Unduh PNG</em> untuk mencetak kartu fisik berukuran 900x540 px.
                </span>
              </li>
            </ul>

            {onNavigateToCatalog && (
              <Button
                variant="outline"
                size="sm"
                onClick={onNavigateToCatalog}
                className="w-full mt-5 text-xs font-semibold gap-1.5"
              >
                <BookOpen size={14} />
                <span>Jelajahi Katalog Buku</span>
              </Button>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
