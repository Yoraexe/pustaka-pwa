/**
 * @file src/client/components/circulation/BarcodeScannerModal.tsx
 * @description Modal pemindai QR Code & Barcode 1D lintas-peramban berbasis html5-qrcode (WebRTC Camera + Image File Decoder).
 * @layer Presentation Component
 *
 * Tujuan: Memungkinkan pemustaka dan pustakawan memindai QR Code / Barcode fisik menggunakan kamera perangkat (Windows/Android/iOS) atau mengunggah berkas gambar QR untuk peminjaman, klaim reservasi, dan pengembalian buku.
 * Caller: CirculationDesk.tsx, CatalogPage.tsx, MyBooksPage.tsx
 * Dependensi: react, html5-qrcode, lucide-react, Shadcn Dialog, Button, Input, sonner
 * Main Functions: BarcodeScannerModal
 * Side Effects: Mengaktifkan/menghentikan MediaStream kamera via Html5Qrcode, membaca file gambar lokal untuk dekode QR/Barcode.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog.js';
import { Button } from '../ui/button.js';
import { Input } from '../ui/input.js';
import { Camera, RefreshCw, AlertCircle, Upload, QrCode } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
  description?: string;
  quickOptions?: Array<{ code: string; label: string }>;
}

const SUPPORTED_FORMATS = [
  Html5QrcodeSupportedFormats.QR_CODE,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
];

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Pindai QR Code / Barcode Buku',
  description = 'Arahkan kamera ke stiker QR / Barcode eksemplar buku, atau unggah gambar QR dari perangkat Anda.',
  quickOptions = [],
}) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const hasScannedRef = useRef<boolean>(false);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanningFile, setIsScanningFile] = useState<boolean>(false);
  const [manualCode, setManualCode] = useState<string>('');

  const readerElementId = 'pustaka-live-qr-reader';
  const fileReaderElementId = 'pustaka-file-qr-reader';

  const stopCamera = useCallback(async () => {
    const instance = scannerRef.current;
    if (instance) {
      scannerRef.current = null;
      try {
        if (instance.isScanning) {
          await instance.stop();
        }
      } catch {
        // Ignore stop errors if already stopped
      }
      try {
        instance.clear();
      } catch {
        // Ignore clear errors
      }
    }
    setCameraActive(false);
  }, []);

  const handleDecodedValue = useCallback(
    async (rawValue: string) => {
      if (hasScannedRef.current) return;
      const cleaned = rawValue.replace(/^PUSTAKA:(COPY|BOOK|TICKET):/i, '').trim();
      if (!cleaned) return;

      hasScannedRef.current = true;
      await stopCamera();
      toast.success('QR / Barcode Terdeteksi!', {
        description: `Kode: ${cleaned}`,
      });
      onScan(cleaned);
      onClose();
    },
    [onClose, onScan, stopCamera]
  );

  const startCamera = useCallback(
    async (facing: 'environment' | 'user') => {
      await stopCamera();
      setCameraError(null);
      hasScannedRef.current = false;

      // Pastikan DOM container sudah dirender oleh Dialog
      await new Promise((r) => setTimeout(r, 120));
      const container = document.getElementById(readerElementId);
      if (!container) return;

      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Peramban tidak mendukung akses kamera WebRTC (pastikan menggunakan localhost atau HTTPS).');
        }

        const html5QrCode = new Html5Qrcode(readerElementId, {
          formatsToSupport: SUPPORTED_FORMATS,
          verbose: false,
        });
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: facing },
          {
            fps: 12,
            qrbox: { width: 220, height: 160 },
            aspectRatio: 1.5,
          },
          (decodedText) => {
            void handleDecodedValue(decodedText);
          },
          () => {
            // Frame tidak memuat QR/barcode, lanjutkan pemindaian
          }
        );

        setCameraActive(true);
      } catch (err: unknown) {
        console.warn('Kamera gagal diaktifkan:', err);
        const msg =
          err instanceof Error
            ? err.message
            : 'Kamera tidak dapat diakses pada perangkat ini.';
        setCameraError(
          `Kamera tidak dapat diakses (${msg}). Anda tetap dapat memindai dengan tombol "Unggah Gambar QR" di bawah!`
        );
      }
    },
    [handleDecodedValue, stopCamera]
  );

  useEffect(() => {
    if (isOpen) {
      hasScannedRef.current = false;
      void startCamera(facingMode);
    } else {
      void stopCamera();
    }
    return () => {
      void stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  const handleSwitchFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanningFile(true);
    try {
      const fileScanner = new Html5Qrcode(fileReaderElementId, {
        formatsToSupport: SUPPORTED_FORMATS,
        verbose: false,
      });
      const decodedText = await fileScanner.scanFile(file, false);
      fileScanner.clear();
      await handleDecodedValue(decodedText);
    } catch {
      toast.error('QR / Barcode Tidak Terbaca dari Gambar', {
        description: 'Pastikan gambar memuat QR Code atau Barcode yang jelas dan tidak buram.',
      });
    } finally {
      setIsScanningFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    await handleDecodedValue(manualCode.trim());
    setManualCode('');
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          void stopCamera();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {description}
          </DialogDescription>
        </DialogHeader>

        {/* Hidden container for Image File QR decoding */}
        <div id={fileReaderElementId} className="hidden" />

        {/* Live Camera Viewfinder Area */}
        <div className="relative min-h-[210px] w-full bg-black/95 rounded-2xl overflow-hidden border border-border flex flex-col items-center justify-center my-1.5 shadow-inner">
          <div
            id={readerElementId}
            className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          />

          {!cameraActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80 gap-2 p-4 text-center">
              <Camera className="w-7 h-7 animate-pulse text-primary" />
              <span className="text-xs font-mono">Mengaktifkan pemindai kamera...</span>
            </div>
          )}

          {cameraError && (
            <div className="p-4 text-center text-white/90 space-y-2.5 max-w-xs">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-[11px] leading-relaxed">{cameraError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void startCamera(facingMode)}
                className="text-xs h-7 text-black bg-white hover:bg-white/90"
              >
                Coba Aktifkan Kamera Lagi
              </Button>
            </div>
          )}

          {/* Camera controls */}
          {cameraActive && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleSwitchFacing}
                className="h-7 px-2.5 text-[10px] bg-black/60 text-white hover:bg-black/80 border border-white/20"
                title="Ganti Kamera Depan/Belakang"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Ganti Kamera
              </Button>
            </div>
          )}
        </div>

        {/* Upload QR Image Button (Works even without a physical webcam!) */}
        <div className="flex items-center justify-between gap-2 bg-muted/40 p-2.5 rounded-2xl border border-border">
          <div className="text-[11px] text-muted-foreground leading-tight">
            <span className="font-semibold text-foreground block">Punya file gambar stiker QR?</span>
            <span>Pindai langsung dari berkas PNG/JPG di perangkat.</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={isScanningFile}
            onClick={() => fileInputRef.current?.click()}
            className="h-8 px-3 text-xs font-semibold gap-1.5 shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-primary" />
            <span>{isScanningFile ? 'Memindai...' : 'Unggah Gambar QR'}</span>
          </Button>
        </div>

        {/* Optional Quick-Pick Chips (for fast testing / selection) */}
        {quickOptions.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground block">
              Pilih Cepat Kode Tersedia:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1.5 bg-muted/30 rounded-xl border border-border">
              {quickOptions.slice(0, 10).map((opt) => (
                <button
                  key={opt.code}
                  type="button"
                  onClick={() => void handleDecodedValue(opt.code)}
                  className="px-2 py-1 rounded-lg text-[10px] font-mono bg-background hover:bg-primary hover:text-primary-foreground border border-border transition-colors cursor-pointer"
                >
                  <span className="font-bold">{opt.code}</span>
                  {opt.label ? <span className="opacity-75 ml-1">({opt.label})</span> : null}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Manual Input Fallback */}
        <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Atau ketik kode QR/Barcode (contoh: BK-0001-01)"
              className="text-xs font-mono h-9"
            />
            <Button type="submit" size="sm" className="h-9 text-xs font-semibold px-4 shrink-0">
              Gunakan
            </Button>
          </div>
        </form>

        <DialogFooter className="pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void stopCamera();
              onClose();
            }}
            className="w-full text-xs"
          >
            Tutup Pemindai
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
