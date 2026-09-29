/**
 * @file src/client/components/circulation/BarcodeScannerModal.tsx
 * @description Modal pemindai barcode eksemplar buku berbasis WebRTC MediaDevices & Web BarcodeDetector API.
 * @layer Presentation Component
 * 
 * Tujuan: Memungkinkan pustakawan memindai barcode fisik langsung menggunakan kamera ponsel/laptop untuk check-out dan return.
 * Caller: src/client/components/circulation/CirculationDesk.tsx
 * Dependensi: react, lucide-react, Shadcn Dialog, Button, Input, sonner
 * Main Functions: BarcodeScannerModal
 * Side Effects: Mengaktifkan dan menghentikan MediaStream kamera perangkat, memanggil requestAnimationFrame loop untuk deteksi barcode.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Camera, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (barcode: string) => void;
  title?: string;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onScan,
  title = 'Pindai Barcode Eksemplar',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanLoopRef = useRef<number | null>(null);

  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState<string>('');

  const stopCamera = useCallback(() => {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const startCamera = useCallback(async (facing: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Perangkat tidak mendukung akses media kamera WebRTC.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Start Barcode Detection loop if BarcodeDetector is available
      if ('BarcodeDetector' in window) {
        try {
          // @ts-expect-error Native BarcodeDetector web API
          const detector = new window.BarcodeDetector({
            formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code', 'upc_a', 'upc_e'],
          });

          const detectFrame = async () => {
            if (!videoRef.current || !streamRef.current) return;
            try {
              if (videoRef.current.readyState >= 2) {
                const barcodes = await detector.detect(videoRef.current);
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  const scannedValue = barcodes[0].rawValue.trim();
                  stopCamera();
                  toast.success('Barcode Terdeteksi!', {
                    description: `Nilai: ${scannedValue}`,
                  });
                  onScan(scannedValue);
                  onClose();
                  return;
                }
              }
            } catch {
              // Ignore single-frame detection errors
            }
            scanLoopRef.current = requestAnimationFrame(detectFrame);
          };

          scanLoopRef.current = requestAnimationFrame(detectFrame);
        } catch (detectorErr) {
          console.warn('BarcodeDetector initialization fallback:', detectorErr);
        }
      }
    } catch (err: unknown) {
      console.error('Gagal mengakses kamera:', err);
      const msg = err instanceof Error ? err.message : 'Kamera tidak dapat diakses.';
      setCameraError(msg);
      toast.error('Kamera Tidak Tersedia', {
        description: 'Pastikan izin kamera diberikan atau gunakan input kode manual di bawah.',
      });
    }
  }, [onClose, onScan, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode, startCamera, stopCamera]);

  const handleSwitchFacing = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const value = manualCode.trim();
    stopCamera();
    onScan(value);
    setManualCode('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <span>{title}</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Arahkan kamera ke barcode stiker eksemplar buku di perpustakaan.
          </DialogDescription>
        </DialogHeader>

        {/* Viewfinder Area */}
        <div className="relative aspect-video w-full bg-black/90 rounded-2xl overflow-hidden border border-border flex items-center justify-center my-2 shadow-inner">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />

          {cameraActive && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
              {/* Scan target box */}
              <div className="w-48 h-28 border-2 border-primary/80 rounded-xl relative shadow-lg">
                <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-primary" />
                <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-primary" />
                <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-primary" />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-primary" />

                {/* Animated scan line */}
                <div className="w-full h-0.5 bg-primary/80 shadow-[0_0_8px_rgba(59,130,246,0.8)] animate-pulse mt-14" />
              </div>
              <span className="text-[10px] text-white/80 font-mono mt-3 bg-black/60 px-2 py-0.5 rounded-full">
                Posisikan barcode di dalam kotak
              </span>
            </div>
          )}

          {cameraError && (
            <div className="p-4 text-center text-white/90 space-y-2">
              <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-xs">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => startCamera(facingMode)}
                className="text-xs h-7 text-black bg-white hover:bg-white/90"
              >
                Coba Lagi
              </Button>
            </div>
          )}

          {/* Camera controls */}
          {cameraActive && (
            <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSwitchFacing}
                className="h-7 px-2 text-[10px] bg-black/50 text-white hover:bg-black/70 border border-white/20"
                title="Ganti Kamera"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Ganti Kamera
              </Button>
            </div>
          )}
        </div>

        {/* Manual Input Fallback */}
        <form onSubmit={handleManualSubmit} className="space-y-2 pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Input
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Atau ketik barcode (contoh: BK-0001-01)"
              className="text-xs font-mono h-9"
            />
            <Button type="submit" size="sm" className="h-9 text-xs font-semibold px-4 shrink-0">
              Gunakan
            </Button>
          </div>
        </form>

        <DialogFooter className="pt-2">
          <Button variant="outline" size="sm" onClick={onClose} className="w-full text-xs">
            Batal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
