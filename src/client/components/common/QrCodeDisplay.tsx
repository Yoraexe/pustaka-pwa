/**
 * @file src/client/components/common/QrCodeDisplay.tsx
 * @description Komponen generator dan penampil QR Code nyata (berbasis pustaka qrcode) beserta fitur unduh stiker PNG untuk eksemplar buku fisik dan tiket reservasi.
 * @layer Presentation Component
 *
 * Tujuan: Merender kode QR yang valid dan dapat dipindai kamera/file scanner dari string barcode eksemplar (BK-...) maupun tiket reservasi (RSV-...).
 * Caller: BookDetailModal.tsx, MyBooksPage.tsx, CirculationDesk.tsx
 * Dependensi: react, qrcode, lucide-react, Button, sonner
 * Main Functions: QrCodeDisplay
 * Side Effects: Menghasilkan Data URL gambar PNG QR Code di sisi klien dan memicu unduhan berkas PNG.
 */

import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { Download } from 'lucide-react';
import { Button } from '../ui/button.js';
import { toast } from 'sonner';

interface QrCodeDisplayProps {
  value: string;
  label?: string;
  size?: number;
  showDownload?: boolean;
  className?: string;
}

export const QrCodeDisplay: React.FC<QrCodeDisplayProps> = ({
  value,
  label,
  size = 112,
  showDownload = true,
  className = '',
}) => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!value) {
      setDataUrl(null);
      return;
    }

    QRCode.toDataURL(value, {
      width: Math.max(size * 2, 240),
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch((err) => {
        console.error('Gagal membuat QR Code:', err);
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  const handleDownloadQr = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    const safeName = value.replace(/[^a-zA-Z0-9_-]/g, '_');
    link.setAttribute('download', `QR-${safeName}.png`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR Code Diunduh', {
      description: `Stiker QR "${value}" berhasil disimpan sebagai gambar PNG.`,
    });
  };

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-muted animate-pulse rounded-xl border border-border ${className}`}
      />
    );
  }

  return (
    <div className={`inline-flex flex-col items-center gap-1.5 ${className}`}>
      <div className="bg-white p-2 rounded-xl border border-border shadow-2xs inline-block">
        <img
          src={dataUrl}
          alt={`QR ${value}`}
          style={{ width: size, height: size }}
          className="block select-none"
        />
      </div>
      {label && (
        <span className="text-[10px] font-mono font-bold text-foreground tracking-wider">
          {label}
        </span>
      )}
      {showDownload && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleDownloadQr}
          className="h-7 px-2.5 text-[10px] font-semibold gap-1"
          title={`Unduh gambar QR ${value}`}
        >
          <Download className="w-3 h-3" />
          <span>Unduh QR</span>
        </Button>
      )}
    </div>
  );
};
